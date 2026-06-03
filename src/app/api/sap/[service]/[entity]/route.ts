import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SAP_DEFAULT_SELECTS, SAP_DEFAULT_EXPANDS } from '@/lib/sap-service';

// SAP configuration from environment variables
const SAP_BASE_URL = process.env.SAP_BASE_URL || 'https://my200967-api.s4hana.sapcloud.cn';
const SAP_USERNAME = process.env.SAP_USERNAME || '';
const SAP_PASSWORD = process.env.SAP_PASSWORD || '';
const SAP_CLIENT = process.env.SAP_CLIENT || '100';
const USE_MOCK = process.env.USE_MOCK === 'true';

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
    const filePath = join(process.cwd(), 'mock', filename);
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
  const credentials = Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString('base64');
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
  // Split by ' and ' for AND conditions
  const andParts = filter.split(/\s+and\s+/i);

  return data.filter(item => {
    return andParts.every(part => {
      const trimmed = part.trim().replace(/^\(/, '').replace(/\)$/, '');

      // Match: Property op 'Value' or Property op Value
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

  // === MOCK MODE ===
  if (USE_MOCK) {
    return handleMockRequest(service, entity, request.nextUrl.searchParams);
  }

  // === LIVE SAP MODE ===
  if (!SAP_USERNAME || !SAP_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'SAP credentials not configured. Please set SAP_USERNAME and SAP_PASSWORD in .env.local' },
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

  queryParams.push(`sap-client=${SAP_CLIENT}`);
  if (odataVersion === 'v2') queryParams.push(`$format=json`);

  const top = searchParams.get('top');
  const skip = searchParams.get('skip');
  if (top) queryParams.push(`$top=${top}`);
  if (skip) queryParams.push(`$skip=${skip}`);

  const filter = searchParams.get('filter');
  if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);

  // Auto-inject default $select if not provided by client
  const select = searchParams.get('select');
  const defaultSelectKey = `${service}:${entity}`;
  const defaultSelect = DEFAULT_SELECT_MAP[defaultSelectKey];
  const effectiveSelect = select || defaultSelect;
  if (effectiveSelect) queryParams.push(`$select=${encodeURIComponent(effectiveSelect)}`);

  const orderby = searchParams.get('orderby');
  if (orderby) queryParams.push(`$orderby=${encodeURIComponent(orderby)}`);

  const expand = searchParams.get('expand');
  const defaultExpand = DEFAULT_EXPAND_MAP[defaultSelectKey];
  const effectiveExpand = expand || defaultExpand;
  if (effectiveExpand) queryParams.push(`$expand=${encodeURIComponent(effectiveExpand)}`);

  const count = searchParams.get('count');
  if (odataVersion === 'v4' && count === 'true') queryParams.push('$count=true');
  if (odataVersion === 'v2') queryParams.push('$inlinecount=allpages');

  const id = searchParams.get('id');
  let entityPath = entity;
  if (id) entityPath = `${entity}('${id}')`;

  const sapUrl = `${SAP_BASE_URL}${servicePath}${entityPath}?${queryParams.join('&')}`;

  try {
    const requestHeaders: Record<string, string> = {
      'Authorization': getAuthHeader(),
      'Accept': 'application/json',
    };

    const response = await fetch(sapUrl, { method: 'GET', headers: requestHeaders });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SAP API error: ${response.status} - ${errorText.substring(0, 500)}`);
      return NextResponse.json(
        { success: false, error: `SAP API returned ${response.status}`, details: errorText.substring(0, 500) },
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

    return NextResponse.json({
      success: true,
      data: results,
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
