from typing import Any

from pydantic import BaseModel, Field


class CustomerSalesAreaDto(BaseModel):
    customerCode: str
    salesOrganization: str
    distributionChannel: str
    division: str
    salesArea: str
    currency: str | None = None
    customerPaymentTerms: str | None = None
    customerAccountAssignmentGroup: str | None = None
    shippingCondition: str | None = None
    incotermsClassification: str | None = None
    supplyingPlant: str | None = None
    salesDistrict: str | None = None
    customerGroup: str | None = None
    deletionIndicator: bool = False


class CustomerCompanyDto(BaseModel):
    customerCode: str
    companyCode: str
    paymentTerms: str | None = None
    reconciliationAccount: str | None = None
    customerAccountGroup: str | None = None
    paymentBlockingReason: str | None = None
    deletionIndicator: bool = False


class CustomerAddressDto(BaseModel):
    businessPartner: str
    addressId: str
    fullName: str | None = None
    country: str | None = None
    region: str | None = None
    cityName: str | None = None
    streetName: str | None = None
    postalCode: str | None = None
    language: str | None = None


class CustomerSummaryDto(BaseModel):
    customerCode: str
    customerName: str | None = None
    customerFullName: str | None = None
    customerAccountGroup: str | None = None
    companyCode: str | None = None
    salesArea: str | None = None
    currency: str | None = None
    customerPaymentTerms: str | None = None
    salesDistrict: str | None = None
    country: str | None = None
    cityName: str | None = None
    creditStatus: str = "正常"
    postingBlocked: bool = False
    deletionIndicator: bool = False
    createdByUser: str | None = None
    creationDate: str | None = None


class CustomerDetailDto(CustomerSummaryDto):
    bpCustomerName: str | None = None
    customerClassification: str | None = None
    industry: str | None = None
    vatRegistration: str | None = None
    orderBlocked: str | None = None
    billingBlocked: str | None = None
    deliveryBlocked: str | None = None
    salesAreas: list[CustomerSalesAreaDto] = Field(default_factory=list)
    companies: list[CustomerCompanyDto] = Field(default_factory=list)
    addresses: list[CustomerAddressDto] = Field(default_factory=list)


class CustomerFullDto(CustomerDetailDto):
    """Portal view plus complete SAP A_Customer payload and expanded relations."""

    sapCustomer: dict[str, Any] = Field(default_factory=dict)
    sapSalesAreas: list[dict[str, Any]] = Field(default_factory=list)
    sapCompanies: list[dict[str, Any]] = Field(default_factory=list)
    sapAddresses: list[dict[str, Any]] = Field(default_factory=list)
