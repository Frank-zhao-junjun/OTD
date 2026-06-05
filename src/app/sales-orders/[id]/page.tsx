'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState, getSapStatusColor } from '@/components/fiori';
import { ArrowLeft, FileText, Package } from 'lucide-react';
import { SALES_ORDER_STATUS_MAP } from '@/lib/sap-service';
import { formatSapDate } from '@/lib/utils';

interface SalesOrderItem {
  SalesOrderItem: string;
  Product: string;
  SalesOrderItemText: string;
  RequestedQuantity: number | string;
  OrderQuantitySAPUnit: string;
  NetAmount: number | string;
  TransactionCurrency: string;
  Plant: string;
  SalesOrderItemCategory: string;
  RequestedDeliveryDate?: string;
  ConfirmedDeliveryDate?: string;
  ItemGrossWeight?: number | string;
  ItemNetWeight?: number | string;
  ItemWeightSAPUnit?: string;
}

interface SalesOrderPartner {
  PartnerFunction: string;
  Customer: string;
  BusinessPartnerName1: string;
}

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
  OverallSDProcessStatus?: string;
  PurchaseOrderByCustomer?: string;
  _Item?: SalesOrderItem[];
  _Partner?: SalesOrderPartner[];
}

const PARTNER_FUNCTION_MAP: Record<string, string> = {
  'AG': '售达方',
  'RE': '收款方',
  'WE': '送达方',
  'RG': '付款方',
};

function formatAmount(amount: string | number | undefined, currency: string | undefined): string {
  if (amount === undefined || amount === null) return '-';
  const num = parseFloat(String(amount));
  if (isNaN(num)) return String(amount);
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (currency ? ' ' + currency : '');
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
        searchParams.set('expand', '_Item,_Partner');

        const response = await fetch(`/api/sap/CE_SALESORDER_0001/SalesOrder?${searchParams.toString()}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        setOrder(results[0] || null);
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
            {[...Array(8)].map((_, i) => (
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

  const processStatus = SALES_ORDER_STATUS_MAP[order.OverallSDProcessStatus || '']?.label || order.OverallSDProcessStatus || '-';

  // Extract customer name from _Partner
  const soldToPartner = order._Partner?.find(p => p.PartnerFunction === 'AG');
  const customerName = soldToPartner?.BusinessPartnerName1 || '';

  const headerFields = [
    { label: '订单类型', value: order.SalesOrderType || '-' },
    { label: '客户编号', value: order.SoldToParty || '-' },
    { label: '客户名称', value: customerName || '-' },
    { label: '客户采购单号', value: order.PurchaseOrderByCustomer || '-' },
    { label: '销售组织', value: order.SalesOrganization || '-' },
    { label: '分销渠道', value: order.DistributionChannel || '-' },
    { label: '产品组', value: order.OrganizationDivision || '-' },
    { label: '订单金额', value: formatAmount(order.TotalNetAmount, order.TransactionCurrency) },
    { label: '订单日期', value: formatSapDate(order.SalesOrderDate) },
  ];

  const items = order._Item || [];

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
              {order.SoldToParty || '-'}{customerName ? ` ${customerName}` : ''} · {formatSapDate(order.SalesOrderDate)}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={getSapStatusColor(order.OverallSDProcessStatus)}>
            处理状态: {processStatus}
          </FioriBadge>
        </div>

        {/* Field grid */}
        <div className="fiori-objheader-fields">
          {headerFields.map((field) => (
            <div key={field.label} className="fiori-objheader-field">
              <span className="fiori-objheader-field-label">{field.label}</span>
              <span className="fiori-objheader-field-value">{field.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Line Items Section */}
      <div className="rounded-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <span className="font-semibold text-sm">行项目 ({items.length})</span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-6" style={{ color: 'var(--muted-foreground)' }}>
            <p className="text-sm">暂无行项目数据</p>
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--muted)' }}>
                    <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>行号</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>产品</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>描述</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>类别</th>
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>数量</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>单位</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>工厂</th>
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>净额</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.SalesOrderItem} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 tabular-nums">{item.SalesOrderItem}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--primary)' }}>{item.Product}</td>
                      <td className="px-4 py-3">{item.SalesOrderItemText || '-'}</td>
                      <td className="px-4 py-3">{item.SalesOrderItemCategory || '-'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.RequestedQuantity ?? '-'}</td>
                      <td className="px-4 py-3">{item.OrderQuantitySAPUnit || '-'}</td>
                      <td className="px-4 py-3">{item.Plant || '-'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatAmount(item.NetAmount, item.TransactionCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="lg:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {items.map((item) => (
                <div key={item.SalesOrderItem} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm" style={{ color: 'var(--primary)' }}>
                      {item.Product}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                      行 {item.SalesOrderItem}
                    </span>
                  </div>
                  <div className="text-sm mb-1">{item.SalesOrderItemText || '-'}</div>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    <span>数量: {item.RequestedQuantity ?? '-'} {item.OrderQuantitySAPUnit || ''}</span>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                      {formatAmount(item.NetAmount, item.TransactionCurrency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Partner Information */}
      {order._Partner && order._Partner.length > 0 && (
        <div className="rounded-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="font-semibold text-sm">业务伙伴</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {order._Partner.map((partner, idx) => (
              <div key={idx} className="px-4 py-2 flex items-center justify-between">
                <span className="text-sm">{PARTNER_FUNCTION_MAP[partner.PartnerFunction] || partner.PartnerFunction}</span>
                <span className="text-sm">
                  <span className="font-medium">{partner.Customer}</span>
                  {partner.BusinessPartnerName1 && (
                    <span style={{ color: 'var(--muted-foreground)' }}> {partner.BusinessPartnerName1}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
