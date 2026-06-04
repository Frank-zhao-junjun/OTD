import type { SalesOrderListSortField } from '@/lib/sap-sales-order-list';
import type { SalesOrderPresetId } from '@/lib/sap-sales-order-presets';
import type { QueryAuditEntry } from '@/lib/query-audit-server';

export const SALES_ORDER_RECENT_STORAGE_KEY = 'otd-sales-order-recent-queries';
export const SALES_ORDER_RESTORE_STORAGE_KEY = 'otd-sales-order-restore';
export const SALES_ORDER_RESTORE_URL_FLAG = 'restore';

const MAX_LOCAL_ENTRIES = 30;
const DISPLAY_LIMIT = 5;

const RECORDABLE_LIST_ACTIONS = new Set(['search', 'quick-view', 'sort']);

export interface SalesOrderRestorePayload {
  salesOrderNo?: string;
  customer?: string;
  purchaseOrderByCustomer?: string;
  material?: string;
  dateFrom?: string;
  dateTo?: string;
  orderType?: string;
  salesOrg?: string;
  statusField?: 'process' | 'delivery' | 'billing';
  statusValue?: string;
  preset?: SalesOrderPresetId;
  sortField?: SalesOrderListSortField;
  sortDir?: 'asc' | 'desc';
}

export interface SalesOrderRecentQueryRecord {
  id: string;
  timestamp: string;
  queryTypeLabel: string;
  conditionSummary: string;
  resultCount?: number;
  success: boolean;
  errorSummary?: string;
  restore: SalesOrderRestorePayload;
}

function str(v: unknown): string | undefined {
  if (v == null || v === '') return undefined;
  return String(v);
}

export function buildRestoreFromConditions(
  conditions: Record<string, unknown>
): SalesOrderRestorePayload {
  const presetRaw = str(conditions.preset);
  const preset = presetRaw as SalesOrderPresetId | undefined;
  return {
    salesOrderNo: str(conditions.salesOrderNo),
    customer: str(conditions.customer) ?? str(conditions.customerInput),
    purchaseOrderByCustomer:
      str(conditions.purchaseOrderByCustomer) ?? str(conditions.customerPoInput),
    material: str(conditions.material) ?? str(conditions.materialInput),
    dateFrom: str(conditions.dateFrom),
    dateTo: str(conditions.dateTo),
    orderType: str(conditions.orderType),
    salesOrg: str(conditions.salesOrg),
    statusField: (str(conditions.statusField) as SalesOrderRestorePayload['statusField']) ?? 'process',
    statusValue: str(conditions.statusValue) ?? 'all',
    preset:
      preset && ['open', 'shipped-unbilled', 'invoiced-7d', 'delivery-7d'].includes(preset)
        ? preset
        : undefined,
    sortField: (str(conditions.sortField) as SalesOrderListSortField) ?? 'risk',
    sortDir: (str(conditions.sortDirection) as 'asc' | 'desc') ?? 'desc',
  };
}

export function formatSalesOrderQueryType(conditions: Record<string, unknown>): string {
  const listAction = str(conditions.listAction);
  if (conditions.source === 'quick-view' || listAction === 'quick-view') {
    return '快捷视图';
  }
  if (listAction === 'sort') return '排序查询';
  return '条件查询';
}

export function formatSalesOrderConditionSummary(conditions: Record<string, unknown>): string {
  const presetLabel = str(conditions.presetLabel);
  if (conditions.source === 'quick-view' && presetLabel) {
    return `快捷视图：${presetLabel}`;
  }
  if (presetLabel) {
    return `快捷视图：${presetLabel}`;
  }

  const parts: string[] = [];
  const orderNo = str(conditions.salesOrderNo);
  const customer = str(conditions.customer) ?? str(conditions.customerInput);
  const customerPo =
    str(conditions.purchaseOrderByCustomer) ?? str(conditions.customerPoInput);
  const material = str(conditions.material) ?? str(conditions.materialInput);
  if (orderNo) parts.push(`订单号 ${orderNo}`);
  if (customerPo) parts.push(`客户 PO ${customerPo}`);
  if (customer) parts.push(`客户 ${customer}`);
  if (material) parts.push(`物料 ${material}`);
  if (str(conditions.dateFrom) || str(conditions.dateTo)) {
    parts.push(`订单日期 ${str(conditions.dateFrom) ?? '…'} ~ ${str(conditions.dateTo) ?? '…'}`);
  }
  const sf = str(conditions.statusField);
  const sv = str(conditions.statusValue);
  if (sv && sv !== 'all') {
    const dim =
      sf === 'delivery' ? '交货' : sf === 'billing' ? '开票' : '系统';
    parts.push(`${dim}状态 ${sv}`);
  }
  if (parts.length === 0) return '默认范围（OR / 1010）';
  return parts.join(' · ');
}

export function formatErrorSummary(error: string | null | undefined): string | undefined {
  if (!error?.trim()) return undefined;
  const t = error.trim();
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
}

export function auditEntryToRecentRecord(entry: QueryAuditEntry): SalesOrderRecentQueryRecord | null {
  if (entry.module !== 'sales-orders' || entry.action !== 'list') return null;
  const listAction = str(entry.conditions.listAction);
  if (listAction && !RECORDABLE_LIST_ACTIONS.has(listAction)) return null;

  return {
    id: `${entry.timestamp}-${entry.user}`,
    timestamp: entry.timestamp,
    queryTypeLabel: formatSalesOrderQueryType(entry.conditions),
    conditionSummary: formatSalesOrderConditionSummary(entry.conditions),
    resultCount: entry.resultCount,
    success: entry.success,
    errorSummary: entry.success ? undefined : formatErrorSummary(entry.error),
    restore: buildRestoreFromConditions(entry.conditions),
  };
}

export function persistRecentSalesOrderQuery(payload: {
  conditions: Record<string, unknown>;
  resultCount?: number;
  success: boolean;
  error?: string | null;
}): void {
  if (typeof window === 'undefined') return;
  const listAction = str(payload.conditions.listAction);
  if (listAction && !RECORDABLE_LIST_ACTIONS.has(listAction)) return;

  const record: SalesOrderRecentQueryRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    queryTypeLabel: formatSalesOrderQueryType(payload.conditions),
    conditionSummary: formatSalesOrderConditionSummary(payload.conditions),
    resultCount: payload.resultCount,
    success: payload.success,
    errorSummary: payload.success ? undefined : formatErrorSummary(payload.error),
    restore: buildRestoreFromConditions(payload.conditions),
  };

  try {
    const existing = loadRecentFromLocalStorage();
    const next = [record, ...existing.filter((r) => r.id !== record.id)].slice(0, MAX_LOCAL_ENTRIES);
    localStorage.setItem(SALES_ORDER_RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

export function loadRecentFromLocalStorage(): SalesOrderRecentQueryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SALES_ORDER_RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SalesOrderRecentQueryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function mergeRecentRecords(
  server: SalesOrderRecentQueryRecord[],
  local: SalesOrderRecentQueryRecord[],
  limit = DISPLAY_LIMIT
): SalesOrderRecentQueryRecord[] {
  const byKey = new Map<string, SalesOrderRecentQueryRecord>();
  for (const r of [...server, ...local]) {
    const key = `${r.timestamp}|${r.conditionSummary}|${r.success}`;
    const prev = byKey.get(key);
    if (!prev || r.timestamp > prev.timestamp) byKey.set(key, r);
  }
  return [...byKey.values()]
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit);
}

export function saveRestorePayload(restore: SalesOrderRestorePayload): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SALES_ORDER_RESTORE_STORAGE_KEY, JSON.stringify(restore));
}

export function loadRestorePayload(): SalesOrderRestorePayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SALES_ORDER_RESTORE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SalesOrderRestorePayload;
  } catch {
    return null;
  }
}

export function clearRestorePayload(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SALES_ORDER_RESTORE_STORAGE_KEY);
}

export function formatRecentQueryTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
