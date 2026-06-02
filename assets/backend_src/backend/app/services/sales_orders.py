import json
from pathlib import Path
from typing import Any

from app.config import settings
from app.sap.client import SapApiError
from app.sap.client_v4 import SapODataV4Client, sales_order_client
from app.schemas.materials import SyncFromOrderItemsResult
from app.schemas.sales_order_portal import SalesOrderPortalDetailDto, SalesOrderPortalLineDto
from app.schemas.sales_orders import (
    SalesOrderDetailDto,
    SalesOrderItemDto,
    SalesOrderSummaryDto,
    SalesOrderSyncResult,
)
from app.services.materials import extract_items_from_sales_orders, material_service


def _escape_odata(value: str) -> str:
    return value.replace("'", "''")


def build_sell_from_stock_filter(
    sales_order_type: str | None = None,
    sales_organization: str | None = None,
    distribution_channel: str | None = None,
    organization_division: str | None = None,
) -> str:
    order_type = sales_order_type or settings.default_sales_order_type
    sales_org = sales_organization or settings.default_sales_organization
    dist_channel = distribution_channel or settings.default_distribution_channel
    division = organization_division or settings.default_division
    return (
        f"SalesOrderType eq '{_escape_odata(order_type)}'"
        f" and SalesOrganization eq '{_escape_odata(sales_org)}'"
        f" and DistributionChannel eq '{_escape_odata(dist_channel)}'"
        f" and OrganizationDivision eq '{_escape_odata(division)}'"
    )


def map_sales_order_item(row: dict[str, Any]) -> SalesOrderItemDto:
    return SalesOrderItemDto(
        salesOrder=str(row.get("SalesOrder") or row.get("salesOrder") or ""),
        salesOrderItem=str(row.get("SalesOrderItem") or row.get("salesOrderItem") or ""),
        product=row.get("Product") or row.get("product"),
        salesOrderItemText=row.get("SalesOrderItemText") or row.get("salesOrderItemText"),
        requestedQuantity=_as_float(row.get("RequestedQuantity") or row.get("requestedQuantity")),
        requestedQuantityUnit=(
            row.get("RequestedQuantityISOUnit")
            or row.get("RequestedQuantityUnit")
            or row.get("requestedQuantityUnit")
        ),
        netAmount=_as_float(row.get("NetAmount") or row.get("netAmount")),
        plant=row.get("Plant") or row.get("plant"),
        storageLocation=row.get("StorageLocation") or row.get("storageLocation"),
        deliveryStatus=row.get("DeliveryStatus") or row.get("deliveryStatus"),
        requestedDeliveryDate=row.get("RequestedDeliveryDate") or row.get("requestedDeliveryDate"),
    )


def map_sales_order_summary(row: dict[str, Any]) -> SalesOrderSummaryDto:
    items = _extract_items(row)
    return SalesOrderSummaryDto(
        salesOrder=str(row.get("SalesOrder") or row.get("salesOrder") or ""),
        salesOrderType=row.get("SalesOrderType") or row.get("salesOrderType"),
        soldToParty=row.get("SoldToParty") or row.get("soldToParty"),
        salesOrganization=row.get("SalesOrganization") or row.get("salesOrganization"),
        distributionChannel=row.get("DistributionChannel") or row.get("distributionChannel"),
        organizationDivision=row.get("OrganizationDivision") or row.get("organizationDivision"),
        billingCompanyCode=row.get("BillingCompanyCode") or row.get("billingCompanyCode"),
        salesOrderDate=row.get("SalesOrderDate") or row.get("salesOrderDate"),
        requestedDeliveryDate=row.get("RequestedDeliveryDate") or row.get("requestedDeliveryDate"),
        transactionCurrency=row.get("TransactionCurrency") or row.get("transactionCurrency"),
        totalNetAmount=_as_float(row.get("TotalNetAmount") or row.get("totalNetAmount")),
        overallSdProcessStatus=row.get("OverallSDProcessStatus") or row.get("overallSdProcessStatus"),
        overallDeliveryStatus=row.get("OverallDeliveryStatus") or row.get("overallDeliveryStatus"),
        itemCount=len(items),
    )


def map_sales_order_detail(row: dict[str, Any]) -> SalesOrderDetailDto:
    summary = map_sales_order_summary(row)
    items = [map_sales_order_item(item) for item in _extract_items(row)]
    return SalesOrderDetailDto(**summary.model_dump(), items=items)


def _extract_items(row: dict[str, Any]) -> list[dict[str, Any]]:
    nested = row.get("_Item") or row.get("items") or []
    if isinstance(nested, dict):
        nested = nested.get("value") or []
    return list(nested) if isinstance(nested, list) else []


def _as_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class SalesOrderService:
    def __init__(self, client: SapODataV4Client | None = None) -> None:
        self.client = client or sales_order_client

    @staticmethod
    def _build_expand(*, items: bool = False, partner: bool = False) -> str | None:
        parts: list[str] = []
        if items:
            parts.append("_Item")
        if partner:
            parts.append("_Partner")
        return ",".join(parts) if parts else None

    @staticmethod
    def _extract_partner_name(row: dict[str, Any]) -> str | None:
        """Pull SoldTo (AG) partner name from _Partner array."""
        partners = row.get("_Partner") or []
        if isinstance(partners, dict):
            partners = partners.get("value") or []
        if not isinstance(partners, list):
            return None
        for p in partners:
            if p.get("PartnerFunction") == "AG":
                return p.get("BusinessPartnerName1") or p.get("businessPartnerName1")
        return None

    def list_sales_orders(
        self,
        *,
        sales_order_type: str | None = None,
        sales_organization: str | None = None,
        distribution_channel: str | None = None,
        organization_division: str | None = None,
        sales_order: str | None = None,
        expand_items: bool = False,
        expand_partner: bool = False,
        top: int = 50,
        select_fields: str | None = None,
    ) -> list[SalesOrderSummaryDto]:
        params: dict[str, Any] = {"$top": str(top)}
        expand = self._build_expand(items=expand_items, partner=expand_partner)
        if expand:
            params["$expand"] = expand
        if sales_order:
            params["$filter"] = f"SalesOrder eq '{_escape_odata(sales_order)}'"
        else:
            params["$filter"] = build_sell_from_stock_filter(
                sales_order_type,
                sales_organization,
                distribution_channel,
                organization_division,
            )

        rows = self.client.fetch_all_pages("SalesOrder", params, page_size=top, select_fields=select_fields)
        return [map_sales_order_summary(row) for row in rows]

    def get_sales_order(
        self,
        sales_order: str,
        *,
        expand_items: bool = True,
        expand_partner: bool = False,
        select_fields: str | None = None,
    ) -> SalesOrderDetailDto | None:
        params: dict[str, Any] = {}
        expand = self._build_expand(items=expand_items, partner=expand_partner)
        if expand:
            params["$expand"] = expand
        key = f"('{_escape_odata(sales_order)}')"
        try:
            row = self.client.get_entity_by_key("SalesOrder", key, params, select_fields=select_fields)
        except SapApiError as exc:
            if exc.status_code == 404:
                return None
            raise
        return map_sales_order_detail(row)

    def sync_from_sap(
        self,
        *,
        sales_order_type: str | None = None,
        sales_organization: str | None = None,
        distribution_channel: str | None = None,
        organization_division: str | None = None,
        sync_materials: bool = True,
        page_size: int = 100,
        select_fields: str | None = None,
        expand_partner: bool = False,
    ) -> SalesOrderSyncResult:
        filter_expr = build_sell_from_stock_filter(
            sales_order_type,
            sales_organization,
            distribution_channel,
            organization_division,
        )
        expand = self._build_expand(items=True, partner=expand_partner)
        params: dict[str, Any] = {
            "$filter": filter_expr,
            "$top": str(page_size),
        }
        if expand:
            params["$expand"] = expand
        orders = self.client.fetch_all_pages(
            "SalesOrder", params, page_size=page_size, select_fields=select_fields
        )
        return self._finalize_sync(orders, source="sap", filter_expression=filter_expr, sync_materials=sync_materials)

    def sync_from_payload(
        self,
        orders: list[dict[str, Any]],
        *,
        source: str = "payload",
        sync_materials: bool = True,
        filter_expression: str | None = None,
    ) -> SalesOrderSyncResult:
        return self._finalize_sync(
            orders,
            source=source,
            filter_expression=filter_expression,
            sync_materials=sync_materials,
        )

    def sync_from_local_sample(self, sample_path: str | None = None) -> SalesOrderSyncResult:
        path = Path(sample_path or settings.so_sync_sample_path)
        if not path.exists():
            raise FileNotFoundError(f"Sample file not found: {path}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        orders = payload.get("value") or payload.get("orders") or payload
        if not isinstance(orders, list):
            raise ValueError("Sample file must contain a 'value' or 'orders' array")
        return self.sync_from_payload(orders, source="local-sample", sync_materials=True)

    def _finalize_sync(
        self,
        orders: list[dict[str, Any]],
        *,
        source: str,
        sync_materials: bool,
        filter_expression: str | None,
    ) -> SalesOrderSyncResult:
        items = extract_items_from_sales_orders(orders)
        material_result: SyncFromOrderItemsResult | None = None
        if sync_materials:
            material_result = material_service.sync_from_order_items(items)

        return SalesOrderSyncResult(
            source=source,
            ordersFetched=len(orders),
            itemsExtracted=len(items),
            materialsSynced=sync_materials,
            materials=material_result,
            filterExpression=filter_expression,
        )

    def _derive_status_labels(
        self,
        overall_sd: str | None,
        overall_delivery: str | None,
    ) -> tuple[str, str, str]:
        delivery = (overall_delivery or "").upper()
        sd = (overall_sd or "").upper()
        if delivery == "C":
            status, deli_status = "发货", "已发货"
        elif delivery == "B":
            status, deli_status = "部分发货", "部分发货"
        else:
            status, deli_status = "订单确认", "未发货"
        if sd in {"C", "D"}:
            status = "开票"
            bill_status = "已开票"
        elif sd == "B":
            bill_status = "部分开票"
            if status == "订单确认":
                status = "部分开票"
        else:
            bill_status = "未开票"
        return status, deli_status, bill_status

    def _map_portal_line(
        self,
        header: dict[str, Any],
        item: dict[str, Any],
        customer_name: str | None = None,
    ) -> SalesOrderPortalLineDto:
        sales_order = str(header.get("SalesOrder") or item.get("SalesOrder") or "")
        sales_order_item = str(item.get("SalesOrderItem") or "10")
        status, deli_status, bill_status = self._derive_status_labels(
            header.get("OverallSDProcessStatus") or header.get("overallSdProcessStatus"),
            header.get("OverallDeliveryStatus") or header.get("overallDeliveryStatus"),
        )
        return SalesOrderPortalLineDto(
            salesOrder=sales_order,
            salesOrderItem=sales_order_item,
            salesOrderLine=f"{sales_order}/{sales_order_item}",
            customerCode=header.get("SoldToParty") or header.get("soldToParty"),
            customerName=customer_name,
            product=item.get("Product") or item.get("product"),
            productName=item.get("SalesOrderItemText") or item.get("salesOrderItemText"),
            quantity=_as_float(item.get("RequestedQuantity") or item.get("requestedQuantity")) or 0,
            unit=item.get("RequestedQuantityISOUnit")
            or item.get("RequestedQuantityUnit")
            or item.get("requestedQuantityUnit"),
            amount=_as_float(item.get("NetAmount") or item.get("netAmount")) or 0,
            currency=header.get("TransactionCurrency") or header.get("transactionCurrency") or "CNY",
            orderDate=header.get("SalesOrderDate") or header.get("salesOrderDate"),
            requestedDeliveryDate=item.get("RequestedDeliveryDate")
            or header.get("RequestedDeliveryDate")
            or header.get("requestedDeliveryDate"),
            status=status,
            deliveryStatus=deli_status,
            billingStatus=bill_status,
            overallSdProcessStatus=header.get("OverallSDProcessStatus") or header.get("overallSdProcessStatus"),
            overallDeliveryStatus=header.get("OverallDeliveryStatus") or header.get("overallDeliveryStatus"),
        )

    def list_portal_lines(
        self,
        *,
        sales_order_type: str | None = None,
        sales_organization: str | None = None,
        distribution_channel: str | None = None,
        organization_division: str | None = None,
        top: int = 100,
        select_fields: str | None = None,
        expand_partner: bool = True,
    ) -> list[SalesOrderPortalLineDto]:
        expand = self._build_expand(items=True, partner=expand_partner)
        params: dict[str, Any] = {
            "$top": str(top),
            "$filter": build_sell_from_stock_filter(
                sales_order_type,
                sales_organization,
                distribution_channel,
                organization_division,
            ),
        }
        if expand:
            params["$expand"] = expand
        orders = self.client.fetch_all_pages(
            "SalesOrder", params, page_size=top, select_fields=select_fields
        )
        lines: list[SalesOrderPortalLineDto] = []
        for header in orders:
            customer_name = self._extract_partner_name(header) if expand_partner else None
            items = _extract_items(header)
            if not items:
                lines.append(
                    self._map_portal_line(
                        header,
                        {"SalesOrder": header.get("SalesOrder"), "SalesOrderItem": "10"},
                        customer_name=customer_name,
                    )
                )
                continue
            for item in items:
                lines.append(self._map_portal_line(header, item, customer_name=customer_name))
        return lines

    def list_portal_lines_from_sample(self) -> list[SalesOrderPortalLineDto]:
        path = Path(settings.so_sync_sample_path)
        payload = json.loads(path.read_text(encoding="utf-8"))
        orders = payload.get("value") or payload.get("orders") or payload
        if not isinstance(orders, list):
            raise ValueError("Sample file must contain a 'value' or 'orders' array")
        lines: list[SalesOrderPortalLineDto] = []
        for header in orders:
            for item in _extract_items(header) or [{"SalesOrderItem": "10"}]:
                lines.append(self._map_portal_line(header, item))
        return lines

    def get_portal_detail(self, sales_order: str) -> SalesOrderPortalDetailDto | None:
        detail = self.get_sales_order(sales_order, expand_items=True, expand_partner=True)
        if detail is None:
            return None
        header_row = detail.model_dump()
        customer_name = None  # detail model doesn't carry _Partner array; single order can re-query if needed
        header_line = self._map_portal_line(
            header_row,
            {
                "SalesOrder": detail.salesOrder,
                "SalesOrderItem": detail.items[0].salesOrderItem if detail.items else "10",
                "Product": detail.items[0].product if detail.items else None,
                "SalesOrderItemText": detail.items[0].salesOrderItemText if detail.items else None,
                "RequestedQuantity": detail.items[0].requestedQuantity if detail.items else 0,
                "NetAmount": detail.totalNetAmount,
            },
            customer_name=customer_name,
        )
        item_lines = [
            self._map_portal_line(header_row, item.model_dump())
            for item in detail.items
        ]
        return SalesOrderPortalDetailDto(header=header_line, items=item_lines)


sales_order_service = SalesOrderService()
