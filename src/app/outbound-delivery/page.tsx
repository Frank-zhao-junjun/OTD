'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriOli, FioriBadge, FioriFilterBar, FioriPageHeader, FioriEmptyState, FioriErrorState, FioriFab, getSapStatusColor } from '@/components/fiori';
import { Truck, Search, RotateCcw, Inbox } from 'lucide-react';

interface Delivery {
  DeliveryDocument: string;
  DeliveryDocumentType?: string;
  SoldToParty?: string;
  ActualGoodsMovementDate?: string;
  OverallGoodsMovementStatus?: string;
  CreationDate?: string;
}

const MOVEMENT_STATUS: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
  'A': { color: 'info', label: '未处理' },
  'B': { color: 'warning', label: '处理中' },
  'C': { color: 'success', label: '已完成' },
  'D': { color: 'error', label: '已取消' },
};

export default function OutboundDeliveryPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      params.set('count', 'true');

      const filterParts: string[] = [];
      if (searchQuery) {
        filterParts.push(`(DeliveryDocument eq '${searchQuery}' or SoldToParty eq '${searchQuery}')`);
      }
      if (filterParts.length > 0) params.set('filter', filterParts.join(' and '));
      params.set('select', 'DeliveryDocument,DeliveryDocumentType,SoldToParty,ActualGoodsMovementDate,OverallGoodsMovementStatus,CreationDate');

      const response = await fetch(`/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader?${params.toString()}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setDeliveries(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  return (
    <div className="space-y-4">
      <FioriPageHeader icon={<Truck className="w-5 h-5" />} title="发货单" count={totalCount} />

      <FioriFilterBar>
        <div className="fiori-filterbar-field flex-1 min-w-[160px]">
          <label>搜索</label>
          <Input placeholder="交货单号 / 客户编号" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchDeliveries()} className="h-8 text-sm" />
        </div>
        <Button size="sm" onClick={fetchDeliveries} disabled={loading} className="h-8"><Search className="w-3.5 h-3.5 mr-1" /> 查询</Button>
        <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="h-8"><RotateCcw className="w-3.5 h-3.5 mr-1" /> 清除</Button>
      </FioriFilterBar>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="fiori-oli"><div className="fiori-oli-bar fiori-oli-bar--neutral" /><div className="fiori-oli-content" style={{ gap: 6 }}><Skeleton className="h-4 w-[120px]" /><Skeleton className="h-3 w-[180px]" /><Skeleton className="h-3 w-[80px]" /></div></div>
          ))}
        </div>
      ) : error ? (
        <FioriErrorState message={error} onRetry={fetchDeliveries} />
      ) : deliveries.length === 0 ? (
        <FioriEmptyState icon={<Inbox className="w-10 h-10" />} title="暂无数据" description="请调整查询条件后重试" />
      ) : (
        <div>
          {deliveries.map((d) => {
            const statusInfo = MOVEMENT_STATUS[d.OverallGoodsMovementStatus || ''] || { color: getSapStatusColor(d.OverallGoodsMovementStatus), label: d.OverallGoodsMovementStatus || '-' };
            return (
              <FioriOli
                key={d.DeliveryDocument}
                barColor={statusInfo.color}
                title={`${d.DeliveryDocument} · ${d.DeliveryDocumentType || '-'}`}
                subtitle={`客户 ${d.SoldToParty || '-'} · ${d.CreationDate || '-'}`}
                status={
                  <div className="flex items-center gap-2 mt-0.5">
                    <FioriBadge variant={statusInfo.color}>{statusInfo.label}</FioriBadge>
                    {d.ActualGoodsMovementDate && (
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>过账 {d.ActualGoodsMovementDate}</span>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchDeliveries} ariaLabel="刷新查询" />
    </div>
  );
}
