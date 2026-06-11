import { NextRequest, NextResponse } from 'next/server';

/**
 * Helper: call our own proxy API
 */
async function callProxyApi(path: string): Promise<Array<Record<string, unknown>>> {
  const port = process.env.DEPLOY_RUN_PORT || '5000';
  const url = `http://localhost:${port}${path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Proxy error: ${response.status}`);
  const json = await response.json();
  if (json.success && Array.isArray(json.data)) return json.data;
  return [];
}

/**
 * Normalize SAP item number: "000010" → "10"
 */
function normalizeItem(itemNum: unknown): string {
  return String(parseInt(String(itemNum || '0'), 10));
}

/**
 * GET /api/sap/sales-order/[id]/related
 *
 * Fetches delivery items, billing document items, and production orders
 * for a given sales order, keyed by sales order item number.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: salesOrderId } = await params;

  try {
    // 1. Fetch outbound delivery items referencing this sales order
    let deliveryItems: Array<Record<string, unknown>> = [];
    try {
      deliveryItems = await callProxyApi(
        `/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryItem?filter=ReferenceSDDocument eq '${salesOrderId}'&select=DeliveryDocument,DeliveryDocumentItem,ReferenceSDDocument,ReferenceSDDocumentItem,ActualDeliveryQuantity,DeliveryQuantityUnit,Material`
      );
    } catch (e) {
      console.warn('Delivery items fetch failed (non-critical):', e instanceof Error ? e.message : e);
    }

    // 2. Fetch billing document items referencing this sales order
    let billingItems: Array<Record<string, unknown>> = [];
    try {
      billingItems = await callProxyApi(
        `/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocumentItem?filter=SalesDocument eq '${salesOrderId}'&select=BillingDocument,BillingDocumentItem,SalesDocument,SalesDocumentItem,NetAmount,TransactionCurrency,ReferenceSDDocument,ReferenceSDDocumentItem,Material`
      );
    } catch (e) {
      console.warn('Billing items fetch failed (non-critical):', e instanceof Error ? e.message : e);
    }

    // 3. Fetch production orders linked to this sales order (V4)
    let productionOrders: Array<Record<string, unknown>> = [];
    try {
      productionOrders = await callProxyApi(
        `/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder?filter=SalesOrder eq '${salesOrderId}'&select=ProductionOrder,SalesOrder,SalesOrderItem,Product,ProductionPlant,ProductionOrderType,OrderPlannedTotalQty`
      );
    } catch (e) {
      console.warn('Production orders V4 fetch failed:', e instanceof Error ? e.message : e);
    }

    // Fallback to V2
    if (productionOrders.length === 0) {
      try {
        productionOrders = await callProxyApi(
          `/api/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder?filter=SalesOrder eq '${salesOrderId}'&select=ProductionOrder,ProductionOrderItem,SalesOrder,SalesOrderItem,Product,ProductionPlant,ProductionOrderType,OrderPlannedTotalQty`
        );
      } catch (e) {
        console.warn('Production orders V2 fetch failed:', e instanceof Error ? e.message : e);
      }
    }

    // 4. Fetch delivery header dates (DeliveryDate is on header, not item)
    const deliveryDocNumbers = [...new Set(deliveryItems.map(i => String(i.DeliveryDocument)))];
    const deliveryHeaders: Record<string, Record<string, unknown>> = {};
    if (deliveryDocNumbers.length > 0) {
      try {
        const filterExpr = deliveryDocNumbers.map(d => `DeliveryDocument eq '${d}'`).join(' or ');
        const headers = await callProxyApi(
          `/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader?filter=${encodeURIComponent(filterExpr)}&select=DeliveryDocument,DeliveryDate,ActualGoodsMovementDate`
        );
        for (const h of headers) {
          deliveryHeaders[String(h.DeliveryDocument)] = h;
        }
      } catch (e) {
        console.warn('Delivery headers fetch failed (non-critical):', e instanceof Error ? e.message : e);
      }
    }

    // 5. Fetch billing document header dates (BillingDocumentDate is on header, not item)
    const billingDocNumbers = [...new Set(billingItems.map(i => String(i.BillingDocument)))];
    const billingHeaders: Record<string, Record<string, unknown>> = {};
    if (billingDocNumbers.length > 0) {
      try {
        const filterExpr = billingDocNumbers.map(d => `BillingDocument eq '${d}'`).join(' or ');
        const headers = await callProxyApi(
          `/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument?filter=${encodeURIComponent(filterExpr)}&select=BillingDocument,BillingDocumentDate`
        );
        for (const h of headers) {
          billingHeaders[String(h.BillingDocument)] = h;
        }
      } catch (e) {
        console.warn('Billing headers fetch failed (non-critical):', e instanceof Error ? e.message : e);
      }
    }

    // Enrich delivery items with header dates
    for (const item of deliveryItems) {
      const header = deliveryHeaders[String(item.DeliveryDocument)];
      if (header) {
        item.DeliveryDate = header.DeliveryDate;
        item.ActualGoodsMovementDate = header.ActualGoodsMovementDate;
      }
    }

    // Enrich billing items with header dates
    for (const item of billingItems) {
      const header = billingHeaders[String(item.BillingDocument)];
      if (header) {
        item.BillingDocumentDate = header.BillingDocumentDate;
      }
    }

    // Group by normalized SalesOrderItem
    const deliveryByItem: Record<string, Array<Record<string, unknown>>> = {};
    for (const item of deliveryItems) {
      const soItem = normalizeItem(item.ReferenceSDDocumentItem);
      if (!deliveryByItem[soItem]) deliveryByItem[soItem] = [];
      deliveryByItem[soItem].push(item);
    }

    const billingByItem: Record<string, unknown[]> = {};
    for (const item of billingItems) {
      const soItem = normalizeItem(item.SalesDocumentItem);
      if (!billingByItem[soItem]) billingByItem[soItem] = [];
      billingByItem[soItem].push(item);
    }

    const productionByItem: Record<string, unknown[]> = {};
    for (const po of productionOrders) {
      const soItem = normalizeItem(po.SalesOrderItem);
      if (!productionByItem[soItem]) productionByItem[soItem] = [];
      productionByItem[soItem].push(po);
    }

    return NextResponse.json({
      success: true,
      data: { deliveryByItem, billingByItem, productionByItem },
    });
  } catch (error) {
    console.error('Failed to fetch sales order related data:', error);
    return NextResponse.json({
      success: true,
      data: { deliveryByItem: {}, billingByItem: {}, productionByItem: {} },
    });
  }
}
