from pydantic import BaseModel, Field


class SalesOrderPortalLineDto(BaseModel):
    salesOrder: str
    salesOrderItem: str
    salesOrderLine: str
    customerCode: str | None = None
    customerName: str | None = None
    product: str | None = None
    productName: str | None = None
    quantity: float = 0
    unit: str | None = None
    amount: float = 0
    currency: str | None = "CNY"
    orderDate: str | None = None
    requestedDeliveryDate: str | None = None
    status: str = "订单确认"
    deliveryStatus: str = "未发货"
    billingStatus: str = "未开票"
    overallSdProcessStatus: str | None = None
    overallDeliveryStatus: str | None = None


class SalesOrderPortalDetailDto(BaseModel):
    header: SalesOrderPortalLineDto
    items: list[SalesOrderPortalLineDto] = Field(default_factory=list)
