from typing import Any

from app.sap.client import SapApiError, SapODataClient, sap_client
from app.sap.transforms import (
    blocked_status,
    format_sales_area,
    nav_results,
    normalize_sap_record,
    extract_scalar_fields,
    parse_sap_v2_date,
)
from app.schemas.customers import (
    CustomerAddressDto,
    CustomerCompanyDto,
    CustomerDetailDto,
    CustomerFullDto,
    CustomerSalesAreaDto,
    CustomerSummaryDto,
)


def _escape_odata(value: str) -> str:
    return value.replace("'", "''")


CUSTOMER_NAME_FIELDS = (
    "CustomerName",
    "CustomerFullName",
    "BPCustomerName",
    "BPCustomerFullName",
)


def _build_customer_name_filter(customer_name: str) -> str:
    keyword = _escape_odata(customer_name.strip())
    if not keyword:
        return ""
    clauses = [f"substringof('{keyword}', {field})" for field in CUSTOMER_NAME_FIELDS]
    return "(" + " or ".join(clauses) + ")"


def _build_customer_filter(customer_code: str | None, customer_name: str | None) -> str | None:
    parts: list[str] = []
    if customer_code:
        parts.append(f"Customer eq '{_escape_odata(customer_code)}'")
    if customer_name and customer_name.strip():
        parts.append(_build_customer_name_filter(customer_name))
    if not parts:
        return None
    return " and ".join(parts)


def _filter_sales_area(row: dict[str, Any], sales_org: str, dist_channel: str, division: str) -> bool:
    return (
        row.get("SalesOrganization") == sales_org
        and row.get("DistributionChannel") == dist_channel
        and row.get("Division") == division
    )


def _filter_company(row: dict[str, Any], company_code: str) -> bool:
    return row.get("CompanyCode") == company_code


def map_sales_area(row: dict[str, Any]) -> CustomerSalesAreaDto:
    sales_org = row.get("SalesOrganization", "")
    dist_channel = row.get("DistributionChannel", "")
    division = row.get("Division", "")
    return CustomerSalesAreaDto(
        customerCode=row.get("Customer", ""),
        salesOrganization=sales_org,
        distributionChannel=dist_channel,
        division=division,
        salesArea=format_sales_area(sales_org, dist_channel, division),
        currency=row.get("Currency"),
        customerPaymentTerms=row.get("CustomerPaymentTerms"),
        customerAccountAssignmentGroup=row.get("CustomerAccountAssignmentGroup"),
        shippingCondition=row.get("ShippingCondition"),
        incotermsClassification=row.get("IncotermsClassification"),
        supplyingPlant=row.get("SupplyingPlant"),
        salesDistrict=row.get("SalesDistrict") or None,
        customerGroup=row.get("CustomerGroup") or None,
        deletionIndicator=bool(row.get("DeletionIndicator")),
    )


def map_company(row: dict[str, Any]) -> CustomerCompanyDto:
    return CustomerCompanyDto(
        customerCode=row.get("Customer", ""),
        companyCode=row.get("CompanyCode", ""),
        paymentTerms=row.get("PaymentTerms"),
        reconciliationAccount=row.get("ReconciliationAccount"),
        customerAccountGroup=row.get("CustomerAccountGroup"),
        paymentBlockingReason=row.get("PaymentBlockingReason") or None,
        deletionIndicator=bool(row.get("DeletionIndicator")),
    )


def map_address(row: dict[str, Any]) -> CustomerAddressDto:
    return CustomerAddressDto(
        businessPartner=row.get("BusinessPartner", ""),
        addressId=str(row.get("AddressID", "")),
        fullName=row.get("FullName") or None,
        country=row.get("Country") or None,
        region=row.get("Region") or None,
        cityName=row.get("CityName") or None,
        streetName=row.get("StreetName") or None,
        postalCode=row.get("PostalCode") or None,
        language=row.get("Language") or None,
    )


def _primary_address(addresses: list[CustomerAddressDto]) -> CustomerAddressDto | None:
    return addresses[0] if addresses else None


def map_customer_summary(
    row: dict[str, Any],
    *,
    company_code: str,
    sales_org: str,
    dist_channel: str,
    division: str,
    addresses: list[CustomerAddressDto] | None = None,
) -> CustomerSummaryDto:
    sales_areas = [
        map_sales_area(item)
        for item in nav_results(row, "to_CustomerSalesArea")
        if _filter_sales_area(item, sales_org, dist_channel, division)
    ]
    companies = [
        map_company(item)
        for item in nav_results(row, "to_CustomerCompany")
        if _filter_company(item, company_code)
    ]
    sales_area = sales_areas[0] if sales_areas else None
    company = companies[0] if companies else None
    address = _primary_address(addresses or [])

    return CustomerSummaryDto(
        customerCode=row.get("Customer", ""),
        customerName=row.get("CustomerName"),
        customerFullName=row.get("CustomerFullName"),
        customerAccountGroup=row.get("CustomerAccountGroup"),
        companyCode=company.companyCode if company else None,
        salesArea=sales_area.salesArea if sales_area else None,
        currency=sales_area.currency if sales_area else None,
        customerPaymentTerms=(sales_area.customerPaymentTerms if sales_area else None)
        or (company.paymentTerms if company else None),
        salesDistrict=sales_area.salesDistrict if sales_area else None,
        country=address.country if address else None,
        cityName=address.cityName if address else None,
        creditStatus=blocked_status(
            row.get("PostingIsBlocked"),
            row.get("OrderIsBlockedForCustomer"),
            row.get("BillingIsBlockedForCustomer"),
            row.get("DeliveryIsBlocked"),
            company.paymentBlockingReason if company else None,
        ),
        postingBlocked=bool(row.get("PostingIsBlocked")),
        deletionIndicator=bool(row.get("DeletionIndicator")),
        createdByUser=row.get("CreatedByUser"),
        creationDate=parse_sap_v2_date(row.get("CreationDate")),
    )


def map_customer_detail(
    row: dict[str, Any],
    *,
    company_code: str,
    sales_org: str,
    dist_channel: str,
    division: str,
    addresses: list[CustomerAddressDto] | None = None,
) -> CustomerDetailDto:
    summary = map_customer_summary(
        row,
        company_code=company_code,
        sales_org=sales_org,
        dist_channel=dist_channel,
        division=division,
        addresses=addresses,
    )
    sales_areas = [
        map_sales_area(item)
        for item in nav_results(row, "to_CustomerSalesArea")
        if _filter_sales_area(item, sales_org, dist_channel, division)
    ]
    companies = [
        map_company(item)
        for item in nav_results(row, "to_CustomerCompany")
        if _filter_company(item, company_code)
    ]
    return CustomerDetailDto(
        **summary.model_dump(),
        bpCustomerName=row.get("BPCustomerName"),
        customerClassification=row.get("CustomerClassification") or None,
        industry=row.get("Industry") or None,
        vatRegistration=row.get("VATRegistration") or None,
        orderBlocked=row.get("OrderIsBlockedForCustomer") or None,
        billingBlocked=row.get("BillingIsBlockedForCustomer") or None,
        deliveryBlocked=row.get("DeliveryIsBlocked") or None,
        salesAreas=sales_areas,
        companies=companies,
        addresses=addresses or [],
    )


CUSTOMER_EXPAND = "to_CustomerSalesArea,to_CustomerCompany,to_CustomerText"


def map_customer_full(
    row: dict[str, Any],
    *,
    company_code: str,
    sales_org: str,
    dist_channel: str,
    division: str,
    addresses: list[CustomerAddressDto] | None = None,
    address_rows: list[dict[str, Any]] | None = None,
    include_all_sales_areas: bool = False,
    include_all_companies: bool = False,
) -> CustomerFullDto:
    detail = map_customer_detail(
        row,
        company_code=company_code,
        sales_org=sales_org,
        dist_channel=dist_channel,
        division=division,
        addresses=addresses,
    )

    sales_area_rows = nav_results(row, "to_CustomerSalesArea")
    company_rows = nav_results(row, "to_CustomerCompany")
    if not include_all_sales_areas:
        sales_area_rows = [
            item for item in sales_area_rows if _filter_sales_area(item, sales_org, dist_channel, division)
        ]
    if not include_all_companies:
        company_rows = [item for item in company_rows if _filter_company(item, company_code)]

    if include_all_sales_areas:
        detail.salesAreas = [map_sales_area(item) for item in sales_area_rows]
    if include_all_companies:
        detail.companies = [map_company(item) for item in company_rows]

    return CustomerFullDto(
        **detail.model_dump(),
        sapCustomer=extract_scalar_fields(row),
        sapSalesAreas=[normalize_sap_record(item) for item in sales_area_rows],
        sapCompanies=[normalize_sap_record(item) for item in company_rows],
        sapAddresses=[normalize_sap_record(item) for item in (address_rows or [])],
    )


class CustomerService:
    def __init__(self, client: SapODataClient | None = None) -> None:
        self.client = client or sap_client

    def list_customers(
        self,
        *,
        company_code: str,
        sales_organization: str,
        distribution_channel: str,
        division: str,
        customer_code: str | None = None,
        customer_name: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[CustomerSummaryDto], int]:
        params: dict[str, Any] = {
            "$expand": "to_CustomerSalesArea,to_CustomerCompany",
            "$inlinecount": "allpages",
            "$top": page_size,
            "$skip": (page - 1) * page_size,
        }
        filter_expr = _build_customer_filter(customer_code, customer_name)
        if filter_expr:
            params["$filter"] = filter_expr

        payload = self.client.get_entity_set("A_Customer", params)
        rows = payload.get("results", [])
        total = int(payload.get("__count", len(rows)))

        items = [
            map_customer_summary(
                row,
                company_code=company_code,
                sales_org=sales_organization,
                dist_channel=distribution_channel,
                division=division,
            )
            for row in rows
        ]
        return items, total

    def get_customer(
        self,
        customer_code: str,
        *,
        company_code: str,
        sales_organization: str,
        distribution_channel: str,
        division: str,
        include_addresses: bool = True,
    ) -> CustomerDetailDto | None:
        try:
            row = self.client.get_entity_by_key(
                "A_Customer",
                f"('{_escape_odata(customer_code)}')",
                params={"$expand": "to_CustomerSalesArea,to_CustomerCompany"},
            )
        except SapApiError as exc:
            if exc.status_code == 404:
                return None
            raise

        addresses: list[CustomerAddressDto] = []
        if include_addresses:
            addresses = self.list_addresses(customer_code)

        return map_customer_detail(
            row,
            company_code=company_code,
            sales_org=sales_organization,
            dist_channel=distribution_channel,
            division=division,
            addresses=addresses,
        )

    def list_address_rows(self, customer_code: str) -> list[dict[str, Any]]:
        params = {"$filter": f"BusinessPartner eq '{_escape_odata(customer_code)}'"}
        rows, _ = self.client.fetch_all_pages("A_BusinessPartnerAddress", params, page_size=100)
        return rows

    def list_addresses(self, customer_code: str) -> list[CustomerAddressDto]:
        return [map_address(row) for row in self.list_address_rows(customer_code)]

    def get_all_customers_full(
        self,
        *,
        company_code: str,
        sales_organization: str,
        distribution_channel: str,
        division: str,
        customer_code: str | None = None,
        customer_name: str | None = None,
        include_all_relations: bool = True,
    ) -> tuple[list[CustomerFullDto], int]:
        params: dict[str, Any] = {"$expand": CUSTOMER_EXPAND}
        filter_expr = _build_customer_filter(customer_code, customer_name)
        if filter_expr:
            params["$filter"] = filter_expr

        rows, total = self.client.fetch_all_pages("A_Customer", params, page_size=100)
        items: list[CustomerFullDto] = []
        for row in rows:
            code = row.get("Customer", "")
            address_rows = self.list_address_rows(code) if code else []
            addresses = [map_address(item) for item in address_rows]
            items.append(
                map_customer_full(
                    row,
                    company_code=company_code,
                    sales_org=sales_organization,
                    dist_channel=distribution_channel,
                    division=division,
                    addresses=addresses,
                    address_rows=address_rows,
                    include_all_sales_areas=include_all_relations,
                    include_all_companies=include_all_relations,
                )
            )
        return items, total


customer_service = CustomerService()
