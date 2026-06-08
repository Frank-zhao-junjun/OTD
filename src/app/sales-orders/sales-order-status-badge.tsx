'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  resolveSalesOrderStatus,
  SALES_ORDER_STATUS_DIMENSION_LABELS,
  type SalesOrderStatusDimension,
} from '@/lib/sap-sales-order-status';
import { isSapStatusBlocked } from '@/lib/sap-sales-order-cancellation';
import { cn } from '@/lib/utils';

export function SalesOrderStatusBadge({
  status,
  dimension,
  showCode = true,
}: {
  status: string | undefined;
  dimension: SalesOrderStatusDimension;
  showCode?: boolean;
}) {
  const resolved = resolveSalesOrderStatus(status, dimension);
  const dimLabel = SALES_ORDER_STATUS_DIMENSION_LABELS[dimension];

  if (!status?.trim()) {
    return <Badge variant="outline">-</Badge>;
  }

  const badgeLabel = showCode ? resolved.displayText : resolved.label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={resolved.variant}
          className={cn(
            'cursor-help font-normal max-w-full truncate',
            isSapStatusBlocked(resolved.code) &&
              'ring-2 ring-red-400/90 font-semibold'
          )}
          title=""
        >
          {badgeLabel}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-left space-y-1 p-2.5">
        <p className="font-medium">{dimLabel}</p>
        <p className="opacity-90">{resolved.description}</p>
        <p className="text-[10px] opacity-75 border-t border-background/20 pt-1 mt-1">
          SAP 状态码：{resolved.code}
          {resolved.unknown ? ` · ${resolved.description}` : ''}
        </p>
        <p className="text-[10px] opacity-75">系统事实状态（非销售风险提示）</p>
      </TooltipContent>
    </Tooltip>
  );
}
