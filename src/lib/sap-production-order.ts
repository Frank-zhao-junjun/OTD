/**
 * Production order V4 field mapping, status derivation, and list shaping.
 * Aligns with Python backend app/services/production_orders.py and ProductionOrder字段分析.md
 */

import { PRODUCTION_ORDER_STATUS_MAP } from '@/lib/sap-service';

/** Fields for portal list query ($select) */
export const PRODUCTION_ORDER_SUMMARY_SELECT = [
  'ProductionOrder',
  'ProductionOrderType',
  'ProductionOrderText',
  'Product',
  'ProductionPlant',
  'CreationDate',
  'OrderActualReleaseDate',
  'OrderPlannedStartDate',
  'OrderPlannedEndDate',
  'OrderActualStartDate',
  'OrderActualEndDate',
  'OrderConfirmedEndDate',
  'TechnicalCompletionDate',
  'OrderPlannedTotalQty',
  'OrderConfirmedYieldQty',
  'ActualDeliveredQuantity',
  'ProductionISOUnit',
  'IsCompletelyDelivered',
  'IsMarkedForDeletion',
  'SalesOrder',
  'SalesOrderItem',
].join(',');

export type ProductionOrderBusinessStatusCode =
  | 'DEL'
  | 'TECO'
  | 'DLV'
  | 'GR_COMPLETE'
  | 'PARTIAL_GR'
  | 'PARTIAL_CONFIRM'
  | 'REL'
  | 'CRTD'
  | 'UNKNOWN';

export interface ProductionOrderV4Row {
  ProductionOrder?: string;
  ProductionOrderType?: string;
  ProductionOrderText?: string;
  Product?: string;
  ProductionPlant?: string;
  CreationDate?: string;
  OrderActualReleaseDate?: string;
  OrderPlannedStartDate?: string;
  OrderPlannedEndDate?: string;
  OrderActualStartDate?: string;
  OrderActualEndDate?: string;
  OrderConfirmedEndDate?: string;
  TechnicalCompletionDate?: string;
  OrderPlannedTotalQty?: string | number;
  OrderConfirmedYieldQty?: string | number;
  ActualDeliveredQuantity?: string | number;
  ProductionISOUnit?: string;
  IsCompletelyDelivered?: boolean | string;
  IsMarkedForDeletion?: boolean | string;
  SalesOrder?: string;
  SalesOrderItem?: string;
}

export interface ProductionOrderItemV4Row {
  ProductionOrderItem?: string;
  Product?: string;
  GoodsReceiptQty?: string | number;
  ActualDeliveryDate?: string;
  OrderIsReleased?: boolean | string;
  PlannedTotalQty?: string | number;
}

export interface DerivedProductionOrderStatus {
  code: ProductionOrderBusinessStatusCode;
  label: string;
  /** SAP-style system status for list display */
  systemStatus: string;
}

export interface ProductionOrderListRow {
  productionOrder: string;
  orderType: string;
  plant: string;
  product: string;
  materialName: string;
  plannedQty: number;
  confirmedQty: number;
  completedQty: number;
  unit: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  systemStatus: string;
  businessStatus: string;
  businessStatusCode: ProductionOrderBusinessStatusCode;
  statusVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  /** Raw row for detail panel */
  raw: ProductionOrderV4Row;
}

export const PRODUCTION_ORDER_STATUS_FILTER_OPTIONS: {
  value: ProductionOrderBusinessStatusCode | 'all';
  label: string;
}[] = [
  { value: 'all', label: '全部' },
  { value: 'CRTD', label: '已创建' },
  { value: 'REL', label: '已下达' },
  { value: 'PARTIAL_CONFIRM', label: '部分确认' },
  { value: 'PARTIAL_GR', label: '部分收货' },
  { value: 'GR_COMPLETE', label: '收货完成' },
  { value: 'DLV', label: '交货完成' },
  { value: 'TECO', label: '技术完成' },
  { value: 'DEL', label: '已删除' },
];

function toFloat(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value);
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 'X';
}

function hasDate(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

/**
 * Derive business lifecycle status from V4 header fields (server-side logic).
 * Priority per ProductionOrder字段分析.md §四.
 */
export function deriveProductionOrderStatus(
  row: ProductionOrderV4Row,
  itemRows?: ProductionOrderItemV4Row[]
): DerivedProductionOrderStatus {
  const isDeleted = isTruthyFlag(row.IsMarkedForDeletion);
  const isTeco = hasDate(row.TechnicalCompletionDate);
  const isDelivered = isTruthyFlag(row.IsCompletelyDelivered);
  const plannedQty = toFloat(row.OrderPlannedTotalQty);
  let totalGr = toFloat(row.ActualDeliveredQuantity);
  if (itemRows && totalGr <= 0) {
    totalGr = itemRows.reduce((sum, item) => sum + toFloat(item.GoodsReceiptQty), 0);
  }
  const confirmedQty = toFloat(row.OrderConfirmedYieldQty);
  const isReleased =
    hasDate(row.OrderActualReleaseDate) ||
    Boolean(itemRows?.some((item) => isTruthyFlag(item.OrderIsReleased)));

  let code: ProductionOrderBusinessStatusCode;
  let label: string;

  if (isDeleted) {
    code = 'DEL';
    label = '已删除';
  } else if (isTeco) {
    code = 'TECO';
    label = '技术完成';
  } else if (isDelivered) {
    code = 'DLV';
    label = '交货完成';
  } else if (totalGr > 0 && plannedQty > 0 && totalGr >= plannedQty) {
    code = 'GR_COMPLETE';
    label = '收货完成';
  } else if (totalGr > 0) {
    code = 'PARTIAL_GR';
    label = '部分收货';
  } else if (confirmedQty > 0 && plannedQty > 0 && confirmedQty < plannedQty) {
    code = 'PARTIAL_CONFIRM';
    label = '部分确认';
  } else if (hasDate(row.OrderConfirmedEndDate) || confirmedQty > 0) {
    code = 'PARTIAL_CONFIRM';
    label = '部分确认';
  } else if (isReleased) {
    code = 'REL';
    label = '已下达';
  } else if (hasDate(row.CreationDate)) {
    code = 'CRTD';
    label = '已创建';
  } else {
    code = 'UNKNOWN';
    label = '未知';
  }

  const systemStatus = deriveSystemStatus(row, isReleased, isDeleted);

  return { code, label, systemStatus };
}

/** System status: release / deletion flags from SAP V4 fields */
export function deriveSystemStatus(
  row: ProductionOrderV4Row,
  isReleased?: boolean,
  isDeleted?: boolean
): string {
  const deleted = isDeleted ?? isTruthyFlag(row.IsMarkedForDeletion);
  if (deleted) return 'DLFL';
  const released = isReleased ?? hasDate(row.OrderActualReleaseDate);
  if (hasDate(row.TechnicalCompletionDate)) return 'TECO';
  if (isTruthyFlag(row.IsCompletelyDelivered)) return 'DLV';
  if (released) return 'REL';
  if (hasDate(row.CreationDate)) return 'CRTD';
  return '-';
}

export function mapProductionOrderListRow(row: ProductionOrderV4Row): ProductionOrderListRow {
  const status = deriveProductionOrderStatus(row);
  const badge = PRODUCTION_ORDER_STATUS_MAP[status.code] ?? {
    label: status.label,
    variant: 'outline' as const,
  };

  return {
    productionOrder: String(row.ProductionOrder ?? ''),
    orderType: row.ProductionOrderType ?? '-',
    plant: row.ProductionPlant ?? '-',
    product: row.Product ?? '-',
    materialName: row.ProductionOrderText ?? '-',
    plannedQty: toFloat(row.OrderPlannedTotalQty),
    confirmedQty: toFloat(row.OrderConfirmedYieldQty),
    completedQty: toFloat(row.ActualDeliveredQuantity),
    unit: row.ProductionISOUnit ?? '-',
    plannedStartDate: row.OrderPlannedStartDate ?? '',
    plannedEndDate: row.OrderPlannedEndDate ?? '',
    actualStartDate: row.OrderActualStartDate ?? '',
    actualEndDate: row.OrderActualEndDate ?? '',
    systemStatus: status.systemStatus,
    businessStatus: status.label,
    businessStatusCode: status.code,
    statusVariant: badge.variant,
    raw: row,
  };
}

export function filterByBusinessStatus(
  rows: ProductionOrderListRow[],
  statusCode: ProductionOrderBusinessStatusCode | 'all'
): ProductionOrderListRow[] {
  if (!statusCode || statusCode === 'all') return rows;
  return rows.filter((row) => row.businessStatusCode === statusCode);
}
