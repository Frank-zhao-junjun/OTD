'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FioriBadge, FioriFab, getSapStatusColor, getSapStatusLabel } from '@/components/fiori';
import { SAP_DEFAULTS } from '@/lib/sap-service';
import { Factory, Search, RotateCcw, Filter, Inbox, LayoutList, Table2 } from 'lucide-react';

interface ProductionOrder {
  ProductionOrder: string;
  Product?: string;
  ProductionPlant?: string;
  ManufacturingOrderType?: string;
  OrderScheduledStartDate?: string;
  OrderScheduledEndDate?: string;
  OrderActualStartDate?: string | null;
  OrderActualEndDate?: string | null;
  OrderActualReleaseDate?: string | null;
  TechnicalCompletionDate?: string | null;
  OrderPlannedTotalQty?: string;
  ActualDeliveredQuantity?: string;
  IsMarkedForDeletion?: boolean;
  IsCompletelyDelivered?: boolean;
  SalesOrder?: string;
  SalesOrderItem?: string;
  ProductionOrderStatus?: string;
  StatusText?: string;
  CreatedByUser?: string;
  CreationDate?: string;
}

const getStatusInfo = (status: string | undefined): { color: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string } => {
  if (!status) return { color: 'neutral', label: '-' };
  const primaryStatus = status.split(' ')[0];
  const statusMap: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
    'CRTD': { color: 'info', label: '已创建' },
    'REL': { color: 'warning', label: '已释放' },
    'PCNF': { color: 'warning', label: '部分确认' },
    'CNF': { color: 'success', label: '已确认' },
    'PDLV': { color: 'warning', label: '部分交货' },
    'DLV': { color: 'success', label: '已交货' },
    'CLSD': { color: 'neutral', label: '已关闭' },
    'TECO': { color: 'neutral', label: '技术完成' },
  };
  return statusMap[primaryStatus] || { color: getSapStatusColor(primaryStatus), label: getSapStatusLabel(primaryStatus) };
};

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const match = dateStr.match(/\/Date\((\d+)\)\//);
  if (match) {
    const d = new Date(parseInt(match[1]));
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return dateStr;
}

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [plant, setPlant] = useState(SAP_DEFAULTS.plant);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      params.set('count', 'true');

      const filterParts: string[] = [];
      if (plant && plant !== 'all') filterParts.push(`ProductionPlant eq '${plant}'`);
      if (searchQuery) {
        filterParts.push(`(ProductionOrder eq '${searchQuery}' or Product eq '${searchQuery}')`);
      }
      if (filterParts.length > 0) params.set('filter', filterParts.join(' and '));

      const response = await fetch(`/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder?${params.toString()}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setOrders(data.data || []);
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
              placeholder="订单号 / 物料号"
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
          <button className="h-8 px-4 text-sm rounded font-medium text-white" style={{ background: 'var(--primary)' }} onClick={fetchOrders} disabled={loading}>
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
              <select className="h-8 px-2 text-sm rounded border outline-none" style={{ background: 'var(--background)', borderColor: 'var(--border)' }} value={plant} onChange={(e) => setPlant(e.target.value)}>
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
      {!loading && !error && orders.length > 0 && viewMode === 'card' && (
        <div className="space-y-2">
          {orders.map((order) => {
            const statusInfo = getStatusInfo(order.ProductionOrderStatus);
            return (
              <div key={order.ProductionOrder} className="fiori-oli">
                <div className={`fiori-oli-bar fiori-oli-bar--${statusInfo.color}`} />
                <div className="fiori-oli-content">
                  <div className="fiori-oli-title">
                    {order.ProductionOrder}
                    <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span>
                    {order.Product || '-'}
                  </div>
                  <div className="fiori-oli-subtitle">
                    {order.ProductionPlant || '-'}
                    <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span>
                    {formatDate(order.OrderScheduledStartDate)} ~ {formatDate(order.OrderScheduledEndDate)}
                  </div>
                  <div className="flex items-center gap-2">
                    <FioriBadge variant={statusInfo.color}>{statusInfo.label}</FioriBadge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Table View (PC only) ===== */}
      {!loading && !error && orders.length > 0 && viewMode === 'table' && (
        <div className="hidden lg:block rounded-lg border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--muted)' }}>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>订单号</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>物料</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>工厂</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>计划开始</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>计划结束</th>
                <th className="text-center px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.ProductionOrderStatus);
                return (
                  <tr key={order.ProductionOrder} className="border-t hover:bg-accent/50 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 font-medium">{order.ProductionOrder}</td>
                    <td className="px-4 py-3">{order.Product || '-'}</td>
                    <td className="px-4 py-3">{order.ProductionPlant || '-'}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(order.OrderScheduledStartDate)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(order.OrderScheduledEndDate)}</td>
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
