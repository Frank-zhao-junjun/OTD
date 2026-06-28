import { NextRequest, NextResponse } from 'next/server';
import { SAP_DEFAULT_SELECTS, SAP_DEFAULT_EXPANDS, SERVICE_PATH_MAP } from '@/lib/sap-service';
import { readEnvLocal } from '@/lib/env-local';
import { queryMockData } from '@/lib/mock-data';

function isMockMode(): boolean {
  const v = process.env.USE_MOCK || readEnvLocal('USE_MOCK');
  return v === 'true' || v === '1';
}

// Input validation for OData-safe identifiers
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_.\-:/ ]+$/;
function validateId(id: string | null): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (trimmed.length === 0 || trimmed.length > 128) return null;
  if (!SAFE_ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}

const SAFE_FILTER_PATTERN = /^[a-zA-Z0-9_\-:()=,.*'%<>!\s&| ]+$/;
const SAFE_SELECT_PATTERN = /^[a-zA-Z0-9_(),.\$ ]+$/;
const SAFE_ORDERBY_PATTERN = /^[a-zA-Z0-9_,\s]+$/;

function validateFilter(filter: string | null): string | null {
  if (!filter) return null;
  const trimmed = filter.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) return null;
  if (!SAFE_FILTER_PATTERN.test(trimmed)) return null;
  return trimmed;
}

function validateSelect(sel: string | null): string | null {
  if (!sel) return null;
  const trimmed = sel.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) return null;
  if (!SAFE_SELECT_PATTERN.test(trimmed)) return null;
  return trimmed;
}

function validateExpand(exp: string | null): string | null {
  return validateSelect(exp);
}

function validateOrderby(ob: string | null): string | null {
  if (!ob) return null;
  const trimmed = ob.trim();
  if (trimmed.length === 0 || trimmed.length > 500) return null;
  if (!SAFE_ORDERBY_PATTERN.test(trimmed)) return null;
  return trimmed;
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

// Default $select fields per service:entity
const DEFAULT_SELECT_MAP = SAP_DEFAULT_SELECTS;
const DEFAULT_EXPAND_MAP = SAP_DEFAULT_EXPANDS;

// Build authorization header (Basic Auth)
function getAuthHeader(): string {
  const { sapUsername, sapPassword } = getSapConfig();
  const credentials = Buffer.from(`${sapUsername}:${sapPassword}`).toString('base64');
  return `Basic ${credentials}`;
}

// SERVICE_PATH_MAP imported from @/lib/sap-service (single source of truth)

function getODataVersion(servicePath: string): 'v2' | 'v4' {
  if (servicePath.includes('/odata4/')) return 'v4';
  return 'v2';
}



// ============================================================
// Service Classification: Master Data vs. Document
// ============================================================

/** Master data services: DB-first with SAP refresh button support */
const MASTER_DATA_SERVICES = new Set([
  'API_PRODUCT_SRV:A_Product',
  'API_BUSINESS_PARTNER:A_Customer',
]);

/**
 * Generic SAP OData proxy endpoint
 *
 * Architecture:
 * - Master Data (products, customers): DB-first 闁?SAP fallback.
 *   Supports `sap_direct=true` to force SAP query + incremental DB save.
 * - Documents (sales orders, production orders, etc.): Always SAP direct, no DB caching.
 *
 * Document services: API_SALES_ORDER_SRV:A_SalesOrder,
 *   CE_SALESORDER_0001:SalesOrder (V4, returns internal code for SalesOrderType),
 *   CE_PRODUCTIONORDER_0001:ProductionOrder, API_PRODUCTION_ORDER_2_SRV:ProductionOrder (V2 fallback),
 *   API_OUTBOUND_DELIVERY_SRV:A_OutbDeliveryHeader,
 *   API_BILLING_DOCUMENT_SRV:A_BillingDocument,
 *   API_MATERIAL_DOCUMENT_SRV:A_MaterialDocumentItem,
 *   API_MATERIAL_STOCK_SRV:A_MatlStkInAcctMod
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string; entity: string }> }
): Promise<NextResponse> {
  const { service, entity } = await params;
  const config = getSapConfig();
  const serviceEntityKey = `${service}:${entity}`;
  const isMasterData = MASTER_DATA_SERVICES.has(serviceEntityKey);

  // Query parameter: sap_direct=true 闁?bypass DB, query SAP directly & save to DB (master data only)
  const sapDirect = request.nextUrl.searchParams.get('sap_direct') === 'true';

  // === MASTER DATA: DB-FIRST MODE ===
  // Only for master data services, and only when NOT requesting SAP direct
  if (isMasterData && !sapDirect) {
    try {
      const { readFromDb, dbHasData } = await import('@/lib/db-service');
      const { SAP_TABLE_FIELDS } = await import('@/lib/sap-db-sync');

      const tableConfig = SAP_TABLE_FIELDS[serviceEntityKey];
      if (tableConfig) {
        const hasData = await dbHasData(serviceEntityKey);

        if (hasData) {
          // Parse query params for DB query
          const id = validateId(request.nextUrl.searchParams.get('id'));
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
                // Multiple or-conditions on same field 闁?use .in(), single 闁?use .eq()
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

  // === DOCUMENT SERVICES: Always SAP direct, no DB caching ===
  // Documents bypass DB entirely 闁?they go straight to SAP

  // === MOCK MODE ===
  if (isMockMode()) {
    const searchParams = request.nextUrl.searchParams;
    const id = validateId(searchParams.get('id')) || undefined;
    const top = searchParams.get('top') ? parseInt(searchParams.get('top')!, 10) : undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!, 10) : undefined;
    const orderby = validateOrderby(searchParams.get('orderby')) || undefined;
    const filter = validateFilter(searchParams.get('filter')) || undefined;
    const wantCount = searchParams.get('count') === 'true' || searchParams.get('inlinecount') === 'allpages';
    const result = queryMockData(serviceEntityKey, { id, top, skip, orderby, filter, count: wantCount });
    return NextResponse.json({
      success: true,
      d: { results: result.list, __count: result.count },
      value: result.list,
      '@odata.count': result.count,
      totalCount: result.count,
      count: result.count,
      data: result.list,
      _source: 'mock',
    });
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

  const id = validateId(searchParams.get('id'));
  if (searchParams.get('id') && !id) {
    return NextResponse.json(
      { success: false, error: 'Invalid id format' },
      { status: 400 }
    );
  }
  const isSingleEntity = !!id;

  queryParams.push(`sap-client=${config.sapClient}`);
  if (odataVersion === 'v2') queryParams.push(`$format=json`);

  // $top, $skip, $orderby, $inlinecount are NOT allowed for single-entity requests
  if (!isSingleEntity) {
    const top = searchParams.get('top');
    const skip = searchParams.get('skip');
    if (top) queryParams.push(`$top=${top}`);
    if (skip) queryParams.push(`$skip=${skip}`);

    const orderby = validateOrderby(searchParams.get('orderby'));
    if (orderby) queryParams.push(`$orderby=${encodeURIComponent(orderby)}`);

    const count = searchParams.get('count');
    if (odataVersion === 'v4' && count === 'true') queryParams.push('$count=true');
    if (odataVersion === 'v2') queryParams.push('$inlinecount=allpages');
  }

  const filter = validateFilter(searchParams.get('filter'));
  if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);

  // Auto-inject default $select if not provided by client
  const select = validateSelect(searchParams.get('select'));
  const defaultSelectKey = `${service}:${entity}`;
  const defaultSelect = DEFAULT_SELECT_MAP[defaultSelectKey];
  const expand = validateExpand(searchParams.get('expand'));
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
                const { __metadata, ...rest } = value as Record<string, unknown>;
                void __metadata;
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

    // Auto-sync to DB: only for master data services (products, customers)
    // Document services are never cached to DB
    if (isMasterData && !isSingleEntity) {
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