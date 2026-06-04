export interface BillingReconcileLineItem {
  NetAmount?: string | number;
  TaxAmount?: string | number;
}

export interface BillingReconcileBillingRow {
  NetAmount?: string | number;
  TaxAmount?: string | number;
  TransactionCurrency?: string;
  BillingDocument?: string;
}

export interface BillingReconcileHeader {
  TotalNetAmount?: string | number;
  TransactionCurrency?: string;
  OverallBillingStatus?: string;
}

export interface BillingReconcileCurrencyRow {
  currency: string;
  orderNet: number;
  orderTaxFromLines: number;
  billedNet: number;
  billedTax: number;
  netDifference: number;
  taxDifference: number;
}

export interface BillingReconcileResult {
  rows: BillingReconcileCurrencyRow[];
  partialBilling: boolean;
  billingDocumentCount: number;
  alerts: string[];
}

const AMOUNT_EPS = 0.01;

function toAmount(raw: string | number | undefined): number {
  if (raw == null || raw === '') return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

function normalizeCurrency(c?: string): string {
  const t = (c ?? '').trim();
  return t || 'CNY';
}

function addToMap(map: Map<string, { net: number; tax: number }>, currency: string, net: number, tax: number) {
  const key = normalizeCurrency(currency);
  const prev = map.get(key) ?? { net: 0, tax: 0 };
  map.set(key, { net: prev.net + net, tax: prev.tax + tax });
}

export function reconcileOrderBilling(
  header: BillingReconcileHeader | null | undefined,
  items: BillingReconcileLineItem[],
  billingRows: BillingReconcileBillingRow[]
): BillingReconcileResult {
  const orderCurrency = normalizeCurrency(header?.TransactionCurrency);
  const orderNetHeader = toAmount(header?.TotalNetAmount);

  const lineTotalsByCurrency = new Map<string, { net: number; tax: number }>();
  let lineNetSum = 0;
  let lineTaxSum = 0;
  for (const item of items) {
    const net = toAmount(item.NetAmount);
    const tax = toAmount(item.TaxAmount);
    lineNetSum += net;
    lineTaxSum += tax;
  }
  addToMap(lineTotalsByCurrency, orderCurrency, lineNetSum, lineTaxSum);

  const billedByCurrency = new Map<string, { net: number; tax: number }>();
  const billDocs = new Set<string>();
  for (const row of billingRows) {
    if (row.BillingDocument) billDocs.add(row.BillingDocument);
    addToMap(
      billedByCurrency,
      row.TransactionCurrency ?? orderCurrency,
      toAmount(row.NetAmount),
      toAmount(row.TaxAmount)
    );
  }

  const currencies = new Set<string>([orderCurrency, ...billedByCurrency.keys()]);

  const rows: BillingReconcileCurrencyRow[] = [...currencies].map((currency) => {
    const lineBucket = lineTotalsByCurrency.get(currency) ?? { net: 0, tax: 0 };
    const billed = billedByCurrency.get(currency) ?? { net: 0, tax: 0 };

    const orderNet = currency === orderCurrency ? orderNetHeader : 0;
    const orderTaxFromLines = lineBucket.tax;

    const netDifference = orderNet - billed.net;
    const taxDifference = orderTaxFromLines - billed.tax;

    return {
      currency,
      orderNet,
      orderTaxFromLines,
      billedNet: billed.net,
      billedTax: billed.tax,
      netDifference,
      taxDifference,
    };
  });

  const billingStatus = header?.OverallBillingStatus ?? '';
  const billedTotalNet = [...billedByCurrency.values()].reduce((s, b) => s + b.net, 0);
  const partialBilling =
    billingStatus !== 'C' && billDocs.size > 0 && billedTotalNet > AMOUNT_EPS;

  const alerts: string[] = [];
  if (currencies.size > 1 || billedByCurrency.size > 1) {
    alerts.push('存在多种币种，以下按币种分别核对，不跨币种汇总。');
  }
  if (partialBilling) {
    alerts.push('部分开票：开票状态未完成，但已有发票明细。');
  }

  for (const row of rows) {
    if (row.orderNet <= 0 && row.billedNet <= 0) continue;
    if (row.orderNet > AMOUNT_EPS && Math.abs(row.netDifference) > AMOUNT_EPS) {
      alerts.push(
        `${row.currency} 净额差异 ${formatDiff(row.netDifference)}（订单 ${fmt(row.orderNet)} − 已开票 ${fmt(row.billedNet)}）`
      );
    }
    if (row.orderTaxFromLines > AMOUNT_EPS && Math.abs(row.taxDifference) > AMOUNT_EPS) {
      alerts.push(
        `${row.currency} 税额差异 ${formatDiff(row.taxDifference)}（订单行税额合计 ${fmt(row.orderTaxFromLines)} − 已开票税额 ${fmt(row.billedTax)}）`
      );
    }
  }

  return {
    rows: rows.sort((a, b) => a.currency.localeCompare(b.currency)),
    partialBilling,
    billingDocumentCount: billDocs.size,
    alerts,
  };
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDiff(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${fmt(n)}`;
}
