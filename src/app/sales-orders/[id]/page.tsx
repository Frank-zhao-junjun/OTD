'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { getSapStatusColor } from '@/components/fiori';
import { ArrowLeft, FileText } from 'lucide-react';
import { SALES_ORDER_STATUS_MAP } from '@/lib/sap-service';
import {
  SALES_ORDER_HEADER_SELECT_EXTENDED,
  withBillingStatusNormalized,
} from '@/lib/sap-sales-order-v4-fields';

interface SalesOrder {
  SalesOrder: string;
  SalesOrderType?: string;
  SoldToParty?: string;
  SalesOrganization?: string;
  DistributionChannel?: string;
  OrganizationDivision?: string;
  TotalNetAmount?: string | number;
  TransactionCurrency?: string;
  SalesOrderDate?: string;
  RequestedDeliveryDate?: string;
  OverallSDProcessStatus?: string;
  OverallDeliveryStatus?: string;
  OverallBillingStatus?: string;
  PurchaseOrderByCustomer?: string;
  CreationDate?: string;
  LastChangeDate?: string;
  SalesGroup?: string;
  SalesOffice?: string;
}

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('id', id);
        searchParams.set('select', SALES_ORDER_HEADER_SELECT_EXTENDED);

        const response = await fetch(`/api/sap/CE_SALESORDER_0001/SalesOrder?${searchParams.toString()}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        setOrder(results[0] ? withBillingStatusNormalized(results[0]) : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-6 w-[200px]" />
        </div>
        <div className="fiori-objheader">
          <Skeleton className="h-6 w-[180px] mb-2" />
          <Skeleton className="h-4 w-[240px] mb-4" />
          <div className="fiori-objheader-fields">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="fiori-objheader-field">
                <Skeleton className="h-3 w-[60px] mb-1" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            ))}
          </div>
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
        <FioriErrorState message={error || '未找到订单数据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    const match = dateStr.match(/\/Date\((\d+)\)\//);
    if (match) {
      const d = new Date(parseInt(match[1]));
      return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    return dateStr;
  };

  const processStatus = SALES_ORDER_STATUS_MAP[order.OverallSDProcessStatus || '']?.label || order.OverallSDProcessStatus || '-';
  const deliveryStatus = SALES_ORDER_STATUS_MAP[order.OverallDeliveryStatus || '']?.label || order.OverallDeliveryStatus || '-';
  const billingStatus = SALES_ORDER_STATUS_MAP[order.OverallBillingStatus || '']?.label || order.OverallBillingStatus || '-';

  const fields = [
    { label: '订单类型', value: order.SalesOrderType || '-' },
    { label: '客户编号', value: order.SoldToParty || '-' },
    { label: '客户采购单号', value: order.PurchaseOrderByCustomer || '-' },
    { label: '销售组织', value: order.SalesOrganization || '-' },
    { label: '分销渠道', value: order.DistributionChannel || '-' },
    { label: '产品组', value: order.OrganizationDivision || '-' },
    { label: '订单金额', value: order.TotalNetAmount ? `${Number(order.TotalNetAmount).toLocaleString()} ${order.TransactionCurrency || 'CNY'}` : '-' },
    { label: '订单日期', value: formatDate(order.SalesOrderDate) },
    { label: '请求交货日期', value: formatDate(order.RequestedDeliveryDate) },
    { label: '创建日期', value: formatDate(order.CreationDate) },
    { label: '最后更改', value: formatDate(order.LastChangeDate) },
    { label: '销售组', value: order.SalesGroup || '-' },
  ];

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/sales-orders')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>

      {/* ObjectHeader */}
      <div className="fiori-objheader">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="fiori-objheader-title">{order.SalesOrder}</div>
            <div className="fiori-objheader-subtitle">
              {order.SoldToParty || '-'} · {formatDate(order.SalesOrderDate)}
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={getSapStatusColor(order.OverallSDProcessStatus)}>
            处理: {processStatus}
          </FioriBadge>
          <FioriBadge variant={getSapStatusColor(order.OverallDeliveryStatus)}>
            交货: {deliveryStatus}
          </FioriBadge>
          <FioriBadge variant={getSapStatusColor(order.OverallBillingStatus)}>
            开票: {billingStatus}
          </FioriBadge>
        </div>

        {/* Field grid */}
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
