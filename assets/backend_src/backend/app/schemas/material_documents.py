from datetime import date

from pydantic import BaseModel


class MaterialDocumentPortalRowDto(BaseModel):
    materialDocument: str
    materialDocumentYear: str | None = None
    materialDocumentItem: str | None = None
    material: str | None = None
    materialName: str | None = None
    plant: str | None = None
    storageLocation: str | None = None
    quantity: float = 0
    unit: str | None = None
    postingDate: date | None = None
    goodsMovementType: str | None = None
    deliveryDocument: str | None = None
    deliveryDocumentItem: str | None = None
    productionOrder: str | None = None
    salesOrder: str | None = None
    salesOrderItem: str | None = None
