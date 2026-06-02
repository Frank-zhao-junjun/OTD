from datetime import date

from pydantic import BaseModel, Field


class ProductionOrderStatusDto(BaseModel):
    """Derived lifecycle status for portal display."""

    code: str
    label: str
    isReleased: bool = False
    isTechnicallyComplete: bool = False
    isCompletelyDelivered: bool = False


class GoodsReceiptLineDto(BaseModel):
    """Per-item goods receipt snapshot from ProductionOrderItem."""

    productionOrderItem: str | None = None
    goodsReceiptQty: float = 0
    goodsReceiptDate: date | None = Field(
        default=None,
        description="SAP ProductionOrderItem.ActualDeliveryDate",
    )


class ProductionOrderDetailDto(BaseModel):
    """Portal production order detail (requirement #2)."""

    productionOrder: str
    product: str | None = None
    materialName: str | None = None
    plant: str | None = None
    baseUnit: str | None = None
    creationDate: date | None = None
    releasedDate: date | None = Field(default=None, description="SAP OrderActualReleaseDate")
    plannedQty: float = 0
    confirmedQty: float = 0
    orderConfirmedEndDate: date | None = Field(
        default=None,
        description="Final confirmation date (SAP OrderConfirmedEndDate)",
    )
    technicalCompletionDate: date | None = Field(
        default=None,
        description="TECO date (SAP TechnicalCompletionDate)",
    )
    goodsReceiptDate: date | None = Field(
        default=None,
        description="Latest goods receipt / actual delivery date (header OrderActualEndDate or item ActualDeliveryDate)",
    )
    goodsReceiptQty: float = Field(
        default=0,
        description="Latest GR quantity on primary item (GoodsReceiptQty)",
    )
    totalGrQuantity: float = Field(
        default=0,
        description="Total GR quantity (header ActualDeliveredQuantity or sum of item GoodsReceiptQty)",
    )
    status: ProductionOrderStatusDto
    goodsReceiptLines: list[GoodsReceiptLineDto] = Field(default_factory=list)


class ProductionOrderNumbersDto(BaseModel):
    """Response for material → production order number lookup (requirement #1)."""

    material: str
    productionOrderNumbers: list[str]
    count: int
