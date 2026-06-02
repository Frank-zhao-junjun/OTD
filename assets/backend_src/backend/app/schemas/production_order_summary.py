from datetime import date

from pydantic import BaseModel, Field


class ProductionOrderSummaryDto(BaseModel):
    """Portal-facing production order list row."""

    productionOrder: str
    salesOrder: str | None = None
    salesOrderItem: str | None = None
    product: str | None = None
    materialName: str | None = None
    plannedQty: float = 0
    confirmedQty: float = 0
    baseUnit: str | None = None
    creationDate: date | None = None
    releasedDate: date | None = None
    plannedFinishedDate: date | None = None
    orderConfirmedEndDate: date | None = Field(
        default=None,
        description="最终确认日期 (SAP OrderConfirmedEndDate)",
    )
    technicalCompletionDate: date | None = Field(
        default=None,
        description="最终完成日期 (SAP TechnicalCompletionDate)",
    )
    goodsReceiptDate: date | None = Field(
        default=None,
        description="收货日期 (SAP OrderActualEndDate)",
    )
    totalGrQuantity: float = Field(default=0, description="累计收货 (SAP ActualDeliveredQuantity)")
    status: str | None = None
