from pydantic import BaseModel, Field


class MaterialStockLineDto(BaseModel):
    material: str = Field(alias="material")
    plant: str
    storageLocation: str
    batch: str = ""
    supplier: str = ""
    customer: str = ""
    inventorySpecialStockType: str = ""
    inventoryStockType: str = ""
    materialBaseUnit: str = ""
    quantity: float = 0

    model_config = {"populate_by_name": True}


class MaterialStockSummaryDto(BaseModel):
    material: str
    materialName: str | None = None
    plant: str
    storageLocation: str = ""
    baseUnit: str = ""
    unrestrictedQty: float = 0
    qualityInspectionQty: float = 0
    blockedQty: float = 0
    availableQty: float = 0
    totalQty: float = 0

    model_config = {"populate_by_name": True}


class MaterialStockSyncResult(BaseModel):
    materialsQueried: int
    linesFetched: int
    summaries: list[MaterialStockSummaryDto]
