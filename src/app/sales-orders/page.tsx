'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RotateCw, Filter, LayoutList, Table2, FileText, Download } from 'lucide-react';
import { exportToExcel, type ExportColumn } from '@/lib/export';
import { FioriOli, FioriBadge, FioriPageHeader, FioriSection, getSapStatusColor, getSapStatusLabel } from '@/components/fiori';
import { useViewMode } from '@/hooks/useViewMode';
import { useFilterPageFetch } from '@/hooks/useFilterPageFetch';
import { fetchCustomerNameMap } from '@/lib/bilingual-display';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface SalesOrderItem {
  SalesOrderItem: string;
  Material: string;
  SalesOrderItemText: string;
  RequestedQuantity: string;
  RequestedQuantityUnit: string;
  NetAmount: string;
  TransactionCurrency: string;
}

interface SalesOrderPartner {
  PartnerFunction: string;
  Customer: string;
}

interface SalesOrder {
  SalesOrder: string;
  SalesOrderType: string;
  SalesOrganization: string;
  DistributionChannel: string;
  OrganizationDivision: string;
  SoldToParty: string;
  PurchaseOrderByCustomer: string;
  SalesOrderDate: string;
  TotalNetAmount: string;
  TransactionCurrency: string;
  OverallSDProcessStatus: string;
  SalesOrderTypeInternalCode?: string;
  to_Item?: SalesOrderItem[];
  to_Partner?: SalesOrderPartner[];
}

const PAGE_SIZE = 20;

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const match = dateStr.match(/\/Date\((\d+)\)\//);
  if (match) {
    const d = new Date(parseInt(match[1]));
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return dateStr;
}

function formatAmount(amount: string | number, currency: string): string {
  const num = parseFloat(String(amount));
  if (isNaN(num)) return String(amount);
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (currency || '');
}

const salesColumns: ExportColumn<SalesOrder>[] = [
  { header: '销售订单号', key: 'SalesOrder', width: 14 },
  { header: '订单类型', key: 'SalesOrderType', width: 10 },
  { header: '客户', key: 'SoldToParty', width: 12 },
  { header: '订单日期', key: 'SalesOrderDate', width: 14, render: (o) => formatDate(o.SalesOrderDate) },
  { header: '金额', key: 'TotalNetAmount', width: 14, render: (o) => formatAmount(o.TotalNetAmount, o.TransactionCurrency) },
  { header: '状态', key: 'OverallSDProcessStatus', width: 12, render: (o) => getSapStatusLabel(o.OverallSDProcessStatus) },
  { header: '行项目数', key: 'SalesOrder', width: 10, render: (o) => String(o.to_Item?.length || 0) },
];

export default function SalesOrdersPage() {
  const router = useRouter();
  const [data, setData] = useState<SalesOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useViewMode();
  const [customerMap, setCustomerMap] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = page * PAGE_SIZE;
      const params = new URLSearchParams({
        top: String(PAGE_SIZE),
        skip: String(skip),
        expand: 'to_Item,to_Partner',
      });

      const filters: string[] = [];
      if (typeFilter !== 'all') {
        filters.push(`SalesOrderType eq '${typeFilter}'`);
      }
      if (statusFilter !== 'all') {
        filters.push(`OverallSDProcessStatus eq '${statusFilter}'`);
      }

      let searchData: { success?: boolean; customers?: { customer: string }[]; products?: { product: string }[] } | null = null;

      if (debouncedSearch.trim()) {
        const keyword = debouncedSearch.trim();
        const searchRes = await fetch(`/api/sap/search?type=all&q=${encodeURIComponent(keyword)}`);
        searchData = await searchRes.json();
        if (searchData?.success) {
          const customerFilters: string[] = [];
          const productFilters: string[] = [];

          if (searchData.customers?.length) {
            for (const c of searchData.customers) {
              customerFilters.push(`SoldToParty eq '${c.customer}'`);
            }
          }
          if (searchData.products?.length) {
            for (const p of searchData.products) {
              productFilters.push(p.product);
            }
          }

          if (customerFilters.length > 0) {
            filters.push(`(${customerFilters.join(' or ')})`);
          } else if (productFilters.length === 0) {
            filters.push(`SalesOrder eq '${keyword}'`);
          }
        }
      }

      if (filters.length > 0) params.set('filter', filters.join(' and '));

      const res = await fetch(`/api/sap/API_SALES_ORDER_SRV/A_SalesOrder?${params}`);
      const json = await res.json();
      if (json.success) {
        let orders: SalesOrder[] = json.data || [];
        setTotalCount(json.totalCount || json.count || 0);

        if (debouncedSearch.trim() && searchData?.success && searchData.products?.length && !searchData.customers?.length) {
          const productCodes = new Set(searchData.products.map((p) => p.product));
          orders = orders.filter((o) =>
            o.to_Item?.some((item) => productCodes.has(item.Material))
          );
        }

        setData((prev) => (page === 0 ? orders : [...prev, ...orders]));

        const customerCodes = [...new Set(orders.map((o) => o.SoldToParty).filter(Boolean))] as string[];
        if (customerCodes.length > 0) {
          fetchCustomerNames(customerCodes);
        }
      } else {
        setError(json.error || '查询失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }

  }, [page, debouncedSearch, statusFilter, typeFilter]);

  const filterSig = `${debouncedSearch}|${statusFilter}|${typeFilter}`;
  useFilterPageFetch(filterSig, page, setPage, fetchData);

  const fetchCustomerNames = async (codes: string[]) => {
    try {
      const map = await fetchCustomerNameMap(codes);
      setCustomerMap(prev => ({ ...prev, ...map }));
    } catch {
      // ignore
    }
  };

  function getCustomerName(soldToParty: string): string {
    return customerMap[soldToParty] || '';
  }

  function getItemCount(order: SalesOrder): number {
    return order.to_Item?.length || 0;
  }

  return (
    <div>
      <FioriPageHeader
        title="销售订单"
        subtitle="按 BD9 Sell from Stock 默认过滤"
        icon={FileText}
        breadcrumbs={[{ label: '工作台', href: '/' }, { label: '业务交易' }, { label: '销售订单' }]}
        actions={
          <button
            className="h-9 px-4 text-sm rounded font-medium text-white"
            style={{ background: 'var(--primary)' }}
            onClick={fetchData}
          >
            <RotateCw className="w-3.5 h-3.5 inline mr-1" />
            查询
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="fiori-filterbar">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              placeholder="搜索订单号/客户名/产品名..."
              className="w-full h-8 pl-8 pr-3 text-sm rounded border outline-none"
              style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="h-8 px-3 text-sm rounded border flex items-center gap-1.5"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">筛选</span>
          </button>
        </div>

        {/* View Toggle - PC only */}
        <div className="hidden lg:flex items-center border rounded overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <button
            className={`h-8 w-8 flex items-center justify-center ${viewMode === 'card' ? 'text-white' : ''}`}
            style={viewMode === 'card' ? { background: 'var(--primary)' } : { background: 'var(--card)', color: 'var(--muted-foreground)' }}
            onClick={() => setViewMode('card')}
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            className={`h-8 w-8 flex items-center justify-center ${viewMode === 'table' ? 'text-white' : ''}`}
            style={viewMode === 'table' ? { background: 'var(--primary)' } : { background: 'var(--card)', color: 'var(--muted-foreground)' }}
            onClick={() => setViewMode('table')}
          >
            <Table2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-8 px-3 text-sm rounded border font-medium" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--primary)' }} onClick={() => exportToExcel(data, salesColumns, '销售订单')}>
            <Download className="w-3.5 h-3.5 inline mr-1" /> 导出
          </button>
        </div>
      </div>

      {/* Expandable Filter Area */}
      {filterOpen && (
        <div className="p-3 rounded-lg border mb-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="fiori-filterbar-field">
              <label>订单类型</label>
              <select
                className="h-8 px-2 text-sm rounded border outline-none"
                style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
              >
                <option value="all">全部</option>
                <option value="OR">OR - 标准订单</option>
                <option value="TA">TA - 现金销售</option>
                <option value="CR">CR - 退货订单</option>
                <option value="DR">DR - 借记备忘录</option>
              </select>
            </div>
            <div className="fiori-filterbar-field">
              <label>状态</label>
              <select
                className="h-8 px-2 text-sm rounded border outline-none"
                style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <option value="all">全部</option>
                <option value="A">未处理</option>
                <option value="B">部分发货</option>
                <option value="C">已完成</option>
                <option value="X">已取消</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Result Count */}
      <div className="text-xs mb-3 flex items-center justify-between" style={{ color: 'var(--muted-foreground)' }}>
        <span>共 <strong style={{ color: 'var(--foreground)' }}>{totalCount}</strong> 条记录 · 已加载 {data.length} 条</span>
      </div>

      {/* ===== Loading ===== */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        </div>
      )}

      {/* ===== Error ===== */}
      {error && !loading && (
        <div className="text-center py-12" style={{ color: 'var(--color-fiori-error)' }}>
          <p className="text-sm">{error}</p>
          <button className="mt-2 text-sm underline" onClick={fetchData}>重试</button>
        </div>
      )}

      {/* ===== Empty ===== */}
      {!loading && !error && data.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}>
          <p className="text-sm">暂无数据</p>
        </div>
      )}

      {/* ===== Card View ===== */}
      {!loading && !error && data.length > 0 && (
        <div className={`space-y-2 ${viewMode === 'table' ? 'lg:hidden' : ''}`}>
          {data.map((order) => {
            const statusColor = getSapStatusColor(order.OverallSDProcessStatus);
            const statusLabel = getSapStatusLabel(order.OverallSDProcessStatus);
            const cname = getCustomerName(order.SoldToParty);
            const itemCount = getItemCount(order);
            return (
              <FioriOli
                key={order.SalesOrder}
                href={`/sales-orders/${order.SalesOrder}`}
                barColor={statusColor}
                title={
                  <span>
                    <span style={{ color: 'var(--primary)' }}>{order.SalesOrder}</span>
                    {cname ? (
                      <span className="ml-2" style={{ color: 'var(--muted-foreground)' }}>{cname}</span>
                    ) : (
                      <span className="ml-2" style={{ color: 'var(--muted-foreground)' }}>{order.SoldToParty}</span>
                    )}
                  </span>
                }
                subtitle={
                  <span className="flex items-center gap-2">
                    <span>{order.SalesOrderType}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span>{formatDate(order.SalesOrderDate)}</span>
                  </span>
                }
                statusVariant={statusColor}
                status={statusLabel}
                numeric={formatAmount(order.TotalNetAmount, order.TransactionCurrency)}
                attributes={[
                  { label: '客户编号', value: order.SoldToParty },
                  { label: '行项目', value: `${itemCount} 个` },
                  { label: '类型', value: order.SalesOrderType },
                ]}
              />
            );
          })}
        </div>
      )}

      {/* ===== Table View (PC only) ===== */}
      {!loading && !error && data.length > 0 && viewMode === 'table' && (
        <div className="hidden lg:block rounded-lg border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--muted)' }}>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>订单号</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>类型</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>客户</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>日期</th>
                <th className="text-center px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>行项目</th>
                <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>金额</th>
                <th className="text-center px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {data.map((order) => {
                const statusColor = getSapStatusColor(order.OverallSDProcessStatus);
                const statusLabel = getSapStatusLabel(order.OverallSDProcessStatus);
                const cname = getCustomerName(order.SoldToParty);
                const itemCount = getItemCount(order);
                return (
                  <tr key={order.SalesOrder} className="border-t hover:bg-accent/50 transition-colors cursor-pointer" style={{ borderColor: 'var(--border)' }} onClick={() => router.push(`/sales-orders/${order.SalesOrder}`)}>
                    <td className="px-4 py-3">
                      <span className="font-medium" style={{ color: 'var(--primary)' }}>
                        {order.SalesOrder}
                      </span>
                    </td>
                    <td className="px-4 py-3">{order.SalesOrderType}</td>
                    <td className="px-4 py-3">
                      {order.SoldToParty}
                      {cname && <span style={{ color: 'var(--muted-foreground)' }}> {cname}</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(order.SalesOrderDate)}</td>
                    <td className="px-4 py-3 text-center">{itemCount}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatAmount(order.TotalNetAmount, order.TransactionCurrency)}</td>
                    <td className="px-4 py-3 text-center">
                      <FioriBadge variant={statusColor}>{statusLabel}</FioriBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Load More ===== */}
      {!loading && !error && data.length < totalCount && (
        <button
          className="w-full h-10 rounded border text-sm font-medium transition-colors mt-3"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--primary)',
          }}
          onClick={() => setPage(p => p + 1)}
        >
          加载更多 ({data.length}/{totalCount})
        </button>
      )}
    </div>
  );
}
