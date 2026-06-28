'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { fetchProductNameMap } from '@/lib/bilingual-display';

interface StockItem {
  Material: string;
  Plant: string;
  StorageLocation: string;
  Batch: string;
  InventoryStockType: string;
  MaterialBaseUnit: string;
  MatlWrhsStkQtyInMatlBaseUnit: string;
}

function formatNumber(num: string | undefined): string {
  if (!num) return '-';
  const n = parseFloat(num);
  if (isNaN(n)) return num;
  return n.toLocaleString('zh-CN');
}

const STOCK_TYPE_MAP: Record<string, string> = {
  '01': '非限制使用',
  '02': '质量检验',
  '03': '冻结',
};

export default function MaterialStockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(params.id as string);

  const [items, setItems] = useState<StockItem[]>([]);
  const [materialName, setMaterialName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('filter', `Material eq '${id}'`);
        const response = await fetch(`/api/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod?${searchParams.toString()}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        setItems(results);
        // Fetch material name
        try {
          const nameMap = await fetchProductNameMap([id]);
          setMaterialName(nameMap[id] || '');
        } catch { /* ignore */ }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchItem();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div className="fiori-objheader">
          <div className="flex items-center gap-3 mb-4"><Skeleton className="w-10 h-10 rounded-lg" /><div><Skeleton className="h-6 w-40 mb-1" /><Skeleton className="h-4 w-60" /></div></div>
          <div className="fiori-objheader-fields">{Array.from({ length: 6 }).map((_, i) => (<div key={i} className="fiori-objheader-field"><Skeleton className="h-3 w-[60px] mb-1" /><Skeleton className="h-4 w-[100px]" /></div>))}</div>
        </div>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <FioriErrorState message={error || '未找到库存数据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  // Sum up total quantity across all stock records
  const totalQty = items.reduce((sum, i) => sum + parseFloat(i.MatlWrhsStkQtyInMatlBaseUnit || '0'), 0);
  const primaryItem = items[0];
  const isNoStock = totalQty === 0;
  const isLowStock = totalQty < 100 && totalQty > 0;
  const stockStatus = isNoStock
    ? { color: 'error' as const, label: '缺货' }
    : isLowStock
      ? { color: 'warning' as const, label: '低库存' }
      : { color: 'success' as const, label: '正常' };

  const primaryFields = [
    { label: '物料', value: primaryItem.Material ? `${primaryItem.Material} ${materialName ? `(${materialName})` : ''}` : '-' },
    { label: '工厂', value: primaryItem.Plant },
    { label: '总库存', value: `${formatNumber(totalQty.toString())} ${primaryItem.MaterialBaseUnit}` },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/material-stock')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="fiori-objheader">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="fiori-objheader-title">{primaryItem.Material}{materialName ? ` (${materialName})` : ''}</div>
            <div className="fiori-objheader-subtitle">
              工厂 {primaryItem.Plant} · {items.length} 条库存记录
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={stockStatus.color}>{stockStatus.label}</FioriBadge>
          <span className="text-lg font-bold tabular-nums" style={{ color: isNoStock ? 'var(--color-fiori-error)' : isLowStock ? 'var(--color-fiori-warning)' : 'var(--foreground)' }}>
            {formatNumber(totalQty.toString())} {primaryItem.MaterialBaseUnit}
          </span>
        </div>
        <div className="fiori-objheader-fields">
          {primaryFields.map((field) => (
            <div key={field.label} className="fiori-objheader-field">
              <span className="fiori-objheader-field-label">{field.label}</span>
              <span className="fiori-objheader-field-value">{field.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stock breakdown table */}
      {items.length > 1 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-[#6A6D70] uppercase tracking-wide mb-2">库存明细</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E4E4]">
                  <th className="text-left py-2 px-3 text-[#6A6D70] font-medium">库位</th>
                  <th className="text-left py-2 px-3 text-[#6A6D70] font-medium">批次</th>
                  <th className="text-left py-2 px-3 text-[#6A6D70] font-medium">库存类型</th>
                  <th className="text-right py-2 px-3 text-[#6A6D70] font-medium">数量</th>
                  <th className="text-left py-2 px-3 text-[#6A6D70] font-medium">单位</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s, idx) => (
                  <tr key={idx} className="border-b border-[#E4E4E4] hover:bg-[#FAFAFA]">
                    <td className="py-2 px-3">{s.StorageLocation || '-'}</td>
                    <td className="py-2 px-3">{s.Batch || '-'}</td>
                    <td className="py-2 px-3">{STOCK_TYPE_MAP[s.InventoryStockType] || s.InventoryStockType}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(s.MatlWrhsStkQtyInMatlBaseUnit)}</td>
                    <td className="py-2 px-3">{s.MaterialBaseUnit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
