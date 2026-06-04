'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  assessSalesOrderRisk,
  type SalesOrderRiskAssessment,
  type SalesOrderRiskInput,
} from '@/lib/sap-sales-order-risk';
import { AlertTriangle, Clock, CircleCheck, Truck, ClipboardList, Ban } from 'lucide-react';

export function SalesOrderRiskBadges({
  order,
  assessment: provided,
  compact = false,
  className,
}: {
  order: SalesOrderRiskInput;
  assessment?: SalesOrderRiskAssessment;
  compact?: boolean;
  className?: string;
}) {
  const r = provided ?? assessSalesOrderRisk(order);

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {r.cancelledOrRejected && (
        <Badge
          variant="destructive"
          className="gap-0.5 font-semibold ring-2 ring-red-300/80"
        >
          <Ban className="w-3 h-3" />
          {r.cancellationLabel ?? '已取消/拒绝'}
        </Badge>
      )}
      {!r.cancelledOrRejected && r.deliveryRisk === 'overdue' && (
        <Badge variant="destructive" className="gap-0.5">
          <AlertTriangle className="w-3 h-3" />
          {r.deliveryRiskLabel}
        </Badge>
      )}
      {!r.cancelledOrRejected && r.deliveryRisk === 'due-soon' && (
        <Badge
          variant="outline"
          className="border-amber-400 bg-amber-50 text-amber-900 gap-0.5"
        >
          <Clock className="w-3 h-3" />
          {r.deliveryRiskLabel}
        </Badge>
      )}
      {!r.cancelledOrRejected && r.deliveryRisk === 'on-track' && (
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50/80 text-emerald-800 gap-0.5"
        >
          <CircleCheck className="w-3 h-3" />
          {r.deliveryRiskLabel}
        </Badge>
      )}
      {!r.cancelledOrRejected && r.deliveryRisk === 'no-date' && (
        <Badge variant="outline" className="text-slate-500">
          {r.deliveryRiskLabel}
        </Badge>
      )}
      {r.shippedUnbilled && (
        <Badge
          variant="outline"
          className="border-orange-400 bg-orange-50 text-orange-900 font-semibold gap-0.5 ring-1 ring-orange-200"
        >
          <Truck className="w-3 h-3" />
          已发货未开票
        </Badge>
      )}
      {r.openPending && (
        <Badge variant="secondary" className="gap-0.5">
          <ClipboardList className="w-3 h-3" />
          待处理
        </Badge>
      )}
      {!compact && r.hints.length > 0 && (
        <span className="sr-only">{r.hints.join('；')}</span>
      )}
    </div>
  );
}

export function SalesOrderRiskBanner({
  order,
  assessment: provided,
}: {
  order: SalesOrderRiskInput;
  assessment?: SalesOrderRiskAssessment;
}) {
  const r = provided ?? assessSalesOrderRisk(order);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-medium text-slate-600">销售风险提示（基于交期与 SAP 状态推导，非系统状态）</p>
        <span className="text-[10px] text-slate-400 tabular-nums">优先级 {r.priorityScore}</span>
      </div>
      <SalesOrderRiskBadges order={order} assessment={r} />
      {r.hints.length > 0 && (
        <ul className="text-xs text-slate-600 list-disc pl-4 space-y-0.5">
          {r.hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
