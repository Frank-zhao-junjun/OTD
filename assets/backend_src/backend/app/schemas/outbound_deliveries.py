from datetime import date

from pydantic import BaseModel, Field


class OutboundDeliveryPortalRowDto(BaseModel):
    """Portal 发货清单行 — 对齐 pc-sales-portal.html deliveryTable."""

    deliveryDocument: str
    deliveryDocumentItem: str
    salesOrder: str | None = None
    salesOrderItem: str | None = None
    salesOrderLine: str | None = Field(
        default=None,
        description="Portal display: salesOrder/salesOrderItem",
    )
    customerCode: str | None = None
    customerName: str | None = None
    material: str | None = None
    materialName: str | None = None
    postedQuantity: float = 0
    unit: str | None = None
    postingDate: date | None = None
    materialDocument: str | None = None
    materialDocumentYear: str | None = None
    materialDocumentItem: str | None = None
    goodsMovementType: str | None = None
    materialDocumentPostingDate: date | None = None


class OutboundDeliveryItemDto(BaseModel):
    deliveryDocument: str
    deliveryDocumentItem: str
    referenceSDDocument: str | None = None
    referenceSDDocumentItem: str | None = None
    material: str | None = None
    deliveryDocumentItemText: str | None = None
    actualDeliveryQuantity: float = 0
    actualDeliveredQtyInBaseUnit: float = 0
    deliveryQuantityUnit: str | None = None
    goodsMovementStatus: str | None = None
    materialDocument: str | None = None
    postingDate: date | None = None
    customerCode: str | None = None
    customerName: str | None = None
