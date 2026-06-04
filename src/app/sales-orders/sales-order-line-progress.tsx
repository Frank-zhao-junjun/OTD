'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  buildLineFulfillmentProgress,
  normalizeSalesOrderItemNo,
  type LineFulfillmentBillingRow,
  type LineFulfillmentDeliveryRow,
  type LineFulfillmentSourceItem,
} from '@/lib/sap-sales-order-line-fulfillment';
import type { SalesOrderRiskInput } from '@/lib/sap-sales-order-risk';
import { AlertTriangle, Truck, Clock } from 'lucide-react';

function fmtQty(n: number, unit: string): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${unit}`.trim();
}

function pctBar(pct: number | null, tone: 'blue' | 'emerald') {
  if (pct == null) {
    return <span className="text-[10px] text-amber-700">单位不一致</span>;
  }
  const bar =
    tone === 'blue' ? 'bg-blue-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn('h-full rounded-full', bar)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-[10px] font-mono tabular-nums text-slate-600 w-10 text-right">{pct}%</span>
    </div>
  );
}

export function SalesOrderLineProgressTable({
  items,
  deliveries,
  billing,
  header,
  selectedLineItem,
  onSelectLine,
}: {
  items: LineFulfillmentSourceItem[];
  deliveries: LineFulfillmentDeliveryRow[];
  billing: LineFulfillmentBillingRow[];
  header?: SalesOrderRiskInput;
  selectedLineItem: string | null;
  onSelectLine: (salesOrderItem: string) => void;
}) {
  const rows = useMemo(
    () => buildLineFulfillmentProgress(items, deliveries, billing, header),
    [items, deliveries, billing, header]
  );

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">暂无行项目</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-500">
        按销售订单行聚合发货/开票数量（多交货单、多发票按行号汇总）。点击行可查看该行穿透记录。
      </p>
      <div className="overflow-x-auto border border-slate-100 rounded-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50/80 text-slate-600">
              <th className="text-left font-medium px-2 py-2 whitespace-nowrap">行号</th>
              <th className="text-left font-medium px-2 py-2 whitespace-nowrap">物料</th>
              <th className="text-right font-medium px-2 py-2 whitespace-nowrap">订单数量</th>
              <th className="text-right font-medium px-2 py-2 whitespace-nowrap">已发货</th>
              <th className="text-right font-medium px-2 py-2 whitespace-nowrap">已开票</th>
              <th className="text-right font-medium px-2 py-2 whitespace-nowrap">未发货</th>
              <th className="text-right font-medium px-2 py-2 whitespace-nowrap">未开票</th>
              <th className="text-left font-medium px-2 py-2 whitespace-nowrap min-w-[120px]">发货完成率</th>
              <th className="text-left font-medium px-2 py-2 whitespace-nowrap min-w-[120px]">开票完成率</th>
              <th className="text-left font-medium px-2 py-2 whitespace-nowrap">提示</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected =
                normalizeSalesOrderItemNo(selectedLineItem ?? '') ===
                normalizeSalesOrderItemNo(row.salesOrderItem);
              return (
                <tr
                  key={row.salesOrderItem}
                  className={cn(
                    'border-t border-slate-50 cursor-pointer transition-colors',
                    selected && 'bg-blue-50/70',
                    row.shippedUnbilled && !selected && 'bg-orange-50/50',
                    row.deliveryDueRisk && !selected && !row.shippedUnbilled && 'bg-amber-50/40',
                    !selected && !row.shippedUnbilled && !row.deliveryDueRisk && 'hover:bg-slate-50'
                  )}
                  onClick={() => onSelectLine(row.salesOrderItem)}
                >
                  <td className="px-2 py-2 font-mono font-medium text-blue-700">{row.salesOrderItem}</td>
                  <td className="px-2 py-2">
                    <div className="font-mono">{row.product}</div>
                    <div className="text-slate-500 truncate max-w-[140px]" title={row.description}>
                      {row.description}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums">
                    {fmtQty(row.orderQty, row.orderUnit)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-700">
                    {fmtQty(row.deliveredQty, row.orderUnit)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-700">
                    {fmtQty(row.billedQty, row.orderUnit)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-600">
                    {fmtQty(row.undeliveredQty, row.orderUnit)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-600">
                    {fmtQty(row.unbilledQty, row.orderUnit)}
                  </td>
                  <td className="px-2 py-2">{pctBar(row.deliveryPct, 'blue')}</td>
                  <td className="px-2 py-2">{pctBar(row.billingPct, 'emerald')}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {row.shippedUnbilled && (
                        <Badge
                          variant="outline"
                          className="border-orange-400 bg-orange-50 text-orange-900 text-[10px] gap-0.5"
                        >
                          <Truck className="w-3 h-3" />
                          已发未开
                        </Badge>
                      )}
                      {row.deliveryDueRisk && (
                        <Badge
                          variant="outline"
                          className="border-amber-400 bg-amber-50 text-amber-900 text-[10px] gap-0.5"
                        >
                          <Clock className="w-3 h-3" />
                          交期风险
                        </Badge>
                      )}
                      {row.unitMismatchNote && (
                        <Badge variant="outline" className="text-amber-800 border-amber-300 text-[10px] gap-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          单位
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.some((r) => r.unitMismatchNote) && (
        <ul className="text-[11px] text-amber-800 space-y-1 list-disc pl-4">
          {rows
            .filter((r) => r.unitMismatchNote)
            .map((r) => (
              <li key={r.salesOrderItem}>
                行 {r.salesOrderItem}：{r.unitMismatchNote}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
