import {
  assessSalesOrderRisk,
  parseRequestedDeliveryDay,
  type SalesOrderRiskInput,
} from '@/lib/sap-sales-order-risk';

export interface LineFulfillmentSourceItem {
  SalesOrderItem: string;
  Product?: string;
  SalesOrderItemText?: string;
  RequestedQuantity?: string | number;
  RequestedQuantityUnit?: string;
  RequestedQuantitySAPUnit?: string;
}

export interface LineFulfillmentDeliveryRow {
  DeliveryDocument?: string;
  ReferenceSDDocumentItem?: string;
  ActualDeliveryQuantity?: string | number;
  DeliveryQuantityUnit?: string;
}

export interface LineFulfillmentBillingRow {
  BillingDocument?: string;
  ReferenceSDDocumentItem?: string;
  BillingQuantity?: string | number;
  BillingQuantityUnit?: string;
}

export interface LineFulfillmentProgress {
  salesOrderItem: string;
  product: string;
  description: string;
  orderQty: number;
  orderUnit: string;
  deliveredQty: number;
  billedQty: number;
  undeliveredQty: number;
  unbilledQty: number;
  /** 0–100；单位不一致时为 null */
  deliveryPct: number | null;
  billingPct: number | null;
  unitMismatchNote?: string;
  shippedUnbilled: boolean;
  deliveryDueRisk: boolean;
  deliveryDocCount: number;
  billingDocCount: number;
}

function toQty(raw: string | number | undefined): number {
  if (raw == null || raw === '') return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

/** 对齐 SAP 行号（去前导零） */
export function normalizeSalesOrderItemNo(raw: string | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const n = parseInt(trimmed, 10);
  return Number.isNaN(n) ? trimmed : String(n);
}

function sumQuantities(
  rows: { qty: number; unit?: string }[],
  expectedUnit: string
): { sum: number; mismatchUnits: string[] } {
  const mismatchUnits = new Set<string>();
  let sum = 0;
  for (const row of rows) {
    const u = (row.unit ?? '').trim();
    if (!expectedUnit) {
      sum += row.qty;
      continue;
    }
    if (!u || u === expectedUnit) {
      sum += row.qty;
    } else {
      mismatchUnits.add(u);
    }
  }
  return { sum, mismatchUnits: [...mismatchUnits] };
}

function completionPct(done: number, total: number): number | null {
  if (total <= 0) return total === 0 && done === 0 ? 100 : null;
  return Math.min(100, Math.round((done / total) * 1000) / 10);
}

export function buildLineFulfillmentProgress(
  items: LineFulfillmentSourceItem[],
  deliveries: LineFulfillmentDeliveryRow[],
  billing: LineFulfillmentBillingRow[],
  headerForDueRisk?: SalesOrderRiskInput & { RequestedDeliveryDate?: string }
): LineFulfillmentProgress[] {
  const headerRisk = headerForDueRisk ? assessSalesOrderRisk(headerForDueRisk) : null;
  const headerDueRisk =
    headerRisk?.deliveryRisk === 'overdue' || headerRisk?.deliveryRisk === 'due-soon';

  return items.map((item) => {
    const lineKey = normalizeSalesOrderItemNo(item.SalesOrderItem);
    const orderUnit = (item.RequestedQuantitySAPUnit ?? item.RequestedQuantityUnit ?? '').trim();
    const orderQty = toQty(item.RequestedQuantity);

    const lineDeliveries = deliveries.filter(
      (d) => normalizeSalesOrderItemNo(d.ReferenceSDDocumentItem) === lineKey
    );
    const lineBilling = billing.filter(
      (b) => normalizeSalesOrderItemNo(b.ReferenceSDDocumentItem) === lineKey
    );

    const delSum = sumQuantities(
      lineDeliveries.map((d) => ({
        qty: toQty(d.ActualDeliveryQuantity),
        unit: d.DeliveryQuantityUnit,
      })),
      orderUnit
    );
    const billSum = sumQuantities(
      lineBilling.map((b) => ({
        qty: toQty(b.BillingQuantity),
        unit: b.BillingQuantityUnit,
      })),
      orderUnit
    );

    const mismatchParts: string[] = [];
    if (delSum.mismatchUnits.length) {
      mismatchParts.push(`发货单位 ${delSum.mismatchUnits.join('、')} 与订单单位 ${orderUnit || '-'} 不一致，未并入合计`);
    }
    if (billSum.mismatchUnits.length) {
      mismatchParts.push(`开票单位 ${billSum.mismatchUnits.join('、')} 与订单单位 ${orderUnit || '-'} 不一致，未并入合计`);
    }

    const deliveredQty = delSum.sum;
    const billedQty = billSum.sum;
    const undeliveredQty = Math.max(0, orderQty - deliveredQty);
    const unbilledQty = Math.max(0, orderQty - billedQty);
    const unitMismatch = mismatchParts.length > 0;

    const shippedUnbilled = deliveredQty > billedQty + 1e-9 && deliveredQty > 0;
    const deliveryDueRisk = undeliveredQty > 0 && Boolean(headerDueRisk);

    return {
      salesOrderItem: item.SalesOrderItem,
      product: item.Product ?? '-',
      description: item.SalesOrderItemText ?? '-',
      orderQty,
      orderUnit: orderUnit || '-',
      deliveredQty,
      billedQty,
      undeliveredQty,
      unbilledQty,
      deliveryPct: unitMismatch ? null : completionPct(deliveredQty, orderQty),
      billingPct: unitMismatch ? null : completionPct(billedQty, orderQty),
      unitMismatchNote: unitMismatch ? mismatchParts.join('；') : undefined,
      shippedUnbilled,
      deliveryDueRisk,
      deliveryDocCount: new Set(lineDeliveries.map((d) => d.DeliveryDocument).filter(Boolean)).size,
      billingDocCount: new Set(lineBilling.map((b) => b.BillingDocument).filter(Boolean)).size,
    };
  });
}

export function isHeaderDeliveryDueRisk(header?: SalesOrderRiskInput): boolean {
  const r = assessSalesOrderRisk(header ?? {});
  return r.deliveryRisk === 'overdue' || r.deliveryRisk === 'due-soon';
}
