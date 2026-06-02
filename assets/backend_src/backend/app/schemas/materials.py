from pydantic import BaseModel, Field


class MaterialDto(BaseModel):
    materialCode: str
    materialName: str | None = None
    baseUnit: str | None = None
    plant: str | None = None
    storageLocation: str | None = None
    firstSeenSalesOrder: str | None = None
    firstSeenSalesOrderItem: str | None = None
    lastSeenSalesOrder: str | None = None
    lastSeenSalesOrderItem: str | None = None
    referenceCount: int = 1
    createdAt: str | None = None
    updatedAt: str | None = None


class SalesOrderItemSyncInput(BaseModel):
    salesOrder: str | None = Field(default=None, alias="salesOrder")
    salesOrderItem: str | None = Field(default=None, alias="salesOrderItem")
    product: str | None = None
    salesOrderItemText: str | None = Field(default=None, alias="salesOrderItemText")
    requestedQuantityUnit: str | None = Field(default=None, alias="requestedQuantityUnit")
    plant: str | None = None
    storageLocation: str | None = Field(default=None, alias="storageLocation")

    model_config = {"populate_by_name": True}


class SyncFromOrderItemsRequest(BaseModel):
    items: list[SalesOrderItemSyncInput]


class SyncFromOrderItemsResult(BaseModel):
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    totalMaterials: int = 0
