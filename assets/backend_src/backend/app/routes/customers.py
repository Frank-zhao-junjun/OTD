from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.sap.client import SapApiError
from app.schemas.common import ApiResponse, ErrorDetail, ErrorResponse, Pagination
from app.schemas.customers import CustomerAddressDto, CustomerDetailDto, CustomerFullDto, CustomerSummaryDto
from app.services.customers import customer_service

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])


@router.get("", response_model=ApiResponse[list[CustomerSummaryDto]])
def list_customers(
    company_code: str = Query(default=settings.default_company_code, alias="companyCode"),
    sales_organization: str = Query(default=settings.default_sales_organization, alias="salesOrganization"),
    distribution_channel: str = Query(default=settings.default_distribution_channel, alias="distributionChannel"),
    division: str = Query(default=settings.default_division, alias="division"),
    customer_code: str | None = Query(default=None, alias="customerCode"),
    customer_name: str | None = Query(default=None, alias="customerName"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
):
    try:
        items, total = customer_service.list_customers(
            company_code=company_code,
            sales_organization=sales_organization,
            distribution_channel=distribution_channel,
            division=division,
            customer_code=customer_code,
            customer_name=customer_name,
            page=page,
            page_size=page_size,
        )
    except SapApiError as exc:
        raise HTTPException(
            status_code=502,
            detail=ErrorResponse(error=ErrorDetail(code="SAP_API_ERROR", message=exc.message)).model_dump(),
        ) from exc

    return ApiResponse(
        data=items,
        pagination=Pagination(page=page, pageSize=page_size, total=total),
    )


@router.get("/all/full", response_model=ApiResponse[list[CustomerFullDto]])
def get_all_customers_full(
    company_code: str = Query(default=settings.default_company_code, alias="companyCode"),
    sales_organization: str = Query(default=settings.default_sales_organization, alias="salesOrganization"),
    distribution_channel: str = Query(default=settings.default_distribution_channel, alias="distributionChannel"),
    division: str = Query(default=settings.default_division, alias="division"),
    customer_code: str | None = Query(default=None, alias="customerCode"),
    customer_name: str | None = Query(default=None, alias="customerName"),
    include_all_relations: bool = Query(default=True, alias="includeAllRelations"),
):
    """Fetch all customers with expanded SAP relations and full field payload."""
    try:
        items, total = customer_service.get_all_customers_full(
            company_code=company_code,
            sales_organization=sales_organization,
            distribution_channel=distribution_channel,
            division=division,
            customer_code=customer_code,
            customer_name=customer_name,
            include_all_relations=include_all_relations,
        )
    except SapApiError as exc:
        raise HTTPException(
            status_code=502,
            detail=ErrorResponse(error=ErrorDetail(code="SAP_API_ERROR", message=exc.message)).model_dump(),
        ) from exc

    return ApiResponse(
        data=items,
        pagination=Pagination(page=1, pageSize=total, total=total),
    )


@router.get("/{customer_code}", response_model=ApiResponse[CustomerDetailDto])
def get_customer(
    customer_code: str,
    company_code: str = Query(default=settings.default_company_code, alias="companyCode"),
    sales_organization: str = Query(default=settings.default_sales_organization, alias="salesOrganization"),
    distribution_channel: str = Query(default=settings.default_distribution_channel, alias="distributionChannel"),
    division: str = Query(default=settings.default_division, alias="division"),
):
    try:
        detail = customer_service.get_customer(
            customer_code,
            company_code=company_code,
            sales_organization=sales_organization,
            distribution_channel=distribution_channel,
            division=division,
        )
    except SapApiError as exc:
        raise HTTPException(
            status_code=502,
            detail=ErrorResponse(error=ErrorDetail(code="SAP_API_ERROR", message=exc.message)).model_dump(),
        ) from exc

    if detail is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ErrorDetail(code="CUSTOMER_NOT_FOUND", message=f"Customer {customer_code} not found")
            ).model_dump(),
        )

    return ApiResponse(data=detail)


@router.get("/{customer_code}/addresses", response_model=ApiResponse[list[CustomerAddressDto]])
def get_customer_addresses(customer_code: str):
    try:
        addresses = customer_service.list_addresses(customer_code)
    except SapApiError as exc:
        raise HTTPException(
            status_code=502,
            detail=ErrorResponse(error=ErrorDetail(code="SAP_API_ERROR", message=exc.message)).model_dump(),
        ) from exc

    return ApiResponse(data=addresses)
