'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { ArrowLeft, BarChart3 } from 'lucide-react';

interface StockItem {
  Material: string;
  MaterialName: string;
  Plant: string;
  StorageLocation: string;
  Batch: string;
  MaterialBaseQuantity: string;
  BaseUnit: string;
  StockType: string;
  StockTypeText: string;
  SupplyArea: string;
  MaterialGroup?: string;
  ValuationType?: string;
}

function formatNumber(num: string | undefined): string {
  if (!num) return '-';
  const n = parseFloat(num);
  if (isNaN(n)) return num;
  return n.toLocaleString('zh-CN');
}

export default function MaterialStockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(params.id as string);

  const [item, setItem] = useState<StockItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('filter', `Material eq '${id}'`);
        searchParams.set('top', '1');
        const response = await fetch(`/api/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod?${searchParams.toString()}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        setItem(results[0] || null);
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
          <div className="fiori-objheader-fields">{Array.from({ length: 8 }).map((_, i) => (<div key={i} className="fiori-objheader-field"><Skeleton className="h-3 w-[60px] mb-1" /><Skeleton className="h-4 w-[100px]" /></div>))}</div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <FioriErrorState message={error || '未找到库存数据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const quantity = parseFloat(item.MaterialBaseQuantity);
  const isNoStock = quantity === 0;
  const isLowStock = quantity < 100 && quantity > 0;
  const stockStatus = isNoStock ? { color: 'error' as const, label: '缺货' } : isLowStock ? { color: 'warning' as const, label: '低库存' } : { color: 'success' as const, label: item.StockTypeText || '正常' };

  const fields = [
    { label: '物料编号', value: item.Material },
    { label: '物料描述', value: item.MaterialName || '-' },
    { label: '工厂', value: item.Plant },
    { label: '库位', value: item.StorageLocation },
    { label: '批次', value: item.Batch || '-' },
    { label: '数量', value: `${formatNumber(item.MaterialBaseQuantity)} ${item.BaseUnit}` },
    { label: '库存类型', value: item.StockTypeText || item.StockType || '-' },
    { label: '供应区域', value: item.SupplyArea || '-' },
    { label: '物料组', value: item.MaterialGroup || '-' },
    { label: '评估类型', value: item.ValuationType || '-' },
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
            <div className="fiori-objheader-title">{item.Material}</div>
            <div className="fiori-objheader-subtitle">
              {item.MaterialName || '-'} · {item.Plant}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={stockStatus.color}>{stockStatus.label}</FioriBadge>
          <span className="text-lg font-bold tabular-nums" style={{ color: isNoStock ? 'var(--color-fiori-error)' : isLowStock ? 'var(--color-fiori-warning)' : 'var(--foreground)' }}>
            {formatNumber(item.MaterialBaseQuantity)} {item.BaseUnit}
          </span>
        </div>
        <div className="fiori-objheader-fields">
          {fields.map((field) => (
            <div key={field.label} className="fiori-objheader-field">
              <span className="fiori-objheader-field-label">{field.label}</span>
              <span className="fiori-objheader-field-value">{field.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
