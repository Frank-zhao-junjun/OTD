from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    sap_base_url: str = "https://my200967-api.s4hana.sapcloud.cn"
    sap_client: str = "100"
    sap_username: str = "EPC_USER"
    sap_password: str = ""
    sap_bp_path: str = "/sap/opu/odata/sap/API_BUSINESS_PARTNER/"
    sap_stock_path: str = "/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/"
    sap_so_path: str = "/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/"
    sap_po_path: str = "/sap/opu/odata4/sap/api_productionorder/srvd_a2x/sap/productionorder/0001/"
    sap_od_path: str = "/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=0002/"
    sap_billing_path: str = "/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/"
    sap_matdoc_path: str = "/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/"
    sap_confirmation_path: str = "/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/"
    sap_product_path: str = "/sap/opu/odata/sap/API_PRODUCT_SRV/"
    default_sales_order_type: str = "OR"
    od_sync_sample_path: str = str(
        Path(__file__).resolve().parent.parent.parent
        / "接口"
        / "Outbound Delivery"
        / "OutboundDelivery sync sample.json"
    )
    billing_sync_sample_path: str = str(
        Path(__file__).resolve().parent.parent.parent
        / "接口"
        / "Billing Document"
        / "BillingDocument sync sample.json"
    )
    matdoc_sync_sample_path: str = str(
        Path(__file__).resolve().parent.parent.parent
        / "接口"
        / "Material Document"
        / "MaterialDocument sync sample.json"
    )
    confirmation_sync_sample_path: str = str(
        Path(__file__).resolve().parent.parent.parent
        / "接口"
        / "Production Confirmation"
        / "ProductionConfirmation sync sample.json"
    )
    so_sync_sample_path: str = str(
        Path(__file__).resolve().parent.parent.parent
        / "接口"
        / "Sales Order"
        / "SalesOrder sync sample.json"
    )

    so_default_select: str = (
        "SalesOrder,SalesOrderType,SoldToParty,"
        "SalesOrganization,DistributionChannel,OrganizationDivision,"
        "SalesOffice,SalesGroup,SalesDistrict,"
        "CreatedByUser,CreationDate,CreationTime,LastChangeDateTime,LastChangedByUser,"
        "PurchaseOrderByCustomer,PurchaseOrderByShipToParty,"
        "CustomerPurchaseOrderType,CustomerPurchaseOrderDate,"
        "CorrespncExternalReference,CorrespncExtRefByShipToParty,"
        "ReferenceSDDocument,"
        "SalesOrderDate,RequestedDeliveryDate,PricingDate,"
        "ServicesRenderedDate,BillingDocumentDate,"
        "TotalNetAmount,TransactionCurrency,"
        "CompleteDeliveryIsDefined,ShippingType,ReceivingPoint,"
        "HeaderBillingBlockReason,DeliveryBlockReason,"
        "OverallSDProcessStatus,OverallPurchaseConfStatus,"
        "OverallDeliveryBlockStatus,OverallBillingBlockStatus,"
        "OverallDeliveryStatus,TotalCreditCheckStatus,"
        "OverallSDDocumentRejectionSts,TotalBlockStatus,"
        "HdrGeneralIncompletionStatus,OvrlItmGeneralIncompletionSts,"
        "OverallOrdReltdBillgStatus"
    )

    default_company_code: str = "1010"
    default_sales_organization: str = "1010"
    default_distribution_channel: str = "10"
    default_division: str = "00"
    default_plant: str = "1010"
    default_storage_location: str = "1003"

    portal_host: str = "0.0.0.0"
    portal_port: int = 8080
    db_path: str = str(Path(__file__).resolve().parent.parent / "data" / "portal.db")


settings = Settings()
