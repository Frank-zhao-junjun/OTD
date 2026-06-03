import { NextRequest, NextResponse } from 'next/server';

// SAP configuration from environment variables
const SAP_BASE_URL = process.env.SAP_BASE_URL || 'https://my200967-api.s4hana.sapcloud.cn';
const SAP_USERNAME = process.env.SAP_USERNAME || '';
const SAP_PASSWORD = process.env.SAP_PASSWORD || '';
const SAP_CLIENT = process.env.SAP_CLIENT || '100';

// Build authorization header (Basic Auth)
function getAuthHeader(): string {
  const credentials = Buffer.from(`${SAP_USERNAME}:${SAP_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Service name → SAP path prefix mapping
 * Supports both V2 and V4 OData endpoints.
 *
 * V2 services use path: /sap/opu/odata/sap/{SERVICE_NAME}/
 * V4 services use path: /sap/opu/odata4/sap/{SERVICE_PATH}/
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

  // V4 OData services (preferred for Sales & Production Order)
  'CE_SALESORDER_0001': '/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/',
  'CE_PRODUCTIONORDER_0001': '/sap/opu/odata4/sap/api_productionorder/srvd_a2x/sap/productionorder/0001/',
};

// Detect OData version from service path
function getODataVersion(servicePath: string): 'v2' | 'v4' {
  if (servicePath.includes('/odata4/')) return 'v4';
  return 'v2';
}

/**
 * Generic SAP OData proxy endpoint
 * Handles GET requests for any SAP OData entity
 *
 * URL pattern: /api/sap/[service]/[entity]
 *   service: SAP service name (e.g., CE_SALESORDER_0001, API_PRODUCT_SRV)
 *   entity:  Entity set name (e.g., SalesOrder, A_Product)
 *
 * Query params: top, skip, filter, select, orderby, expand, format, id, count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string; entity: string }> }
): Promise<NextResponse> {
  const { service, entity } = await params;

  // Check credentials
  if (!SAP_USERNAME || !SAP_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'SAP credentials not configured. Please set SAP_USERNAME and SAP_PASSWORD in .env.local' },
      { status: 500 }
    );
  }

  // Resolve service path
  const servicePath = SERVICE_PATH_MAP[service];
  if (!servicePath) {
    return NextResponse.json(
      { success: false, error: `Unknown SAP service: ${service}. Available: ${Object.keys(SERVICE_PATH_MAP).join(', ')}` },
      { status: 400 }
    );
  }

  const odataVersion = getODataVersion(servicePath);

  // Build query options
  const searchParams = request.nextUrl.searchParams;
  const queryParams: string[] = [];

  // Add sap-client
  queryParams.push(`sap-client=${SAP_CLIENT}`);

  // Add format (default json) — V2 uses $format, V4 uses Accept header
  if (odataVersion === 'v2') {
    queryParams.push(`$format=json`);
  }

  // Add pagination
  const top = searchParams.get('top');
  const skip = searchParams.get('skip');
  if (top) queryParams.push(`$top=${top}`);
  if (skip) queryParams.push(`$skip=${skip}`);

  // Add filter
  const filter = searchParams.get('filter');
  if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);

  // Add select
  const select = searchParams.get('select');
  if (select) queryParams.push(`$select=${encodeURIComponent(select)}`);

  // Add orderby
  const orderby = searchParams.get('orderby');
  if (orderby) queryParams.push(`$orderby=${encodeURIComponent(orderby)}`);

  // Add expand
  const expand = searchParams.get('expand');
  if (expand) queryParams.push(`$expand=${encodeURIComponent(expand)}`);

  // Add inline count (V4)
  const count = searchParams.get('count');
  if (odataVersion === 'v4' && count === 'true') {
    queryParams.push('$count=true');
  }
  // V2 inline count
  if (odataVersion === 'v2') {
    queryParams.push('$inlinecount=allpages');
  }

  // Handle single entity query (by key)
  const id = searchParams.get('id');
  let entityPath = entity;
  if (id) {
    entityPath = `${entity}('${id}')`;
  }

  // Construct full SAP URL
  const sapUrl = `${SAP_BASE_URL}${servicePath}${entityPath}?${queryParams.join('&')}`;

  try {
    // Make request to SAP
    const requestHeaders: Record<string, string> = {
      'Authorization': getAuthHeader(),
      'Accept': 'application/json',
    };

    const response = await fetch(sapUrl, {
      method: 'GET',
      headers: requestHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SAP API error: ${response.status} - ${errorText.substring(0, 500)}`);
      return NextResponse.json(
        {
          success: false,
          error: `SAP API returned ${response.status}`,
          details: errorText.substring(0, 500)
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Parse OData response format
    // V2 format: { d: { results: [...], __count: N } }
    // V4 format: { value: [...], @odata.count: N }
    let results: unknown[] = [];
    let count: number | undefined = undefined;

    if (data.d && Array.isArray(data.d.results)) {
      // OData V2 collection format
      results = data.d.results;
      count = parseInt(data.d.__count, 10) || results.length;
    } else if (data.value && Array.isArray(data.value)) {
      // OData V4 collection format
      results = data.value;
      count = data['@odata.count'] || results.length;
    } else if (data.d && !data.d.results) {
      // OData V2 single entity
      results = [data.d];
      count = 1;
    } else {
      // Unknown format, return raw data
      results = [data];
      count = 1;
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: count,
      totalCount: count,
      odataVersion: odataVersion,
    });

  } catch (error) {
    console.error('SAP API request failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
