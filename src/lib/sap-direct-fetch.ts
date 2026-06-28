import { readEnvLocal } from '@/lib/env-local';
import { SAP_DEFAULT_SELECTS } from '@/lib/sap-service';

const SERVICE_PATH_MAP: Record<string, string> = {
  API_PRODUCT_SRV: '/sap/opu/odata/sap/API_PRODUCT_SRV/',
  API_BUSINESS_PARTNER: '/sap/opu/odata/sap/API_BUSINESS_PARTNER/',
  API_SALES_ORDER_SRV: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/',
  API_MATERIAL_STOCK_SRV: '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/',
  API_OUTBOUND_DELIVERY_SRV: '/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=0002/',
  API_BILLING_DOCUMENT_SRV: '/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/',
  API_MATERIAL_DOCUMENT_SRV: '/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/',
  CE_SALESORDER_0001: '/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/',
  CE_PRODUCTIONORDER_0001: '/sap/opu/odata4/sap/api_productionorder/srvd_a2x/sap/productionorder/0001/',
};

export interface SapDirectQueryOptions {
  top?: number;
  skip?: number;
  orderby?: string;
  count?: boolean;
  filter?: string;
  select?: string;
  expand?: string;
}

export interface SapDirectResult {
  success: boolean;
  data: Record<string, unknown>[];
  count: number;
  error?: string;
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

function getAuthHeader(): string {
  const { sapUsername, sapPassword } = getSapConfig();
  return `Basic ${Buffer.from(`${sapUsername}:${sapPassword}`).toString('base64')}`;
}

function getODataVersion(servicePath: string): 'v2' | 'v4' {
  return servicePath.includes('/odata4/') ? 'v4' : 'v2';
}

function parseSapResponse(data: unknown): { results: Record<string, unknown>[]; count: number } {
  const payload = data as Record<string, unknown>;
  if (payload.d && Array.isArray((payload.d as Record<string, unknown>).results)) {
    const results = (payload.d as Record<string, unknown>).results as Record<string, unknown>[];
    const count = parseInt(String((payload.d as Record<string, unknown>).__count), 10) || results.length;
    return { results, count };
  }
  if (Array.isArray(payload.value)) {
    const results = payload.value as Record<string, unknown>[];
    const count = Number(payload['@odata.count']) || results.length;
    return { results, count };
  }
  if (payload.d && typeof payload.d === 'object') {
    return { results: [payload.d as Record<string, unknown>], count: 1 };
  }
  return { results: [], count: 0 };
}

/** Server-side SAP OData query — bypasses HTTP self-call to /api/sap. */
export async function querySapDirect(
  service: string,
  entity: string,
  options: SapDirectQueryOptions = {}
): Promise<SapDirectResult> {
  const config = getSapConfig();
  if (!config.sapHost) {
    return { success: false, data: [], count: 0, error: 'SAP host not configured' };
  }

  const servicePath = SERVICE_PATH_MAP[service];
  if (!servicePath) {
    return { success: false, data: [], count: 0, error: `Unknown service: ${service}` };
  }

  const odataVersion = getODataVersion(servicePath);
  const queryParams: string[] = [`sap-client=${config.sapClient}`];
  if (odataVersion === 'v2') queryParams.push('$format=json');

  if (options.top !== undefined) queryParams.push(`$top=${options.top}`);
  if (options.skip !== undefined) queryParams.push(`$skip=${options.skip}`);
  if (options.orderby) queryParams.push(`$orderby=${encodeURIComponent(options.orderby)}`);
  if (options.filter) queryParams.push(`$filter=${encodeURIComponent(options.filter)}`);
  if (options.select) queryParams.push(`$select=${encodeURIComponent(options.select)}`);
  else {
    const defaultSelect = SAP_DEFAULT_SELECTS[`${service}:${entity}`];
    if (defaultSelect) queryParams.push(`$select=${encodeURIComponent(defaultSelect)}`);
  }
  if (options.count) {
    if (odataVersion === 'v4') queryParams.push('$count=true');
    else queryParams.push('$inlinecount=allpages');
  }

  const sapUrl = `${config.sapScheme}://${config.sapHost}${servicePath}${entity}?${queryParams.join('&')}`;

  try {
    const response = await fetch(sapUrl, {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { success: false, data: [], count: 0, error: `SAP API returned ${response.status}` };
    }

    const json = await response.json();
    const { results, count } = parseSapResponse(json);
    return { success: true, data: results, count };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SAP request failed';
    return { success: false, data: [], count: 0, error: message };
  }
}
