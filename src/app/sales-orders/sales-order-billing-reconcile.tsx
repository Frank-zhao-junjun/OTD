'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  reconcileOrderBilling,
  type BillingReconcileBillingRow,
  type BillingReconcileHeader,
  type BillingReconcileLineItem,
} from '@/lib/sap-sales-order-billing-reconcile';
import { AlertTriangle, Receipt } from 'lucide-react';

export function SalesOrderBillingReconcilePanel({
  header,
  items,
  billingRows,
}: {
  header: BillingReconcileHeader | null | undefined;
  items: BillingReconcileLineItem[];
  billingRows: BillingReconcileBillingRow[];
}) {
  const result = useMemo(
    () => reconcileOrderBilling(header, items, billingRows),
    [header, items, billingRows]
  );

  if (!header) return null;

  const orderCurrency = header.TransactionCurrency || 'CNY';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-3 space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
        <Receipt className="w-3.5 h-3.5 text-slate-500" />
        金额与开票核对
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-md bg-white border border-slate-100 px-2 py-1.5">
          <div className="text-slate-400">订单总净额</div>
          <div className="font-mono tabular-nums text-slate-800">
            {header.TotalNetAmount != null
              ? `${Number(header.TotalNetAmount).toLocaleString()} ${orderCurrency}`
              : '-'}
          </div>
        </div>
        <div className="rounded-md bg-white border border-slate-100 px-2 py-1.5">
          <div className="text-slate-400">订单行税额合计</div>
          <div className="font-mono tabular-nums text-slate-800">
            {items
              .reduce((s, i) => s + Number(i.TaxAmount ?? 0), 0)
              .toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
            {orderCurrency}
          </div>
        </div>
        <div className="rounded-md bg-white border border-slate-100 px-2 py-1.5">
          <div className="text-slate-400">已开票净额合计</div>
          <div className="font-mono tabular-nums text-slate-800">
            {result.rows
              .map((r) => `${r.billedNet.toLocaleString()} ${r.currency}`)
              .join(' · ') || '0'}
          </div>
        </div>
        <div className="rounded-md bg-white border border-slate-100 px-2 py-1.5">
          <div className="text-slate-400">已开票税额合计</div>
          <div className="font-mono tabular-nums text-slate-800">
            {result.rows
              .map((r) => `${r.billedTax.toLocaleString()} ${r.currency}`)
              .join(' · ') || '0'}
          </div>
        </div>
      </div>

      {result.rows.length > 0 && (
        <div className="overflow-x-auto border border-slate-100 rounded-md bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left font-medium px-2 py-1.5">币种</th>
                <th className="text-right font-medium px-2 py-1.5">订单净额</th>
                <th className="text-right font-medium px-2 py-1.5">行税额合计</th>
                <th className="text-right font-medium px-2 py-1.5">已开票净额</th>
                <th className="text-right font-medium px-2 py-1.5">已开票税额</th>
                <th className="text-right font-medium px-2 py-1.5">净额差异</th>
                <th className="text-right font-medium px-2 py-1.5">税额差异</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => {
                const netMismatch = Math.abs(row.netDifference) > 0.01 && row.orderNet > 0;
                const taxMismatch = Math.abs(row.taxDifference) > 0.01 && row.orderTaxFromLines > 0;
                return (
                  <tr key={row.currency} className="border-t border-slate-50">
                    <td className="px-2 py-1.5 font-mono">{row.currency}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {row.orderNet.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {row.orderTaxFromLines.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {row.billedNet.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {row.billedTax.toLocaleString()}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-right font-mono tabular-nums ${
                        netMismatch ? 'text-amber-800 font-medium' : 'text-slate-600'
                      }`}
                    >
                      {row.netDifference.toLocaleString()}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-right font-mono tabular-nums ${
                        taxMismatch ? 'text-amber-800 font-medium' : 'text-slate-600'
                      }`}
                    >
                      {row.taxDifference.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {result.partialBilling && (
          <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 text-[10px]">
            部分开票
          </Badge>
        )}
        {result.billingDocumentCount > 0 && (
          <Badge variant="secondary" className="text-[10px] font-mono">
            {result.billingDocumentCount} 张发票
          </Badge>
        )}
      </div>

      {result.alerts.length > 0 && (
        <ul className="space-y-1">
          {result.alerts.map((msg) => (
            <li
              key={msg}
              className="flex items-start gap-1.5 text-xs text-amber-900 bg-amber-50/80 border border-amber-100 rounded px-2 py-1"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {msg}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-slate-400">
        净额差异 = 订单总净额 − 已开票净额；税额差异 = 订单行税额合计 − 已开票税额。正数表示尚未开足。
      </p>
    </div>
  );
}
