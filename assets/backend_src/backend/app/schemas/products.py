from pydantic import BaseModel


class ProductSummaryDto(BaseModel):
    product: str
    productType: str | None = None
    baseUnit: str | None = None
    productGroup: str | None = None
    description: str | None = None
