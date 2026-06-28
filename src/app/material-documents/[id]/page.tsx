'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriErrorState } from '@/components/fiori';
import { fetchProductNameMap } from '@/lib/bilingual-display';
import { fetchMaterialDocumentHeaderDates } from '@/lib/material-document';
import { formatSapDate } from '@/lib/utils';

interface MaterialDocumentItem {
  MaterialDocumentYear?: string;
  MaterialDocument?: string;
  MaterialDocumentItem?: string;
  Material?: string;
  Plant?: string;
  StorageLocation?: string;
  Batch?: string;
  GoodsMovementType?: string;
  ManufacturingOrder?: string;
  PurchaseOrder?: string;
  PurchaseOrderItem?: string;
  MaterialBaseUnit?: string;
  QuantityInBaseUnit?: string;
  GoodsRecipientName?: string;
  CostCenter?: string;
  ProfitCenter?: string;
}

export default function MaterialDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [items, setItems] = useState<MaterialDocumentItem[]>([]);
  const [materialName, setMaterialName] = useState<string>('');
  const [documentDate, setDocumentDate] = useState<string>('');
  const [postingDate, setPostingDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem?filter=MaterialDocument%20eq%20%27${encodeURIComponent(id)}%27`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setItems(data.data);
          const firstMaterial = data.data[0]?.Material;
          if (firstMaterial) {
            try {
              const nameMap = await fetchProductNameMap([firstMaterial]);
              setMaterialName(nameMap[firstMaterial] || '');
            } catch { /* ignore */ }
          }
          const doc = data.data[0];
          if (doc?.MaterialDocument && doc?.MaterialDocumentYear) {
            try {
              const dates = await fetchMaterialDocumentHeaderDates([{
                MaterialDocument: doc.MaterialDocument,
                MaterialDocumentYear: doc.MaterialDocumentYear,
              }]);
              const header = dates[doc.MaterialDocument];
              setDocumentDate(header?.documentDate || '');
              setPostingDate(header?.postingDate || '');
            } catch { /* ignore */ }
          }
        } else {
          setError(data.error || '未找到入库单');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '请求失败');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchData();
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

  if (error || items.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <FioriErrorState message={error || '未找到入库单'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const firstItem = items[0];

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
            <div className="fiori-objheader-title">{firstItem.MaterialDocument}</div>
            <div className="fiori-objheader-subtitle">
              年度: {firstItem.MaterialDocumentYear || '-'} · 行项目数: {items.length}
              <span className="mx-1.5">·</span>
              凭证日期: {formatSapDate(documentDate)}
              <span className="mx-1.5">·</span>
              过账日期: {formatSapDate(postingDate)}
            </div>
          </div>
        </div>
        <div className="fiori-objheader-fields mb-4">
          {[
            { label: '凭证日期', value: formatSapDate(documentDate) },
            { label: '过账日期', value: formatSapDate(postingDate) },
          ].map((field) => (
            <div key={field.label} className="fiori-objheader-field">
              <span className="fiori-objheader-field-label">{field.label}</span>
              <span className="fiori-objheader-field-value">{field.value}</span>
            </div>
          ))}
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="border-t border-gray-100 pt-3 mt-3">
            <div className="text-xs font-semibold text-gray-500 mb-2">行项目 {item.MaterialDocumentItem || idx + 1}</div>
            <div className="fiori-objheader-fields">
              {[
                { label: '物料', value: item.Material ? `${item.Material} ${item === firstItem && materialName ? `(${materialName})` : ''}` : '-' },
                { label: '工厂', value: item.Plant || '-' },
                { label: '库存地点', value: item.StorageLocation || '-' },
                { label: '批次', value: item.Batch || '-' },
                { label: '移动类型', value: item.GoodsMovementType || '-' },
                { label: '数量', value: item.QuantityInBaseUnit ? `${item.QuantityInBaseUnit} ${item.MaterialBaseUnit || ''}` : '-' },
                { label: '生产订单', value: item.ManufacturingOrder || '-' },
                { label: '采购订单', value: item.PurchaseOrder || '-' },
                { label: '成本中心', value: item.CostCenter || '-' },
                { label: '利润中心', value: item.ProfitCenter || '-' },
                { label: '收货人', value: item.GoodsRecipientName || '-' },
              ].map((field) => (
                <div key={field.label} className="fiori-objheader-field">
                  <span className="fiori-objheader-field-label">{field.label}</span>
                  <span className="fiori-objheader-field-value">{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
