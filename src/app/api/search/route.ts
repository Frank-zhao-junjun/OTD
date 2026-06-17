import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Read a value from .env.local by key, bypassing dotenv-expand.
 */
function readEnvLocal(key: string): string | undefined {
  const paths = ['/tmp/.env.local', join(process.env.COZE_WORKSPACE_PATH || process.cwd(), '.env.local')];
  for (const envPath of paths) {
    try {
      const content = readFileSync(envPath, 'utf-8');
      const regex = new RegExp(`^${key}=(?:["'](.+?)["']|(.+))$`, 'm');
      const match = content.match(regex);
      if (match) {
        const val = match[1] || match[2];
        const commentIdx = val.search(/(?<!["'])#/);
        return commentIdx > 0 ? val.substring(0, commentIdx).trimEnd() : val.trimEnd();
      }
    } catch { /* file not found */ }
  }
  return undefined;
}

function getSapConfig() {
  return {
    sapScheme: process.env.sapScheme || readEnvLocal('sapScheme') || 'https',
    sapHost: process.env.sapHost || readEnvLocal('sapHost') || '',
    sapUsername: process.env.sapUsername || readEnvLocal('sapUsername') || '',
    sapPassword: readEnvLocal('sapPassword') || process.env.sapPassword || '',
    sapClient: process.env.sapClient || readEnvLocal('sapClient') || '100',
  };
}

// Service path mapping (same as proxy route)
const SERVICE_PATH_MAP: Record<string, string> = {
  'API_PRODUCT_SRV': '/sap/opu/odata/sap/API_PRODUCT_SRV/',
  'API_BUSINESS_PARTNER': '/sap/opu/odata/sap/API_BUSINESS_PARTNER/',
  'API_MATERIAL_STOCK_SRV': '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/',
  'API_OUTBOUND_DELIVERY_SRV': '/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=0002/',
  'API_BILLING_DOCUMENT_SRV': '/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/',
  'API_MATERIAL_DOCUMENT_SRV': '/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/',
  'CE_SALESORDER_0001': '/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/',
  'CE_PRODUCTIONORDER_0001': '/sap/opu/odata4/sap/api_productionorder/srvd_a2x/sap/productionorder/0001/',
};
interface SearchConfig {
  service: string;
  entity: string;
  searchFields: string[];
  selectFields: string[];
  resultLabel: (item: Record<string, unknown>) => string;
  resultDesc: (item: Record<string, unknown>) => string;
  detailPath: (item: Record<string, unknown>) => string;
  icon: string;
  groupLabel: string;
}

const SEARCH_CONFIGS: SearchConfig[] = [
  {
    service: 'CE_SALESORDER_0001',
    entity: 'SalesOrder',
    searchFields: ['SalesOrder', 'SoldToParty', 'PurchaseOrderByCustomer'],
    selectFields: ['SalesOrder', 'SalesOrderType', 'SoldToParty', 'TotalNetAmount', 'TransactionCurrency', 'SalesOrderDate', 'OverallSDProcessStatus'],
    resultLabel: (item) => `销售订单 ${item.SalesOrder}`,
    resultDesc: (item) => `客户: ${item.SoldToParty} | 金额: ${item.TotalNetAmount} ${item.TransactionCurrency}`,
    detailPath: (item) => `/sales-orders/${item.SalesOrder}`,
    icon: 'FileText',
    groupLabel: '销售订单',
  },
  {
    service: 'CE_PRODUCTIONORDER_0001',
    entity: 'ProductionOrder',
    searchFields: ['ProductionOrder', 'Product', 'SalesOrder'],
    selectFields: ['ProductionOrder', 'ProductionOrderType', 'Product', 'ProductionPlant', 'OrderPlannedTotalQty', 'ActualDeliveredQuantity', 'OrderScheduledStartDate'],
    resultLabel: (item) => `生产订单 ${item.ProductionOrder}`,
    resultDesc: (item) => `物料: ${item.Product} | 计划: ${item.OrderPlannedTotalQty}`,
    detailPath: (item) => `/production-orders/${item.ProductionOrder}`,
    icon: 'Factory',
    groupLabel: '生产订单',
  },
  {
    service: 'API_OUTBOUND_DELIVERY_SRV',
    entity: 'A_OutbDeliveryHeader',
    searchFields: ['DeliveryDocument', 'ShipToParty', 'SoldToParty'],
    selectFields: ['DeliveryDocument', 'DeliveryDocumentType', 'ShipToParty', 'SoldToParty', 'DeliveryDate', 'OverallGoodsMovementStatus'],
    resultLabel: (item) => `交货单 ${item.DeliveryDocument}`,
    resultDesc: (item) => `客户: ${item.SoldToParty} | 收货方: ${item.ShipToParty}`,
    detailPath: (item) => `/outbound-delivery?id=${item.DeliveryDocument}`,
    icon: 'Truck',
    groupLabel: '交货单',
  },
  {
    service: 'API_BILLING_DOCUMENT_SRV',
    entity: 'A_BillingDocument',
    searchFields: ['BillingDocument', 'SoldToParty'],
    selectFields: ['BillingDocument', 'BillingDocumentType', 'SoldToParty', 'TotalNetAmount', 'TransactionCurrency', 'BillingDocumentDate'],
    resultLabel: (item) => `开票单据 ${item.BillingDocument}`,
    resultDesc: (item) => `客户: ${item.SoldToParty} | 金额: ${item.TotalNetAmount} ${item.TransactionCurrency}`,
    detailPath: (item) => `/billing-documents?id=${item.BillingDocument}`,
    icon: 'Receipt',
    groupLabel: '开票单据',
  },
  {
    service: 'API_MATERIAL_STOCK_SRV',
    entity: 'A_MatlStkInAcctMod',
    searchFields: ['Material', 'Plant', 'StorageLocation'],
    selectFields: ['Material', 'Plant', 'StorageLocation', 'Batch', 'MatlWrhsStkQtyInMatlBaseUnit', 'MaterialBaseUnit'],
    resultLabel: (item) => `物料 ${item.Material}`,
    resultDesc: (item) => `工厂: ${item.Plant} | 库位: ${item.StorageLocation} | 库存: ${item.MatlWrhsStkQtyInMatlBaseUnit} ${item.MaterialBaseUnit}`,
    detailPath: (item) => `/material-stock/${encodeURIComponent(String(item.Material))}`,
    icon: 'BarChart3',
    groupLabel: '库存',
  },
  {
    service: 'API_MATERIAL_DOCUMENT_SRV',
    entity: 'A_MaterialDocumentHeader',
    searchFields: ['MaterialDocument', 'Material'],
    selectFields: ['MaterialDocumentYear', 'MaterialDocument', 'DocumentDate', 'PostingDate', 'MaterialDocumentHeaderText'],
    resultLabel: (item) => `物料凭证 ${item.MaterialDocument}`,
    resultDesc: (item) => `年度: ${item.MaterialDocumentYear} | 日期: ${formatDateStr(String(item.DocumentDate))}`,
    detailPath: (item) => `/material-documents?id=${item.MaterialDocument}`,
    icon: 'FileSpreadsheet',
    groupLabel: '物料凭证',
  },
  {
    service: 'API_PRODUCT_SRV',
    entity: 'A_Product',
    searchFields: ['Product', 'ProductDescription'],
    selectFields: ['Product', 'ProductType', 'ProductGroup', 'ProductDescription', 'BaseUnit'],
    resultLabel: (item) => `产品 ${item.Product}`,
    resultDesc: (item) => `${item.ProductDescription || ''} | 类型: ${item.ProductType} | 单位: ${item.BaseUnit}`,
    detailPath: (item) => `/products/${encodeURIComponent(String(item.Product))}`,
    icon: 'Package',
    groupLabel: '产品',
  },
  {
    service: 'API_BUSINESS_PARTNER',
    entity: 'A_Customer',
    searchFields: ['Customer', 'CustomerName', 'CustomerFullName'],
    selectFields: ['Customer', 'CustomerName', 'CustomerFullName', 'CustomerAccountGroup', 'Industry'],
    resultLabel: (item) => `客户 ${item.Customer}`,
    resultDesc: (item) => `${item.CustomerName || ''} | 分组: ${item.CustomerAccountGroup}`,
    detailPath: (item) => `/customers?id=${item.Customer}`,
    icon: 'Users',
    groupLabel: '客户',
  },
];

function formatDateStr(dateStr: string): string {
  if (!dateStr) return '';
  // Handle /Date(1756339200000)/ format
  const match = dateStr.match(/\/Date\((\d+)\)\//);
  if (match) {
    const d = new Date(parseInt(match[1]));
    return d.toISOString().split('T')[0];
  }
  // Handle ISO date
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dateStr.split('T')[0];
  }
  return dateStr;
}

async function searchEntity(
  config: SearchConfig,
  query: string,
  sapBaseUrl: string,
  credentials: string,
  sapClient: string
): Promise<Array<Record<string, unknown>>> {
  const servicePath = SERVICE_PATH_MAP[config.service];
  if (!servicePath) return [];

  const isV4 = servicePath.includes('/odata4/');
  const filterParts = config.searchFields.map(
    (field) => `substringof('${encodeURIComponent(query)}',${field})`
  );
  const filter = filterParts.join(' or ');

  const url = `${sapBaseUrl}${servicePath}${config.entity}`;

  const params = new URLSearchParams();
  params.set('$filter', filter);
  params.set('$top', '5');
  params.set('$select', config.selectFields.join(','));
  if (!isV4) {
    params.set('$format', 'json');
    params.set('sap-client', sapClient);
  }

  try {
    const headers: Record<string, string> = {
      'Authorization': `Basic ${credentials}`,
    };
    if (isV4) {
      headers['Accept'] = 'application/json';
    }

    const res = await fetch(`${url}?${params.toString()}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const json = await res.json();
    const items = isV4 ? (json.value || []) : (json.d?.results || []);
    return items;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';
  const trimmed = query.trim();

  if (!trimmed || trimmed.length < 1) {
    return NextResponse.json({ success: true, results: [], query: '' });
  }

  // Get SAP credentials
  const { sapScheme, sapHost, sapUsername, sapPassword, sapClient } = getSapConfig();
  const sapBaseUrl = `${sapScheme}://${sapHost}`;

  if (!sapHost || !sapUsername || !sapPassword) {
    return NextResponse.json({ success: false, error: 'SAP credentials not configured' }, { status: 500 });
  }

  const credentials = Buffer.from(`${sapUsername}:${sapPassword}`).toString('base64');

  // Search all entities in parallel
  const results = await Promise.all(
    SEARCH_CONFIGS.map(async (config) => {
      const items = await searchEntity(config, trimmed, sapBaseUrl, credentials, sapClient);
      if (items.length === 0) return null;

      return {
        group: config.groupLabel,
        icon: config.icon,
        items: items.map((item) => ({
          label: config.resultLabel(item),
          description: config.resultDesc(item),
          path: config.detailPath(item),
          raw: item,
        })),
      };
    })
  );

  const filtered = results.filter(Boolean);

  return NextResponse.json({
    success: true,
    query: trimmed,
    results: filtered,
    totalGroups: filtered.length,
    totalItems: filtered.reduce((sum, g) => sum + (g?.items?.length || 0), 0),
  });
}
