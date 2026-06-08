/** SAP Overall*Status 销售可读说明（系统事实，非风险提示） */
export type SalesOrderStatusDimension = 'process' | 'delivery' | 'billing';

export const SALES_ORDER_STATUS_DIMENSION_LABELS: Record<SalesOrderStatusDimension, string> = {
  process: '系统处理状态',
  delivery: '交货状态',
  billing: '开票状态',
};

export type StatusBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface SalesOrderStatusResolved {
  code: string;
  label: string;
  variant: StatusBadgeVariant;
  /** 悬停说明 */
  description: string;
  /** 详情页：销售下一步关注点 */
  salesFocus: string;
  unknown: boolean;
  displayText: string;
}

interface StatusDef {
  label: string;
  variant: StatusBadgeVariant;
  description: string;
  salesFocus: Record<SalesOrderStatusDimension, string>;
}

const STATUS_DEFS: Record<string, StatusDef> = {
  A: {
    label: '未处理',
    variant: 'outline',
    description: '该环节尚未进入后续流程。',
    salesFocus: {
      process: '跟进订单确认与内部处理，推动进入履约流程。',
      delivery: '跟进物流/仓库，确认何时可以创建或完成发货。',
      billing: '跟进财务/开票岗位，确认开票计划与前提条件。',
    },
  },
  B: {
    label: '部分处理',
    variant: 'secondary',
    description: '该环节已部分完成，仍有未完成部分。',
    salesFocus: {
      process: '协调内部完成剩余系统处理，避免订单长期挂起。',
      delivery: '跟踪已发与未发数量，与客户同步收货计划。',
      billing: '协调完成剩余开票，关注已发未开票的金额。',
    },
  },
  C: {
    label: '完全处理',
    variant: 'default',
    description: '该环节已全部完成。',
    salesFocus: {
      process: '系统处理已完成，重点关注后续交货与开票是否跟上。',
      delivery: '发货环节已完成，重点关注开票与客户回款。',
      billing: '开票已完成，重点关注客户确认与回款跟进。',
    },
  },
  D: {
    label: '已取消/拒绝',
    variant: 'destructive',
    description: '该环节不再继续（已拒绝、已取消或阻塞，不适用）。',
    salesFocus: {
      process: '确认订单是否已取消或拒绝，避免重复跟进无效流程。',
      delivery: '确认交货是否已取消，勿再催促物流发货。',
      billing: '确认开票是否已取消或冲销，与财务核实后再对客户说明。',
    },
  },
};

export const SALES_ORDER_UNKNOWN_STATUS_HINT = '未知状态，请联系管理员确认';

export function resolveSalesOrderStatus(
  raw: string | undefined,
  dimension: SalesOrderStatusDimension
): SalesOrderStatusResolved {
  const code = (raw ?? '').trim();
  if (!code) {
    return {
      code: '',
      label: '-',
      variant: 'outline',
      description: '暂无状态数据。',
      salesFocus: '等待 SAP 返回状态后再判断跟进方向。',
      unknown: false,
      displayText: '-',
    };
  }

  const def = STATUS_DEFS[code];
  if (!def) {
    return {
      code,
      label: code,
      variant: 'outline',
      description: SALES_ORDER_UNKNOWN_STATUS_HINT,
      salesFocus: SALES_ORDER_UNKNOWN_STATUS_HINT,
      unknown: true,
      displayText: `${code} · ${SALES_ORDER_UNKNOWN_STATUS_HINT}`,
    };
  }

  return {
    code,
    label: def.label,
    variant: def.variant,
    description: def.description,
    salesFocus: def.salesFocus[dimension],
    unknown: false,
    displayText: `${def.label} (${code})`,
  };
}

/** 与筛选下拉、旧代码兼容 */
export function salesOrderStatusLabel(code: string): string {
  return resolveSalesOrderStatus(code, 'process').label;
}

export const SALES_ORDER_STATUS_MAP: Record<
  string,
  { label: string; variant: StatusBadgeVariant }
> = {
  '': { label: '-', variant: 'outline' },
  A: { label: STATUS_DEFS.A.label, variant: STATUS_DEFS.A.variant },
  B: { label: STATUS_DEFS.B.label, variant: STATUS_DEFS.B.variant },
  C: { label: STATUS_DEFS.C.label, variant: STATUS_DEFS.C.variant },
  D: { label: STATUS_DEFS.D.label, variant: STATUS_DEFS.D.variant },
};
