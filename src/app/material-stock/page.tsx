'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriOli, FioriBadge, FioriFilterBar, FioriPageHeader, FioriEmptyState, FioriErrorState, FioriFab } from '@/components/fiori';
import { BarChart3, Search, RotateCcw, Inbox, AlertTriangle } from 'lucide-react';

interface StockItem {
  Material: string;
  Plant: string;
  StorageLocation?: string;
  Batch?: string;
  MaterialBaseUnit?: string;
  MatlWrhsStkQtyInMatlBaseUnit?: string | number;
  WarehouseStockCategory?: string;
}

const STOCK_CATEGORY: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
  'F': { color: 'success', label: '非限制' },
  'Q': { color: 'warning', label: '质检中' },
  'S': { color: 'error', label: '冻结' },
};

export default function MaterialStockPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      params.set('count', 'true');

      const filterParts: string[] = [];
      if (searchQuery) {
        filterParts.push(`(Material eq '${searchQuery}' or Plant eq '${searchQuery}')`);
      }
      if (filterParts.length > 0) params.set('filter', filterParts.join(' and '));
      params.set('select', 'Material,Plant,StorageLocation,Batch,MaterialBaseUnit,MatlWrhsStkQtyInMatlBaseUnit,WarehouseStockCategory');

      const response = await fetch(`/api/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod?${params.toString()}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setStocks(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { fetchStocks(); }, [fetchStocks]);

  const isLowStock = (item: StockItem): boolean => {
    const qty = Number(item.MatlWrhsStkQtyInMatlBaseUnit || 0);
    return qty > 0 && qty < 10;
  };

  return (
    <div className="space-y-4">
      <FioriPageHeader icon={<BarChart3 className="w-5 h-5" />} title="库存查询" count={totalCount} />

      <FioriFilterBar>
        <div className="fiori-filterbar-field flex-1 min-w-[160px]">
          <label>搜索</label>
          <Input placeholder="物料号 / 工厂" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchStocks()} className="h-8 text-sm" />
        </div>
        <Button size="sm" onClick={fetchStocks} disabled={loading} className="h-8"><Search className="w-3.5 h-3.5 mr-1" /> 查询</Button>
        <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="h-8"><RotateCcw className="w-3.5 h-3.5 mr-1" /> 清除</Button>
      </FioriFilterBar>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="fiori-oli"><div className="fiori-oli-bar fiori-oli-bar--neutral" /><div className="fiori-oli-content" style={{ gap: 6 }}><Skeleton className="h-4 w-[140px]" /><Skeleton className="h-3 w-[200px]" /><Skeleton className="h-3 w-[80px]" /></div></div>
          ))}
        </div>
      ) : error ? (
        <FioriErrorState message={error} onRetry={fetchStocks} />
      ) : stocks.length === 0 ? (
        <FioriEmptyState icon={<Inbox className="w-10 h-10" />} title="暂无数据" description="请调整查询条件后重试" />
      ) : (
        <div>
          {stocks.map((item, idx) => {
            const catInfo = STOCK_CATEGORY[item.WarehouseStockCategory || ''] || { color: 'neutral' as const, label: item.WarehouseStockCategory || '-' };
            const lowStock = isLowStock(item);
            const qty = Number(item.MatlWrhsStkQtyInMatlBaseUnit || 0);
            return (
              <FioriOli
                key={`${item.Material}-${item.Plant}-${item.WarehouseStockCategory}-${idx}`}
                barColor={qty === 0 ? 'error' : lowStock ? 'warning' : catInfo.color}
                title={`${item.Material} · ${item.Plant}`}
                subtitle={`${item.StorageLocation || '-'} · 批次 ${item.Batch || '-'} · ${item.MaterialBaseUnit || '-'}`}
                status={
                  <div className="flex items-center gap-2 mt-0.5">
                    <FioriBadge variant={qty === 0 ? 'error' : lowStock ? 'warning' : catInfo.color}>
                      {qty === 0 ? '缺货' : lowStock ? '低库存' : catInfo.label}
                    </FioriBadge>
                    <span className="text-xs font-mono tabular-nums" style={{ color: qty === 0 ? 'var(--color-fiori-error)' : lowStock ? 'var(--color-fiori-warning)' : 'var(--foreground)' }}>
                      {qty.toLocaleString()} {item.MaterialBaseUnit || ''}
                    </span>
                    {lowStock && <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--color-fiori-warning)' }} />}
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchStocks} ariaLabel="刷新查询" />
    </div>
  );
}
