'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, RotateCw, ChevronLeft, ChevronRight, Filter, LayoutList, Table2 } from 'lucide-react';
import { FioriBadge } from '@/components/fiori';
import { getSapStatusColor, getSapStatusLabel } from '@/components/fiori';

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

function formatAmount(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
}

export default function SalesOrdersPage() {
  const [data, setData] = useState<SalesOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = page * PAGE_SIZE;
      const params = new URLSearchParams({
        top: String(PAGE_SIZE),
        skip: String(skip),
        count: 'true',
      });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('filter', `OverallSDProcessStatus eq '${statusFilter}'`);

      const res = await fetch(`/api/sap/CE_SALESORDER_0001/SalesOrder?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
        setTotalCount(json.totalCount || 0);
      } else {
        setError(json.error || '查询失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
              placeholder="搜索订单号/客户..."
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
            return (
              <Link key={order.SalesOrder} href={`/sales-orders/${order.SalesOrder}`} className="fiori-oli block">
                <div className={`fiori-oli-bar fiori-oli-bar--${statusColor}`} />
                <div className="fiori-oli-content">
                  <div className="fiori-oli-title">
                    {order.SalesOrder}
                    <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span>
                    {order.SoldToParty}
                  </div>
                  <div className="fiori-oli-subtitle">
                    {formatDate(order.SalesOrderDate)}
                    <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span>
                    {order.PurchaseOrderByCustomer}
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
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>客户</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>日期</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>客户采购单</th>
                <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>金额</th>
                <th className="text-center px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {data.map((order) => {
                const statusColor = getSapStatusColor(order.OverallSDProcessStatus);
                const statusLabel = getSapStatusLabel(order.OverallSDProcessStatus);
                return (
                  <tr key={order.SalesOrder} className="border-t hover:bg-accent/50 transition-colors cursor-pointer" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">
                      <Link href={`/sales-orders/${order.SalesOrder}`} className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                        {order.SalesOrder}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{order.SoldToParty}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(order.SalesOrderDate)}</td>
                    <td className="px-4 py-3">{order.PurchaseOrderByCustomer}</td>
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
