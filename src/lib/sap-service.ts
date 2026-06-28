/**
 * SAP OData API Service Library
 * Provides unified interface for SAP ERP data queries
 * Supports both V2 and V4 OData endpoints
 */

// Unified service-name-to-path map 閳?SINGLE SOURCE OF TRUTH for all SAP API routing.
// V2 services use /sap/opu/odata/sap/ prefix; V4 use /sap/opu/odata4/sap/

// Default business filters (from Python backend config)
export const SAP_DEFAULTS = {
  salesOrganization: '1010',
  distributionChannel: '10',
  division: '00',
  companyCode: '1010',
  plant: '1010',
  storageLocation: '1003',
  salesOrderType: 'OR',
};

// Query options type
export interface SapQueryOptions {
  top?: number;       // $top - limit results
  skip?: number;      // $skip - pagination offset
  filter?: string;    // $filter - OData filter expression
  select?: string;    // $select - select specific fields
  orderby?: string;   // $orderby - sort results
  expand?: string;    // $expand - expand related entities
  format?: 'json' | 'xml'; // $format - response format
  count?: boolean;    // $count - include total count (V4)
}

// Build OData query string
export function buildODataQuery(options: SapQueryOptions, version: 'v2' | 'v4' = 'v2'): string {
  const params: string[] = [];

  if (options.top) params.push(`$top=${options.top}`);
  if (options.skip) params.push(`$skip=${options.skip}`);
  if (options.filter) params.push(`$filter=${encodeURIComponent(options.filter)}`);
  if (options.select) params.push(`$select=${options.select}`);
  if (options.orderby) params.push(`$orderby=${options.orderby}`);
  if (options.expand) params.push(`$expand=${encodeURIComponent(options.expand)}`);
  if (options.format) params.push(`$format=${options.format}`);
  if (version === 'v4' && options.count) params.push('$count=true');

  return params.length > 0 ? '?' + params.join('&') : '';
}

/**
 * Build the sell-from-stock default filter for sales orders
 * Matches Python backend: SalesOrderType='OR' AND SalesOrganization='1010' etc.
 */
export function buildSellFromStockFilter(overrides?: {
  salesOrderType?: string;
  salesOrganization?: string;
  distributionChannel?: string;
  organizationDivision?: string;
}): string {
  const sot = overrides?.salesOrderType || SAP_DEFAULTS.salesOrderType;
  const so = overrides?.salesOrganization || SAP_DEFAULTS.salesOrganization;
  const dc = overrides?.distributionChannel || SAP_DEFAULTS.distributionChannel;
  const div = overrides?.organizationDivision || SAP_DEFAULTS.division;
  return (
    `SalesOrderType eq '${sot}'` +
    ` and SalesOrganization eq '${so}'` +
    ` and DistributionChannel eq '${dc}'` +
    ` and OrganizationDivision eq '${div}'`
  );
}

// SAP API response wrapper
export interface SapApiResponse<T> {
  success: boolean;
  data?: T[];
  count?: number;
  error?: string;
}

// Common SAP field labels (Chinese) 閳?ALL fields verified against real SAP S/4HANA Cloud responses
export const SAP_FIELD_LABELS = {
  // === Product fields (V2: API_PRODUCT_SRV/A_Product) ===
  Product: '产品编号',
  ProductDescription: '产品描述',
  ProductGroup: '物料组',
  ProductType: '产品类型',
  BaseUnit: '基本单位',
  CreationDate: '创建日期',
  GrossWeight: '毛重',
  NetWeight: '净重',
  WeightUnit: '重量单位',
  IsMarkedForDeletion: '删除标记',
  CrossPlantStatus: '跨工厂状态',
  CreatedByUser: '创建人',
  // Product Plant expand fields
  Plant: '工厂',
  MRPType: 'MRP类型',
  ProductionInvtryManagedLoc: '生产库存地点',
  ProcurementType: '采购类型',
  ProfitCenter: '利润中心',
  AvailabilityCheckType: '可用性检查',
  PurchasingGroup: '采购组',
  CountryOfOrigin: '原产国',
  RegionOfOrigin: '原产地',
  IsBatchManagementRequired: '批次管理',
  // Product SalesDelivery expand fields
  ProductSalesOrg: '销售组织',
  ProductDistributionChnl: '分销渠道',
  ProductSalesStatus: '销售状态',
  MinimumOrderQuantity: '最小订单量',
  SalesMeasureUnit: '销售单位',
  SupplyingPlant: '供应工厂',
  Language: '语言',
  // Product Valuation expand fields
  ValuationArea: '评估范围',
  ValuationClass: '评估类',
  StandardPrice: '标准价格',
  MovingAveragePrice: '移动平均价',
  PriceUnitQty: '价格单位',
  Currency: '货币',

  // === Sales Order fields (V4: CE_SALESORDER_0001/SalesOrder) ===
  SalesOrder: '销售订单号',
  SalesOrderType: '订单类型',
  SoldToParty: '售达方',
  TotalNetAmount: '总金额',
  TransactionCurrency: '货币',
  SalesOrderDate: '订单日期',
  DistributionChannel: '分销渠道',
  SalesOrganization: '销售组织',
  OrganizationDivision: '产品组',
  OverallSDProcessStatus: '处理状态',
  PurchaseOrderByCustomer: '客户采购订单',

  // === Production Order fields (V4: CE_PRODUCTIONORDER_0001/ProductionOrder) ===
  ProductionOrder: '生产订单号',
  ProductionOrderType: '订单类型',
  // IsMarkedForDeletion — already defined in Product section
  IsCompletelyDelivered: '完全交货',
  // Product — already defined in Product section (物料号/产品编号)
  ProductionPlant: '生产工厂',
  // SalesOrder — already defined in Sales Order section
  SalesOrderItem: '销售订单行',
  OrderPlannedTotalQty: '计划数量',
  ActualDeliveredQuantity: '实际交货数量',
  OrderScheduledStartDate: '计划开始日期',
  OrderScheduledEndDate: '计划结束日期',
  OrderActualStartDate: '实际开始日期',
  OrderActualEndDate: '实际结束日期',
  OrderActualReleaseDate: '实际释放日期',
  TechnicalCompletionDate: '技术完成日期',

  // === Material Stock fields (V2: API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod) ===
  Material: '物料号',
  StorageLocation: '存储位置',
  Batch: '批次',
  InventoryStockType: '库存类型',
  MatlWrhsStkQtyInMatlBaseUnit: '库存数量',
  MaterialBaseUnit: '单位',

  // === Customer fields (V2: API_BUSINESS_PARTNER/A_Customer) ===
  Customer: '客户编号',
  CustomerName: '客户名称',
  CustomerFullName: '客户全名',
  CustomerAccountGroup: '账户组',
  CustomerCorporateGroup: '企业集团',
  Industry: '行业',
  Supplier: '供应商',
  CityName: '城市',
  Country: '国家/地区',
  Region: '地区',
  BusinessPartnerType: '业务伙伴类型',
  BusinessPartnerCategory: '业务伙伴类别',
  IsMarkedForArchiving: '归档标记',

  // === Outbound Delivery fields (V2: API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader) ===
  DeliveryDocument: '交货单号',
  DeliveryDocumentType: '交货类型',
  DeliveryDate: '交货日期',
  // SoldToParty — already defined in Sales Order section
  ShipToParty: '送达方',
  ActualGoodsMovementDate: '实际发货日期',
  OverallGoodsMovementStatus: '货物移动状态',
  // OverallSDProcessStatus — already defined in Sales Order section
  ShippingPoint: '装运点',
  SalesOffice: '销售办公室',
  // TransactionCurrency — already defined in Sales Order section
  IncotermsClassification: '国际贸易条款',

  // === Billing Document fields (V2: API_BILLING_DOCUMENT_SRV/A_BillingDocument) ===
  BillingDocument: '开票单号',
  BillingDocumentType: '开票类型',
  BillingDocumentDate: '开票日期',
  // TotalNetAmount — already defined in Sales Order section
  OverallBillingStatus: '开票状态',
  AccountingPostingStatus: '过账状态',
  CompanyCode: '公司代码',
  Division: '产品组',
  // DistributionChannel — already defined in Sales Order section
  CreationTime: '创建时间',
  LastChangeDate: '最后修改日期',

  // === Material Document fields (V2: API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem) ===
  MaterialDocument: '物料凭证号',
  MaterialDocumentYear: '年度',
  MaterialDocumentItem: '行号',
  DocumentDate: '凭证日期',
  PostingDate: '过账日期',
  GoodsMovementType: '移动类型',
  QuantityInBaseUnit: '数量',
  GoodsRecipientName: '收货人',
  ManufacturingOrder: '生产订单',
  PurchaseOrder: '采购订单',
  PurchaseOrderItem: '采购订单行',
  CostCenter: '成本中心',
  // ProfitCenter — already defined in Product section
} as const;

// Default $select fields per service:entity (reduces response payload)
export const SAP_DEFAULT_SELECTS: Record<string, string> = {
  // Production Order (V4) — user-specified field set + UI-needed fields
  'CE_PRODUCTIONORDER_0001:ProductionOrder':
    'ProductionOrder,IsMarkedForDeletion,IsCompletelyDelivered,Product,ProductionPlant,SalesOrder,SalesOrderItem,OrderPlannedTotalQty,ActualDeliveredQuantity,ProductionOrderType,OrderScheduledStartDate,OrderScheduledEndDate,OrderActualStartDate,OrderActualEndDate,OrderActualReleaseDate,TechnicalCompletionDate,_Component,_Operation,_Sequence,_PostingRule',
  'API_SALES_ORDER_SRV:A_SalesOrder':
    'SalesOrder,SalesOrderType,SalesOrganization,DistributionChannel,OrganizationDivision,SoldToParty,PurchaseOrderByCustomer,SalesOrderDate,TotalNetAmount,TransactionCurrency,OverallSDProcessStatus,CreatedByUser',
  // Sales Order (V4) — DEPRECATED: SalesOrderType returns internal code instead of business type
  'CE_SALESORDER_0001:SalesOrder':
    'SalesOrder,SalesOrderType,SalesOrganization,DistributionChannel,OrganizationDivision,SoldToParty,PurchaseOrderByCustomer,SalesOrderDate,TotalNetAmount,TransactionCurrency,OverallSDProcessStatus',
  // Products (V2) — $select only basic fields; $expand fetches description & plant
  'API_PRODUCT_SRV:A_Product':
    'Product,ProductType,ProductGroup,BaseUnit,WeightUnit,GrossWeight,NetWeight,IsMarkedForDeletion,CrossPlantStatus,CreatedByUser,CreationDate',
  // Customers (V2)
  'API_BUSINESS_PARTNER:A_Customer':
    'Customer,CustomerName,CustomerFullName,BPCustomerName,BPCustomerFullName,CustomerAccountGroup,CreationDate,CustomerCorporateGroup,Industry,Supplier',
  // Material Stock (V2)
  'API_MATERIAL_STOCK_SRV:A_MatlStkInAcctMod':
    'Material,Plant,StorageLocation,Batch,InventoryStockType,MaterialBaseUnit,MatlWrhsStkQtyInMatlBaseUnit',
  // Outbound Delivery (V2)
  'API_OUTBOUND_DELIVERY_SRV:A_OutbDeliveryHeader':
    'DeliveryDocument,SoldToParty,ShipToParty,DeliveryDate,DeliveryDocumentType,OverallGoodsMovementStatus,OverallSDProcessStatus,SalesOrganization,ShippingPoint,ActualGoodsMovementDate,SalesOffice,IncotermsClassification',
  // Billing Document (V2)
  'API_BILLING_DOCUMENT_SRV:A_BillingDocument':
    'BillingDocument,SoldToParty,BillingDocumentDate,BillingDocumentType,TotalNetAmount,TransactionCurrency,OverallBillingStatus,AccountingPostingStatus,SalesOrganization,CompanyCode,Division,DistributionChannel,CreationTime,LastChangeDate',
  // Material Document (V2)
  'API_MATERIAL_DOCUMENT_SRV:A_MaterialDocumentItem':
    'MaterialDocument,MaterialDocumentYear,MaterialDocumentItem,Material,Plant,StorageLocation,GoodsMovementType,QuantityInBaseUnit,MaterialBaseUnit,GoodsRecipientName,ManufacturingOrder,Batch,PurchaseOrder,PurchaseOrderItem,CostCenter,ProfitCenter',
  'API_MATERIAL_DOCUMENT_SRV:A_MaterialDocumentHeader':
    'MaterialDocumentYear,MaterialDocument,DocumentDate,PostingDate,MaterialDocumentHeaderText',
};

// Default $expand per service:entity (SAP navigation properties)
export const SAP_DEFAULT_EXPANDS: Record<string, string> = {
  // Products (V2) — expand description (ZH name) and plant (MRP/production info)
  'API_PRODUCT_SRV:A_Product': 'to_Description,to_Plant,to_SalesDelivery,to_Valuation',
  // Production Order (V4) — expand components, operations, sequences, posting rules
  'CE_PRODUCTIONORDER_0001:ProductionOrder': '_Component,_Operation,_Sequence,_PostingRule',
};

// Status display helpers
export const SALES_ORDER_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'A': { label: '开放', variant: 'outline' },
  'B': { label: '处理中', variant: 'secondary' },
  'C': { label: '已完成', variant: 'default' },
  'X': { label: '已取消', variant: 'outline' },
  'D': { label: '已关闭', variant: 'outline' },
};

export const PRODUCTION_ORDER_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'CRTD': { label: '已创建', variant: 'outline' },
  'REL': { label: '已释放', variant: 'default' },
  'PCNF': { label: '部分确认', variant: 'secondary' },
  'CNF': { label: '已确认', variant: 'default' },
  'PDLV': { label: '部分交货', variant: 'secondary' },
  'DLV': { label: '已交货', variant: 'default' },
  'TECO': { label: '技术完成', variant: 'outline' },
  'CLSD': { label: '已关闭', variant: 'outline' },
  'DLFL': { label: '已删除', variant: 'destructive' },
};

/** Service name → SAP OData path prefix. Single source of truth for API proxy routing. */
export const SERVICE_PATH_MAP: Record<string, string> = {
  'API_PRODUCT_SRV': '/sap/opu/odata/sap/API_PRODUCT_SRV/',
  'API_BUSINESS_PARTNER': '/sap/opu/odata/sap/API_BUSINESS_PARTNER/',
  'API_SALES_ORDER_SRV': '/sap/opu/odata/sap/API_SALES_ORDER_SRV/',
  'API_PRODUCTION_ORDER_2_SRV': '/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/',
  'API_MATERIAL_STOCK_SRV': '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/',
  'API_OUTBOUND_DELIVERY_SRV': '/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=0002/',
  'API_BILLING_DOCUMENT_SRV': '/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/',
  'API_MATERIAL_DOCUMENT_SRV': '/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/',
  'API_PROD_ORDER_CONFIRMATION_2_SRV': '/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/',
  'CE_SALESORDER_0001': '/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/',
  'CE_PRODUCTIONORDER_0001': '/sap/opu/odata4/sap/api_productionorder/srvd_a2x/sap/productionorder/0001/',
};
