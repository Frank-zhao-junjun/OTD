'use client';

import {
  resolveSalesOrderStatus,
  SALES_ORDER_STATUS_DIMENSION_LABELS,
  type SalesOrderStatusDimension,
} from '@/lib/sap-sales-order-status';
import { SalesOrderStatusBadge } from '@/app/sales-orders/sales-order-status-badge';
import { Info } from 'lucide-react';

const DIMENSIONS: SalesOrderStatusDimension[] = ['process', 'delivery', 'billing'];

export function SalesOrderStatusSalesGuide({
  processStatus,
  deliveryStatus,
  billingStatus,
}: {
  processStatus?: string;
  deliveryStatus?: string;
  billingStatus?: string;
}) {
  const values: Record<SalesOrderStatusDimension, string | undefined> = {
    process: processStatus,
    delivery: deliveryStatus,
    billing: billingStatus,
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <Info className="w-3.5 h-3.5 text-slate-400" />
        销售视角状态说明（SAP 系统事实，与上方风险提示区分）
      </div>
      <ul className="space-y-2.5">
        {DIMENSIONS.map((dim) => {
          const resolved = resolveSalesOrderStatus(values[dim], dim);
          return (
            <li key={dim} className="text-xs border-b border-slate-50 last:border-0 pb-2 last:pb-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-slate-500 w-20 shrink-0">
                  {SALES_ORDER_STATUS_DIMENSION_LABELS[dim]}
                </span>
                <SalesOrderStatusBadge status={values[dim]} dimension={dim} />
              </div>
              <p className="text-slate-600 pl-0 sm:pl-20">
                <span className="text-slate-400">含义：</span>
                {resolved.description}
              </p>
              <p className="text-slate-800 mt-0.5 pl-0 sm:pl-20">
                <span className="text-slate-400">下一步：</span>
                {resolved.salesFocus}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
