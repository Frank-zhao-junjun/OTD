'use client';
import { useRouter } from 'next/navigation';

import { useState, useEffect, useCallback } from 'react';
import { FioriBadge, FioriFab } from '@/components/fiori';
import { Search, RotateCcw, Inbox, LayoutList, Table2, CloudDownload } from 'lucide-react';
import { useViewMode } from '@/hooks/useViewMode';

interface ProductDescription {
  Product: string;
  Language: string;
  ProductDescription: string;
}

interface ProductPlant {
  Product: string;
  Plant: string;
  MRPType: string;
  ProductionInvtryManagedLoc: string;
  ProcurementType: string;
  IsBatchManagementRequired: boolean;
  ProfitCenter: string;
  AvailabilityCheckType: string;
  IsMarkedForDeletion: boolean;
}

interface ProductSalesDelivery {
  Product: string;
  ProductSalesOrg: string;
  ProductDistributionChnl: string;
  SupplyingPlant: string;
  AccountDetnProductGroup: string;
  ItemCategoryGroup: string;
  IsMarkedForDeletion: boolean;
}

interface ProductValuation {
  Product: string;
  ValuationArea: string;
  ValuationClass: string;
  StandardPrice: string;
  PriceUnitQty: string;
  MovingAveragePrice: string;
  Currency: string;
  IsMarkedForDeletion: boolean;
}

interface Product {
  Product: string;
  ProductType: string;
  ProductGroup: string;
  BaseUnit: string;
  WeightUnit: string;
  GrossWeight: string;
  NetWeight: string;
  IsMarkedForDeletion: boolean;
  CrossPlantStatus: string;
  CreatedByUser: string;
  CreationDate: string;
  to_Description?: { results: ProductDescription[] } | ProductDescription[];
  to_Plant?: { results: ProductPlant[] } | ProductPlant[];
  to_SalesDelivery?: { results: ProductSalesDelivery[] } | ProductSalesDelivery[];
  to_Valuation?: { results: ProductValuation[] } | ProductValuation[];
}

// Helper: normalize expand result (SAP V2 returns {results:[...]}, proxy may return plain array)
function normalizeExpand<T>(data: { results: T[] } | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  return [];
}

// Helper: extract ZH description from expand
function getDescription(product: Product): string {
  const descs = normalizeExpand(product.to_Description);
  const zh = descs.find((d) => d.Language === 'ZH');
  return zh?.ProductDescription || descs[0]?.ProductDescription || product.Product;
}

// Helper: extract EN description from expand
function getEnDescription(product: Product): string | null {
  const descs = normalizeExpand(product.to_Description);
  const en = descs.find((d) => d.Language === 'EN');
  return en?.ProductDescription || null;
}

// Helper: extract first valuation
function getValuation(product: Product): ProductValuation | null {
  const vals = normalizeExpand(product.to_Valuation);
  return vals.length > 0 ? vals[0] : null;
}

// Helper: get price display
function getPrice(product: Product): string {
  const val = getValuation(product);
  if (!val) return '-';
  const price = val.StandardPrice !== '0.00' ? val.StandardPrice : val.MovingAveragePrice;
  return `${price} ${val.Currency}/${product.BaseUnit}`;
}

const PRODUCT_TYPE_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  'FERT': { label: '成品', variant: 'success' },
  'HAWA': { label: '贸易品', variant: 'info' },
  'ROH': { label: '原材料', variant: 'warning' },
  'HALB': { label: '半成品', variant: 'neutral' },
};

const PRODUCT_GROUP_MAP: Record<string, string> = {
  'L001': '原材料-电子',
  'L002': '原材料-包装',
  'L003': '半成品',
  'L004': '成品',
};

export default function ProductsPage() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sapRefreshing, setSapRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const router = useRouter();
  const [viewMode, setViewMode] = useViewMode();
  const PAGE_SIZE = 20;

  // 从本地DB查询（默认行为，DB优先）
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ top: String(PAGE_SIZE), skip: String(page * PAGE_SIZE), count: 'true' });
      if (searchQuery.trim()) {
        // Step 1: 在本地DB中按名称/编号模糊搜索，获取精确代码
        const searchRes = await fetch(`/api/sap/search?type=product&q=${encodeURIComponent(searchQuery.trim())}`);
        const searchJson = await searchRes.json();
        if (searchJson.success && searchJson.data && searchJson.data.length > 0) {
          // Step 2: 用精确代码列表过滤DB数据
          const codes = searchJson.data.map((d: { product: string }) => d.product);
          params.set('filter', codes.map((c: string) => `Product eq '${c}'`).join(' or '));
        } else {
          // 没有匹配结果，直接返回空
          setData([]); setTotalCount(0); setLoading(false); return;
        }
      }
      const res = await fetch(`/api/sap/API_PRODUCT_SRV/A_Product?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setData(prev => page === 0 ? (json.data || []) : [...prev, ...(json.data || [])]); setTotalCount(json.totalCount || json.count || 0);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unknown error'); }
    finally { setLoading(false); }
  }, [searchQuery]);

  // 从SAP直接查询并增量保存到DB
  const fetchFromSap = useCallback(async () => {
    setSapRefreshing(true); setError(null);
    try {
      const params = new URLSearchParams({ top: '200', count: 'true', sap_direct: 'true', expand: 'to_Description' });
      const res = await fetch(`/api/sap/API_PRODUCT_SRV/A_Product?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'SAP查询失败');
      // SAP数据已自动增量保存到DB，刷新页面数据
      setData(prev => page === 0 ? (json.data || []) : [...prev, ...(json.data || [])]); setTotalCount(json.totalCount || json.count || 0);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unknown error'); }
    finally { setSapRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="lg:hidden"><h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>产品管理</h1></div>

      <div className="fiori-filterbar">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            <input type="text" placeholder="编号 / 名称" className="w-full h-8 pl-8 pr-3 text-sm rounded border outline-none" style={{ background: 'var(--background)', borderColor: 'var(--border)' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchData()} />
          </div>
        </div>
        <div className="hidden lg:flex items-center border rounded overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <button className={`h-8 w-8 flex items-center justify-center ${viewMode === 'card' ? 'text-white' : ''}`} style={viewMode === 'card' ? { background: 'var(--primary)' } : { background: 'var(--card)', color: 'var(--muted-foreground)' }} onClick={() => setViewMode('card')}><LayoutList className="w-4 h-4" /></button>
          <button className={`h-8 w-8 flex items-center justify-center ${viewMode === 'table' ? 'text-white' : ''}`} style={viewMode === 'table' ? { background: 'var(--primary)' } : { background: 'var(--card)', color: 'var(--muted-foreground)' }} onClick={() => setViewMode('table')}><Table2 className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-4 text-sm rounded font-medium text-white" style={{ background: 'var(--primary)' }} onClick={() => { setPage(0); fetchData(); }} disabled={loading}><Search className="w-3.5 h-3.5 inline mr-1" /> 查询</button>
          <button className="h-8 px-3 text-sm rounded border flex items-center gap-1" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: '#0A6ED1' }} onClick={fetchFromSap} disabled={sapRefreshing}><CloudDownload className="w-3.5 h-3.5" /> {sapRefreshing ? '同步中...' : '从SAP查询'}</button>
          <button className="h-8 px-3 text-sm rounded border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={() => { setSearchQuery(''); setPage(0); }}><RotateCcw className="w-3.5 h-3.5 inline mr-1" /> 清除</button>
        </div>
      </div>

      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>共 {totalCount} 条记录</div>

      {/* Load More */}
      {!loading && !error && data.length < totalCount && (
        <button
          className="w-full h-10 rounded border text-sm font-medium transition-colors"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--primary)' }}
          onClick={() => setPage(p => p + 1)}
        >
          加载更多 ({data.length}/{totalCount})
        </button>
      )}

      {loading && <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>}
      {error && !loading && <div className="text-center py-12" style={{ color: 'var(--color-fiori-error)' }}><p className="text-sm">{error}</p><button className="mt-2 text-sm underline" onClick={fetchData}>重试</button></div>}
      {!loading && !error && data.length === 0 && <div className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}><Inbox className="w-10 h-10 mx-auto mb-2" /><p className="text-sm">暂无数据</p></div>}

      {/* Card View (Mobile default + Desktop toggle) */}
      {!loading && !error && data.length > 0 && (
        <div className={`space-y-2 ${viewMode === 'table' ? 'lg:hidden' : ''}`}>
          {data.map((item) => {
            const typeInfo = PRODUCT_TYPE_MAP[item.ProductType] || { label: item.ProductType, variant: 'neutral' as const };
            const desc = getDescription(item);
            const price = getPrice(item);
            return (
              <div key={item.Product} className="fiori-oli cursor-pointer" onClick={() => router.push(`/products/${encodeURIComponent(item.Product)}`)}>
                <div className={`fiori-oli-bar fiori-oli-bar--${typeInfo.variant}`} />
                <div className="fiori-oli-content">
                  <div className="fiori-oli-title">{item.Product} <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span> {desc}</div>
                  {(() => { const enDesc = getEnDescription(item); return enDesc && enDesc !== desc ? <div className="fiori-oli-subtitle" style={{ color: 'var(--muted-foreground)' }}>EN: {enDesc}</div> : null; })()}
                  <div className="fiori-oli-subtitle">
                    {PRODUCT_GROUP_MAP[item.ProductGroup] || item.ProductGroup}
                  </div>
                  <div className="flex items-center gap-2">
                    <FioriBadge variant={typeInfo.variant}>{typeInfo.label}</FioriBadge>
                    {price && <span className="text-xs tabular-nums" style={{ color: 'var(--muted-foreground)' }}>{price}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View (Desktop only) */}
      {!loading && !error && data.length > 0 && viewMode === 'table' && (
        <div className="hidden lg:block rounded-lg border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: 'var(--muted)' }}>
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>产品编号</th>
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>中文描述</th>
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>英文描述</th>
              <th className="text-center px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>类型</th>
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>产品组</th>
              <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>价格</th>
            </tr></thead>
            <tbody>{data.map((item) => {
              const typeInfo = PRODUCT_TYPE_MAP[item.ProductType] || { label: item.ProductType, variant: 'neutral' as const };
              const desc = getDescription(item);
              const val = getValuation(item);
              const enDesc = getEnDescription(item);
              return (<tr key={item.Product} className="border-t hover:bg-accent/50 transition-colors cursor-pointer" style={{ borderColor: 'var(--border)' }} onClick={() => router.push(`/products/${encodeURIComponent(item.Product)}`)}>
                <td className="px-4 py-3 font-medium text-[#0070F2]">{item.Product}</td>
                <td className="px-4 py-3">{desc}</td>
                <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>{enDesc || '-'}</td>
                <td className="px-4 py-3 text-center"><FioriBadge variant={typeInfo.variant}>{typeInfo.label}</FioriBadge></td>
                <td className="px-4 py-3">{PRODUCT_GROUP_MAP[item.ProductGroup] || item.ProductGroup}</td>
                <td className="px-4 py-3 text-right tabular-nums">{val ? `${val.StandardPrice !== '0.00' ? val.StandardPrice : val.MovingAveragePrice} ${val.Currency}` : '-'}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}
      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchData} ariaLabel="刷新查询" />
    </div>
  );
}
