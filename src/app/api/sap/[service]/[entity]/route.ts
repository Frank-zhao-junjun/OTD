import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SAP_DEFAULT_SELECTS, SAP_DEFAULT_EXPANDS } from '@/lib/sap-service';

/**
 * Read a value from .env.local by key, bypassing dotenv-expand.
 * Priority: /tmp/.env.local (runtime settings) > workspace .env.local (deploy config)
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

// SAP configuration — dynamically read on each request so settings take effect immediately.
// Variable names aligned with SAP Communication Scenarios (SAP_COM_xxxx) Postman environment.
function getSapConfig() {
  return {
    sapScheme: process.env.sapScheme || readEnvLocal('sapScheme') || 'https',
    sapHost: process.env.sapHost || readEnvLocal('sapHost') || '',
    sapUsername: process.env.sapUsername || readEnvLocal('sapUsername') || '',
    sapPassword: readEnvLocal('sapPassword') || process.env.sapPassword || '',
    sapClient: process.env.sapClient || readEnvLocal('sapClient') || '100',
    useMock: process.env.USE_MOCK === 'true' || readEnvLocal('USE_MOCK') === 'true',
  };
}

// Mock data file mapping: service:entity → mock file
const MOCK_FILE_MAP: Record<string, string> = {
  // Sales Orders
  'CE_SALESORDER_0001:SalesOrder': 'sales_orders.json',
  'API_SALES_ORDER_SRV:A_SalesOrder': 'sales_orders.json',
  // Production Orders
  'CE_PRODUCTIONORDER_0001:ProductionOrder': 'production_orders.json',
  'API_PRODUCTION_ORDER_2_SRV:A_ProductionOrder': 'production_orders.json',
  // Deliveries
  'API_OUTBOUND_DELIVERY_SRV:A_OutbDeliveryHeader': 'deliveries.json',
  'API_OUTBOUND_DELIVERY_SRV:A_OutbDeliveryItem': 'deliveries.json',
  'API_OUTBOUND_DELIVERY_SRV:A_OutboundDelivery': 'deliveries.json',
  // Billing
  'API_BILLING_DOCUMENT_SRV:A_BillingDocument': 'invoices.json',
  'API_BILLING_DOCUMENT_SRV:A_BillingDocumentItem': 'invoices.json',
  // Inventory
  'API_MATERIAL_STOCK_SRV:A_MatlStkInAcctMod': 'inventory.json',
  // Goods Receipts / Material Documents
  'API_MATERIAL_DOCUMENT_SRV:A_MaterialDocument': 'goods_receipts.json',
  'API_MATERIAL_DOCUMENT_SRV:A_MaterialDocumentItem': 'goods_receipts.json',
  // Products
  'API_PRODUCT_SRV:A_Product': 'products.json',
  // Customers
  'API_BUSINESS_PARTNER:A_Customer': 'customers.json',
};

function loadMockData(filename: string): unknown[] {
  try {
    const filePath = join(process.env.COZE_WORKSPACE_PATH || process.cwd(), 'mock', filename);
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    console.error(`Mock file not found: ${filename}`);
    return [];
  }
}

// Default $select fields per service:entity
const DEFAULT_SELECT_MAP = SAP_DEFAULT_SELECTS;
const DEFAULT_EXPAND_MAP = SAP_DEFAULT_EXPANDS;

// Build authorization header (Basic Auth)
function getAuthHeader(): string {
  const { sapUsername, sapPassword } = getSapConfig();
  const credentials = Buffer.from(`${sapUsername}:${sapPassword}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Service name → SAP path prefix mapping
 * Supports both V2 and V4 OData endpoints.
 */
const SERVICE_PATH_MAP: Record<string, string> = {
  // V2 OData services
  'API_PRODUCT_SRV': '/sap/opu/odata/sap/API_PRODUCT_SRV/',
  'API_BUSINESS_PARTNER': '/sap/opu/odata/sap/API_BUSINESS_PARTNER/',
  'API_SALES_ORDER_SRV': '/sap/opu/odata/sap/API_SALES_ORDER_SRV/',
  'API_PRODUCTION_ORDER_2_SRV': '/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/',
  'API_MATERIAL_STOCK_SRV': '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/',
  'API_OUTBOUND_DELIVERY_SRV': '/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=0002/',
  'API_BILLING_DOCUMENT_SRV': '/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/',
  'API_MATERIAL_DOCUMENT_SRV': '/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/',
  'API_PROD_ORDER_CONFIRMATION_2_SRV': '/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/',
  // V4 OData services
  'CE_SALESORDER_0001': '/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/',
  'CE_PRODUCTIONORDER_0001': '/sap/opu/odata4/sap/api_productionorder/srvd_a2x/sap/productionorder/0001/',
};

function getODataVersion(servicePath: string): 'v2' | 'v4' {
  if (servicePath.includes('/odata4/')) return 'v4';
  return 'v2';
}

/**
 * Handle Mock mode: load local JSON, apply filter/pagination
 */
function handleMockRequest(
  service: string,
  entity: string,
  searchParams: URLSearchParams
): NextResponse {
  const mockKey = `${service}:${entity}`;
  const mockFile = MOCK_FILE_MAP[mockKey];

  if (!mockFile) {
    return NextResponse.json(
      { success: false, error: `No mock data for ${mockKey}` },
      { status: 404 }
    );
  }

  let data = loadMockData(mockFile);
  const totalCount = data.length;

  // Single entity lookup by key (e.g. id=100000001 → SalesOrder('100000001'))
  const id = searchParams.get('id');
  if (id && Array.isArray(data)) {
    data = (data as Record<string, unknown>[]).filter(item => {
      const keyField = Object.keys(item).find(k =>
        k === entity || k === entity.replace(/^A_/, '') || k === 'SalesOrder' || k === 'ProductionOrder' || k === 'DeliveryDocument' || k === 'BillingDocument' || k === 'MaterialDocument' || k === 'Product' || k === 'Customer'
      );
      return keyField ? String(item[keyField]) === id : false;
    });
  }

  // Apply simple filter (parse OData filter expressions)
  const filter = searchParams.get('filter');
  if (filter && Array.isArray(data) && data.length > 0) {
    data = applyODataFilter(data as Record<string, unknown>[], filter);
  }

  // Apply $select (field projection) — keep $expand navigation properties
  const select = searchParams.get('select');
  const effectiveSelect = select || DEFAULT_SELECT_MAP[mockKey];
  const effectiveExpand = searchParams.get('expand') || DEFAULT_EXPAND_MAP[mockKey];
  const expandFields = effectiveExpand ? effectiveExpand.split(',').map(f => f.trim()) : [];
  if (effectiveSelect && Array.isArray(data) && data.length > 0) {
    const fields = effectiveSelect.split(',').map(f => f.trim());
    const allFields = [...fields, ...expandFields];
    data = (data as Record<string, unknown>[]).map(item => {
      const projected: Record<string, unknown> = {};
      for (const f of allFields) {
        if (f in item) projected[f] = item[f];
      }
      return projected;
    });
  }

  // Apply pagination
  const top = parseInt(searchParams.get('top') || '0', 10);
  const skip = parseInt(searchParams.get('skip') || '0', 10);
  if (skip > 0) data = data.slice(skip);
  if (top > 0) data = data.slice(0, top);

  const sp = SERVICE_PATH_MAP[service];
  const odataVer = sp ? getODataVersion(sp) : 'v2';
  return NextResponse.json({
    success: true,
    data,
    count: data.length,
    totalCount,
    odataVersion: odataVer,
    _mock: true,
  });
}

/**
 * Simple OData $filter parser
 * Supports: eq, ne, gt, lt, ge, le, and, or
 */
function applyODataFilter(
  data: Record<string, unknown>[],
  filter: string
): Record<string, unknown>[] {
  const andParts = filter.split(/\s+and\s+/i);

  return data.filter(item => {
    return andParts.every(part => {
      const trimmed = part.trim().replace(/^\(/, '').replace(/\)$/, '');
      const match = trimmed.match(/^(\w+)\s+(eq|ne|gt|lt|ge|le)\s+'?([^']*)'?$/);
      if (!match) return true;

      const [, prop, op, val] = match;
      const itemVal = String(item[prop] ?? '');

      switch (op) {
        case 'eq': return itemVal === val;
        case 'ne': return itemVal !== val;
        case 'gt': return itemVal > val;
        case 'lt': return itemVal < val;
        case 'ge': return itemVal >= val;
        case 'le': return itemVal <= val;
        default: return true;
      }
    });
  });
}

/**
 * Generic SAP OData proxy endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string; entity: string }> }
): Promise<NextResponse> {
  const { service, entity } = await params;
  const config = getSapConfig();

  // === MOCK MODE ===
  if (config.useMock) {
    return handleMockRequest(service, entity, request.nextUrl.searchParams);
  }

  // === LIVE SAP MODE ===
  if (!config.sapHost) {
    return NextResponse.json(
      { success: false, error: 'SAP host not configured. Please set sapHost via Settings page' },
      { status: 500 }
    );
  }
  if (!config.sapUsername || !config.sapPassword) {
    return NextResponse.json(
      { success: false, error: 'SAP credentials not configured. Please set sapUsername and sapPassword via Settings page' },
      { status: 500 }
    );
  }

  const servicePath = SERVICE_PATH_MAP[service];
  if (!servicePath) {
    return NextResponse.json(
      { success: false, error: `Unknown SAP service: ${service}. Available: ${Object.keys(SERVICE_PATH_MAP).join(', ')}` },
      { status: 400 }
    );
  }

  const odataVersion = getODataVersion(servicePath);
  const searchParams = request.nextUrl.searchParams;
  const queryParams: string[] = [];

  const id = searchParams.get('id');
  const isSingleEntity = !!id;

  queryParams.push(`sap-client=${config.sapClient}`);
  if (odataVersion === 'v2') queryParams.push(`$format=json`);

  // $top, $skip, $orderby, $inlinecount are NOT allowed for single-entity requests
  if (!isSingleEntity) {
    const top = searchParams.get('top');
    const skip = searchParams.get('skip');
    if (top) queryParams.push(`$top=${top}`);
    if (skip) queryParams.push(`$skip=${skip}`);

    const orderby = searchParams.get('orderby');
    if (orderby) queryParams.push(`$orderby=${encodeURIComponent(orderby)}`);

    const count = searchParams.get('count');
    if (odataVersion === 'v4' && count === 'true') queryParams.push('$count=true');
    if (odataVersion === 'v2') queryParams.push('$inlinecount=allpages');
  }

  const filter = searchParams.get('filter');
  if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);

  // Auto-inject default $select if not provided by client
  const select = searchParams.get('select');
  const defaultSelectKey = `${service}:${entity}`;
  const defaultSelect = DEFAULT_SELECT_MAP[defaultSelectKey];
  const effectiveSelect = select || defaultSelect;
  if (effectiveSelect) queryParams.push(`$select=${encodeURIComponent(effectiveSelect)}`);

  const expand = searchParams.get('expand');
  const defaultExpand = DEFAULT_EXPAND_MAP[defaultSelectKey];
  const effectiveExpand = expand || defaultExpand;
  if (effectiveExpand) queryParams.push(`$expand=${encodeURIComponent(effectiveExpand)}`);

  let entityPath = entity;
  if (id) entityPath = `${entity}('${id}')`;

  const sapUrl = `${config.sapScheme}://${config.sapHost}${servicePath}${entityPath}?${queryParams.join('&')}`;

  try {
    const requestHeaders: Record<string, string> = {
      'Authorization': getAuthHeader(),
      'Accept': 'application/json',
    };

    const response = await fetch(sapUrl, { method: 'GET', headers: requestHeaders });

    if (!response.ok) {
      const errorText = await response.text();
      // Sanitize error details - remove internal hostnames, transaction IDs, and etags
      const sanitizedDetails = errorText
        .replace(/https?:\/\/[^\s"']+/g, '[URL_REDACTED]')
        .replace(/"transactionid"\s*:\s*"[^"]*"/g, '"transactionid":"[REDACTED]"')
        .replace(/"etag"\s*:\s*"[^"]*"/g, '"etag":"[REDACTED]"')
        .substring(0, 500);

      console.error(`SAP API error: ${response.status} - ${errorText.substring(0, 500)}`);
      return NextResponse.json(
        { success: false, error: `SAP API returned ${response.status}`, details: sanitizedDetails },
        { status: response.status }
      );
    }

    const data = await response.json();
    let results: unknown[] = [];
    let resultCount: number | undefined;

    if (data.d && Array.isArray(data.d.results)) {
      results = data.d.results;
      resultCount = parseInt(data.d.__count, 10) || results.length;
    } else if (data.value && Array.isArray(data.value)) {
      results = data.value;
      resultCount = data['@odata.count'] || results.length;
    } else if (data.d && !data.d.results) {
      results = [data.d];
      resultCount = 1;
    } else {
      results = [data];
      resultCount = 1;
    }

    // Strip __metadata from results to avoid exposing internal SAP hostnames/URLs
    const sanitizeResults = (items: unknown[]): unknown[] => {
      if (!Array.isArray(items)) return items;
      return items.map(item => {
        if (item && typeof item === 'object') {
          const { __metadata, ...rest } = item as Record<string, unknown>;
          return rest;
        }
        return item;
      });
    };

    return NextResponse.json({
      success: true,
      data: sanitizeResults(results),
      count: resultCount,
      totalCount: resultCount,
      odataVersion,
    });
  } catch (error) {
    console.error('SAP API request failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
