'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FioriBadge, FioriFab, getSapStatusColor } from '@/components/fiori';
import { Search, RotateCcw, Inbox, LayoutList, Table2, Download } from 'lucide-react';
import { exportToExcel, type ExportColumn } from '@/lib/export';
import { formatSapDate } from '@/lib/utils';
import { useViewMode } from '@/hooks/useViewMode';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useFilterPageFetch } from '@/hooks/useFilterPageFetch';

interface Delivery {
  DeliveryDocument: string;
  DeliveryDocumentType: string;
  SoldToParty: string;
  ShipToParty: string;
  DeliveryDate: string;
  ActualGoodsMovementDate: string;
  OverallGoodsMovementStatus: string;
  OverallSDProcessStatus: string;
  SalesOrganization: string;
  ShippingPoint: string;
  SalesOffice: string;
  IncotermsClassification: string;
}

interface Customer {
  Customer: string;
  CustomerName: string;
}

const MOVEMENT_STATUS: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
  'A': { color: 'info', label: '未处理' },
  'B': { color: 'warning', label: '处理中' },
  'C': { color: 'success', label: '已完成' },
  'D': { color: 'error', label: '已取消' },
};

const SD_STATUS: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
  'A': { color: 'info', label: '未处理' },
  'B': { color: 'warning', label: '处理中' },
  'C': { color: 'success', label: '已完成' },
  'D': { color: 'error', label: '已取消' },
};

const deliveryColumns: ExportColumn<Delivery>[] = [
  { header: '交货单号', key: 'DeliveryDocument', width: 14 },
  { header: '类型', key: 'DeliveryDocumentType', width: 10 },
  { header: '客户', key: 'SoldToParty', width: 12 },
  { header: '交货日期', key: 'DeliveryDate', width: 14, render: (d) => formatSapDate(d.DeliveryDate) },
  { header: '库存状态', key: 'OverallGoodsMovementStatus', width: 12, render: (d) => MOVEMENT_STATUS[d.OverallGoodsMovementStatus]?.label || d.OverallGoodsMovementStatus || '-' },
  { header: 'SD状态', key: 'OverallSDProcessStatus', width: 12, render: (d) => SD_STATUS[d.OverallSDProcessStatus]?.label || d.OverallSDProcessStatus || '-' },
];

export default function OutboundDeliveryPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const router = useRouter();
  const [viewMode, setViewMode] = useViewMode();
  const PAGE_SIZE = 20;

  const fetchCustomerNames = useCallback(async (soldToCodes: string[]) => {
    if (soldToCodes.length === 0) return;
    const names: Record<string, string> = {};
    try {
      const res = await fetch('/api/sap/API_BUSINESS_PARTNER/A_Customer?top=200');
      const json = await res.json();
      const customers = json.data as Customer[];
      for (const code of soldToCodes) {
        const c = customers.find(x => x.Customer === code);
        if (c) names[code] = c.CustomerName;
      }
      setCustomerNames(names);
    } catch { /* ignore */ }
  }, []);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', String(PAGE_SIZE));
      params.set('skip', String(page * PAGE_SIZE));
      params.set('count', 'true');

      if (debouncedSearchQuery.trim()) {
        const keyword = debouncedSearchQuery.trim();
        const searchRes = await fetch(`/api/sap/search?type=customer&q=${encodeURIComponent(keyword)}`);
        const searchData = await searchRes.json();
        if (searchData.success && searchData.data?.length > 0) {
          const customerFilters = searchData.data.map((c: { customer: string }) => `SoldToParty eq '${c.customer}'`);
          const filterStr = `(DeliveryDocument eq '${keyword}' or ${customerFilters.join(' or ')})`;
          params.set('filter', filterStr);
        } else {
          params.set('filter', `(DeliveryDocument eq '${keyword}' or SoldToParty eq '${keyword}')`);
        }
      }

      const response = await fetch(`/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader?${params.toString()}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      const deliveryData = data.data as Delivery[] || [];
      setDeliveries(prev => page === 0 ? deliveryData : [...prev, ...deliveryData]);
      setTotalCount(data.totalCount || data.count || 0);

      const codes = [...new Set(deliveryData.map(d => d.SoldToParty).filter(Boolean))];
      fetchCustomerNames(codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearchQuery, fetchCustomerNames]);

  useFilterPageFetch(debouncedSearchQuery, page, setPage, fetchDeliveries);

  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>发货单</h1>
      </div>

      <div className="fiori-filterbar">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            <input type="text" placeholder="单据号/客户名..." className="w-full h-8 pl-8 pr-3 text-sm rounded border outline-none" style={{ background: 'var(--background)', borderColor: 'var(--border)' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchDeliveries()} />
          </div>
        </div>
        <div className="hidden lg:flex items-center border rounded overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <button className={`h-8 w-8 flex items-center justify-center ${viewMode === 'card' ? 'text-white' : ''}`} style={viewMode === 'card' ? { background: 'var(--primary)' } : { background: 'var(--card)', color: 'var(--muted-foreground)' }} onClick={() => setViewMode('card')}><LayoutList className="w-4 h-4" /></button>
          <button className={`h-8 w-8 flex items-center justify-center ${viewMode === 'table' ? 'text-white' : ''}`} style={viewMode === 'table' ? { background: 'var(--primary)' } : { background: 'var(--card)', color: 'var(--muted-foreground)' }} onClick={() => setViewMode('table')}><Table2 className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 text-sm rounded border font-medium" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--primary)' }} onClick={() => exportToExcel(deliveries, deliveryColumns, '交货单')}>
            <Download className="w-3.5 h-3.5 inline mr-1" /> 导出
          </button>
          <button className="h-8 px-4 text-sm rounded font-medium text-white" style={{ background: 'var(--primary)' }} onClick={() => { setPage(0); fetchDeliveries(); }} disabled={loading}><Search className="w-3.5 h-3.5 inline mr-1" /> 查询</button>
          <button className="h-8 px-3 text-sm rounded border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={() => { setSearchQuery(''); setPage(0); }}><RotateCcw className="w-3.5 h-3.5 inline mr-1" /> 清除</button>
        </div>
      </div>

      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>共 {totalCount} 条记录</div>

      {/* Load More */}
      {!loading && !error && deliveries.length < totalCount && (
        <button
          className="w-full h-10 rounded border text-sm font-medium transition-colors"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--primary)' }}
          onClick={() => setPage(p => p + 1)}
        >
          加载更多 ({deliveries.length}/{totalCount})
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>
      )}
      {error && !loading && (
        <div className="text-center py-12" style={{ color: 'var(--color-fiori-error)' }}><p className="text-sm">{error}</p><button className="mt-2 text-sm underline" onClick={fetchDeliveries}>重试</button></div>
      )}
      {!loading && !error && deliveries.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}><Inbox className="w-10 h-10 mx-auto mb-2" /><p className="text-sm">暂无数据</p></div>
      )}

      {/* Card View */}
      {!loading && !error && deliveries.length > 0 && (
        <div className={`space-y-2 ${viewMode === 'table' ? 'lg:hidden' : ''}`}>
          {deliveries.map((d) => {
            const statusInfo = MOVEMENT_STATUS[d.OverallGoodsMovementStatus || ''] || { color: getSapStatusColor(d.OverallGoodsMovementStatus), label: d.OverallGoodsMovementStatus || '-' };
            return (
              <div key={d.DeliveryDocument} className="fiori-oli cursor-pointer" onClick={() => router.push(`/outbound-delivery/${d.DeliveryDocument}`)}>
                <div className={`fiori-oli-bar fiori-oli-bar--${statusInfo.color}`} />
                <div className="fiori-oli-content">
                  <div className="fiori-oli-title">{d.DeliveryDocument} <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span> {d.DeliveryDocumentType}</div>
                  <div className="fiori-oli-subtitle">{formatSapDate(d.DeliveryDate)} <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span> 客户: {d.SoldToParty}{customerNames[d.SoldToParty] ? ` (${customerNames[d.SoldToParty]})` : ''}</div>
                  <div className="flex items-center gap-2">
                    <FioriBadge variant={statusInfo.color}>{statusInfo.label}</FioriBadge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {!loading && !error && deliveries.length > 0 && viewMode === 'table' && (
        <div className="hidden lg:block rounded-lg border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--muted)' }}>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>交货单号</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>类型</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>客户</th>
                <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>交货日期</th>
                <th className="text-center px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>库存状态</th>
                <th className="text-center px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>SD状态</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => {
                const movementStatus = MOVEMENT_STATUS[d.OverallGoodsMovementStatus || ''] || { color: getSapStatusColor(d.OverallGoodsMovementStatus), label: d.OverallGoodsMovementStatus || '-' };
                const sdStatus = SD_STATUS[d.OverallSDProcessStatus || ''] || { color: getSapStatusColor(d.OverallSDProcessStatus), label: d.OverallSDProcessStatus || '-' };
                return (
                  <tr key={d.DeliveryDocument} className="border-t hover:bg-accent/50 transition-colors cursor-pointer" style={{ borderColor: 'var(--border)' }} onClick={() => router.push(`/outbound-delivery/${d.DeliveryDocument}`)}>
                    <td className="px-4 py-3 font-medium text-[#0070F2]">{d.DeliveryDocument}</td>
                    <td className="px-4 py-3">{d.DeliveryDocumentType}</td>
                    <td className="px-4 py-3">{d.SoldToParty}{customerNames[d.SoldToParty] ? ` (${customerNames[d.SoldToParty]})` : ''}</td>
                    <td className="px-4 py-3 tabular-nums">{formatSapDate(d.DeliveryDate)}</td>
                    <td className="px-4 py-3 text-center"><FioriBadge variant={movementStatus.color}>{movementStatus.label}</FioriBadge></td>
                    <td className="px-4 py-3 text-center"><FioriBadge variant={sdStatus.color}>{sdStatus.label}</FioriBadge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchDeliveries} ariaLabel="刷新查询" />
    </div>
  );
}
