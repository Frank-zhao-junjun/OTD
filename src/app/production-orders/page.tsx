'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SAP_DEFAULTS } from '@/lib/sap-service';
import { FioriOli, FioriBadge, FioriFilterBar, FioriPageHeader, FioriEmptyState, FioriErrorState, FioriFab, getSapStatusColor, getSapStatusLabel } from '@/components/fiori';
import { Factory, Search, RotateCcw, Filter, Inbox } from 'lucide-react';

interface ProductionOrder {
  ProductionOrder: string;
  Material?: string;
  ProductionPlant?: string;
  ManufacturingOrderType?: string;
  PlannedTotalQty?: string | number;
  MfgOrderPlannedStartDate?: string;
  MfgOrderPlannedEndDate?: string;
  ProductionOrderStatus?: string;
  ProductionOrderStatusText?: string;
  TotalQuantity?: string | number;
  ConfirmedQuantity?: string | number;
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

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [plant, setPlant] = useState(SAP_DEFAULTS.plant);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilter, setShowFilter] = useState(false);

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
        filterParts.push(`(ProductionOrder eq '${searchQuery}' or Material eq '${searchQuery}')`);
      }
      if (filterParts.length > 0) params.set('filter', filterParts.join(' and '));
      params.set('select', 'ProductionOrder,Material,ProductionPlant,ManufacturingOrderType,PlannedTotalQty,MfgOrderPlannedStartDate,MfgOrderPlannedEndDate,ProductionOrderStatus,ProductionOrderStatusText,TotalQuantity,ConfirmedQuantity');

      const response = await fetch(`/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder?${params.toString()}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setOrders(data.data || []);
      setTotalCount(data.count || 0);
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
      <FioriPageHeader icon={<Factory className="w-5 h-5" />} title="生产订单" count={totalCount} />

      <FioriFilterBar>
        <div className="fiori-filterbar-field flex-1 min-w-[160px]">
          <label>搜索</label>
          <Input placeholder="生产订单号 / 物料号" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchOrders()} className="h-8 text-sm" />
        </div>
        <Button size="sm" onClick={fetchOrders} disabled={loading} className="h-8"><Search className="w-3.5 h-3.5 mr-1" /> 查询</Button>
        <Button variant="outline" size="sm" onClick={handleClear} className="h-8"><RotateCcw className="w-3.5 h-3.5 mr-1" /> 清除</Button>
        {showFilter && (
          <div className="fiori-filterbar-field w-[140px]">
            <label>工厂</label>
            <Select value={plant} onValueChange={setPlant}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="1010">1010</SelectItem>
                <SelectItem value="1020">1020</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => setShowFilter(!showFilter)} className="h-8 text-xs"><Filter className="w-3.5 h-3.5 mr-1" />{showFilter ? '收起' : '筛选'}</Button>
      </FioriFilterBar>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="fiori-oli">
              <div className="fiori-oli-bar fiori-oli-bar--neutral" />
              <div className="fiori-oli-content" style={{ gap: 6 }}><Skeleton className="h-4 w-[120px]" /><Skeleton className="h-3 w-[180px]" /><Skeleton className="h-3 w-[80px]" /></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <FioriErrorState message={error} onRetry={fetchOrders} />
      ) : orders.length === 0 ? (
        <FioriEmptyState icon={<Inbox className="w-10 h-10" />} title="暂无数据" description="请调整查询条件后重试" />
      ) : (
        <div>
          {orders.map((order) => {
            const statusInfo = getStatusInfo(order.ProductionOrderStatus);
            return (
              <FioriOli
                key={order.ProductionOrder}
                barColor={statusInfo.color}
                title={`${order.ProductionOrder} · ${order.Material || '-'}`}
                subtitle={`${order.ProductionPlant || '-'} · ${order.MfgOrderPlannedStartDate || '-'} ~ ${order.MfgOrderPlannedEndDate || '-'}`}
                status={
                  <div className="flex items-center gap-2 mt-0.5">
                    <FioriBadge variant={statusInfo.color}>{statusInfo.label}</FioriBadge>
                    {order.PlannedTotalQty && (
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--foreground)' }}>
                        计划 {Number(order.PlannedTotalQty).toLocaleString()}
                      </span>
                    )}
                    {order.ConfirmedQuantity && Number(order.ConfirmedQuantity) > 0 && (
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--color-fiori-success)' }}>
                        / 确认 {Number(order.ConfirmedQuantity).toLocaleString()}
                      </span>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchOrders} ariaLabel="刷新查询" />
    </div>
  );
}
