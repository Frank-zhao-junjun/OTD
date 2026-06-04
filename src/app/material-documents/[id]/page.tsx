'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';

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
  PostingDate?: string;
  DocumentDate?: string;
  Supplier?: string;
  Customer?: string;
}

const MOVEMENT_COLORS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  '101': 'success', '102': 'error',
  '261': 'warning', '262': 'error',
  '311': 'info', '312': 'error',
  '501': 'success', '502': 'error',
  '201': 'warning', '202': 'error',
};

function getMovementLabel(type: string): string {
  const labels: Record<string, string> = {
    '101': '生产收货', '102': '收货取消',
    '261': '生产发料', '262': '发料取消',
    '311': '库存转储', '312': '转储取消',
    '501': '无PO收货', '502': '收货取消',
    '201': '成本中心发料', '202': '发料取消',
  };
  return labels[type] || type;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const match = dateStr.match(/\/Date\((\d+)\)\//);
  if (match) {
    const d = new Date(parseInt(match[1]));
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return dateStr;
}

export default function MaterialDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [doc, setDoc] = useState<MaterialDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('filter', `MaterialDocument eq '${id}'`);
        searchParams.set('top', '1');
        const response = await fetch(`/api/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem?${searchParams.toString()}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        setDoc(results[0] || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDoc();
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

  if (error || !doc) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <FioriErrorState message={error || '未找到入库单数据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const barColor = MOVEMENT_COLORS[doc.GoodsMovementType] || 'neutral';
  const movementLabel = getMovementLabel(doc.GoodsMovementType);

  const fields = [
    { label: '凭证号', value: doc.MaterialDocument },
    { label: '年度', value: doc.MaterialDocumentYear || '-' },
    { label: '行项目', value: doc.MaterialDocumentItem || '-' },
    { label: '物料', value: doc.Material },
    { label: '工厂', value: doc.Plant },
    { label: '库位', value: doc.StorageLocation },
    { label: '移动类型', value: `${movementLabel} (${doc.GoodsMovementType})` },
    { label: '数量', value: `${parseFloat(doc.QuantityInBaseUnit || '0').toLocaleString()} ${doc.MaterialBaseUnit}` },
    { label: '收货方', value: doc.GoodsRecipientName || '-' },
    { label: '生产订单', value: doc.ManufacturingOrder || '-' },
    { label: '过账日期', value: formatDate(doc.PostingDate) },
    { label: '凭证日期', value: formatDate(doc.DocumentDate) },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/material-documents')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="fiori-objheader">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="fiori-objheader-title">{doc.MaterialDocument}</div>
            <div className="fiori-objheader-subtitle">
              {doc.Material} · {movementLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={barColor}>{movementLabel}</FioriBadge>
          <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
            {parseFloat(doc.QuantityInBaseUnit || '0').toLocaleString()} {doc.MaterialBaseUnit}
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
