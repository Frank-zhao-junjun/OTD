'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { formatSapDate } from '@/lib/utils';

interface ProductionOrder {
  ProductionOrder: string;
  IsMarkedForDeletion?: boolean;
  IsCompletelyDelivered?: boolean;
  ProductionOrderType?: string;
  Product?: string;
  ProductionPlant?: string;
  SalesOrder?: string;
  SalesOrderItem?: string;
  OrderScheduledStartDate?: string;
  OrderScheduledEndDate?: string;
  OrderActualStartDate?: string;
  OrderActualEndDate?: string;
  OrderActualReleaseDate?: string;
  TechnicalCompletionDate?: string;
  OrderPlannedTotalQty?: number | string;
  ActualDeliveredQuantity?: number | string;
}

export default function ProductionOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setOrder(data.data[0]);
        } else {
          setError(data.error || '未找到生产订单');
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
        <FioriErrorState message={error || '未找到生产订单'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const fields = [
    { label: '订单类型', value: order.ProductionOrderType || '-' },
    { label: '产品', value: order.Product || '-' },
    { label: '生产工厂', value: order.ProductionPlant || '-' },
    { label: '计划数量', value: order.OrderPlannedTotalQty ? String(order.OrderPlannedTotalQty) : '-' },
    { label: '实际交付数量', value: order.ActualDeliveredQuantity ? String(order.ActualDeliveredQuantity) : '-' },
    { label: '销售订单', value: order.SalesOrder || '-' },
    { label: '销售订单行', value: order.SalesOrderItem || '-' },
    { label: '计划开始日期', value: formatSapDate(order.OrderScheduledStartDate) },
    { label: '计划结束日期', value: formatSapDate(order.OrderScheduledEndDate) },
    { label: '实际开始日期', value: formatSapDate(order.OrderActualStartDate) },
    { label: '实际结束日期', value: formatSapDate(order.OrderActualEndDate) },
    { label: '实际释放日期', value: formatSapDate(order.OrderActualReleaseDate) },
    { label: '技术完成日期', value: formatSapDate(order.TechnicalCompletionDate) },
    { label: '完全交货', value: order.IsCompletelyDelivered ? '是' : '否' },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/production-orders')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="fiori-objheader">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <div className="fiori-objheader-title">{order.ProductionOrder}</div>
            <div className="fiori-objheader-subtitle">
              {order.Product || '-'} · {order.ProductionPlant || '-'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {order.IsCompletelyDelivered && <FioriBadge variant="success">已完全交货</FioriBadge>}
          {order.IsMarkedForDeletion && <FioriBadge variant="error">已标记删除</FioriBadge>}
          {!order.IsCompletelyDelivered && !order.IsMarkedForDeletion && <FioriBadge variant="info">进行中</FioriBadge>}
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
