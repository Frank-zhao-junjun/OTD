import { parseSapDate } from '@/lib/sap-api-client';
import {
  assessSalesOrderCancellation,
  type SalesOrderCancellationInput,
} from '@/lib/sap-sales-order-cancellation';

/** 销售视角交期风险（不改变 SAP 状态码） */
export type DeliveryRiskKind = 'overdue' | 'due-soon' | 'on-track' | 'no-date';

export interface SalesOrderRiskInput extends SalesOrderCancellationInput {
  SalesOrderDate?: string;
  RequestedDeliveryDate?: string;
  OverallSDProcessStatus?: string;
  OverallDeliveryStatus?: string;
  OverallBillingStatus?: string;
}

export interface SalesOrderRiskAssessment {
  deliveryRisk: DeliveryRiskKind;
  deliveryRiskLabel: string;
  shippedUnbilled: boolean;
  openPending: boolean;
  cancelledOrRejected: boolean;
  cancellationLabel?: string;
  /** 数值越小越优先跟进 */
  priorityScore: number;
  /** 详情/审计用一句话说明 */
  summary: string;
  hints: string[];
}

export const DELIVERY_COMPLETE = 'C';
const PROCESS_OPEN = new Set(['A', 'B']);

function startOfLocalDay(base = new Date()): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addLocalDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatLocalDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 与 assessSalesOrderRisk「近7天需交货」一致的 OData 请求交期区间（本地日历日） */
export function requestedDeliveryDueSoonODataRange(now = new Date()): {
  from: string;
  to: string;
} {
  const today = startOfLocalDay(now);
  const dueEnd = addLocalDays(today, 7);
  return {
    from: formatLocalDateYmd(today),
    to: formatLocalDateYmd(dueEnd),
  };
}

export function parseRequestedDeliveryDay(raw: string | undefined): Date | null {
  if (!raw) return null;
  const iso = parseSapDate(raw);
  if (!iso || iso === '-') return null;
  const [y, m, day] = iso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

function isDeliveryIncomplete(status: string | undefined): boolean {
  return status !== DELIVERY_COMPLETE;
}

export function assessSalesOrderRisk(
  row: SalesOrderRiskInput,
  now = new Date()
): SalesOrderRiskAssessment {
  const today = startOfLocalDay(now);
  const dueEnd = addLocalDays(today, 7);
  const reqDay = parseRequestedDeliveryDay(row.RequestedDeliveryDate);
  const deliveryIncomplete = isDeliveryIncomplete(row.OverallDeliveryStatus);
  const shippedUnbilled =
    row.OverallDeliveryStatus === DELIVERY_COMPLETE &&
    row.OverallBillingStatus !== DELIVERY_COMPLETE &&
    row.OverallBillingStatus !== 'D';
  const openPending = PROCESS_OPEN.has(row.OverallSDProcessStatus ?? '');
  const cancellation = assessSalesOrderCancellation(row);
  const cancelledOrRejected = cancellation.headerClosed || cancellation.kind === 'partially-rejected';

  let deliveryRisk: DeliveryRiskKind;
  let deliveryRiskLabel: string;

  if (!reqDay) {
    deliveryRisk = 'no-date';
    deliveryRiskLabel = '无请求交期';
  } else if (!deliveryIncomplete) {
    deliveryRisk = 'on-track';
    deliveryRiskLabel = '交期正常';
  } else if (reqDay < today) {
    deliveryRisk = 'overdue';
    deliveryRiskLabel = '已逾期·未完成交货';
  } else if (reqDay <= dueEnd) {
    deliveryRisk = 'due-soon';
    deliveryRiskLabel = '近7天需交货';
  } else {
    deliveryRisk = 'on-track';
    deliveryRiskLabel = '交期正常';
  }

  const hints: string[] = [];
  if (cancelledOrRejected) {
    hints.push(
      cancellation.kind === 'partially-rejected'
        ? '部分行已拒绝：勿对拒绝行催交货/开票，请确认拒绝原因。'
        : '无需继续催交付/开票，请先确认取消或拒绝原因。'
    );
  }
  if (deliveryRisk === 'overdue' && !cancellation.headerClosed) {
    hints.push('请求交期已过，且交货尚未完全处理');
  } else if (deliveryRisk === 'due-soon' && !cancellation.headerClosed) {
    hints.push('请求交期在未来 7 天内，且交货尚未完全处理');
  } else if (deliveryRisk === 'on-track' && deliveryIncomplete && reqDay && !cancellation.headerClosed) {
    hints.push('请求交期在 7 天之后，交货尚未完全处理');
  }
  if (shippedUnbilled && !cancellation.headerClosed) {
    hints.push('交货已完全处理，开票尚未完全处理');
  }
  if (openPending && !cancellation.headerClosed) {
    hints.push('系统处理状态为未处理或部分处理');
  }

  let priorityScore = 900;
  if (cancelledOrRejected) priorityScore = Math.min(priorityScore, 5);
  else if (deliveryRisk === 'overdue') priorityScore = Math.min(priorityScore, 10);
  if (!cancellation.headerClosed && shippedUnbilled) priorityScore = Math.min(priorityScore, 20);
  if (!cancellation.headerClosed && deliveryRisk === 'due-soon') priorityScore = Math.min(priorityScore, 30);
  if (!cancellation.headerClosed && openPending) priorityScore = Math.min(priorityScore, 40);

  const tags: string[] = [];
  if (cancellation.label) tags.push(cancellation.label);
  else tags.push(deliveryRiskLabel);
  if (shippedUnbilled && !cancellation.headerClosed) tags.push('已发货未开票');
  if (openPending && !cancellation.headerClosed) tags.push('待处理');

  return {
    deliveryRisk,
    deliveryRiskLabel,
    shippedUnbilled: shippedUnbilled && !cancellation.headerClosed,
    openPending: openPending && !cancellation.headerClosed,
    cancelledOrRejected,
    cancellationLabel: cancellation.label || undefined,
    priorityScore,
    summary: tags.join(' · '),
    hints,
  };
}

export function sortSalesOrdersByRisk<T extends SalesOrderRiskInput>(
  rows: T[],
  now = new Date()
): T[] {
  return [...rows].sort((a, b) => {
    const ra = assessSalesOrderRisk(a, now);
    const rb = assessSalesOrderRisk(b, now);
    if (ra.priorityScore !== rb.priorityScore) {
      return ra.priorityScore - rb.priorityScore;
    }
    const oa = parseRequestedDeliveryDay(a.SalesOrderDate);
    const ob = parseRequestedDeliveryDay(b.SalesOrderDate);
    if (oa && ob && oa.getTime() !== ob.getTime()) {
      return ob.getTime() - oa.getTime();
    }
    return 0;
  });
}

export interface SalesOrderRiskSnapshot {
  overdue: number;
  dueSoon: number;
  onTrack: number;
  noDate: number;
  shippedUnbilled: number;
  openPending: number;
}

export function summarizeSalesOrderRisks(
  rows: SalesOrderRiskInput[],
  now = new Date()
): SalesOrderRiskSnapshot {
  const snap: SalesOrderRiskSnapshot = {
    overdue: 0,
    dueSoon: 0,
    onTrack: 0,
    noDate: 0,
    shippedUnbilled: 0,
    openPending: 0,
  };
  for (const row of rows) {
    const r = assessSalesOrderRisk(row, now);
    if (r.deliveryRisk === 'overdue') snap.overdue += 1;
    else if (r.deliveryRisk === 'due-soon') snap.dueSoon += 1;
    else if (r.deliveryRisk === 'no-date') snap.noDate += 1;
    else snap.onTrack += 1;
    if (r.shippedUnbilled) snap.shippedUnbilled += 1;
    if (r.openPending) snap.openPending += 1;
  }
  return snap;
}
