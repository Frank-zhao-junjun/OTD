'use client';

import { Badge } from '@/components/ui/badge';
import {
  assessSalesOrderCancellation,
  resolveRejectionStatus,
  type SalesOrderCancellationInput,
} from '@/lib/sap-sales-order-cancellation';
import { SalesOrderStatusBadge } from '@/app/sales-orders/sales-order-status-badge';
import { Ban } from 'lucide-react';

export interface LineRejectionRow {
  SalesOrderItem: string;
  Product?: string;
  SDDocumentRejectionStatus?: string;
}

export function SalesOrderCancellationPanel({
  header,
  items = [],
}: {
  header: SalesOrderCancellationInput;
  items?: LineRejectionRow[];
}) {
  const assessment = assessSalesOrderCancellation(header);
  const headerRejection = resolveRejectionStatus(header.OverallSDDocumentRejectionSts);
  const rejectedLines = items.filter((item) => {
    const r = resolveRejectionStatus(item.SDDocumentRejectionStatus);
    return r.isRejected;
  });

  if (
    assessment.kind === 'none' &&
    !headerRejection.isRejected &&
    rejectedLines.length === 0
  ) {
    return null;
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/70 px-3 py-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-red-900">
        <Ban className="w-4 h-4" />
        取消 / 拒绝状态说明（SAP 系统事实）
      </div>

      {assessment.kind !== 'none' && (
        <div className="text-xs text-red-900/90 space-y-1">
          <p>
            <span className="font-medium">{assessment.label}</span>
            {assessment.description ? ` — ${assessment.description}` : ''}
          </p>
          <p>
            <span className="text-red-800/80">销售关注点：</span>
            {assessment.salesFocus}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-red-800/70 block mb-1">抬头拒绝状态</span>
          <Badge variant="outline" className="border-red-300 bg-white font-mono">
            {headerRejection.unknown
              ? `${headerRejection.code} · 未知`
              : `${headerRejection.label} (${headerRejection.code || '-'})`}
          </Badge>
          <p className="text-red-800/80 mt-1">{headerRejection.description}</p>
        </div>
        <div>
          <span className="text-red-800/70 block mb-1">系统处理</span>
          <SalesOrderStatusBadge status={header.OverallSDProcessStatus} dimension="process" />
        </div>
        <div>
          <span className="text-red-800/70 block mb-1">交货 / 开票</span>
          <div className="flex flex-wrap gap-1">
            <SalesOrderStatusBadge status={header.OverallDeliveryStatus} dimension="delivery" />
            <SalesOrderStatusBadge status={header.OverallBillingStatus} dimension="billing" />
          </div>
        </div>
      </div>

      {rejectedLines.length > 0 && (
        <div>
          <p className="text-xs font-medium text-red-900 mb-1.5">
            行级拒绝（{rejectedLines.length} 行）
          </p>
          <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {rejectedLines.map((line) => {
              const r = resolveRejectionStatus(line.SDDocumentRejectionStatus);
              return (
                <li
                  key={line.SalesOrderItem}
                  className="flex justify-between gap-2 bg-white/60 rounded px-2 py-1 border border-red-100"
                >
                  <span className="font-mono">
                    行 {line.SalesOrderItem} · {line.Product ?? '-'}
                  </span>
                  <span className="shrink-0 text-red-800">
                    {r.unknown ? r.code : `${r.label} (${r.code})`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
