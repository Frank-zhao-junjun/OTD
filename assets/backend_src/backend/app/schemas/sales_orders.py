from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.schemas.materials import SyncFromOrderItemsResult


class SalesOrderItemDto(BaseModel):
    salesOrder: str
    salesOrderItem: str
    product: str | None = None
    salesOrderItemText: str | None = None
    requestedQuantity: float | None = None
    requestedQuantityUnit: str | None = None
    netAmount: float | None = None
    plant: str | None = None
    storageLocation: str | None = None
    deliveryStatus: str | None = None
    requestedDeliveryDate: str | None = None


class SalesOrderSummaryDto(BaseModel):
    salesOrder: str
    salesOrderType: str | None = None
    soldToParty: str | None = None
    salesOrganization: str | None = None
    distributionChannel: str | None = None
    organizationDivision: str | None = None
    billingCompanyCode: str | None = None
    salesOrderDate: str | None = None
    requestedDeliveryDate: str | None = None
    transactionCurrency: str | None = None
    totalNetAmount: float | None = None
    overallSdProcessStatus: str | None = None
    overallDeliveryStatus: str | None = None
    itemCount: int = 0


class SalesOrderDetailDto(SalesOrderSummaryDto):
    items: list[SalesOrderItemDto] = Field(default_factory=list)


class SalesOrderSyncResult(BaseModel):
    source: str
    ordersFetched: int = 0
    itemsExtracted: int = 0
    materialsSynced: bool = True
    materials: SyncFromOrderItemsResult | None = None
    syncedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    filterExpression: str | None = None
