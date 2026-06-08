/**
 * SAP 销售订单取消/拒绝识别（系统事实）
 * - OverallSDProcessStatus / Delivery / Billing = D：该环节不再继续
 * - OverallSDDocumentRejectionSts：A 无拒绝，B 部分拒绝，C 全部拒绝
 * - 行项目 SDDocumentRejectionStatus：同上
 */

export const SAP_STATUS_CANCELLED_OR_BLOCKED = 'D';

/** SAP OverallSDDocumentRejectionSts / SDDocumentRejectionStatus */
export const SAP_REJECTION_STATUS = {
  NONE: 'A',
  PARTIAL: 'B',
  FULL: 'C',
} as const;

export type OrderCancellationKind =
  | 'none'
  | 'process-blocked'
  | 'fully-rejected'
  | 'partially-rejected'
  | 'multi-blocked';

export interface SalesOrderCancellationInput {
  OverallSDProcessStatus?: string;
  OverallDeliveryStatus?: string;
  OverallBillingStatus?: string;
  OverallSDDocumentRejectionSts?: string;
}

export interface SalesOrderCancellationAssessment {
  kind: OrderCancellationKind;
  /** 抬头是否应视为不再跟进履约 */
  headerClosed: boolean;
  label: string;
  description: string;
  salesFocus: string;
  blockedDimensions: string[];
}

const REJECTION_LABELS: Record<string, { label: string; description: string }> = {
  A: { label: '无拒绝', description: '销售凭证行均未拒绝。' },
  B: { label: '部分拒绝', description: '部分行项目已被拒绝，未拒绝行可继续处理。' },
  C: { label: '全部拒绝', description: '订单行均已拒绝，不再继续履约。' },
};

export function isSapStatusBlocked(code: string | undefined): boolean {
  return (code ?? '').trim() === SAP_STATUS_CANCELLED_OR_BLOCKED;
}

export function resolveRejectionStatus(code: string | undefined): {
  code: string;
  label: string;
  description: string;
  isRejected: boolean;
  unknown: boolean;
} {
  const c = (code ?? '').trim();
  if (!c) {
    return {
      code: '',
      label: '-',
      description: '暂无拒绝状态',
      isRejected: false,
      unknown: false,
    };
  }
  const def = REJECTION_LABELS[c];
  if (!def) {
    return {
      code: c,
      label: c,
      description: '未知拒绝状态，请联系管理员确认',
      isRejected: false,
      unknown: true,
    };
  }
  return {
    code: c,
    label: def.label,
    description: def.description,
    isRejected: c === SAP_REJECTION_STATUS.PARTIAL || c === SAP_REJECTION_STATUS.FULL,
    unknown: false,
  };
}

export function assessSalesOrderCancellation(
  input: SalesOrderCancellationInput
): SalesOrderCancellationAssessment {
  const process = (input.OverallSDProcessStatus ?? '').trim();
  const delivery = (input.OverallDeliveryStatus ?? '').trim();
  const billing = (input.OverallBillingStatus ?? '').trim();
  const rejection = (input.OverallSDDocumentRejectionSts ?? '').trim();

  const blocked: string[] = [];
  if (isSapStatusBlocked(process)) blocked.push('系统处理');
  if (isSapStatusBlocked(delivery)) blocked.push('交货');
  if (isSapStatusBlocked(billing)) blocked.push('开票');

  const rejectionResolved = resolveRejectionStatus(rejection);

  if (rejection === SAP_REJECTION_STATUS.FULL) {
    return {
      kind: 'fully-rejected',
      headerClosed: true,
      label: '已全部拒绝',
      description: rejectionResolved.description,
      salesFocus:
        '订单行均已拒绝：无需继续催发货或开票，请先与客户/内部确认拒绝原因及是否改单。',
      blockedDimensions: blocked,
    };
  }

  if (rejection === SAP_REJECTION_STATUS.PARTIAL) {
    return {
      kind: 'partially-rejected',
      headerClosed: false,
      label: '部分拒绝',
      description: rejectionResolved.description,
      salesFocus:
        '部分行已拒绝：仅跟进未拒绝行；勿对拒绝行催交货/开票，并确认拒绝原因。',
      blockedDimensions: blocked,
    };
  }

  if (isSapStatusBlocked(process)) {
    return {
      kind: 'process-blocked',
      headerClosed: true,
      label: '订单已取消/阻塞',
      description: '系统处理状态为不适用(D)，订单不再按正常流程推进。',
      salesFocus:
        '无需继续催交付或开票，请先确认订单取消/拒绝原因，避免对客户过度承诺。',
      blockedDimensions: blocked,
    };
  }

  if (blocked.length >= 2) {
    return {
      kind: 'multi-blocked',
      headerClosed: true,
      label: '多环节已停止',
      description: `以下环节已不再继续：${blocked.join('、')}。`,
      salesFocus:
        '无需继续催交付/开票，请核实取消或拒绝原因后再与客户沟通。',
      blockedDimensions: blocked,
    };
  }

  if (blocked.length === 1) {
    return {
      kind: 'multi-blocked',
      headerClosed: true,
      label: `${blocked[0]}已停止`,
      description: `${blocked[0]}状态为不适用(D)，该环节不再继续。`,
      salesFocus: '无需对该环节继续催促，请确认是否整单已终止履约。',
      blockedDimensions: blocked,
    };
  }

  return {
    kind: 'none',
    headerClosed: false,
    label: '',
    description: '',
    salesFocus: '',
    blockedDimensions: [],
  };
}

/** 「未完成订单」快捷视图应排除的 OData 条件片段 */
export function openPresetExcludesCancelledFilter(): string[] {
  return [
    `OverallSDProcessStatus ne '${SAP_STATUS_CANCELLED_OR_BLOCKED}'`,
    `(OverallSDDocumentRejectionSts eq '${SAP_REJECTION_STATUS.NONE}' or OverallSDDocumentRejectionSts eq '')`,
  ];
}
