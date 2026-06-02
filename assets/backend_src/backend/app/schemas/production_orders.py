"""Pydantic schemas for SAP Production Order API (CE_PRODUCTIONORDER_0001)."""

from __future__ import annotations

from datetime import date, datetime, time
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
#  Common
# ---------------------------------------------------------------------------

class SapMessage(BaseModel):
    """SAP message embedded in entity responses."""
    code: str | None = Field(None, alias="code")
    message: str | None = Field(None, alias="message")
    number: str | None = Field(None, alias="number")
    log_no: str | None = Field(None, alias="log_no")
    log_msg_no: str | None = Field(None, alias="log_msg_no")
    message_v1: str | None = Field(None, alias="message_v1")
    message_v2: str | None = Field(None, alias="message_v2")
    message_v3: str | None = Field(None, alias="message_v3")
    message_v4: str | None = Field(None, alias="message_v4")
    parameter: str | None = Field(None, alias="parameter")
    row: int | None = Field(None, alias="row")
    field: str | None = Field(None, alias="field")
    system: str | None = Field(None, alias="system")

    model_config = {"populate_by_name": True, "extra": "allow"}


# ---------------------------------------------------------------------------
#  Production Order Header
# ---------------------------------------------------------------------------

class ProductionOrderBase(BaseModel):
    """Core production order fields (subset of the full SAP schema)."""
    ProductionOrder: str | None = None
    ProductionOrderText: str | None = None
    ProductionOrderType: str | None = None
    Product: str | None = None
    ProductionPlant: str | None = None
    PlanningPlant: str | None = None
    MRPArea: str | None = None
    MRPController: str | None = None
    ProductionSupervisor: str | None = None
    ProductionVersion: str | None = None
    Currency: str | None = None
    ProductionSAPUnit: str | None = None
    ProductionISOUnit: str | None = None
    OrderPlannedTotalQty: float | None = None
    OrderPlannedScrapQty: float | None = None
    OrderConfirmedYieldQty: float | None = None
    OrderConfirmedScrapQty: float | None = None
    OrderConfirmedReworkQty: float | None = None
    ExpectedDeviationQuantity: float | None = None
    ActualDeliveredQuantity: float | None = None
    OrderImportance: str | None = None
    IsMarkedForDeletion: bool | None = None
    IsCompletelyDelivered: bool | None = None
    OrderHasMultipleItems: bool | None = None
    OrderIsPartOfCollectiveOrder: bool | None = None
    OrderIsNotCostedAutomatically: bool | None = None
    OrdIsNotSchedldAutomatically: bool | None = None
    CompanyCode: str | None = None
    BusinessArea: str | None = None
    ControllingArea: str | None = None
    ProfitCenter: str | None = None
    CostCenter: str | None = None
    ResponsibleCostCenter: str | None = None
    CostElement: str | None = None
    CostingSheet: str | None = None
    FunctionalArea: str | None = None
    OverheadCode: str | None = None
    VarianceKey: str | None = None
    EventBasedProcessingKey: str | None = None
    EventBasedPostingMethod: str | None = None
    SchedulingFloatProfile: str | None = None
    FloatBeforeProductionInWrkDays: float | None = None
    FloatAfterProductionInWorkDays: float | None = None
    ReleasePeriodInWorkDays: float | None = None
    OrderPlannedStartDate: date | None = None
    OrderPlannedEndDate: date | None = None
    PlannedReleaseDate: date | None = None
    OrderScheduledStartDate: date | None = None
    OrderScheduledEndDate: date | None = None
    OrderScheduledReleaseDate: date | None = None
    OrderActualStartDate: date | None = None
    OrderActualEndDate: date | None = None
    OrderActualReleaseDate: date | None = None
    OrderConfirmedEndDate: date | None = None
    TotalCommitmentDate: date | None = None
    TechnicalCompletionDate: date | None = None
    ProductionPlantTimeZone: str | None = None
    BillOfOperationsType: str | None = None
    BillOfOperationsGroup: str | None = None
    BillOfOperationsVariant: str | None = None
    BillOfOperationsUsage: str | None = None
    BillOfMaterialCategory: str | None = None
    BillOfMaterialInternalID: str | None = None
    BillOfMaterialVariant: str | None = None
    BillOfMaterialVariantUsage: str | None = None
    BasicSchedulingType: str | None = None
    ForecastSchedulingType: str | None = None
    SchedulingIsAllowingForBreaks: bool | None = None
    SalesOrder: str | None = None
    SalesOrderItem: str | None = None
    WBSElementInternalID: str | None = None
    ReferenceOrder: str | None = None
    LeadingOrder: str | None = None
    SuperiorOrder: str | None = None
    PlannedOrder: str | None = None
    CapacityRequirement: str | None = None
    InspectionLot: str | None = None
    ChangeNumber: str | None = None
    SettlementReservation: str | None = None
    OrderConfirmationGroup: str | None = None
    NumberOfOrderConfirmations: int | None = None
    ProductConfiguration: str | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


class ProductionOrderCreate(ProductionOrderBase):
    """Schema for creating a production order."""
    ProductionOrderType: str
    Product: str
    ProductionPlant: str
    OrderPlannedTotalQty: float
    ProductionSAPUnit: str


class ProductionOrderUpdate(BaseModel):
    """Schema for updating a production order (all fields optional)."""
    ProductionOrderText: str | None = None
    ProductionPlant: str | None = None
    ProductionSAPUnit: str | None = None
    ProductionISOUnit: str | None = None
    OrderPlannedTotalQty: float | None = None
    OrderPlannedScrapQty: float | None = None
    MRPController: str | None = None
    ProductionSupervisor: str | None = None
    ProfitCenter: str | None = None
    CostCenter: str | None = None
    ResponsibleCostCenter: str | None = None
    BusinessArea: str | None = None
    FunctionalArea: str | None = None
    OrderPlannedStartDate: date | None = None
    OrderPlannedEndDate: date | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


# ---------------------------------------------------------------------------
#  Production Order Item
# ---------------------------------------------------------------------------

class ProductionOrderItemBase(BaseModel):
    ProductionOrder: str | None = None
    ProductionOrderItem: str | None = None
    ProductionOrderType: str | None = None
    Product: str | None = None
    ProductionPlant: str | None = None
    PlanningPlant: str | None = None
    ProductionVersion: str | None = None
    MRPArea: str | None = None
    SalesOrder: str | None = None
    SalesOrderItem: str | None = None
    SalesOrderScheduleLine: str | None = None
    OrderIsReleased: bool | None = None
    IsMarkedForDeletion: bool | None = None
    IsCompletelyDelivered: bool | None = None
    GoodsReceiptIsExpected: bool | None = None
    GoodsReceiptIsNonValuated: bool | None = None
    UnlimitedOverdeliveryIsAllowed: bool | None = None
    ProductionSAPUnit: str | None = None
    ProductionISOUnit: str | None = None
    PlannedTotalQty: float | None = None
    PlannedScrapQuantity: float | None = None
    PlannedYieldQuantity: float | None = None
    GoodsReceiptQty: float | None = None
    ActualDeviationQty: float | None = None
    OpenYieldQuantity: float | None = None
    StorageLocation: str | None = None
    Batch: str | None = None
    SerialNumberProfile: str | None = None
    NumberOfSerialNumbers: int | None = None
    PlannedEndDate: date | None = None
    ScheduledEndDate: date | None = None
    PlannedDeliveryDate: date | None = None
    ActualDeliveryDate: date | None = None
    TotalCommitmentDate: date | None = None
    UnderdelivTolrtdLmtRatioInPct: float | None = None
    OverdelivTolrtdLmtRatioInPct: float | None = None
    MaterialGoodsReceiptDuration: float | None = None
    ConsumptionPosting: str | None = None
    GoodsRecipientName: str | None = None
    UnloadingPointName: str | None = None
    AccountAssignmentCategory: str | None = None
    BusinessArea: str | None = None
    BillOfMaterialItemNumber: str | None = None
    BillOfMaterialItemCategory: str | None = None
    Plant: str | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


class ProductionOrderItemCreate(ProductionOrderItemBase):
    ProductionOrderItem: str
    Product: str


class ProductionOrderItemUpdate(BaseModel):
    Product: str | None = None
    ProductionPlant: str | None = None
    PlannedTotalQty: float | None = None
    PlannedScrapQuantity: float | None = None
    StorageLocation: str | None = None
    Batch: str | None = None
    IsMarkedForDeletion: bool | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


# ---------------------------------------------------------------------------
#  Production Order Operation
# ---------------------------------------------------------------------------

class ProductionOrderOperationBase(BaseModel):
    OrderInternalID: str | None = None
    OrderOperationInternalID: str | None = None
    ProductionOrder: str | None = None
    ProductionOrderSequence: str | None = None
    ProductionOrderOperation: str | None = None
    OperationText: str | None = None
    OperationStandardTextCode: str | None = None
    Plant: str | None = None
    WorkCenter: str | None = None
    OperationControlProfile: str | None = None
    OperationConfirmation: str | None = None
    ChangeNumber: str | None = None
    Reservation: str | None = None
    NumberOfConfirmationSlips: int | None = None
    NumberOfTimeTickets: int | None = None
    FactoryCalendar: str | None = None
    CapacityRequirement: str | None = None
    OperationSetupGroupCategory: str | None = None
    OperationSetupGroup: str | None = None
    OperationSetupType: str | None = None
    ExtProcgOperationHasSubcontrg: bool | None = None
    PurchasingInfoRecord: str | None = None
    Supplier: str | None = None
    CostElement: str | None = None
    PurchasingOrganization: str | None = None
    PurchasingGroup: str | None = None
    InspectionLotType: str | None = None
    OpPlannedSetupDurn: float | None = None
    OpPlannedProcessingDurn: float | None = None
    OpPlannedTeardownDurn: float | None = None
    PlannedSetupDurnSAPUnit: str | None = None
    PlannedProcgDurnSAPUnit: str | None = None
    PlannedTeardownDurnSAPUnit: str | None = None
    OperationSAPUnit: str | None = None
    OperationISOUnit: str | None = None
    OperationScrapPercent: float | None = None
    OperationReferenceQuantity: float | None = None
    OpPlannedTotalQuantity: float | None = None
    OpPlannedScrapQuantity: float | None = None
    OpTotalConfirmedYieldQty: float | None = None
    OpTotalConfirmedScrapQty: float | None = None
    OperationConfirmedReworkQty: float | None = None
    LeadTimeReductionStrategy: str | None = None
    OpSchedldReductionLevel: int | None = None
    NumberOfOperationConfirmations: int | None = None
    OperationSplitIsRequired: bool | None = None
    MaximumNumberOfSplits: int | None = None
    ActualNumberOfSplits: int | None = None
    MinProcessingDurationPerSplit: float | None = None
    OverlapMinimumDuration: float | None = None
    OverlapMinimumTransferQty: float | None = None
    BusinessProcess: str | None = None
    BusinessProcessConfirmedQty: float | None = None
    NoFurtherBusinessProcQtyIsExpd: bool | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


class ProductionOrderOperationCreate(ProductionOrderOperationBase):
    ProductionOrderOperation: str
    Plant: str
    WorkCenter: str


class ProductionOrderOperationUpdate(BaseModel):
    OperationText: str | None = None
    WorkCenter: str | None = None
    OperationControlProfile: str | None = None
    OpPlannedSetupDurn: float | None = None
    OpPlannedProcessingDurn: float | None = None
    OpPlannedTeardownDurn: float | None = None
    OperationScrapPercent: float | None = None
    OperationReferenceQuantity: float | None = None
    OpPlannedTotalQuantity: float | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


# ---------------------------------------------------------------------------
#  Production Order Sequence
# ---------------------------------------------------------------------------

class ProductionOrderSequenceBase(BaseModel):
    ProductionOrder: str | None = None
    ProductionOrderSequence: str | None = None
    OrderInternalID: str | None = None
    SequenceInternalID: str | None = None
    SequenceText: str | None = None
    SequenceBranchOperation: str | None = None
    SequenceReturnOperation: str | None = None
    SequenceCategory: str | None = None
    ReferenceSequence: str | None = None
    SequenceSchedulingAlignment: str | None = None
    BillOfOperationsSAPUnit: str | None = None
    BillOfOperationsISOUnit: str | None = None
    MinimumLotSizeQuantity: float | None = None
    MaximumLotSizeQuantity: float | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


class ProductionOrderSequenceCreate(ProductionOrderSequenceBase):
    ProductionOrderSequence: str


class ProductionOrderSequenceUpdate(BaseModel):
    SequenceText: str | None = None
    MinimumLotSizeQuantity: float | None = None
    MaximumLotSizeQuantity: float | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


# ---------------------------------------------------------------------------
#  Production Order Component
# ---------------------------------------------------------------------------

class ProductionOrderComponentBase(BaseModel):
    Reservation: str | None = None
    ReservationItem: str | None = None
    ReservationRecordType: str | None = None
    MaterialGroup: str | None = None
    Material: str | None = None
    Plant: str | None = None
    ProductionOrder: str | None = None
    ProductionOrderSequence: str | None = None
    ProductionOrderOperation: str | None = None
    OrderInternalID: str | None = None
    OrderOperationInternalID: str | None = None
    MaterialComponentText: str | None = None
    MaterialComponentSecondText: str | None = None
    MatlCompRequirementDate: date | None = None
    LatestRequirementDate: date | None = None
    RequiredQuantity: float | None = None
    WithdrawnQuantity: float | None = None
    ConfirmedAvailableQuantity: float | None = None
    MaterialCompOriginalQuantity: float | None = None
    BaseSAPUnit: str | None = None
    BaseISOUnit: str | None = None
    EntrySAPUnit: str | None = None
    EntryISOUnit: str | None = None
    GoodsMovementEntryQty: float | None = None
    StorageLocation: str | None = None
    Batch: str | None = None
    BatchSplitType: str | None = None
    GoodsMovementType: str | None = None
    InventorySpecialStockType: str | None = None
    ConsumptionPosting: str | None = None
    SupplyArea: str | None = None
    GoodsRecipientName: str | None = None
    UnloadingPointName: str | None = None
    BusinessArea: str | None = None
    GLAccount: str | None = None
    FunctionalArea: str | None = None
    AccountAssignmentCategory: str | None = None
    MatlCompIsMarkedForDeletion: bool | None = None
    MaterialComponentIsMissing: bool | None = None
    IsBulkMaterialComponent: bool | None = None
    MatlCompIsMarkedForBackflush: bool | None = None
    MatlCompIsTextItem: bool | None = None
    MatlCompIsConfigurable: bool | None = None
    QuantityIsFixed: bool | None = None
    IsNetScrap: bool | None = None
    ComponentScrapInPercent: float | None = None
    OperationScrapInPercent: float | None = None
    LeadTimeOffset: float | None = None
    OperationLeadTimeOffset: float | None = None
    BillOfMaterialItemNumber: str | None = None
    BillOfMaterialItemCategory: str | None = None
    SalesOrder: str | None = None
    SalesOrderItem: str | None = None
    PurchaseRequisition: str | None = None
    PurchaseRequisitionItem: str | None = None
    PurchaseOrder: str | None = None
    PurchaseOrderItem: str | None = None
    Supplier: str | None = None
    Currency: str | None = None
    WithdrawnQuantityAmount: float | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


# ---------------------------------------------------------------------------
#  Operation Capacity
# ---------------------------------------------------------------------------

class OperationCapacityBase(BaseModel):
    CapacityRequirement: str | None = None
    CapacityRequirementItem: str | None = None
    CapacityRqmtItemCapacity: str | None = None
    ProductionOrder: str | None = None
    OrderInternalID: str | None = None
    OrderOperationInternalID: str | None = None
    ProductionOrderType: str | None = None
    ProductionOrderSequence: str | None = None
    ProductionOrderOperation: str | None = None
    Plant: str | None = None
    WorkCenterInternalID: str | None = None
    WorkCenterTypeCode: str | None = None
    CapacityInternalID: str | None = None
    CapacityRequirementDistrKey: str | None = None
    ActualNumberOfSplits: int | None = None
    CapacityRequirementSplit: int | None = None
    CapacityRequirementSAPUnit: str | None = None
    CapacityRequirementISOUnit: str | None = None
    ScheduledCapReqOpSegSetupDurn: float | None = None
    RemainingCapReqOpSegSetupDurn: float | None = None
    ScheduledCapReqOpSegProcgDurn: float | None = None
    RemainingCapReqOpSegProcgDurn: float | None = None
    ScheduledCapReqOpSegTrdwnDurn: float | None = None
    RemainingCapReqOpSegTrdwnDurn: float | None = None
    OperationEarliestStartDate: date | None = None
    OperationEarliestStartTime: time | None = None
    OperationEarliestEndDate: date | None = None
    OperationEarliestEndTime: time | None = None
    OperationLatestStartDate: date | None = None
    OperationLatestStartTime: time | None = None
    OperationLatestEndDate: date | None = None
    OperationLatestEndTime: time | None = None
    ActualStartDate: date | None = None
    ActualStartTime: time | None = None
    ActualEndDate: date | None = None
    ActualEndTime: time | None = None
    ProductionPlantTimeZone: str | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


# ---------------------------------------------------------------------------
#  Posting Rule
# ---------------------------------------------------------------------------

class PostingRuleBase(BaseModel):
    EventBasedDistrPostingRuleUUID: str | None = None
    ProductionOrder: str | None = None
    OrderInternalID: str | None = None
    EventBasedPostingRule: str | None = None
    EventBasedPostingRuleText: str | None = None
    EventBasedDistributionRule: str | None = None
    EventBasedPostingRuleForUsage: str | None = None
    EventBasedPostingRuleIsActive: bool | None = None
    EventBasedPostingRuleType: str | None = None
    EventBasedPostingCostElement: str | None = None
    EventBasedPostingCostCenter: str | None = None
    EventBasedPostingBusinessArea: str | None = None
    EventBasedPostingProfitCenter: str | None = None
    EventBasedPostingFunctionalArea: str | None = None
    EventBasedPostingCompanyCode: str | None = None
    EventBasedPostingControllingArea: str | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


class PostingRuleCreate(PostingRuleBase):
    ProductionOrder: str


class PostingRuleUpdate(BaseModel):
    EventBasedPostingRuleIsActive: bool | None = None
    EventBasedPostingCostElement: str | None = None
    EventBasedPostingCostCenter: str | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


# ---------------------------------------------------------------------------
#  Serial Number
# ---------------------------------------------------------------------------

class SerialNumberBase(BaseModel):
    ProductionOrder: str | None = None
    ProductionOrderItem: str | None = None
    SerialNumber: str | None = None
    Product: str | None = None
    ProductionPlant: str | None = None
    ProductionOrderType: str | None = None
    SerialNumberProfile: str | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}


# ---------------------------------------------------------------------------
#  Variant Configuration
# ---------------------------------------------------------------------------

class VariantConfigurationBase(BaseModel):
    VarConfigurationBusObjectKey: str | None = None
    VarConfigurationBusObjectType: str | None = None
    VarConfignStatus: str | None = None
    LastChangeDateTime: datetime | None = None

    model_config = {"populate_by_name": True, "extra": "allow"}
