from datetime import date

from pydantic import BaseModel, Field


class BillingDocumentPortalRowDto(BaseModel):
    billingDocument: str
    billingDocumentItem: str
    salesOrder: str | None = None
    salesOrderItem: str | None = None
    salesOrderLine: str | None = None
    customerCode: str | None = None
    customerName: str | None = None
    material: str | None = None
    materialName: str | None = None
    billingDate: date | None = None
    billingQuantity: float = 0
    unit: str | None = None
    netAmount: float = 0
    taxAmount: float = 0
    currency: str | None = "CNY"
