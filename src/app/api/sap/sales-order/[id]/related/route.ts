import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Read a value from .env.local by key
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

function getAuthHeader(username: string, password: string): string {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Fetch SAP OData V2 endpoint
 */
async function fetchSapV2(
  baseUrl: string,
  entity: string,
  params: Record<string, string>,
  auth: string
): Promise<unknown> {
  const queryString = new URLSearchParams(params).toString();
  const url = `${baseUrl}${entity}?${queryString}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: auth, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`SAP V2 error: ${response.status}`);
  const data = await response.json();
  if (data.d?.results) return data.d.results;
  if (data.d) return [data.d];
  if (data.value) return data.value;
  return [];
}

/**
 * GET /api/sap/sales-order/[id]/related
 *
 * Fetches delivery items and billing document items for a given sales order,
 * keyed by sales order item number for easy line-item display.
 *
 * Response shape:
 * {
 *   deliveryItems: Record<string, { DeliveryDocument, DeliveryDocumentItem, ActualDeliveryQuantity, DeliveryUnit }[]>,
 *   billingItems: Record<string, { BillingDocument, BillingDocumentItem, BilledQuantity, BilledQuantityUnit, NetAmount }[]>
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: salesOrderId } = await params;
  const config = getSapConfig();

  if (!config.sapHost || !config.sapUsername || !config.sapPassword) {
    return NextResponse.json({ success: false, error: 'SAP not configured' }, { status: 500 });
  }

  const baseUrl = `${config.sapScheme}://${config.sapHost}/sap/opu/odata/sap/`;
  const auth = getAuthHeader(config.sapUsername, config.sapPassword);
  const client = config.sapClient;

  try {
    // 1. Fetch outbound delivery items referencing this sales order
    //    API_OUTBOUND_DELIVERY_SRV - A_OutbDeliveryItem has ReferenceSDDocument + ReferenceSDDocumentItem
    let deliveryItems: Array<Record<string, unknown>> = [];
    try {
      deliveryItems = await fetchSapV2(
        baseUrl,
        'API_OUTBOUND_DELIVERY_SRV;v=0002/A_OutbDeliveryItem',
        {
          '$format': 'json',
          'sap-client': client,
          '$filter': `ReferenceSDDocument eq '${salesOrderId}'`,
          '$select': 'DeliveryDocument,DeliveryDocumentItem,ReferenceSDDocument,ReferenceSDDocumentItem,ActualDeliveryQuantity,DeliveryUnit,DeliveryDocumentItemText',
        },
        auth
      ) as Array<Record<string, unknown>>;
    } catch (e) {
      console.warn('Delivery items fetch failed (non-critical):', e instanceof Error ? e.message : e);
    }

    // 2. Fetch billing document items referencing this sales order
    //    API_BILLING_DOCUMENT_SRV - A_BillingDocumentItem has ReferenceSDDocument + ReferenceSDDocumentItem
    let billingItems: Array<Record<string, unknown>> = [];
    try {
      billingItems = await fetchSapV2(
        baseUrl,
        'API_BILLING_DOCUMENT_SRV/A_BillingDocumentItem',
        {
          '$format': 'json',
          'sap-client': client,
          '$filter': `ReferenceSDDocument eq '${salesOrderId}'`,
          '$select': 'BillingDocument,BillingDocumentItem,ReferenceSDDocument,ReferenceSDDocumentItem,BilledQuantity,BilledQuantityUnit,NetAmount',
        },
        auth
      ) as Array<Record<string, unknown>>;
    } catch (e) {
      console.warn('Billing items fetch failed (non-critical):', e instanceof Error ? e.message : e);
    }

    // Group by SalesOrderItem for fast lookup in UI
    const deliveryByItem: Record<string, unknown[]> = {};
    for (const item of deliveryItems) {
      const soItem = String(item.ReferenceSDDocumentItem || '');
      if (!deliveryByItem[soItem]) deliveryByItem[soItem] = [];
      deliveryByItem[soItem].push(item);
    }

    const billingByItem: Record<string, unknown[]> = {};
    for (const item of billingItems) {
      const soItem = String(item.ReferenceSDDocumentItem || '');
      if (!billingByItem[soItem]) billingByItem[soItem] = [];
      billingByItem[soItem].push(item);
    }

    // 3. Fetch production orders linked to this sales order
    //    CE_PRODUCTIONORDER_0001 (V4) - ProductionOrder has SalesOrder + SalesOrderItem
    let productionOrders: Array<Record<string, unknown>> = [];
    try {
      // Try V4 API first
      const v4BaseUrl = `${config.sapScheme}://${config.sapHost}/sap/opu/odata4/sap/api_productionorder/srvd_a2x/sap/productionorder/0001/`;
      const v4Response = await fetch(
        `${v4BaseUrl}ProductionOrder?$filter=SalesOrder eq '${salesOrderId}'&$select=ProductionOrder,ProductionOrderItem,SalesOrder,SalesOrderItem,Material,MaterialName,ProductionPlant,ProductionOrderType,ProductionOrderStatus,OrderPlannedTotalQty,ActualDeliveredQuantity&$format=json`,
        { headers: { Authorization: auth, Accept: 'application/json' } }
      );
      if (v4Response.ok) {
        const v4Data = await v4Response.json();
        productionOrders = v4Data.value || [];
      }
    } catch (e) {
      console.warn('Production orders V4 fetch failed:', e instanceof Error ? e.message : e);
    }

    // Fallback to V2 API
    if (productionOrders.length === 0) {
      try {
        productionOrders = await fetchSapV2(
          baseUrl,
          'API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder',
          {
            '$format': 'json',
            'sap-client': client,
            '$filter': `SalesOrder eq '${salesOrderId}'`,
            '$select': 'ProductionOrder,ProductionOrderItem,SalesOrder,SalesOrderItem,Product,ProductionPlant,ProductionOrderType,ProductionOrderStatus,OrderPlannedTotalQty,ActualDeliveredQuantity',
          },
          auth
        ) as Array<Record<string, unknown>>;
      } catch (e) {
        console.warn('Production orders V2 fetch failed:', e instanceof Error ? e.message : e);
      }
    }

    // Group production orders by SalesOrderItem
    const productionByItem: Record<string, unknown[]> = {};
    for (const po of productionOrders) {
      const soItem = String(po.SalesOrderItem || '');
      if (!productionByItem[soItem]) productionByItem[soItem] = [];
      productionByItem[soItem].push(po);
    }

    return NextResponse.json({
      success: true,
      data: {
        deliveryByItem,
        billingByItem,
        productionByItem,
      },
    });
  } catch (error) {
    console.error('Failed to fetch sales order related data:', error);
    // Return empty data instead of error, so UI can still display the order
    return NextResponse.json({
      success: true,
      data: {
        deliveryByItem: {},
        billingByItem: {},
        productionByItem: {},
      },
    });
  }
}
