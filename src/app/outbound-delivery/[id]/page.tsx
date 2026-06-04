'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { ArrowLeft, Truck } from 'lucide-react';

interface DeliveryItem {
  DeliveryDocument: string;
  DeliveryDocumentType: string;
  DeliveryDate: string;
  SoldToParty: string;
  SalesOrganization: string;
  ShippingPoint: string;
  OverallGoodsMovementStatus: string;
  OverallSDProcessStatus: string;
}

import { formatSapDate } from '@/lib/utils';

const DELIVERY_STATUS_MAP: Record<string, { label: string; variant: 'error' | 'success' | 'warning' | 'info' | 'neutral' }> = {
  'A': { label: '未处理', variant: 'neutral' },
  'B': { label: '部分处理', variant: 'warning' },
  'C': { label: '已完成', variant: 'success' },
};

const MOVEMENT_STATUS_MAP: Record<string, { label: string; variant: 'error' | 'success' | 'warning' | 'info' | 'neutral' }> = {
  'A': { label: '未过账', variant: 'neutral' },
  'B': { label: '部分过账', variant: 'warning' },
  'C': { label: '已过账', variant: 'success' },
};

const DELIVERY_TYPE_MAP: Record<string, string> = {
  'LF': '外向交货单',
  'NL': '补货交货',
  'LR': '退货交货',
};

export default function OutboundDeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(params.id as string);

  const [item, setItem] = useState<DeliveryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader?id=${encodeURIComponent(id)}`);
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
          <div className="fiori-objheader-fields">{Array.from({ length: 6 }).map((_, i) => (<div key={i} className="fiori-objheader-field"><Skeleton className="h-3 w-[60px] mb-1" /><Skeleton className="h-4 w-[100px]" /></div>))}</div>
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
        <FioriErrorState message={error || '未找到交货单数据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const processStatus = DELIVERY_STATUS_MAP[item.OverallSDProcessStatus] || { label: item.OverallSDProcessStatus, variant: 'outline' as const };
  const movementStatus = MOVEMENT_STATUS_MAP[item.OverallGoodsMovementStatus] || { label: item.OverallGoodsMovementStatus, variant: 'outline' as const };

  const fields = [
    { label: '交货单号', value: item.DeliveryDocument },
    { label: '交货类型', value: DELIVERY_TYPE_MAP[item.DeliveryDocumentType] || item.DeliveryDocumentType },
    { label: '交货日期', value: formatSapDate(item.DeliveryDate) },
    { label: '售达方', value: item.SoldToParty },
    { label: '销售组织', value: item.SalesOrganization },
    { label: '装运点', value: item.ShippingPoint },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/outbound-delivery')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="fiori-objheader">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="fiori-objheader-title">{item.DeliveryDocument}</div>
            <div className="fiori-objheader-subtitle">
              {DELIVERY_TYPE_MAP[item.DeliveryDocumentType] || item.DeliveryDocumentType} · {formatSapDate(item.DeliveryDate)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={processStatus.variant}>{processStatus.label}</FioriBadge>
          <FioriBadge variant={movementStatus.variant}>物料{movementStatus.label}</FioriBadge>
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
