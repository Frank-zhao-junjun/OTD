'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, RotateCw, ChevronLeft, ChevronRight, Filter, LayoutList, Table2 } from 'lucide-react';
import { FioriBadge } from '@/components/fiori';
import { getSapStatusColor, getSapStatusLabel } from '@/components/fiori';

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

const PAGE_SIZE = 10;

function formatDate(dateStr: string): string {
  const match = dateStr.match(/\/Date\((\d+)\)\//);
  if (match) {
    const d = new Date(parseInt(match[1]));
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return dateStr;
}

function formatAmount(amount: string | number, currency: string): string {
  const num = parseFloat(String(amount));
  if (isNaN(num)) return String(amount);
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const [data, setData] = useState<SalesOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
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

      // 构建过滤条件
      const filters: string[] = [];
      if (typeFilter !== 'all') {
        filters.push(`SalesOrderType eq '${typeFilter}'`);
      }
      if (statusFilter !== 'all') {
        filters.push(`OverallSDProcessStatus eq '${statusFilter}'`);
      }

      // 搜索关键词：先在DB中模糊搜索获取精确编号，再用编号过滤
      if (search.trim()) {
        const keyword = search.trim();
        const searchRes = await fetch(`/api/sap/search?type=all&q=${encodeURIComponent(keyword)}`);
        const searchData = await searchRes.json();
        if (searchData.success) {
          const customerFilters: string[] = [];
          const productFilters: string[] = [];

          if (searchData.customers?.length > 0) {
            for (const c of searchData.customers) {
              customerFilters.push(`SoldToParty eq '${c.customer}'`);
            }
          }
          if (searchData.products?.length > 0) {
            // V2: 行项目用Material字段，需要在header级别用SoldToParty过滤
            // 产品编号过滤无法在header级别直接应用，后续在客户端过滤
            for (const p of searchData.products) {
              productFilters.push(p.product);
            }
          }

          // 客户编号匹配
          const codeFilters: string[] = [];
          if (customerFilters.length > 0) codeFilters.push(customerFilters.join(' or '));

          if (codeFilters.length > 0) {
            filters.push(`(${codeFilters.join(' or ')})`);
          } else if (productFilters.length === 0) {
            // DB中也搜不到，尝试用关键词直接匹配订单号
            filters.push(`SalesOrder eq '${keyword}'`);
          }
        }
      }

      if (filters.length > 0) params.set('filter', filters.join(' and '));

      const res = await fetch(`/api/sap/API_SALES_ORDER_SRV/A_SalesOrder?${params}`);
      const json = await res.json();
      if (json.success) {
        let orders = json.data || [];
        setTotalCount(json.totalCount || json.count || 0);

        // 如果有产品搜索条件，在客户端过滤包含该产品的订单
        if (search.trim()) {
          const keyword = search.trim();
          const searchRes = await fetch(`/api/sap/search?type=all&q=${encodeURIComponent(keyword)}`);
          const searchData = await searchRes.json();
          if (searchData.success && searchData.products?.length > 0) {
            const productCodes = new Set(searchData.products.map((p: { product: string }) => p.product));
            const customerCodes = searchData.customers?.length > 0
              ? new Set(searchData.customers.map((c: { customer: string }) => c.customer))
              : null;
            if (!customerCodes) {
              // 只按产品过滤
              orders = orders.filter((o: SalesOrder) =>
                o.to_Item?.some((item: SalesOrderItem) => productCodes.has(item.Material))
              );
            }
          }
        }

        setData(orders);

        // 获取客户名称（从DB查询）
        const customerCodes = [...new Set(orders.map((o: SalesOrder) => o.SoldToParty).filter(Boolean))] as string[];
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
   
  }, [page, search, statusFilter, typeFilter]);

  const fetchCustomerNames = async (codes: string[]) => {
    try {
      const filter = codes.map(c => `Customer eq '${c}'`).join(' or ');
      const res = await fetch(`/api/sap/API_BUSINESS_PARTNER/A_Customer?filter=${encodeURIComponent(filter)}&top=100`);
      const json = await res.json();
      if (json.success && json.data) {
        const map: Record<string, string> = {};
        for (const c of json.data) {
          map[c.Customer] = c.CustomerName || c.CustomerFullName || '';
        }
        setCustomerMap(prev => ({ ...prev, ...map }));
      }
    } catch {
      // 客户名称获取失败不影响主流程
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  /** Get customer name from lookup map */
  function getCustomerName(soldToParty: string): string {
    return customerMap[soldToParty] || '';
  }

  /** Count line items from to_Item expand data */
  function getItemCount(order: SalesOrder): number {
    return order.to_Item?.length || 0;
  }

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="lg:hidden">
        <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>销售订单</h1>
      </div>

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
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
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

        <button
          className="h-8 px-4 text-sm rounded font-medium text-white"
          style={{ background: 'var(--primary)' }}
          onClick={fetchData}
        >
          <RotateCw className="w-3.5 h-3.5 inline mr-1" />
          查询
        </button>
      </div>

      {/* Expandable Filter Area */}
      {filterOpen && (
        <div className="p-3 rounded-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
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
      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        共 {totalCount} 条记录
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

      {/* ===== Card View (Mobile: always, PC: when selected) ===== */}
      {!loading && !error && data.length > 0 && (
        <div className={`space-y-2 ${viewMode === 'table' ? 'lg:hidden' : ''}`}>
          {data.map((order) => {
            const statusColor = getSapStatusColor(order.OverallSDProcessStatus);
            const statusLabel = getSapStatusLabel(order.OverallSDProcessStatus);
            const cname = getCustomerName(order.SoldToParty);
            const itemCount = getItemCount(order);
            return (
              <Link key={order.SalesOrder} href={`/sales-orders/${order.SalesOrder}`} className="fiori-oli block">
                <div className={`fiori-oli-bar fiori-oli-bar--${statusColor}`} />
                <div className="fiori-oli-content">
                  <div className="fiori-oli-title">
                    {order.SalesOrder}
                    <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span>
                    {order.SoldToParty}
                    {cname && <span style={{ color: 'var(--muted-foreground)' }}> {cname}</span>}
                  </div>
                  <div className="fiori-oli-subtitle">
                    {order.SalesOrderType}
                    <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span>
                    {formatDate(order.SalesOrderDate)}
                    <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span>
                    {itemCount}个行项目
                  </div>
                  <div className="flex items-center gap-2">
                    <FioriBadge variant={statusColor as 'success' | 'warning' | 'error' | 'info' | 'neutral'}>{statusLabel}</FioriBadge>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                      {formatAmount(order.TotalNetAmount, order.TransactionCurrency)}
                    </span>
                  </div>
                </div>
              </Link>
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
                      <FioriBadge variant={statusColor as 'success' | 'warning' | 'error' | 'info' | 'neutral'}>{statusLabel}</FioriBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Pagination ===== */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            第 {page + 1}/{totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              className="h-8 w-8 flex items-center justify-center rounded border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: page === 0 ? 'var(--muted-foreground)' : 'var(--foreground)' }}
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="h-8 w-8 flex items-center justify-center rounded border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: page >= totalPages - 1 ? 'var(--muted-foreground)' : 'var(--foreground)' }}
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
