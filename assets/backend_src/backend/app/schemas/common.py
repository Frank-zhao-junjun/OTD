from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Pagination(BaseModel):
    page: int
    pageSize: int
    total: int


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    pagination: Pagination | None = None


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class CustomerQuery(BaseModel):
    company_code: str = Field(default="1010", alias="companyCode")
    sales_organization: str = Field(default="1010", alias="salesOrganization")
    distribution_channel: str = Field(default="10", alias="distributionChannel")
    division: str = Field(default="00", alias="division")
    customer_code: str | None = Field(default=None, alias="customerCode")
    customer_name: str | None = Field(default=None, alias="customerName")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100, alias="pageSize")

    model_config = {"populate_by_name": True}
