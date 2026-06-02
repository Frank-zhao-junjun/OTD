/**
 * SAP OData API Service Library
 * Provides unified interface for SAP ERP data queries
 */

// API endpoint configuration
export const SAP_ENDPOINTS = {
  PRODUCT: '/sap/opu/odata/sap/API_PRODUCT_SRV/',
  BUSINESS_PARTNER: '/sap/opu/odata/sap/API_BUSINESS_PARTNER/',
  SALES_ORDER_V2: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/',
  SALES_ORDER_V4: '/sap/opu/odata4/sap/ce_salesorder_0001/srvd_a2x/sap/salesorder/0001/',
  PRODUCTION_ORDER: '/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/',
  MATERIAL_STOCK: '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/',
  OUTBOUND_DELIVERY: '/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV/',
  BILLING_DOCUMENT: '/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/',
} as const;

// Entity sets for each API
export const SAP_ENTITY_SETS = {
  PRODUCT: ['A_Product', 'ProductGroupText'],
  BUSINESS_PARTNER: ['A_BusinessPartner', 'A_Customer', 'A_CustomerSalesArea'],
  SALES_ORDER: ['A_SalesOrder', 'A_SalesOrderItem'],
  PRODUCTION_ORDER: ['A_ProductionOrder', 'A_ProductionOrderItem'],
  MATERIAL_STOCK: ['A_MatlStkInAcctMod'],
  OUTBOUND_DELIVERY: ['A_OutbDeliveryHeader', 'A_OutbDeliveryItem'],
  BILLING_DOCUMENT: ['A_BillingDocument', 'A_BillingDocumentItem'],
} as const;

// Query options type
export interface SapQueryOptions {
  top?: number;       // $top - limit results
  skip?: number;      // $skip - pagination offset
  filter?: string;    // $filter - OData filter expression
  select?: string;    // $select - select specific fields
  orderby?: string;   // $orderby - sort results
  expand?: string;    // $expand - expand related entities
  format?: 'json' | 'xml'; // $format - response format
}

// Build OData query string
export function buildODataQuery(options: SapQueryOptions): string {
  const params: string[] = [];
  
  if (options.top) params.push(`$top=${options.top}`);
  if (options.skip) params.push(`$skip=${options.skip}`);
  if (options.filter) params.push(`$filter=${encodeURIComponent(options.filter)}`);
  if (options.select) params.push(`$select=${options.select}`);
  if (options.orderby) params.push(`$orderby=${options.orderby}`);
  if (options.expand) params.push(`$expand=${options.expand}`);
  if (options.format) params.push(`$format=${options.format}`);
  
  return params.length > 0 ? '?' + params.join('&') : '';
}

// SAP API response wrapper
export interface SapApiResponse<T> {
  success: boolean;
  data?: T[];
  count?: number;
  error?: string;
}

// Common SAP field mappings
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
  SoldParty: '售方',
  TotalNetAmount: '总金额',
  SalesOrderDate: '订单日期',
  DistributionChannel: '分销渠道',
  
  // Production Order fields
  ProductionOrder: '生产订单号',
  Material: '物料号',
  PlannedQuantity: '计划数量',
  ManufacturingOrderType: '订单类型',
  ProductionPlant: '生产工厂',
  
  // Stock fields
  Plant: '工厂',
  StorageLocation: '存储位置',
  Batch: '批次',
  StockLevel: '库存数量',
  Unit: '单位',
} as const;