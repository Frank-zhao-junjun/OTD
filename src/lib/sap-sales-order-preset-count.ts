import { fetchSapEntity } from '@/lib/sap-api-client';
import { SAP_DEFAULTS } from '@/lib/sap-service';
import { buildSalesOrderListFilter, type SalesOrderSearchFilters } from '@/lib/sap-sales-order-filters';
import {
  getSalesOrderPresetFilters,
  SALES_ORDER_PRESET_LIST,
  type SalesOrderPresetId,
} from '@/lib/sap-sales-order-presets';

export interface PresetCountResult {
  count: number | null;
  /** SAP @odata.count 不可用时，用返回行数降级 */
  estimated: boolean;
  error?: string;
}

const defaultFilters = (): SalesOrderSearchFilters => ({
  orderType: SAP_DEFAULTS.salesOrderType,
  salesOrg: SAP_DEFAULTS.salesOrganization,
  statusField: 'process',
  statusValue: 'all',
});

async function queryCount(filter: string): Promise<PresetCountResult> {
  const run = async (top: string) => {
    const params = new URLSearchParams();
    params.set('top', top);
    params.set('count', 'true');
    params.set('filter', filter);
    params.set('select', 'SalesOrder');
    return fetchSapEntity<{ SalesOrder: string }>('CE_SALESORDER_0001', 'SalesOrder', params);
  };

  const parseResponse = (
    res: Awaited<ReturnType<typeof run>>,
    estimatedFromRows: boolean
  ): PresetCountResult | null => {
    const sapCount = res.count;
    if (sapCount != null && !Number.isNaN(Number(sapCount))) {
      return { count: Number(sapCount), estimated: false };
    }
    const rows = res.data?.length ?? 0;
    if (estimatedFromRows && rows > 0) {
      return { count: rows, estimated: true };
    }
    if (!estimatedFromRows && rows === 0) {
      return { count: 0, estimated: false };
    }
    return null;
  };

  try {
    let res: Awaited<ReturnType<typeof run>>;
    try {
      res = await run('0');
    } catch {
      res = await run('1');
    }
    const primary = parseResponse(res, false);
    if (primary) return primary;

    const fallback = await run('51');
    const fromFallback = parseResponse(fallback, true);
    if (fromFallback) return fromFallback;

    return { count: 0, estimated: false };
  } catch (err) {
    return {
      count: null,
      estimated: false,
      error: err instanceof Error ? err.message : '查询失败',
    };
  }
}

/** 只读计数，不改变 SAP 数据 */
export async function fetchSalesOrderPresetCount(
  presetId: SalesOrderPresetId
): Promise<PresetCountResult> {
  const filters = { ...defaultFilters(), ...getSalesOrderPresetFilters(presetId) };
  const filter = buildSalesOrderListFilter(filters);
  return queryCount(filter);
}

export async function fetchAllSalesOrderPresetCounts(): Promise<
  Record<SalesOrderPresetId, PresetCountResult>
> {
  const ids = SALES_ORDER_PRESET_LIST.map((preset) => preset.id);
  const results = await Promise.all(
    ids.map(async (id) => [id, await fetchSalesOrderPresetCount(id)] as const)
  );
  return Object.fromEntries(results) as Record<SalesOrderPresetId, PresetCountResult>;
}
