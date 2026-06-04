import type { SalesOrderSearchFilters } from '@/lib/sap-sales-order-filters';
import {
  DELIVERY_COMPLETE,
  requestedDeliveryDueSoonODataRange,
} from '@/lib/sap-sales-order-risk';

/** URL query: ?preset=<id> */
export type SalesOrderPresetId =
  | 'open'
  | 'shipped-unbilled'
  | 'invoiced-7d'
  | 'delivery-7d';

export const SALES_ORDER_PRESET_PARAM = 'preset';

export interface SalesOrderPresetDefinition {
  id: SalesOrderPresetId;
  label: string;
  description: string;
  href: string;
  filters: SalesOrderSearchFilters;
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function last7DaysRange(): { from: string; to: string } {
  const to = new Date();
  const from = addDays(to, -7);
  return { from: isoDate(from), to: isoDate(to) };
}

/** SAP OverallSDProcessStatus: A=开立, B=处理中, C=完成 (see 8大接口梳理.md) */
const OPEN_PROCESS_STATUSES = ['A', 'B'];

export const SALES_ORDER_PRESETS: Record<SalesOrderPresetId, SalesOrderPresetDefinition> = {
  open: {
    id: 'open',
    label: '未完成订单',
    description: '开立或处理中，尚未完成履约',
    href: `/sales-orders?${SALES_ORDER_PRESET_PARAM}=open`,
    filters: {
      processStatusIn: OPEN_PROCESS_STATUSES,
      excludeCancelledAndRejected: true,
    },
  },
  'shipped-unbilled': {
    id: 'shipped-unbilled',
    label: '已发货未开票',
    description: '交货已完成，开票未完成',
    href: `/sales-orders?${SALES_ORDER_PRESET_PARAM}=shipped-unbilled`,
    filters: {
      statusField: 'delivery',
      statusValue: 'C',
      billingStatusNe: 'C',
    },
  },
  'invoiced-7d': {
    id: 'invoiced-7d',
    label: '近 7 天已开票',
    /** SalesOrder.BillingDocumentDate（V4 抬头字段，见 SalesOrder metaData） */
    description: '开票状态=完全处理，且抬头开票日期在近 7 天内',
    href: `/sales-orders?${SALES_ORDER_PRESET_PARAM}=invoiced-7d`,
    filters: (() => {
      const { from, to } = last7DaysRange();
      return {
        statusField: 'billing',
        statusValue: 'C',
        billingDateFrom: from,
        billingDateTo: to,
      };
    })(),
  },
  'delivery-7d': {
    id: 'delivery-7d',
    label: '近 7 天需交货',
    description: '请求交期在今日起 7 天内、交货未完成，排除已取消/拒绝',
    href: `/sales-orders?${SALES_ORDER_PRESET_PARAM}=delivery-7d`,
    filters: {
      excludeCancelledAndRejected: true,
      deliveryStatusNe: DELIVERY_COMPLETE,
    },
  },
};

/** 查询时解析 preset 筛选（交期类 preset 按本地日历日动态计算） */
export function getSalesOrderPresetFilters(
  preset: SalesOrderPresetId,
  now = new Date()
): SalesOrderSearchFilters {
  const base = { ...SALES_ORDER_PRESETS[preset].filters };
  if (preset === 'delivery-7d') {
    return {
      ...base,
      ...requestedDeliveryDueSoonODataRange(now),
    };
  }
  return base;
}

export const SALES_ORDER_PRESET_LIST = Object.values(SALES_ORDER_PRESETS);

export function parseSalesOrderPreset(raw: string | null): SalesOrderPresetId | null {
  if (!raw) return null;
  return raw in SALES_ORDER_PRESETS ? (raw as SalesOrderPresetId) : null;
}

/** Merge preset base filters with user-edited form fields (form wins on non-empty scalar fields). */
export function mergePresetWithForm(
  preset: SalesOrderPresetId,
  form: SalesOrderSearchFilters
): SalesOrderSearchFilters {
  const base = { ...getSalesOrderPresetFilters(preset) };
  const merged: SalesOrderSearchFilters = { ...base };

  if (form.salesOrderNo?.trim()) merged.salesOrderNo = form.salesOrderNo;
  if (form.customer?.trim()) merged.customer = form.customer;
  if (form.purchaseOrderByCustomer?.trim()) {
    merged.purchaseOrderByCustomer = form.purchaseOrderByCustomer;
  }
  if (form.material?.trim()) merged.material = form.material;
  if (form.dateFrom) merged.dateFrom = form.dateFrom;
  if (form.dateTo) merged.dateTo = form.dateTo;
  if (form.orderType && form.orderType !== 'all') merged.orderType = form.orderType;
  if (form.salesOrg && form.salesOrg !== 'all') merged.salesOrg = form.salesOrg;

  if (base.processStatusIn && form.statusField === 'process' && form.statusValue && form.statusValue !== 'all') {
    merged.processStatusIn = undefined;
    merged.statusField = form.statusField;
    merged.statusValue = form.statusValue;
  } else if (form.statusField && form.statusValue && form.statusValue !== 'all') {
    merged.statusField = form.statusField;
    merged.statusValue = form.statusValue;
    merged.processStatusIn = undefined;
    merged.deliveryStatus = undefined;
    merged.deliveryStatusNe = undefined;
    merged.billingStatusNe = undefined;
  }

  if (form.requestedDeliveryFrom) merged.requestedDeliveryFrom = form.requestedDeliveryFrom;
  if (form.requestedDeliveryTo) merged.requestedDeliveryTo = form.requestedDeliveryTo;
  if (form.billingDateFrom) merged.billingDateFrom = form.billingDateFrom;
  if (form.billingDateTo) merged.billingDateTo = form.billingDateTo;

  return merged;
}

/** Map preset filters into sales-orders page form state where possible. */
/** 横幅上展示的 OData 筛选摘要（含未出现在表单里的 preset 条件） */
export function presetFilterSummary(preset: SalesOrderPresetId): string {
  const f = getSalesOrderPresetFilters(preset);
  switch (preset) {
    case 'open':
      return '系统处理状态 ∈ 未处理(A)、部分处理(B)';
    case 'shipped-unbilled':
      return '交货状态=完全处理(C)，且开票状态≠完全处理';
    case 'invoiced-7d':
      return `开票状态=完全处理(C)，BillingDocumentDate ${f.billingDateFrom ?? ''} ~ ${f.billingDateTo ?? ''}`;
    case 'delivery-7d':
      return `请求交期 ${f.requestedDeliveryFrom ?? ''} ~ ${f.requestedDeliveryTo ?? ''}，交货未完成，排除已取消/拒绝`;
    default:
      return '';
  }
}

export function presetToFormState(preset: SalesOrderPresetId): Partial<SalesOrderSearchFilters> {
  const f = getSalesOrderPresetFilters(preset);
  const state: Partial<SalesOrderSearchFilters> = {};

  if (f.dateFrom) state.dateFrom = f.dateFrom;
  if (f.dateTo) state.dateTo = f.dateTo;
  if (f.requestedDeliveryFrom) state.requestedDeliveryFrom = f.requestedDeliveryFrom;
  if (f.requestedDeliveryTo) state.requestedDeliveryTo = f.requestedDeliveryTo;
  if (f.billingDateFrom) state.billingDateFrom = f.billingDateFrom;
  if (f.billingDateTo) state.billingDateTo = f.billingDateTo;

  if (f.statusField && f.statusValue && f.statusValue !== 'all' && !f.processStatusIn) {
    state.statusField = f.statusField;
    state.statusValue = f.statusValue;
  } else if (f.processStatusIn?.length === 1) {
    state.statusField = 'process';
    state.statusValue = f.processStatusIn[0];
  } else {
    state.statusField = 'process';
    state.statusValue = 'all';
  }

  return state;
}
