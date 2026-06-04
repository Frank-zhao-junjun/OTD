'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriErrorState } from '@/components/fiori';
import { ArrowLeft, Package } from 'lucide-react';

interface MaterialDocItem {
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
}

function formatNumber(num: string | undefined): string {
  if (!num) return '-';
  const n = parseFloat(num);
  if (isNaN(n)) return num;
  return n.toLocaleString('zh-CN');
}

const MOVEMENT_TYPE_MAP: Record<string, string> = {
  '101': '采购订单收货',
  '102': '采购订单退货',
  '261': '生产发料',
  '262': '生产发料取消',
  '311': '转储过账(从存储地)',
  '312': '转储过账取消',
  '561': '期初入库',
  '701': '盘点差异(增加)',
  '702': '盘点差异(减少)',
};

export default function MaterialDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(params.id as string);

  const [items, setItems] = useState<MaterialDocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('filter', `MaterialDocument eq '${id}'`);
        const response = await fetch(`/api/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem?${searchParams.toString()}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        setItems(results);
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
        <FioriErrorState message={error || '未找到物料凭证数据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const primaryItem = items[0];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/material-documents')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="fiori-objheader">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="fiori-objheader-title">{primaryItem.MaterialDocument}</div>
            <div className="fiori-objheader-subtitle">
              年度 {primaryItem.MaterialDocumentYear} · {items.length} 行项目
            </div>
          </div>
        </div>
        <div className="fiori-objheader-fields">
          <div className="fiori-objheader-field">
            <span className="fiori-objheader-field-label">凭证号</span>
            <span className="fiori-objheader-field-value">{primaryItem.MaterialDocument}</span>
          </div>
          <div className="fiori-objheader-field">
            <span className="fiori-objheader-field-label">年度</span>
            <span className="fiori-objheader-field-value">{primaryItem.MaterialDocumentYear}</span>
          </div>
        </div>
      </div>

      {/* Line items table */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-[#6A6D70] uppercase tracking-wide mb-2">行项目明细</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E4E4]">
                <th className="text-left py-2 px-3 text-[#6A6D70] font-medium">行号</th>
                <th className="text-left py-2 px-3 text-[#6A6D70] font-medium">物料</th>
                <th className="text-left py-2 px-3 text-[#6A6D70] font-medium">工厂</th>
                <th className="text-left py-2 px-3 text-[#6A6D70] font-medium">库位</th>
                <th className="text-left py-2 px-3 text-[#6A6D70] font-medium">移动类型</th>
                <th className="text-right py-2 px-3 text-[#6A6D70] font-medium">数量</th>
                <th className="text-left py-2 px-3 text-[#6A6D70] font-medium">单位</th>
                <th className="text-left py-2 px-3 text-[#6A6D70] font-medium">生产订单</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.MaterialDocumentItem} className="border-b border-[#E4E4E4] hover:bg-[#FAFAFA]">
                  <td className="py-2 px-3">{s.MaterialDocumentItem}</td>
                  <td className="py-2 px-3">{s.Material}</td>
                  <td className="py-2 px-3">{s.Plant}</td>
                  <td className="py-2 px-3">{s.StorageLocation || '-'}</td>
                  <td className="py-2 px-3">{MOVEMENT_TYPE_MAP[s.GoodsMovementType] || s.GoodsMovementType}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatNumber(s.QuantityInBaseUnit)}</td>
                  <td className="py-2 px-3">{s.MaterialBaseUnit}</td>
                  <td className="py-2 px-3">{s.ManufacturingOrder || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
