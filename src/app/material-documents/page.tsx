'use client';
import { useRouter } from 'next/navigation';

import { useState, useEffect, useCallback } from 'react';
import { FioriBadge, FioriFab } from '@/components/fiori';
import { FileSpreadsheet, Search, RotateCcw, Inbox, LayoutList, Table2 } from 'lucide-react';

interface MaterialDocument {
  MaterialDocument: string;
  MaterialDocumentYear: string;
  MaterialDocumentItem: string;
  Material: string;
  Plant: string;
  StorageLocation: string;
  GoodsMovementType: string;
  QuantityInBaseUnit: string;
  MaterialBaseUnit: string;
  GoodsRecipientName: string;
  ManufacturingOrder: string;
  Batch: string;
  PurchaseOrder: string;
  PurchaseOrderItem: string;
  CostCenter: string;
  ProfitCenter: string;
}

const MOVEMENT_COLORS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  '101': 'success', '102': 'error',
  '261': 'warning', '262': 'error',
  '311': 'info', '312': 'error',
  '501': 'success', '502': 'error',
  '201': 'warning', '202': 'error',
  '561': 'success',
};

function getMovementLabel(type: string): string {
  const labels: Record<string, string> = {
    '101': '生产收货', '102': '收货取消',
    '261': '生产发料', '262': '发料取消',
    '311': '库存转储', '312': '转储取消',
    '501': '无PO收货', '502': '收货取消',
    '201': '成本中心发料', '202': '发料取消',
    '561': '初始入库',
  };
  return labels[type] || type;
}

export default function MaterialDocumentsPage() {
  const [data, setData] = useState<MaterialDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // 默认过滤：凭证号5开头 + 移动类型101 + 生产订单号不为空
  const DEFAULT_FILTER = "startswith(MaterialDocument,'5') eq true and GoodsMovementType eq '101' and ManufacturingOrder ne ''";

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ top: '50', count: 'true' });
      if (searchQuery) {
        const searchRes = await fetch(`/api/sap/search?type=product&q=${encodeURIComponent(searchQuery)}`);
        const searchData = await searchRes.json();
        const productCodes = (searchData.products || []).map((p: { product: string }) => p.product);
        const searchFilters: string[] = [`MaterialDocument eq '${searchQuery}'`];
        if (productCodes.length > 0) searchFilters.push(productCodes.map((m: string) => `Material eq '${m}'`).join(' or '));
        // 搜索时叠加默认过滤
        params.set('filter', `(${searchFilters.join(' or ')}) and ${DEFAULT_FILTER}`);
      } else {
        params.set('filter', DEFAULT_FILTER);
      }
      const res = await fetch(`/api/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setData(json.data || []); setTotalCount(json.totalCount || json.count || 0);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unknown error'); }
    finally { setLoading(false); }
  }, [searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="lg:hidden"><h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>入库单</h1><p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>生产订单入库（凭证号5开头，移动类型101）</p></div>

      <div className="fiori-filterbar">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            <input type="text" placeholder="凭证号 / 物料名称" className="w-full h-8 pl-8 pr-3 text-sm rounded border outline-none" style={{ background: 'var(--background)', borderColor: 'var(--border)' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchData()} />
</div>
        </div>
        <div className="hidden lg:flex items-center border rounded overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <button className={`h-8 w-8 flex items-center justify-center ${viewMode === 'card' ? 'text-white' : ''}`} style={viewMode === 'card' ? { background: 'var(--primary)' } : { background: 'var(--card)', color: 'var(--muted-foreground)' }} onClick={() => setViewMode('card')}><LayoutList className="w-4 h-4" /></button>
          <button className={`h-8 w-8 flex items-center justify-center ${viewMode === 'table' ? 'text-white' : ''}`} style={viewMode === 'table' ? { background: 'var(--primary)' } : { background: 'var(--card)', color: 'var(--muted-foreground)' }} onClick={() => setViewMode('table')}><Table2 className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-4 text-sm rounded font-medium text-white" style={{ background: 'var(--primary)' }} onClick={fetchData} disabled={loading}><Search className="w-3.5 h-3.5 inline mr-1" /> 查询</button>
          <button className="h-8 px-3 text-sm rounded border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={() => setSearchQuery('')}><RotateCcw className="w-3.5 h-3.5 inline mr-1" /> 清除</button>
        </div>
      </div>

      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>共 {totalCount} 条记录</div>
      {loading && <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>}
      {error && !loading && <div className="text-center py-12" style={{ color: 'var(--color-fiori-error)' }}><p className="text-sm">{error}</p><button className="mt-2 text-sm underline" onClick={fetchData}>重试</button></div>}
      {!loading && !error && data.length === 0 && <div className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}><Inbox className="w-10 h-10 mx-auto mb-2" /><p className="text-sm">暂无数据</p></div>}

      {!loading && !error && data.length > 0 && (
        <div className={`space-y-2 ${viewMode === 'table' ? 'lg:hidden' : ''}`}>
          {data.map((item, idx) => {
            const barColor = MOVEMENT_COLORS[item.GoodsMovementType] || 'neutral';
            const movementLabel = getMovementLabel(item.GoodsMovementType);
            return (
              <div key={`${item.MaterialDocument}-${item.MaterialDocumentItem}-${idx}`} className="fiori-oli cursor-pointer" onClick={() => router.push(`/material-documents/${item.MaterialDocument}`)}>
                <div className={`fiori-oli-bar fiori-oli-bar--${barColor}`} />
                <div className="fiori-oli-content">
                  <div className="fiori-oli-title">{item.MaterialDocument} <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span> {item.Material}</div>
                  <div className="fiori-oli-subtitle">生产订单: {item.ManufacturingOrder} <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span> {item.Plant} / {item.StorageLocation}</div>
                  <div className="flex items-center gap-2">
                    <FioriBadge variant={barColor}>{movementLabel}</FioriBadge>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{parseFloat(item.QuantityInBaseUnit || '0').toLocaleString()} {item.MaterialBaseUnit}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && data.length > 0 && viewMode === 'table' && (
        <div className="hidden lg:block rounded-lg border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: 'var(--muted)' }}>
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>凭证号</th>
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>物料</th>
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>生产订单</th>
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>工厂/库位</th>
              <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>数量</th>
            </tr></thead>
            <tbody>{data.map((item, idx) => {
              const barColor = MOVEMENT_COLORS[item.GoodsMovementType] || 'neutral';
              return (<tr key={`${item.MaterialDocument}-${item.MaterialDocumentItem}-${idx}`} className="border-t hover:bg-accent/50 transition-colors cursor-pointer" style={{ borderColor: 'var(--border)' }} onClick={() => router.push(`/material-documents/${item.MaterialDocument}`)}>
                <td className="px-4 py-3 font-medium text-[#0070F2]">{item.MaterialDocument}</td>
                <td className="px-4 py-3">{item.Material}</td>
                <td className="px-4 py-3">{item.ManufacturingOrder}</td>
                <td className="px-4 py-3 tabular-nums">{item.Plant} / {item.StorageLocation}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{parseFloat(item.QuantityInBaseUnit || '0').toLocaleString()} {item.MaterialBaseUnit}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}
      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchData} ariaLabel="刷新查询" />
    </div>
  );
}
