'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SALES_ORDER_STATUS_FILTER_OPTIONS, SAP_DEFAULTS } from '@/lib/sap-service';
import { SalesOrderStatusBadge } from '@/app/sales-orders/sales-order-status-badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { fetchSapEntity, logQueryAudit, parseSapDate } from '@/lib/sap-api-client';
import { SAP_NO_PERMISSION_MESSAGE } from '@/lib/sap-errors';
import {
  buildSalesOrderListFilter,
  resolveCustomerFilter,
  resolveMaterialFilter,
  type SalesOrderSearchFilters,
} from '@/lib/sap-sales-order-filters';
import { OrderDetailPanel } from '@/app/sales-orders/order-detail-panel';
import { SalesOrderRiskBadges } from '@/app/sales-orders/sales-order-risk-badges';
import { summarizeSalesOrderRisks, assessSalesOrderRisk } from '@/lib/sap-sales-order-risk';
import { assessSalesOrderCancellation } from '@/lib/sap-sales-order-cancellation';
import {
  SALES_ORDER_PAGE_SIZE,
  SALES_ORDER_SORT_OPTIONS,
  canGoNextPage,
  salesOrderSapOrderBy,
  salesOrderSkip,
  salesOrderTotalPages,
  sortSalesOrderListPage,
  type SalesOrderListSortField,
} from '@/lib/sap-sales-order-list';
import {
  mergePresetWithForm,
  parseSalesOrderPreset,
  presetToFormState,
  SALES_ORDER_PRESETS,
  SALES_ORDER_PRESET_PARAM,
  presetFilterSummary,
  type SalesOrderPresetId,
} from '@/lib/sap-sales-order-presets';
import {
  clearRestorePayload,
  loadRestorePayload,
  persistRecentSalesOrderQuery,
  SALES_ORDER_RESTORE_URL_FLAG,
  type SalesOrderRestorePayload,
} from '@/lib/sap-sales-order-recent-queries';
import { Search, RotateCcw, FileText, AlertCircle, Inbox, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface SalesOrderListRow {
  SalesOrder: string;
  SalesOrderType?: string;
  SoldToParty?: string;
  SalesOrganization?: string;
  TotalNetAmount?: string | number;
  TransactionCurrency?: string;
  SalesOrderDate?: string;
  RequestedDeliveryDate?: string;
  OverallSDProcessStatus?: string;
  OverallDeliveryStatus?: string;
  OverallBillingStatus?: string;
  OverallSDDocumentRejectionSts?: string;
  PurchaseOrderByCustomer?: string;
}

const defaultFilters = (): SalesOrderSearchFilters => ({
  orderType: SAP_DEFAULTS.salesOrderType,
  salesOrg: SAP_DEFAULTS.salesOrganization,
  statusField: 'process',
  statusValue: 'all',
});

function SalesOrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activePreset, setActivePreset] = useState<SalesOrderPresetId | null>(null);
  const [orders, setOrders] = useState<SalesOrderListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [countKnown, setCountKnown] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SalesOrderListSortField>('risk');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});

  const [salesOrderNo, setSalesOrderNo] = useState('');
  const [customer, setCustomer] = useState('');
  const [customerPo, setCustomerPo] = useState('');
  const [material, setMaterial] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [orderType, setOrderType] = useState(SAP_DEFAULTS.salesOrderType);
  const [salesOrg, setSalesOrg] = useState(SAP_DEFAULTS.salesOrganization);
  const [statusField, setStatusField] = useState<'process' | 'delivery' | 'billing'>('process');
  const [statusValue, setStatusValue] = useState('all');

  const effectiveFilters = (): SalesOrderSearchFilters => {
    const form: SalesOrderSearchFilters = {
      salesOrderNo,
      customer,
      purchaseOrderByCustomer: customerPo,
      material,
      dateFrom,
      dateTo,
      orderType,
      salesOrg,
      statusField,
      statusValue,
    };
    if (!activePreset) {
      return { ...defaultFilters(), ...form };
    }
    return { ...defaultFilters(), ...mergePresetWithForm(activePreset, form) };
  };

  const applyPresetToForm = (preset: SalesOrderPresetId) => {
    const partial = presetToFormState(preset);
    setActivePreset(preset);
    if (partial.statusField) setStatusField(partial.statusField);
    if (partial.statusValue) setStatusValue(partial.statusValue);
    setDateFrom(partial.dateFrom ?? '');
    setDateTo(partial.dateTo ?? '');
  };

  const applyRestorePayload = (payload: SalesOrderRestorePayload) => {
    setSalesOrderNo(payload.salesOrderNo ?? '');
    setCustomer(payload.customer ?? '');
    setCustomerPo(payload.purchaseOrderByCustomer ?? '');
    setMaterial(payload.material ?? '');
    setDateFrom(payload.dateFrom ?? '');
    setDateTo(payload.dateTo ?? '');
    setOrderType(payload.orderType ?? SAP_DEFAULTS.salesOrderType);
    setSalesOrg(payload.salesOrg ?? SAP_DEFAULTS.salesOrganization);
    setStatusField(payload.statusField ?? 'process');
    setStatusValue(payload.statusValue ?? 'all');
    setSortField(payload.sortField ?? 'risk');
    setSortDir(payload.sortDir ?? 'desc');
    setPage(1);
    if (payload.preset) {
      applyPresetToForm(payload.preset);
    } else {
      setActivePreset(null);
    }
  };

  useEffect(() => {
    if (searchParams.get(SALES_ORDER_RESTORE_URL_FLAG) !== '1') return;
    const payload = loadRestorePayload();
    clearRestorePayload();
    if (!payload) {
      router.replace('/sales-orders');
      return;
    }
    applyRestorePayload(payload);
    if (payload.preset) {
      router.replace(`/sales-orders?${SALES_ORDER_PRESET_PARAM}=${payload.preset}`);
      return;
    }
    router.replace('/sales-orders');
    window.setTimeout(() => {
      void fetchOrders({
        page: 1,
        listAction: 'search',
        sortField: payload.sortField,
        sortDir: payload.sortDir,
      });
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot restore from home
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get(SALES_ORDER_RESTORE_URL_FLAG) === '1') return;
    const preset = parseSalesOrderPreset(searchParams.get(SALES_ORDER_PRESET_PARAM));
    if (!preset) {
      setActivePreset(null);
      return;
    }
    applyPresetToForm(preset);
  }, [searchParams]);

  const loadCustomerNames = async (parties: string[]) => {
    const unique = [...new Set(parties.filter(Boolean))];
    if (unique.length === 0) return;

    const entries = await Promise.all(
      unique.map(async (party) => {
        try {
          const params = new URLSearchParams();
          params.set('id', party);
          params.set('select', 'Customer,CustomerName');
          const res = await fetchSapEntity<{ Customer: string; CustomerName?: string }>(
            'API_BUSINESS_PARTNER',
            'A_Customer',
            params
          );
          const row = res.data?.[0];
          return [party, row?.CustomerName || ''] as const;
        } catch {
          return [party, ''] as const;
        }
      })
    );

    setCustomerNames((prev) => {
      const next = { ...prev };
      entries.forEach(([id, name]) => {
        if (name) next[id] = name;
      });
      return next;
    });
  };

  const fetchOrders = useCallback(
    async (opts?: {
      page?: number;
      listAction?: 'search' | 'page' | 'sort' | 'quick-view';
      sortField?: SalesOrderListSortField;
      sortDir?: 'asc' | 'desc';
    }) => {
    const targetPage = opts?.page ?? page;
    const listAction = opts?.listAction ?? 'search';
    const activeSortField = opts?.sortField ?? sortField;
    const activeSortDir = opts?.sortDir ?? sortDir;
    setLoading(true);
    setError(null);

    const filters = effectiveFilters();
    const auditPayload: Record<string, unknown> = {
      ...filters,
      scope: {
        salesOrganization: SAP_DEFAULTS.salesOrganization,
        distributionChannel: SAP_DEFAULTS.distributionChannel,
        organizationDivision: SAP_DEFAULTS.division,
        defaultOrderType: SAP_DEFAULTS.salesOrderType,
      },
      page: targetPage,
      pageSize: SALES_ORDER_PAGE_SIZE,
      skip: salesOrderSkip(targetPage),
      sortField: activeSortField,
      sortDirection: activeSortDir,
      listAction,
    };
    if (activePreset) {
      auditPayload.source = 'quick-view';
      auditPayload.preset = activePreset;
      auditPayload.presetLabel = SALES_ORDER_PRESETS[activePreset].label;
    }
    auditPayload.riskSemantics = {
      sortedByRiskPriority: activeSortField === 'risk',
      note: '销售视角风险提示，不改变 SAP 状态',
    };

    try {
      let customerResolution: Awaited<ReturnType<typeof resolveCustomerFilter>> | undefined;
      if (customerPo.trim()) {
        auditPayload.customerPoInput = customerPo.trim();
      }
      if (customer.trim()) {
        customerResolution = await resolveCustomerFilter(customer);
        auditPayload.customerInput = customer.trim();
        auditPayload.customerResolveMode = customerResolution.mode;
        if (customerResolution.matchedCustomerIds?.length) {
          auditPayload.matchedCustomerIds = customerResolution.matchedCustomerIds;
        }
      }
      const customerClause = customerResolution?.clause;

      const runQuery = async (materialClause?: string) => {
        const params = new URLSearchParams();
        params.set('top', String(SALES_ORDER_PAGE_SIZE));
        params.set('skip', String(salesOrderSkip(targetPage)));
        params.set('count', 'true');
        params.set('filter', buildSalesOrderListFilter(filters, { customerClause, materialClause }));
        params.set('orderby', salesOrderSapOrderBy(activeSortField, activeSortDir));
        params.set(
          'select',
          'SalesOrder,SalesOrderType,SoldToParty,PurchaseOrderByCustomer,SalesOrganization,TotalNetAmount,TransactionCurrency,SalesOrderDate,RequestedDeliveryDate,OverallSDProcessStatus,OverallDeliveryStatus,OverallBillingStatus,OverallSDDocumentRejectionSts'
        );
        return fetchSapEntity<SalesOrderListRow>('CE_SALESORDER_0001', 'SalesOrder', params);
      };

      if (material.trim()) {
        auditPayload.materialInput = material.trim();
      }

      const emptyListResult = (): Awaited<ReturnType<typeof runQuery>> => ({
        success: true,
        data: [],
        count: 0,
      });

      let data: Awaited<ReturnType<typeof runQuery>>;
      let materialResolution: Awaited<ReturnType<typeof resolveMaterialFilter>> | undefined;
      let materialFallbackUsed = false;

      try {
        data = await runQuery();
      } catch (firstErr) {
        if (!material.trim()) throw firstErr;
        materialResolution = await resolveMaterialFilter(material);
        materialFallbackUsed = true;
        auditPayload.materialResolveMode = materialResolution.mode;
        if (!materialResolution.clause) {
          data = emptyListResult();
        } else {
          auditPayload.materialFilterPath = 'SalesOrderItem-reverse';
          data = await runQuery(materialResolution.clause);
        }
      }

      if (
        material.trim() &&
        !materialFallbackUsed &&
        (data.data?.length ?? 0) === 0
      ) {
        materialResolution = await resolveMaterialFilter(material);
        auditPayload.materialResolveMode = materialResolution.mode;
        if (materialResolution.clause) {
          auditPayload.materialFilterPath = 'SalesOrderItem-reverse-after-empty';
          const retry = await runQuery(materialResolution.clause);
          if ((retry.data?.length ?? 0) > 0) {
            data = retry;
          }
        }
      } else if (material.trim() && !materialFallbackUsed) {
        auditPayload.materialFilterPath = '_Item/any';
      }

      const rawRows = data.data || [];
      const rows = sortSalesOrderListPage(rawRows, activeSortField, activeSortDir);
      const sapCount = data.count;
      const known = sapCount != null && !Number.isNaN(Number(sapCount));
      setCountKnown(known);
      setTotalCount(known ? Number(sapCount) : rawRows.length);
      setPage(targetPage);
      setOrders(rows);

      await loadCustomerNames(rows.map((o) => o.SoldToParty || '').filter(Boolean));

      auditPayload.riskSnapshot = summarizeSalesOrderRisks(rows);
      auditPayload.totalCountKnown = known;
      if (!known) {
        auditPayload.totalCountNote = 'SAP 未返回 @odata.count，总条数仅显示本页';
      }

      await logQueryAudit({
        module: 'sales-orders',
        action: 'list',
        conditions: auditPayload,
        resultCount: known ? Number(sapCount) : rows.length,
        success: true,
      });
      persistRecentSalesOrderQuery({
        conditions: auditPayload,
        resultCount: known ? Number(sapCount) : rows.length,
        success: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setOrders([]);
      setTotalCount(0);
      setCountKnown(true);
      await logQueryAudit({
        module: 'sales-orders',
        action: 'list',
        conditions: auditPayload,
        success: false,
        error: message,
      });
      persistRecentSalesOrderQuery({
        conditions: auditPayload,
        success: false,
        error: message,
      });
    } finally {
      setLoading(false);
    }
  },
    [
      salesOrderNo,
      customer,
      customerPo,
      material,
      dateFrom,
      dateTo,
      orderType,
      salesOrg,
      statusField,
      statusValue,
      activePreset,
      page,
      sortField,
      sortDir,
    ]
  );

  const runSearch = () => {
    setPage(1);
    void fetchOrders({ page: 1, listAction: 'search' });
  };

  useEffect(() => {
    if (!activePreset) return;
    setPage(1);
    void fetchOrders({ page: 1, listAction: 'quick-view' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-query when quick-view preset is active
  }, [activePreset]);

  const totalPages = salesOrderTotalPages(totalCount, countKnown, orders.length, page);
  const showNext = canGoNextPage(page, totalCount, countKnown, orders.length);
  const showPrev = page > 1;

  const goPrevPage = () => {
    const next = page - 1;
    setPage(next);
    void fetchOrders({ page: next, listAction: 'page' });
  };

  const goNextPage = () => {
    const next = page + 1;
    setPage(next);
    void fetchOrders({ page: next, listAction: 'page' });
  };

  const onSortFieldChange = (value: SalesOrderListSortField) => {
    const dir = value === 'risk' ? 'desc' : sortDir;
    setSortField(value);
    if (value === 'risk') setSortDir('desc');
    setPage(1);
    void fetchOrders({ page: 1, listAction: 'sort', sortField: value, sortDir: dir });
  };

  const onSortDirChange = (value: 'asc' | 'desc') => {
    setSortDir(value);
    setPage(1);
    void fetchOrders({ page: 1, listAction: 'sort', sortField, sortDir: value });
  };

  const clearPreset = () => {
    setActivePreset(null);
    router.replace('/sales-orders');
  };

  const handleClear = () => {
    const d = defaultFilters();
    setSalesOrderNo('');
    setCustomer('');
    setCustomerPo('');
    setMaterial('');
    setDateFrom('');
    setDateTo('');
    setOrderType(d.orderType!);
    setSalesOrg(d.salesOrg!);
    setStatusField('process');
    setStatusValue('all');
    setSelectedOrderNo(null);
    setOrders([]);
    setTotalCount(0);
    setPage(1);
    setCountKnown(true);
    setError(null);
    if (activePreset) clearPreset();
  };

  const isPermissionError = error === SAP_NO_PERMISSION_MESSAGE;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800">销售订单</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              默认范围：销售组织 {SAP_DEFAULTS.salesOrganization} · 分销渠道 {SAP_DEFAULTS.distributionChannel} · 产品组 {SAP_DEFAULTS.division} · 订单类型 {SAP_DEFAULTS.salesOrderType}
            </p>
          </div>
        </div>
      </div>

      {activePreset && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-2.5">
          <p className="text-sm text-blue-900">
            <span className="font-medium">快捷视图：</span>
            {SALES_ORDER_PRESETS[activePreset].label}
            <span className="text-blue-700/80 ml-2 text-xs block sm:inline sm:ml-2 mt-1 sm:mt-0">
              {presetFilterSummary(activePreset)}
            </span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-800 hover:text-blue-950 hover:bg-blue-100/80 shrink-0"
            onClick={clearPreset}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            清除快捷视图
          </Button>
        </div>
      )}

      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-full md:w-[160px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">销售订单号</label>
              <Input
                placeholder="订单号"
                value={salesOrderNo}
                onChange={(e) => setSalesOrderNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
            </div>
            <div className="w-full md:w-[150px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">客户</label>
              <Input
                placeholder="客户编号 / 名称（亦可填 PO）"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
            </div>
            <div className="w-full md:w-[140px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">客户采购单号</label>
              <Input
                placeholder="客户 PO 精确匹配"
                value={customerPo}
                onChange={(e) => setCustomerPo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                className="font-mono text-sm"
              />
            </div>
            <div className="w-full md:w-[140px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">物料</label>
              <Input
                placeholder="物料编码 / 描述"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
            </div>
            <div className="w-[140px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">订单日期起</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="w-[140px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">订单日期止</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="w-[130px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">订单类型</label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SAP_DEFAULTS.salesOrderType}>OR - 标准订单</SelectItem>
                  <SelectItem value="CR">CR - 退货</SelectItem>
                  <SelectItem value="DR">DR - 借记</SelectItem>
                  <SelectItem value="S1">S1 - 免费交货</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[120px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">状态维度</label>
              <Select
                value={statusField}
                onValueChange={(v) => {
                  setStatusField(v as typeof statusField);
                  setStatusValue('all');
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="process">系统处理</SelectItem>
                  <SelectItem value="delivery">交货</SelectItem>
                  <SelectItem value="billing">开票</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                {statusField === 'delivery' ? '交货状态' : statusField === 'billing' ? '开票状态' : '系统状态'}
              </label>
              <Select value={statusValue} onValueChange={setStatusValue}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SALES_ORDER_STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={runSearch} disabled={loading}>
              <Search className="w-3.5 h-3.5 mr-1" />
              查询
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              清除
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Card className="border-slate-200 xl:col-span-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 flex-wrap">
              <div className="min-w-0">
                <span className="text-sm font-medium text-slate-700">查询结果</span>
                {!loading && !error && orders.length > 0 && sortField === 'risk' && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    默认：当页内风险优先，其次订单日期倒序；翻页按 SAP 订单日期分页
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as SalesOrderListSortField)}>
                  <SelectTrigger className="h-8 w-[148px] text-xs">
                    <SelectValue placeholder="排序" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALES_ORDER_SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sortDir}
                  onValueChange={(v) => onSortDirChange(v as 'asc' | 'desc')}
                  disabled={sortField === 'risk'}
                >
                  <SelectTrigger className="h-8 w-[88px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">降序</SelectItem>
                    <SelectItem value="asc">升序</SelectItem>
                  </SelectContent>
                </Select>
                {!loading && !error && orders.length > 0 && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {countKnown ? `共 ${totalCount} 条` : `本页 ${orders.length} 条`}
                  </Badge>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <AlertCircle className={`w-10 h-10 mb-3 ${isPermissionError ? 'text-amber-500' : 'text-red-400'}`} />
                <p className={`text-sm font-medium ${isPermissionError ? 'text-amber-800' : 'text-red-600'}`}>
                  {isPermissionError ? SAP_NO_PERMISSION_MESSAGE : '查询失败'}
                </p>
                <p className="text-xs text-slate-500 mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => fetchOrders({ page, listAction: 'page' })}
                >
                  重试
                </Button>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">暂无数据</p>
                <p className="text-xs text-slate-400 mt-1">设置条件后点击查询</p>
              </div>
            ) : (
              <TooltipProvider delayDuration={200}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="font-medium text-slate-600">订单号</TableHead>
                      <TableHead className="font-medium text-slate-600 min-w-[140px]">
                        风险 / 优先级
                      </TableHead>
                      <TableHead className="font-medium text-slate-600">类型</TableHead>
                      <TableHead className="font-medium text-slate-600">客户编号 / 名称</TableHead>
                      <TableHead className="font-medium text-slate-600">客户 PO</TableHead>
                      <TableHead className="font-medium text-slate-600">订单日期</TableHead>
                      <TableHead className="font-medium text-slate-600">请求交期</TableHead>
                      <TableHead className="font-medium text-slate-600">币种</TableHead>
                      <TableHead className="font-medium text-slate-600 text-right">总金额</TableHead>
                      <TableHead className="font-medium text-slate-600">系统状态</TableHead>
                      <TableHead className="font-medium text-slate-600">交货状态</TableHead>
                      <TableHead className="font-medium text-slate-600">开票状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const selected = selectedOrderNo === order.SalesOrder;
                      const party = order.SoldToParty || '';
                      const name = customerNames[party];
                      const risk = assessSalesOrderRisk(order);
                      const cancel = assessSalesOrderCancellation(order);
                      const deliveryDateClass =
                        risk.deliveryRisk === 'overdue'
                          ? 'text-red-700 font-medium'
                          : risk.deliveryRisk === 'due-soon'
                            ? 'text-amber-800 font-medium'
                            : 'text-slate-500';
                      return (
                        <TableRow
                          key={order.SalesOrder}
                          className={`cursor-pointer transition-colors ${
                            selected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                          } ${
                            cancel.headerClosed
                              ? 'bg-red-50/40 hover:bg-red-50/60'
                              : cancel.kind === 'partially-rejected'
                                ? 'bg-red-50/20'
                                : ''
                          }`}
                          onClick={() => setSelectedOrderNo(order.SalesOrder)}
                        >
                          <TableCell className="font-mono text-sm text-blue-600 font-medium">
                            {order.SalesOrder}
                          </TableCell>
                          <TableCell className="align-top py-2">
                            <SalesOrderRiskBadges order={order} assessment={risk} compact />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {order.SalesOrderType || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-mono text-xs text-slate-500">{party || '-'}</div>
                            {name && <div className="text-slate-700">{name}</div>}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-slate-700 max-w-[120px] truncate" title={order.PurchaseOrderByCustomer}>
                            {order.PurchaseOrderByCustomer?.trim() || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {parseSapDate(order.SalesOrderDate)}
                          </TableCell>
                          <TableCell className={`text-sm ${deliveryDateClass}`}>
                            {parseSapDate(order.RequestedDeliveryDate)}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {order.TransactionCurrency || 'CNY'}
                          </TableCell>
                          <TableCell className="text-sm text-right font-mono tabular-nums">
                            {order.TotalNetAmount != null
                              ? Number(order.TotalNetAmount).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <SalesOrderStatusBadge
                              status={order.OverallSDProcessStatus}
                              dimension="process"
                            />
                          </TableCell>
                          <TableCell>
                            <SalesOrderStatusBadge
                              status={order.OverallDeliveryStatus}
                              dimension="delivery"
                            />
                          </TableCell>
                          <TableCell>
                            <SalesOrderStatusBadge
                              status={order.OverallBillingStatus}
                              dimension="billing"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    第 <span className="font-mono tabular-nums">{page}</span> 页
                    {totalPages != null ? (
                      <>
                        {' '}
                        / <span className="font-mono tabular-nums">{totalPages}</span>
                      </>
                    ) : null}
                    {' · '}每页 {SALES_ORDER_PAGE_SIZE} 条
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={loading || !showPrev}
                      onClick={goPrevPage}
                    >
                      <ChevronLeft className="w-4 h-4 mr-0.5" />
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={loading || !showNext}
                      onClick={goNextPage}
                    >
                      下一页
                      <ChevronRight className="w-4 h-4 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 xl:col-span-2">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">订单详情与穿透</h2>
            <OrderDetailPanel
              salesOrderNo={selectedOrderNo}
              customerName={
                selectedOrderNo
                  ? customerNames[
                      orders.find((o) => o.SalesOrder === selectedOrderNo)?.SoldToParty ?? ''
                    ]
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SalesOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <SalesOrdersPageContent />
    </Suspense>
  );
}
