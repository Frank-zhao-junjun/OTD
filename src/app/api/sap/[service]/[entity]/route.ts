import { NextRequest, NextResponse } from 'next/server';

import { appendApiError } from '@/lib/api-error-log';

import { formatAuditUser, getSessionUserFromRequest } from '@/lib/auth-session';

import { mapSapHttpError } from '@/lib/sap-errors';

import { appendQueryAudit } from '@/lib/query-audit-server';

import { getSapCredentialsForUser } from '@/lib/portal-users';



const SAP_BASE_URL = process.env.SAP_BASE_URL || 'https://my200967-api.s4hana.sapcloud.cn';

const SAP_CLIENT = process.env.SAP_CLIENT || '100';



/**

 * MVP SAP auth model (see PRD §4.1):

 * - Default: single technical communication user (SAP_USERNAME/SAP_PASSWORD).

 *   SAP authorization still applies at OData layer; audit records mapped sapUserId.

 * - Full PRD: per-user sapCommunicationUser + sapCommunicationPassword on portal user.

 *   When set, OData calls use that user's credentials → true per-user SAP auth (AC6).

 */

function getAuthHeader(username: string, password: string): string {

  const credentials = Buffer.from(`${username}:${password}`).toString('base64');

  return `Basic ${credentials}`;

}



const SERVICE_PATH_MAP: Record<string, string> = {

  'API_PRODUCT_SRV': '/sap/opu/odata/sap/API_PRODUCT_SRV/',

  'API_BUSINESS_PARTNER': '/sap/opu/odata/sap/API_BUSINESS_PARTNER/',

  'API_SALES_ORDER_SRV': '/sap/opu/odata/sap/API_SALES_ORDER_SRV/',

  'API_PRODUCTION_ORDER_2_SRV': '/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/',

  'API_MATERIAL_STOCK_SRV': '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/',

  'API_OUTBOUND_DELIVERY_SRV': '/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=0002/',

  'API_BILLING_DOCUMENT_SRV': '/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/',

  'API_MATERIAL_DOCUMENT_SRV': '/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/',

  'API_PROD_ORDER_CONFIRMATION_2_SRV': '/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/',

  'CE_SALESORDER_0001': '/sap/opu/odata4/sap/api_salesorder/srvd_a2x/sap/salesorder/0001/',

  'CE_PRODUCTIONORDER_0001': '/sap/opu/odata4/sap/api_productionorder/srvd_a2x/sap/productionorder/0001/',

};



function getODataVersion(servicePath: string): 'v2' | 'v4' {

  if (servicePath.includes('/odata4/')) return 'v4';

  return 'v2';

}



export async function GET(

  request: NextRequest,

  { params }: { params: Promise<{ service: string; entity: string }> }

): Promise<NextResponse> {

  const { service, entity } = await params;



  const auth = await getSessionUserFromRequest(request);

  if (!auth) {

    return NextResponse.json(

      { success: false, error: '请先登录', code: 'AUTH_REQUIRED' },

      { status: 401 }

    );

  }



  const { user } = auth;

  const auditUser = formatAuditUser(user);



  if (!user.sapUserId) {

    appendQueryAudit({

      user: auditUser,

      module: 'sap-proxy',

      action: 'GET',

      conditions: { service, entity, reason: 'no_sap_user_id' },

      success: false,

      error: '当前账号未绑定 SAP User ID，无法访问业务数据',

    });

    return NextResponse.json(

      {

        success: false,

        error: '当前账号未绑定 SAP User ID，无法访问业务数据',

        code: 'SAP_USER_UNBOUND',

      },

      { status: 403 }

    );

  }



  const sapCreds = getSapCredentialsForUser(user);

  if (!sapCreds.username || !sapCreds.password) {

    return NextResponse.json(

      {

        success: false,

        error: 'SAP credentials not configured. Please set SAP_USERNAME and SAP_PASSWORD in .env.local',

      },

      { status: 500 }

    );

  }



  const auditConditions = {

    service,

    entity,

    filter: request.nextUrl.searchParams.get('filter'),

    top: request.nextUrl.searchParams.get('top'),

    id: request.nextUrl.searchParams.get('id'),

    sapUserId: user.sapUserId,

    sapAuthMode: sapCreds.mode,

  };



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



  if (odataVersion === 'v2') {

    queryParams.push(`$format=json`);

  }



  const top = searchParams.get('top');

  const skip = searchParams.get('skip');

  if (top) queryParams.push(`$top=${top}`);

  if (skip) queryParams.push(`$skip=${skip}`);



  const filter = searchParams.get('filter');

  if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);



  const select = searchParams.get('select');

  if (select) queryParams.push(`$select=${encodeURIComponent(select)}`);



  const orderby = searchParams.get('orderby');

  if (orderby) queryParams.push(`$orderby=${encodeURIComponent(orderby)}`);



  const expand = searchParams.get('expand');

  if (expand) queryParams.push(`$expand=${encodeURIComponent(expand)}`);



  const count = searchParams.get('count');

  if (count === 'true') {
    if (odataVersion === 'v4') {
      queryParams.push('$count=true');
    } else if (odataVersion === 'v2') {
      queryParams.push('$inlinecount=allpages');
    }
  }



  const id = searchParams.get('id');

  let entityPath = entity;

  if (id) {

    entityPath = `${entity}('${id}')`;

  }



  const sapUrl = `${SAP_BASE_URL}${servicePath}${entityPath}?${queryParams.join('&')}`;



  try {

    const requestHeaders: Record<string, string> = {

      Authorization: getAuthHeader(sapCreds.username, sapCreds.password),

      Accept: 'application/json',

    };



    const response = await fetch(sapUrl, {

      method: 'GET',

      headers: requestHeaders,

    });



    if (!response.ok) {

      const errorText = await response.text();

      console.error(`SAP API error: ${response.status} - ${errorText.substring(0, 500)}`);

      const mapped = mapSapHttpError(response.status, errorText);

      appendApiError({

        user: auditUser,

        module: `sap-proxy/${service}/${entity}`,

        status: response.status,

        code: mapped.code,

        message: mapped.message,

        details: errorText.substring(0, 500),

      });

      appendQueryAudit({

        user: auditUser,

        module: 'sap-proxy',

        action: 'GET',

        conditions: auditConditions,

        success: false,

        error: mapped.message,

      });

      return NextResponse.json(

        {

          success: false,

          error: mapped.message,

          code: mapped.code,

          details: errorText.substring(0, 500),

        },

        { status: response.status }

      );

    }



    const data = await response.json();



    let results: unknown[] = [];

    let resultCount: number | undefined = undefined;



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



    appendQueryAudit({

      user: auditUser,

      module: 'sap-proxy',

      action: 'GET',

      conditions: auditConditions,

      resultCount,

      success: true,

    });



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

    appendApiError({

      user: auditUser,

      module: `sap-proxy/${service}/${entity}`,

      message: errorMessage,

    });

    appendQueryAudit({

      user: auditUser,

      module: 'sap-proxy',

      action: 'GET',

      conditions: auditConditions,

      success: false,

      error: errorMessage,

    });

    return NextResponse.json(

      { success: false, error: errorMessage },

      { status: 500 }

    );

  }

}

