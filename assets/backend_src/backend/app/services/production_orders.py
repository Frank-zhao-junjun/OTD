from typing import Any

from app.config import settings
from app.sap.production_order_client import production_order_client
from app.schemas.production_order_portal import (
    GoodsReceiptLineDto,
    ProductionOrderDetailDto,
    ProductionOrderStatusDto,
)
from app.schemas.production_order_summary import ProductionOrderSummaryDto

SUMMARY_SELECT = ",".join(
    [
        "ProductionOrder",
        "ProductionOrderText",
        "CreationDate",
        "OrderActualReleaseDate",
        "Product",
        "ProductionPlant",
        "OrderPlannedTotalQty",
        "OrderConfirmedYieldQty",
        "ProductionISOUnit",
        "OrderPlannedEndDate",
        "OrderConfirmedEndDate",
        "TechnicalCompletionDate",
        "OrderActualEndDate",
        "ActualDeliveredQuantity",
        "SalesOrder",
        "SalesOrderItem",
        "IsCompletelyDelivered",
    ]
)

DETAIL_SELECT = ",".join(
    [
        "ProductionOrder",
        "ProductionOrderText",
        "ProductionOrderType",
        "CreationDate",
        "OrderActualReleaseDate",
        "Product",
        "ProductionPlant",
        "OrderPlannedTotalQty",
        "OrderConfirmedYieldQty",
        "ProductionISOUnit",
        "OrderConfirmedEndDate",
        "TechnicalCompletionDate",
        "OrderActualEndDate",
        "ActualDeliveredQuantity",
        "IsCompletelyDelivered",
        "NumberOfOrderConfirmations",
    ]
)

ITEM_SELECT = "ProductionOrderItem,GoodsReceiptQty,ActualDeliveryDate,PlannedTotalQty,OrderIsReleased"


def _escape_odata(value: str) -> str:
    return value.replace("'", "''")


def _to_float(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def _derive_status(row: dict[str, Any], *, item_rows: list[dict[str, Any]] | None = None) -> ProductionOrderStatusDto:
    is_released = bool(row.get("OrderActualReleaseDate"))
    if item_rows:
        is_released = is_released or any(item.get("OrderIsReleased") for item in item_rows)

    is_teco = bool(row.get("TechnicalCompletionDate"))
    is_delivered = bool(row.get("IsCompletelyDelivered"))
    total_gr = _to_float(row.get("ActualDeliveredQuantity"))
    if item_rows and total_gr <= 0:
        total_gr = sum(_to_float(item.get("GoodsReceiptQty")) for item in item_rows)
    planned_qty = _to_float(row.get("OrderPlannedTotalQty"))
    confirmed_qty = _to_float(row.get("OrderConfirmedYieldQty"))

    if is_teco:
        code, label = "TECO", "技术完成"
    elif is_delivered:
        code, label = "DELIVERED", "交货完成"
    elif total_gr > 0 and planned_qty > 0 and total_gr >= planned_qty:
        code, label = "GR_COMPLETE", "收货完成"
    elif total_gr > 0:
        code, label = "PARTIAL_GR", "部分收货"
    elif confirmed_qty > 0 and planned_qty > 0 and confirmed_qty < planned_qty:
        code, label = "PARTIAL_CONFIRM", "部分确认"
    elif row.get("OrderConfirmedEndDate") or confirmed_qty > 0:
        code, label = "IN_PROGRESS", "生产中"
    elif is_released:
        code, label = "RELEASED", "已下达"
    elif row.get("CreationDate"):
        code, label = "CREATED", "已创建"
    else:
        code, label = "UNKNOWN", "未知"

    return ProductionOrderStatusDto(
        code=code,
        label=label,
        isReleased=is_released,
        isTechnicallyComplete=is_teco,
        isCompletelyDelivered=is_delivered,
    )


def _map_goods_receipt_lines(items: list[dict[str, Any]]) -> list[GoodsReceiptLineDto]:
    lines: list[GoodsReceiptLineDto] = []
    for item in items:
        qty = _to_float(item.get("GoodsReceiptQty"))
        if qty <= 0 and not item.get("ActualDeliveryDate"):
            continue
        lines.append(
            GoodsReceiptLineDto(
                productionOrderItem=str(item.get("ProductionOrderItem") or ""),
                goodsReceiptQty=qty,
                goodsReceiptDate=item.get("ActualDeliveryDate") or None,
            )
        )
    return lines


def _resolve_gr_totals(
    header: dict[str, Any],
    items: list[dict[str, Any]],
) -> tuple[float, date | None, float]:
    header_gr = _to_float(header.get("ActualDeliveredQuantity"))
    item_gr_sum = sum(_to_float(item.get("GoodsReceiptQty")) for item in items)
    total_gr = header_gr if header_gr > 0 else item_gr_sum

    gr_dates: list[Any] = []
    if header.get("OrderActualEndDate"):
        gr_dates.append(header.get("OrderActualEndDate"))
    for item in items:
        if item.get("ActualDeliveryDate"):
            gr_dates.append(item.get("ActualDeliveryDate"))
    latest_gr_date = max(gr_dates) if gr_dates else None

    primary_qty = _to_float(items[0].get("GoodsReceiptQty")) if items else header_gr
    return total_gr, latest_gr_date, primary_qty


def map_production_order_summary(row: dict[str, Any]) -> ProductionOrderSummaryDto:
    status = _derive_status(row)
    return ProductionOrderSummaryDto(
        productionOrder=str(row.get("ProductionOrder") or ""),
        salesOrder=row.get("SalesOrder") or None,
        salesOrderItem=row.get("SalesOrderItem") or None,
        product=row.get("Product") or None,
        materialName=row.get("ProductionOrderText") or None,
        plannedQty=_to_float(row.get("OrderPlannedTotalQty")),
        confirmedQty=_to_float(row.get("OrderConfirmedYieldQty")),
        baseUnit=row.get("ProductionISOUnit") or None,
        creationDate=row.get("CreationDate") or None,
        releasedDate=row.get("OrderActualReleaseDate") or None,
        plannedFinishedDate=row.get("OrderPlannedEndDate") or None,
        orderConfirmedEndDate=row.get("OrderConfirmedEndDate") or None,
        technicalCompletionDate=row.get("TechnicalCompletionDate") or None,
        goodsReceiptDate=row.get("OrderActualEndDate") or None,
        totalGrQuantity=_to_float(row.get("ActualDeliveredQuantity")),
        status=status.label,
    )


def map_production_order_detail(header: dict[str, Any], items: list[dict[str, Any]]) -> ProductionOrderDetailDto:
    total_gr, gr_date, primary_gr_qty = _resolve_gr_totals(header, items)
    status = _derive_status(header, item_rows=items)
    return ProductionOrderDetailDto(
        productionOrder=str(header.get("ProductionOrder") or ""),
        product=header.get("Product") or None,
        materialName=header.get("ProductionOrderText") or None,
        plant=header.get("ProductionPlant") or None,
        baseUnit=header.get("ProductionISOUnit") or None,
        creationDate=header.get("CreationDate") or None,
        releasedDate=header.get("OrderActualReleaseDate") or None,
        plannedQty=_to_float(header.get("OrderPlannedTotalQty")),
        confirmedQty=_to_float(header.get("OrderConfirmedYieldQty")),
        orderConfirmedEndDate=header.get("OrderConfirmedEndDate") or None,
        technicalCompletionDate=header.get("TechnicalCompletionDate") or None,
        goodsReceiptDate=gr_date,
        goodsReceiptQty=primary_gr_qty,
        totalGrQuantity=total_gr,
        status=status,
        goodsReceiptLines=_map_goods_receipt_lines(items),
    )


class ProductionOrderService:
    def find_order_numbers_by_material(
        self,
        material: str,
        *,
        plant: str | None = None,
        top: int = 50,
    ) -> list[str]:
        params: dict[str, Any] = {
            "$select": "ProductionOrder",
            "$top": str(top),
            "$orderby": "CreationDate desc",
        }
        plant_code = (plant or settings.default_plant).strip()
        rows = production_order_client.find_by_material(
            material.strip(),
            params,
            plant=plant_code,
        )
        numbers: list[str] = []
        seen: set[str] = set()
        for row in rows:
            po = str(row.get("ProductionOrder") or "").strip()
            if po and po not in seen:
                seen.add(po)
                numbers.append(po)
        return numbers

    def get_detail(self, order_id: str) -> ProductionOrderDetailDto | None:
        params: dict[str, Any] = {
            "$select": DETAIL_SELECT,
            "$expand": f"_Item($select={ITEM_SELECT})",
        }
        payload = production_order_client.get_order(order_id.strip(), params)
        if not payload:
            return None
        items = payload.get("_Item") or []
        if isinstance(items, dict):
            items = items.get("value") or []
        return map_production_order_detail(payload, items)

    def list_summary(
        self,
        *,
        plant: str | None = None,
        material: str | None = None,
        top: int = 50,
    ) -> list[ProductionOrderSummaryDto]:
        params: dict[str, Any] = {
            "$select": SUMMARY_SELECT,
            "$top": str(top),
            "$orderby": "CreationDate desc",
        }
        plant_code = (plant or settings.default_plant).strip()
        if material:
            rows = production_order_client.find_by_material(
                material.strip(),
                params,
                plant=plant_code,
            )
        else:
            params["$filter"] = f"ProductionPlant eq '{_escape_odata(plant_code)}'"
            rows = production_order_client.list_orders(params)
        return [map_production_order_summary(row) for row in rows if row.get("ProductionOrder")]


production_order_service = ProductionOrderService()
