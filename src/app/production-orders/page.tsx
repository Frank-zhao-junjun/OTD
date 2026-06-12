'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FioriBadge, FioriFab } from '@/components/fiori';
import { SAP_DEFAULTS } from '@/lib/sap-service';
import { Search, RotateCcw, Filter, Inbox, LayoutList, Table2 } from 'lucide-react';
import { useViewMode } from '@/hooks/useViewMode';

interface ProductionOrder {
  ProductionOrder: string;
  ProductionOrderType?: string;
  IsMarkedForDeletion?: boolean;
  IsCompletelyDelivered?: boolean;
  Product?: string;
  ProductionPlant?: string;
  SalesOrder?: string;
  SalesOrderItem?: string;
  OrderScheduledStartDate?: string;
  OrderScheduledEndDate?: string;
  OrderActualStartDate?: string;
  OrderActualEndDate?: string;
  OrderPlannedTotalQty?: string;
  ActualDeliveredQuantity?: string;
}

const getStatusInfo = (order: ProductionOrder): { color: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string } => {
  if (order.IsMarkedForDeletion) return { color: 'error', label: '已删除' };
  if (order.IsCompletelyDelivered) return { color: 'success', label: '已交货' };
  if (order.OrderActualStartDate && !order.OrderActualEndDate) return { color: 'warning', label: '生产中' };
  if (order.OrderActualEndDate) return { color: 'info', label: '已完成' };
  return { color: 'neutral', label: '已创建' };
};

export default function ProductionOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [plant, setPlant] = useState(SAP_DEFAULTS.plant);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [viewMode, setViewMode] = useViewMode();
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // 获取产品名称映射
  useEffect(() => {
    const fetchProductNames = async () => {
      try {
        const res = await fetch('/api/sap/search?type=product&q=');
        const data = await res.json();
        if (data.success && data.data) {
          const map: Record<string, string> = {};
          for (const p of data.data) {
            map[p.product] = p.description || p.description_zh || p.description_en || p.product;
          }
          setProductNames(map);
        }
      } catch { /* ignore */ }
    };
    fetchProductNames();
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', String(PAGE_SIZE));
      params.set('skip', String(page * PAGE_SIZE));
      params.set('count', 'true');

      const filterParts: string[] = [];
      if (plant && plant !== 'all') filterParts.push(`ProductionPlant eq '${plant}'`);

      // 搜索关键词：先在DB中模糊搜索产品名称获取精确编号，再用编号过滤
      if (searchQuery.trim()) {
        const keyword = searchQuery.trim();
        const searchRes = await fetch(`/api/sap/search?type=product&q=${encodeURIComponent(keyword)}`);
        const searchData = await searchRes.json();
        if (searchData.success && searchData.data?.length > 0) {
          const productFilters = searchData.data.map((p: { product: string }) => `Product eq '${p.product}'`);
          filterParts.push(`(ProductionOrder eq '${keyword}' or ${productFilters.join(' or ')})`);
        } else {
          filterParts.push(`(ProductionOrder eq '${keyword}' or Product eq '${keyword}')`);
        }
      }

      if (filterParts.length > 0) params.set('filter', filterParts.join(' and '));

      const response = await fetch(`/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder?${params.toString()}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setOrders(prev => page === 0 ? (data.data || []) : [...prev, ...(data.data || [])]);
      setTotalCount(data.totalCount || data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, plant]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleClear = () => {
    setSearchQuery('');
    setPlant(SAP_DEFAULTS.plant);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      {/* Page Title - mobile */}
      <div className="lg:hidden">
        <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>生产订单</h1>
      </div>

      {/* Filter Bar */}
      <div className="fiori-filterbar">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              placeholder="订单号/物料名..."
              className="w-full h-8 pl-8 pr-3 text-sm rounded border outline-none"
              style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
            />
          </div>
          <button
            className="h-8 px-3 text-sm rounded border flex items-center gap-1.5"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            onClick={() => setShowFilter(!showFilter)}
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
          <button className="h-8 px-4 text-sm rounded font-medium text-white" style={{ background: 'var(--primary)' }} onClick={() => { setPage(0); fetchOrders(); }} disabled={loading}>
            <Search className="w-3.5 h-3.5 inline mr-1" /> 查询
          </button>
          <button className="h-8 px-3 text-sm rounded border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={handleClear}>
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> 清除
          </button>
        </div>
      </div>

      {/* Expandable Filter */}
      {showFilter && (
        <div className="p-3 rounded-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="fiori-filterbar-field">
              <label>工厂</label>
              <select className="h-8 px-2 text-sm rounded border outline-none" style={{ background: 'var(--background)', borderColor: 'var(--border)' }} value={plant} onChange={(e) => { setPlant(e.target.value); setPage(0); }}>
                <option value="all">全部</option>
                <option value="1010">1010</option>
                <option value="1020">1020</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Result Count */}
      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>共 {totalCount} 条记录</div>

      {/* Load More */}
      {!loading && !error && orders.length < totalCount && (
        <button
          className="w-full h-10 rounded border text-sm font-medium transition-colors"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--primary)' }}
          onClick={() => setPage(p => p + 1)}
        >
          加载更多 ({orders.length}/{totalCount})
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-12" style={{ color: 'var(--color-fiori-error)' }}>
          <p className="text-sm">{error}</p>
          <button className="mt-2 text-sm underline" onClick={fetchOrders}>重试</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}>
          <Inbox className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--muted-foreground)' }} />
          <p className="text-sm">暂无数据</p>
        </div>
      )}

      {/* ===== Card View (Mobile: always, PC: when selected) ===== */}
      {!loading && !error && orders.length > 0 && (
        <div className={`space-y-2 ${viewMode === 'table' ? 'lg:hidden' : ''}`}>
          {orders.map((order) => {
            const statusInfo = getStatusInfo(order);
            return (
              <Link key={order.ProductionOrder} href={`/production-orders/${order.ProductionOrder}`} className="fiori-oli" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className={`fiori-oli-bar fiori-oli-bar--${statusInfo.color}`} />
                <div className="fiori-oli-content">
                  <div className="fiori-oli-title">
                    {order.ProductionOrder}
                    <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span>
                    {order.Product || '-'}
                    {order.Product && productNames[order.Product] && (
                      <span className="ml-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        ({productNames[order.Product]})
                      </span>
                    )}
                  </div>
                  <div className="fiori-oli-subtitle">
                    工厂: {order.ProductionPlant || '-'}
                    <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span>
                    计划: {order.OrderPlannedTotalQty || '0'}
                    <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span>
                    交货: {order.ActualDeliveredQuantity || '0'}
                  </div>
                  <div className="flex items-center gap-2">
                    <FioriBadge variant={statusInfo.color}>{statusInfo.label}</FioriBadge>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && !error && orders.length > 0 && viewMode === 'table' && (
        <div className="hidden lg:block rounded-lg border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--muted)' }}>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>订单号</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>物料</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>工厂</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>计划数量</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>交货数量</th>
                <th className="text-center px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order);
                return (
                  <tr key={order.ProductionOrder} className="border-t hover:bg-accent/50 transition-colors cursor-pointer" style={{ borderColor: 'var(--border)' }} onClick={() => router.push(`/production-orders/${order.ProductionOrder}`)}>
                    <td className="px-4 py-3 font-medium text-primary underline">{order.ProductionOrder}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{order.Product || '-'}</span>
                      {order.Product && productNames[order.Product] && (
                        <span className="ml-1" style={{ color: 'var(--muted-foreground)' }}>
                          {productNames[order.Product]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{order.ProductionPlant || '-'}</td>
                    <td className="px-4 py-3 tabular-nums">{order.OrderPlannedTotalQty || '0'}</td>
                    <td className="px-4 py-3 tabular-nums">{order.ActualDeliveredQuantity || '0'}</td>
                    <td className="px-4 py-3 text-center">
                      <FioriBadge variant={statusInfo.color}>{statusInfo.label}</FioriBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchOrders} ariaLabel="刷新查询" />
    </div>
  );
}
