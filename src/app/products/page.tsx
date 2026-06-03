'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriOli, FioriBadge, FioriFilterBar, FioriPageHeader, FioriEmptyState, FioriErrorState, FioriFab } from '@/components/fiori';
import { Package, Search, RotateCcw, Inbox } from 'lucide-react';

interface Product {
  Product: string;
  ProductType?: string;
  ProductGroup?: string;
  BaseUnit?: string;
  GrossWeight?: string | number;
  WeightUnit?: string;
  CreationDate?: string;
  ProductDescription?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      params.set('count', 'true');

      const filterParts: string[] = [];
      if (searchQuery) {
        filterParts.push(`(Product eq '${searchQuery}' or ProductGroup eq '${searchQuery}')`);
      }
      if (filterParts.length > 0) params.set('filter', filterParts.join(' and '));
      params.set('select', 'Product,ProductType,ProductGroup,BaseUnit,GrossWeight,WeightUnit,CreationDate');

      const response = await fetch(`/api/sap/API_PRODUCT_SRV/A_Product?${params.toString()}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setProducts(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const PRODUCT_TYPE: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
    'FERT': { color: 'info', label: '成品' },
    'HALB': { color: 'warning', label: '半成品' },
    'ROH': { color: 'neutral', label: '原材料' },
    'HIBE': { color: 'success', label: '辅料' },
    'DIEN': { color: 'info', label: '服务' },
  };

  return (
    <div className="space-y-4">
      <FioriPageHeader icon={<Package className="w-5 h-5" />} title="产品管理" count={totalCount} />

      <FioriFilterBar>
        <div className="fiori-filterbar-field flex-1 min-w-[160px]">
          <label>搜索</label>
          <Input placeholder="产品号 / 产品组" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchProducts()} className="h-8 text-sm" />
        </div>
        <Button size="sm" onClick={fetchProducts} disabled={loading} className="h-8"><Search className="w-3.5 h-3.5 mr-1" /> 查询</Button>
        <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="h-8"><RotateCcw className="w-3.5 h-3.5 mr-1" /> 清除</Button>
      </FioriFilterBar>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="fiori-oli"><div className="fiori-oli-bar fiori-oli-bar--neutral" /><div className="fiori-oli-content" style={{ gap: 6 }}><Skeleton className="h-4 w-[120px]" /><Skeleton className="h-3 w-[180px]" /><Skeleton className="h-3 w-[80px]" /></div></div>
          ))}
        </div>
      ) : error ? (
        <FioriErrorState message={error} onRetry={fetchProducts} />
      ) : products.length === 0 ? (
        <FioriEmptyState icon={<Inbox className="w-10 h-10" />} title="暂无数据" description="请调整查询条件后重试" />
      ) : (
        <div>
          {products.map((p) => {
            const typeInfo = PRODUCT_TYPE[p.ProductType || ''] || { color: 'neutral' as const, label: p.ProductType || '-' };
            return (
              <FioriOli
                key={p.Product}
                barColor={typeInfo.color}
                title={`${p.Product} · ${p.ProductDescription || ''}`}
                subtitle={`产品组 ${p.ProductGroup || '-'} · 基本单位 ${p.BaseUnit || '-'}`}
                status={
                  <div className="flex items-center gap-2 mt-0.5">
                    <FioriBadge variant={typeInfo.color}>{typeInfo.label}</FioriBadge>
                    {p.GrossWeight && (
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                        {Number(p.GrossWeight).toLocaleString()} {p.WeightUnit || ''}
                      </span>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchProducts} ariaLabel="刷新查询" />
    </div>
  );
}
