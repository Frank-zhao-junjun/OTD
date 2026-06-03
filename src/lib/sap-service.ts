/**
 * SAP OData API Service Library
 * Provides unified interface for SAP ERP data queries
 * Supports both V2 and V4 OData endpoints
 */

// API endpoint configuration — maps service name → SAP path prefix
// V2 services use: /sap/opu/odata/sap/{SERVICE_NAME}/
// V4 services use: /sap/opu/odata4/sap/{SERVICE_PATH}/
export const SAP_ENDPOINTS = {
  // V2 OData endpoints
  PRODUCT: {
    version: 'v2' as const,
    path: '/sap/opu/odata/sap/API_PRODUCT_SRV/',
  },
  BUSINESS_PARTNER: {
    version: 'v2' as const,
    path: '/sap/opu/odata/sap/API_BUSINESS_PARTNER/',
  },
  SALES_ORDER_V2: {
    version: 'v2' as const,
    path: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/',
  },
  MATERIAL_STOCK: {
    version: 'v2' as const,
    path: '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/',
  },
  OUTBOUND_DELIVERY: {
    version: 'v2' as const,
    path: '/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=0002/',
  },
  BILLING_DOCUMENT: {
    version: 'v2' as const,
    path: '/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/',
  },
  MATERIAL_DOCUMENT: {
    version: 'v2' as const,
    path: '/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/',
  },
  PRODUCTION_CONFIRMATION: {
    version: 'v2' as const,
    path: '/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/',
  },

  // V4 OData endpoints (used by Sales Order & Production Order)
  SALES_ORDER: {
    version: 'v4' as const,
    path: '/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/',
  },
  PRODUCTION_ORDER: {
    version: 'v4' as const,
    path: '/sap/opu/odata4/sap/api_productionorder/srvd_a2x/sap/productionorder/0001/',
  },
} as const;

// V4 entity set names (different from V2 which uses A_ prefix)
export const SAP_ENTITY_SETS = {
  // V2 entity sets (A_ prefix)
  PRODUCT: ['A_Product', 'A_ProductDescription'],
  BUSINESS_PARTNER: ['A_BusinessPartner', 'A_Customer', 'A_CustomerSalesArea'],
  SALES_ORDER_V2: ['A_SalesOrder', 'A_SalesOrderItem'],
  MATERIAL_STOCK: ['A_MatlStkInAcctMod'],
  OUTBOUND_DELIVERY: ['A_OutbDeliveryHeader', 'A_OutbDeliveryItem'],
  BILLING_DOCUMENT: ['A_BillingDocument', 'A_BillingDocumentItem'],
  MATERIAL_DOCUMENT: ['A_MaterialDocumentItem'],
  PRODUCTION_CONFIRMATION: ['A_ProdOrderConf'],

  // V4 entity sets (no A_ prefix)
  SALES_ORDER: ['SalesOrder', 'SalesOrderItem', 'SalesOrderScheduleLine', 'SalesOrderPartner'],
  PRODUCTION_ORDER: ['ProductionOrder', 'ProductionOrderItem', 'ProductionOrderOperation'],
} as const;

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

// Common SAP field labels (Chinese)
export const SAP_FIELD_LABELS = {
  // Product fields
  Product: '产品编号',
  ProductDescription: '产品描述',
  ProductGroup: '物料组',
  ProductType: '产品类型',
  BaseUnit: '基本单位',
  CreationDate: '创建日期',

  // Sales Order fields
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
  OverallDeliveryStatus: '交货状态',
  OverallBillingStatus: '开票状态',
  RequestedDeliveryDate: '要求交货日期',
  PurchaseOrderByCustomer: '客户采购订单',

  // Production Order fields
  ProductionOrder: '生产订单号',
  Material: '物料号',
  PlannedTotalQty: '计划数量',
  ManufacturingOrderType: '订单类型',
  ProductionPlant: '生产工厂',
  ProductionOrderStatus: '状态',
  OrderStartDate: '开始日期',
  OrderEndDate: '结束日期',
  MfgOrderPlannedStartDate: '计划开始日期',
  MfgOrderPlannedEndDate: '计划结束日期',

  // Stock fields
  Plant: '工厂',
  StorageLocation: '存储位置',
  Batch: '批次',
  MatlWrhsStkQtyInMatlBaseUnit: '库存数量',
  MaterialBaseUnit: '单位',

  // Customer fields
  Customer: '客户编号',
  CustomerName: '客户名称',
  Country: '国家',
  CityName: '城市',

  // Outbound Delivery fields
  OutboundDelivery: '交货单号',
  DeliveryDate: '交货日期',
  DeliveryStatus: '交货状态',

  // Billing Document fields
  BillingDocument: '开票单号',
  BillingDocumentType: '开票类型',
  BillingDocumentDate: '开票日期',
  BillingDocumentItem: '行号',
  BillingQuantity: '开票数量',
  NetAmount: '净金额',
  TaxAmount: '税额',

  // Material Document fields
  MaterialDocument: '物料凭证号',
  MaterialDocumentYear: '年度',
  MaterialDocumentItem: '行号',
  QuantityInEntryUnit: '数量',
  EntryUnit: '单位',
  GoodsMovementType: '移动类型',
  PostingDate: '过账日期',
  ManufacturingOrder: '生产订单',
} as const;

// Default $select fields per service:entity (reduces response payload)
export const SAP_DEFAULT_SELECTS: Record<string, string> = {
  // Production Order (V4) — user-specified field set + UI-needed fields
  'CE_PRODUCTIONORDER_0001:ProductionOrder':
    'ProductionOrder,OrderIsReleased,IsMarkedForDeletion,Product,ProductionPlant,SalesOrder,SalesOrderItem,PlannedTotalQty,GoodsReceiptQty,ProductionOrderStatus,ManufacturingOrderType',
  // Sales Order (V4)
  'CE_SALESORDER_0001:SalesOrder':
    'SalesOrder,SalesOrderType,SalesOrganization,DistributionChannel,OrganizationDivision,SoldToParty,PurchaseOrderByCustomer,SalesOrderDate,TotalNetAmount,TransactionCurrency,OverallSDProcessStatus,OverallDeliveryStatus,OverallBillingStatus',
  // Products (V2)
  'API_PRODUCT_SRV:A_Product':
    'Product,ProductName,ProductType,ProductGroup,BaseUnit,Weight,WeightUnit,Plant,MRPType',
  // Customers (V2)
  'API_BUSINESS_PARTNER:A_Customer':
    'Customer,CustomerName,Country,CityName,PostalCode,SalesOrganization,DistributionChannel,Division,CustomerGroup,Currency',
  // Material Stock (V2)
  'API_MATERIAL_STOCK_SRV:A_MatlStkInAcctMod':
    'Material,MaterialName,Plant,StorageLocation,Batch,MaterialBaseQuantity,BaseUnit,StockType,SupplyArea',
  // Outbound Delivery (V2)
  'API_OUTBOUND_DELIVERY_SRV:A_OutbDeliveryHeader':
    'DeliveryDocument,SoldToParty,DeliveryDate,DeliveryType,OverallGoodsMovementStatus,TotalNetAmount,TransactionCurrency',
  // Billing Document (V2)
  'API_BILLING_DOCUMENT_SRV:A_BillingDocument':
    'BillingDocument,SoldToParty,BillingDocumentDate,BillingType,TotalNetAmount,TransactionCurrency,BillingDocumentStatus',
  // Material Document (V2)
  'API_MATERIAL_DOCUMENT_SRV:A_MaterialDocumentItem':
    'MaterialDocument,MaterialDocumentYear,PostingDate,Material,Plant,MovementType,Quantity,BaseUnit,GoodsRecipient,ReferenceDocument',
};

// Status display helpers
export const SALES_ORDER_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'A': { label: '已完成', variant: 'default' },
  'B': { label: '处理中', variant: 'secondary' },
  'C': { label: '已取消', variant: 'destructive' },
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
