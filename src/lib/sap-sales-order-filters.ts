import { SAP_DEFAULTS } from '@/lib/sap-service';
import { fetchSapEntity, odataEscape } from '@/lib/sap-api-client';
import { openPresetExcludesCancelledFilter } from '@/lib/sap-sales-order-cancellation';

export interface SalesOrderSearchFilters {
  salesOrderNo?: string;
  customer?: string;
  /** 客户采购单号（PurchaseOrderByCustomer）精确匹配 */
  purchaseOrderByCustomer?: string;
  material?: string;
  dateFrom?: string;
  dateTo?: string;
  orderType?: string;
  salesOrg?: string;
  statusField?: 'process' | 'delivery' | 'billing' | '';
  statusValue?: string;
  /** Preset: 开立/处理中等多值 (OverallSDProcessStatus) */
  processStatusIn?: string[];
  deliveryStatus?: string;
  /** 交货状态不等于（如 C=已完成，用于近7天需交货 preset） */
  deliveryStatusNe?: string;
  billingStatusNe?: string;
  requestedDeliveryFrom?: string;
  requestedDeliveryTo?: string;
  billingDateFrom?: string;
  billingDateTo?: string;
  /** 未完成快捷视图：排除 D 状态与全部/部分拒绝 */
  excludeCancelledAndRejected?: boolean;
}

export type CustomerResolveMode =
  | 'exact-party-or-po'
  | 'name-fuzzy'
  | 'name-fuzzy-fallback-exact'
  | 'name-lookup-failed-fallback-exact';

export interface CustomerFilterResolution {
  clause: string;
  mode: CustomerResolveMode;
  matchedCustomerIds?: string[];
}

function exactPartyOrPoClause(c: string): string {
  return `(SoldToParty eq '${c}' or PurchaseOrderByCustomer eq '${c}')`;
}

function isNumericCustomerOrPoInput(trimmed: string): boolean {
  return /^\d[\d\s]*$/.test(trimmed.replace(/\s/g, ''));
}

/** Resolve customer text → OData filter (编号/采购单号精确，名称走主数据模糊匹配) */
export async function resolveCustomerFilter(customerInput: string): Promise<CustomerFilterResolution> {
  const trimmed = customerInput.trim();
  const c = odataEscape(trimmed);

  if (isNumericCustomerOrPoInput(trimmed)) {
    return { clause: exactPartyOrPoClause(c), mode: 'exact-party-or-po' };
  }

  try {
    const params = new URLSearchParams();
    params.set('top', '25');
    params.set('filter', `substringof('${c}',CustomerName)`);
    params.set('select', 'Customer,CustomerName');

    const res = await fetchSapEntity<{ Customer: string }>(
      'API_BUSINESS_PARTNER',
      'A_Customer',
      params
    );
    const ids = [...new Set((res.data ?? []).map((row) => row.Customer).filter(Boolean))];
    if (ids.length === 0) {
      return {
        clause: exactPartyOrPoClause(c),
        mode: 'name-fuzzy-fallback-exact',
        matchedCustomerIds: [],
      };
    }
    return {
      clause: `(${ids.map((id) => `SoldToParty eq '${odataEscape(id)}'`).join(' or ')})`,
      mode: 'name-fuzzy',
      matchedCustomerIds: ids,
    };
  } catch {
    return {
      clause: exactPartyOrPoClause(c),
      mode: 'name-lookup-failed-fallback-exact',
    };
  }
}

export type MaterialResolveMode =
  | 'product-exact'
  | 'description-fuzzy'
  | 'description-then-product'
  | 'no-match'
  | 'lookup-failed';

export interface MaterialFilterResolution {
  clause: string | null;
  mode: MaterialResolveMode;
  matchedOrderCount?: number;
}

function salesOrderIdsClause(ids: string[]): string | null {
  if (ids.length === 0) return null;
  return `(${ids.map((id) => `SalesOrder eq '${odataEscape(id)}'`).join(' or ')})`;
}

/** 典型物料编码：字母数字与 - _ .，不含空格 */
function looksLikeProductCode(input: string): boolean {
  const t = input.trim();
  return t.length > 0 && t.length <= 40 && /^[A-Za-z0-9\-_.]+$/.test(t);
}

async function lookupSalesOrdersByItemFilter(itemFilter: string): Promise<string[]> {
  const params = new URLSearchParams();
  params.set('top', '100');
  params.set('filter', itemFilter);
  params.set('select', 'SalesOrder');
  params.set('orderby', 'SalesOrder desc');

  const res = await fetchSapEntity<{ SalesOrder: string }>(
    'CE_SALESORDER_0001',
    'SalesOrderItem',
    params
  );
  return [...new Set((res.data ?? []).map((row) => row.SalesOrder).filter(Boolean))];
}

/**
 * US12 物料筛选回退：当 CE SalesOrder 不支持 `_Item/any` 时，
 * 通过 SalesOrderItem 按 Product 或 SalesOrderItemText 反查订单号。
 */
export async function resolveMaterialFilter(material: string): Promise<MaterialFilterResolution> {
  const trimmed = material.trim();
  const m = odataEscape(trimmed);
  if (!trimmed) {
    return { clause: null, mode: 'no-match' };
  }

  try {
    if (looksLikeProductCode(trimmed)) {
      const byProduct = await lookupSalesOrdersByItemFilter(`Product eq '${m}'`);
      const clause = salesOrderIdsClause(byProduct);
      if (clause) {
        return {
          clause,
          mode: 'product-exact',
          matchedOrderCount: byProduct.length,
        };
      }
      const byDesc = await lookupSalesOrdersByItemFilter(`substringof('${m}',SalesOrderItemText)`);
      const descClause = salesOrderIdsClause(byDesc);
      if (descClause) {
        return {
          clause: descClause,
          mode: 'description-then-product',
          matchedOrderCount: byDesc.length,
        };
      }
      return { clause: null, mode: 'no-match', matchedOrderCount: 0 };
    }

    const byDesc = await lookupSalesOrdersByItemFilter(`substringof('${m}',SalesOrderItemText)`);
    const descClause = salesOrderIdsClause(byDesc);
    if (descClause) {
      return {
        clause: descClause,
        mode: 'description-fuzzy',
        matchedOrderCount: byDesc.length,
      };
    }

    const byProduct = await lookupSalesOrdersByItemFilter(`Product eq '${m}'`);
    const productClause = salesOrderIdsClause(byProduct);
    if (productClause) {
      return {
        clause: productClause,
        mode: 'product-exact',
        matchedOrderCount: byProduct.length,
      };
    }

    return { clause: null, mode: 'no-match', matchedOrderCount: 0 };
  } catch {
    return { clause: null, mode: 'lookup-failed' };
  }
}

export function buildSalesOrderListFilter(
  filters: SalesOrderSearchFilters,
  options?: { customerClause?: string; materialClause?: string }
): string {
  const parts: string[] = [];

  const exactOrderLookup = Boolean(filters.salesOrderNo?.trim());

  if (!exactOrderLookup) {
    const orderType =
      filters.orderType && filters.orderType !== 'all'
        ? filters.orderType
        : SAP_DEFAULTS.salesOrderType;
    parts.push(`SalesOrderType eq '${odataEscape(orderType)}'`);
  }

  const salesOrg =
    filters.salesOrg && filters.salesOrg !== 'all'
      ? filters.salesOrg
      : SAP_DEFAULTS.salesOrganization;
  parts.push(`SalesOrganization eq '${odataEscape(salesOrg)}'`);
  parts.push(`DistributionChannel eq '${SAP_DEFAULTS.distributionChannel}'`);
  parts.push(`OrganizationDivision eq '${SAP_DEFAULTS.division}'`);

  if (filters.salesOrderNo?.trim()) {
    const q = odataEscape(filters.salesOrderNo.trim());
    parts.push(`SalesOrder eq '${q}'`);
  }

  if (filters.purchaseOrderByCustomer?.trim()) {
    const po = odataEscape(filters.purchaseOrderByCustomer.trim());
    parts.push(`PurchaseOrderByCustomer eq '${po}'`);
  }

  if (options?.customerClause) {
    parts.push(options.customerClause);
  } else if (filters.customer?.trim()) {
    const c = odataEscape(filters.customer.trim());
    parts.push(`(SoldToParty eq '${c}' or PurchaseOrderByCustomer eq '${c}')`);
  }

  if (options?.materialClause) {
    parts.push(options.materialClause);
  } else if (filters.material?.trim()) {
    const m = odataEscape(filters.material.trim());
    parts.push(`_Item/any(i: i/Product eq '${m}')`);
  }

  if (filters.dateFrom) {
    parts.push(`SalesOrderDate ge ${filters.dateFrom}`);
  }
  if (filters.dateTo) {
    parts.push(`SalesOrderDate le ${filters.dateTo}`);
  }

  if (filters.requestedDeliveryFrom) {
    parts.push(`RequestedDeliveryDate ge ${filters.requestedDeliveryFrom}`);
  }
  if (filters.requestedDeliveryTo) {
    parts.push(`RequestedDeliveryDate le ${filters.requestedDeliveryTo}`);
  }

  if (filters.billingDateFrom) {
    parts.push(`BillingDocumentDate ge ${filters.billingDateFrom}`);
  }
  if (filters.billingDateTo) {
    parts.push(`BillingDocumentDate le ${filters.billingDateTo}`);
  }

  if (filters.processStatusIn?.length) {
    const clause = filters.processStatusIn
      .map((s) => `OverallSDProcessStatus eq '${odataEscape(s)}'`)
      .join(' or ');
    parts.push(`(${clause})`);
  } else if (filters.deliveryStatus) {
    parts.push(`OverallDeliveryStatus eq '${odataEscape(filters.deliveryStatus)}'`);
  } else if (filters.deliveryStatusNe) {
    parts.push(`OverallDeliveryStatus ne '${odataEscape(filters.deliveryStatusNe)}'`);
  } else if (filters.statusValue && filters.statusValue !== 'all') {
    const fieldMap = {
      process: 'OverallSDProcessStatus',
      delivery: 'OverallDeliveryStatus',
      billing: 'OverallOrdReltdBillgStatus',
    } as const;
    const field = filters.statusField ? fieldMap[filters.statusField] : undefined;
    if (field) {
      parts.push(`${field} eq '${odataEscape(filters.statusValue)}'`);
    }
  }

  if (filters.billingStatusNe) {
    parts.push(`OverallOrdReltdBillgStatus ne '${odataEscape(filters.billingStatusNe)}'`);
  }

  if (filters.excludeCancelledAndRejected) {
    for (const clause of openPresetExcludesCancelledFilter()) {
      parts.push(clause);
    }
  }

  return parts.join(' and ');
}
