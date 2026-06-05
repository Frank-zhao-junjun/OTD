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
  // Handle or-separated parts first
  const orParts = filter.split(/\s+or\s+/i);
  if (orParts.length > 1) {
    return data.filter(item => {
      return orParts.some(part => evaluateFilterPart(item, part.trim()));
    });
  }

  // Handle and-separated parts
  const andParts = filter.split(/\s+and\s+/i);
  return data.filter(item => {
    return andParts.every(part => evaluateFilterPart(item, part.trim()));
  });
}

function evaluateFilterPart(item: Record<string, unknown>, part: string): boolean {
  const trimmed = part.replace(/^\(/, '').replace(/\)$/, '');

  // Comparison operators: eq, ne, gt, lt, ge, le
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
}

/**
 * Generic SAP OData proxy endpoint — DB-first with SAP fallback
 * 1. Try to read from Supabase DB
 * 2. If DB has data, return it (converted to SAP format)
 * 3. If DB is empty, fetch from SAP, auto-sync to DB, then return
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string; entity: string }> }
): Promise<NextResponse> {
  const { service, entity } = await params;
  const config = getSapConfig();
  const serviceEntityKey = `${service}:${entity}`;

  // === MOCK MODE ===
  if (config.useMock) {
    return handleMockRequest(service, entity, request.nextUrl.searchParams);
  }

  // === SKIP DB SYNC (used by /api/sync to prevent infinite loop) ===
  const skipDbSync = request.nextUrl.searchParams.get('skip_sap_sync') === 'true';

  // === DB-FIRST MODE ===
  // Try reading from Supabase DB first (unless explicitly skipped)
  if (!skipDbSync) {
    try {
      const { readFromDb, dbHasData } = await import('@/lib/db-service');
      const { SAP_TABLE_FIELDS } = await import('@/lib/sap-db-sync');

      const tableConfig = SAP_TABLE_FIELDS[serviceEntityKey];
      if (tableConfig) {
        const hasData = await dbHasData(serviceEntityKey);

        if (hasData) {
          // Parse query params for DB query
          const id = request.nextUrl.searchParams.get('id');
          const top = parseInt(request.nextUrl.searchParams.get('top') || '0', 10) || undefined;
          const skip = parseInt(request.nextUrl.searchParams.get('skip') || '0', 10) || undefined;
          const filterStr = request.nextUrl.searchParams.get('filter');

          // Parse OData $filter into simple DB filters (only eq supported, use /api/sap/search for fuzzy)
          const filter: Record<string, string> = {};
          const inFilter: Record<string, string[]> = {};
          if (filterStr) {
            const parts = filterStr.split(/\s+or\s+/i);
            for (const part of parts) {
              let trimmed = part.trim();
              if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
                let depth = 0; let matched = true;
                for (let i = 0; i < trimmed.length - 1; i++) {
                  if (trimmed[i] === '(') depth++;
                  else if (trimmed[i] === ')') depth--;
                  if (depth === 0 && i < trimmed.length - 1) { matched = false; break; }
                }
                if (matched) trimmed = trimmed.slice(1, -1);
              }
              const eqMatch = trimmed.match(/^(\w+)\s+eq\s+'?([^']*)'?$/);
              if (eqMatch) {
                const prop = eqMatch[1];
                const val = eqMatch[2];
                const dbProp = prop.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
                  .replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
                // Multiple or-conditions on same field → use .in(), single → use .eq()
                if (parts.length > 1) {
                  if (!inFilter[dbProp]) inFilter[dbProp] = [];
                  inFilter[dbProp].push(val);
                } else {
                  filter[dbProp] = val;
                }
              }
            }
          }

          const result = await readFromDb(serviceEntityKey, {
            id: id || undefined,
            top,
            skip,
            filter: Object.keys(filter).length > 0 ? filter : undefined,
            inFilter: Object.keys(inFilter).length > 0 ? inFilter : undefined,
          });

          if (!result.error) {
            return NextResponse.json({
              success: true,
              data: result.data,
              count: result.count,
              totalCount: result.count,
              _source: 'database',
            });
          }

          console.warn(`DB read failed for ${serviceEntityKey}: ${result.error}, falling back to SAP`);
        }
      }
    } catch (dbErr) {
      // Supabase not available or not configured, fall through to SAP
      console.warn(`DB not available, falling back to SAP:`, dbErr instanceof Error ? dbErr.message : dbErr);
    }
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
  const expand = searchParams.get('expand');
  const defaultExpand = DEFAULT_EXPAND_MAP[defaultSelectKey];
  const effectiveExpand = expand || defaultExpand;
  // When $expand is used with $select, the expanded nav property names must be included in $select
  let effectiveSelect = select || defaultSelect;
  if (effectiveSelect && effectiveExpand) {
    const expandNames = effectiveExpand.split(',').map(f => f.trim().split('(')[0]); // strip expand options like ($select=...)
    const selectNames = effectiveSelect.split(',').map(f => f.trim());
    const missing = expandNames.filter(e => !selectNames.includes(e));
    if (missing.length > 0) {
      effectiveSelect = effectiveSelect + ',' + missing.join(',');
    }
  }
  if (effectiveSelect) queryParams.push(`$select=${encodeURIComponent(effectiveSelect)}`);
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
    // Also handles nested expand results (to_Description, to_Plant, etc.)
    const sanitizeResults = (items: unknown[]): unknown[] => {
      if (!Array.isArray(items)) return items;
      return items.map(item => {
        if (item && typeof item === 'object') {
          const cleaned: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
            if (key === '__metadata') continue;
            if (key === '@odata.etag') continue;
            // Handle expanded navigation properties
            if (value && typeof value === 'object') {
              if (Array.isArray(value)) {
                cleaned[key] = sanitizeResults(value as unknown[]);
              } else if ((value as Record<string, unknown>).d && Array.isArray(((value as Record<string, unknown>).d as Record<string, unknown>)?.results)) {
                // V2 expand: { d: { results: [...] } }
                cleaned[key] = sanitizeResults(((value as Record<string, unknown>).d as Record<string, unknown>).results as unknown[]);
              } else if ((value as Record<string, unknown>).results && Array.isArray((value as Record<string, unknown>).results)) {
                // V2 expand: { results: [...] }
                cleaned[key] = sanitizeResults((value as Record<string, unknown>).results as unknown[]);
              } else if (!key.startsWith('@')) {
                // Single expanded entity (e.g. to_Description with one result)
                const { __metadata: _, ...rest } = value as Record<string, unknown>;
                cleaned[key] = Object.keys(rest).length > 0 ? rest : value;
              } else {
                cleaned[key] = value;
              }
            } else {
              cleaned[key] = value;
            }
          }
          return cleaned;
        }
        return item;
      });
    };

    const sanitizedData = sanitizeResults(results);

    // Auto-sync to DB (background, non-blocking)
    if (!skipDbSync && !isSingleEntity) {
      try {
        const { syncModuleToDb } = await import('@/lib/db-service');
        // Fire and forget - don't await
        syncModuleToDb(serviceEntityKey, sanitizedData as Record<string, unknown>[])
          .catch(err => console.warn(`Background sync failed for ${serviceEntityKey}:`, err));
      } catch {
        // DB sync not available, continue
      }
    }

    return NextResponse.json({
      success: true,
      data: sanitizedData,
      count: resultCount,
      totalCount: resultCount,
      odataVersion,
      _source: 'sap',
    });
  } catch (error) {
    console.error('SAP API request failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
