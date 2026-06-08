'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { formatSapDate } from '@/lib/utils';

const DELIVERY_STATUS_MAP: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  A: { label: '未处理', color: 'neutral' },
  B: { label: '部分处理', color: 'warning' },
  C: { label: '已完成', color: 'success' },
};

const MOVEMENT_STATUS_MAP: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  A: { label: '未过账', color: 'neutral' },
  B: { label: '部分过账', color: 'warning' },
  C: { label: '已过账', color: 'success' },
};

interface OutboundDelivery {
  DeliveryDocument: string;
  DeliveryDocumentType?: string;
  DeliveryDate?: string;
  ActualGoodsMovementDate?: string;
  SoldToParty?: string;
  ShipToParty?: string;
  SalesOrganization?: string;
  OverallGoodsMovementStatus?: string;
  OverallSDProcessStatus?: string;
  ShippingPoint?: string;
  SalesOffice?: string;
  IncotermsClassification?: string;
}

export default function OutboundDeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<OutboundDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setOrder(data.data[0]);
        } else {
          setError(data.error || '未找到发货单');
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

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <FioriErrorState message={error || '未找到发货单'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const sdStatus = DELIVERY_STATUS_MAP[order.OverallSDProcessStatus || ''] || { label: order.OverallSDProcessStatus || '-', color: 'neutral' as const };
  const movementStatus = MOVEMENT_STATUS_MAP[order.OverallGoodsMovementStatus || ''] || { label: order.OverallGoodsMovementStatus || '-', color: 'neutral' as const };

  const fields = [
    { label: '交货单类型', value: order.DeliveryDocumentType || '-' },
    { label: '客户编号', value: order.SoldToParty || '-' },
    { label: '收货方', value: order.ShipToParty || '-' },
    { label: '销售组织', value: order.SalesOrganization || '-' },
    { label: '交货日期', value: formatSapDate(order.DeliveryDate) },
    { label: '实际发货日期', value: formatSapDate(order.ActualGoodsMovementDate) },
    { label: '装运点', value: order.ShippingPoint || '-' },
    { label: '销售办公室', value: order.SalesOffice || '-' },
    { label: '国际贸易条件', value: order.IncotermsClassification || '-' },
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
            <div className="fiori-objheader-title">{order.DeliveryDocument}</div>
            <div className="fiori-objheader-subtitle">
              {order.SoldToParty || '-'} · {formatSapDate(order.DeliveryDate)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={sdStatus.color}>处理: {sdStatus.label}</FioriBadge>
          <FioriBadge variant={movementStatus.color}>发货: {movementStatus.label}</FioriBadge>
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
