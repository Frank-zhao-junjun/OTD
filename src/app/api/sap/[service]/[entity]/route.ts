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

// Default headers for SAP OData requests
const SAP_HEADERS = {
  'Authorization': getAuthHeader(),
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'sap-client': SAP_CLIENT,
};

/**
 * Generic SAP OData proxy endpoint
 * Handles GET requests for any SAP OData entity
 * 
 * URL pattern: /api/sap/[service]/[entity]
 * Query params: top, skip, filter, select, orderby, expand, format, id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string; entity: string }> }
): Promise<NextResponse> {
  const { service, entity } = await params;
  
  // Check credentials
  if (!SAP_USERNAME || !SAP_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'SAP credentials not configured' },
      { status: 500 }
    );
  }
  
  // Build SAP URL
  const searchParams = request.nextUrl.searchParams;
  
  // Build query options
  const queryParams: string[] = [];
  
  // Add sap-client
  queryParams.push(`sap-client=${SAP_CLIENT}`);
  
  // Add format (default json)
  queryParams.push(`$format=json`);
  
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
  if (select) queryParams.push(`$select=${select}`);
  
  // Add orderby
  const orderby = searchParams.get('orderby');
  if (orderby) queryParams.push(`$orderby=${orderby}`);
  
  // Add expand
  const expand = searchParams.get('expand');
  if (expand) queryParams.push(`$expand=${expand}`);
  
  // Handle single entity query (by key)
  const id = searchParams.get('id');
  let entityPath = entity;
  if (id) {
    entityPath = `${entity}('${id}')`;
  }
  
  // Construct full SAP URL
  const sapUrl = `${SAP_BASE_URL}/sap/opu/odata/sap/${service}/${entityPath}?${queryParams.join('&')}`;
  
  try {
    // Make request to SAP
    const response = await fetch(sapUrl, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SAP API error: ${response.status} - ${errorText}`);
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
    // V2 format: { d: { results: [...] } }
    // V4 format: { value: [...] }
    let results: unknown[] = [];
    let count: number | undefined = undefined;
    
    if (data.d && data.d.results) {
      // OData V2 format
      results = data.d.results;
      count = data.d.__count || results.length;
    } else if (data.value) {
      // OData V4 format
      results = data.value;
      count = data['@odata.count'] || results.length;
    } else if (data.d) {
      // Single entity V2
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

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}