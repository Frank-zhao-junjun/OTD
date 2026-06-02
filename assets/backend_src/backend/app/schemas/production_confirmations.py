from datetime import date

from pydantic import BaseModel


class ProductionConfirmationPortalRowDto(BaseModel):
    productionOrder: str
    orderOperation: str | None = None
    confirmationGroup: str | None = None
    confirmationCounter: str | None = None
    yieldQuantity: float = 0
    unit: str | None = None
    postingDate: date | None = None
    workCenter: str | None = None
    finalConfirmationType: str | None = None
