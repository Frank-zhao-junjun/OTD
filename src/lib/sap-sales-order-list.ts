import { parseSapDate } from '@/lib/sap-api-client';
import {
  assessSalesOrderRisk,
  sortSalesOrdersByRisk,
  type SalesOrderRiskInput,
} from '@/lib/sap-sales-order-risk';

export const SALES_ORDER_PAGE_SIZE = 50;

export type SalesOrderListSortField = 'risk' | 'orderDate' | 'deliveryDate' | 'amount';

export const SALES_ORDER_SORT_OPTIONS: { value: SalesOrderListSortField; label: string }[] = [
  { value: 'risk', label: '风险优先级（默认）' },
  { value: 'orderDate', label: '订单日期' },
  { value: 'deliveryDate', label: '请求交期' },
  { value: 'amount', label: '金额' },
];

function parseSortableDate(raw: string | undefined): number {
  if (!raw) return 0;
  const iso = parseSapDate(raw);
  if (!iso || iso === '-') return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function parseAmount(raw: string | number | undefined): number {
  if (raw == null || raw === '') return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

/** OData $orderby for SAP list fetch ($skip/$top 分页) */
export function salesOrderSapOrderBy(
  field: SalesOrderListSortField,
  direction: 'asc' | 'desc'
): string {
  switch (field) {
    case 'orderDate':
      return `SalesOrderDate ${direction}`;
    case 'deliveryDate':
      return `RequestedDeliveryDate ${direction}`;
    case 'amount':
      return `TotalNetAmount ${direction}`;
    case 'risk':
    default:
      return 'SalesOrderDate desc';
  }
}

export function salesOrderSkip(page: number): number {
  return Math.max(0, (page - 1) * SALES_ORDER_PAGE_SIZE);
}

export function salesOrderTotalPages(totalCount: number, countKnown: boolean, pageRows: number, page: number): number | null {
  if (countKnown && totalCount > 0) {
    return Math.max(1, Math.ceil(totalCount / SALES_ORDER_PAGE_SIZE));
  }
  if (pageRows < SALES_ORDER_PAGE_SIZE) return page;
  return null;
}

export function canGoNextPage(
  page: number,
  totalCount: number,
  countKnown: boolean,
  pageRows: number
): boolean {
  if (pageRows === 0) return false;
  const totalPages = salesOrderTotalPages(totalCount, countKnown, pageRows, page);
  if (totalPages != null) return page < totalPages;
  return pageRows >= SALES_ORDER_PAGE_SIZE;
}

/** 当前页内排序；风险模式在 SAP 分页基础上于页内重排 */
export function sortSalesOrderListPage<T extends SalesOrderRiskInput & {
  SalesOrderDate?: string;
  RequestedDeliveryDate?: string;
  TotalNetAmount?: string | number;
}>(
  rows: T[],
  field: SalesOrderListSortField,
  direction: 'asc' | 'desc'
): T[] {
  if (field === 'risk') {
    return sortSalesOrdersByRisk(rows);
  }

  const dir = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (field === 'orderDate') {
      cmp = parseSortableDate(a.SalesOrderDate) - parseSortableDate(b.SalesOrderDate);
    } else if (field === 'deliveryDate') {
      cmp = parseSortableDate(a.RequestedDeliveryDate) - parseSortableDate(b.RequestedDeliveryDate);
    } else if (field === 'amount') {
      cmp = parseAmount(a.TotalNetAmount) - parseAmount(b.TotalNetAmount);
    }
    if (cmp !== 0) return cmp * dir;
    const ra = assessSalesOrderRisk(a);
    const rb = assessSalesOrderRisk(b);
    return ra.priorityScore - rb.priorityScore;
  });
}
