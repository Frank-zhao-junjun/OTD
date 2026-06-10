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
  Material: string;
  SalesOrderItemText: string;
  RequestedQuantity: string;
  RequestedQuantityUnit: string;
  NetAmount: string;
  TransactionCurrency: string;
  Plant: string;
  SalesOrderItemCategory: string;
}

interface SalesOrderPartner {
  PartnerFunction: string;
  Customer: string;
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
  CreatedByUser?: string;
  SalesOrderTypeInternalCode?: string;
  to_Item?: SalesOrderItem[];
  to_Partner?: SalesOrderPartner[];
}

// V2 partner function codes
const PARTNER_FUNCTION_MAP: Record<string, string> = {
  'SP': '售达方',
  'SH': '送达方',
  'BP': '收款方',
  'PY': '付款方',
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
  const [customerName, setCustomerName] = useState('');
  const [materialNames, setMaterialNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('id', id);
        searchParams.set('expand', 'to_Item,to_Partner');

        const response = await fetch(`/api/sap/API_SALES_ORDER_SRV/A_SalesOrder?${searchParams.toString()}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        const orderData = results[0] || null;
        setOrder(orderData);

        // Fetch customer name from DB
        if (orderData?.SoldToParty) {
          try {
            const cRes = await fetch(`/api/sap/API_BUSINESS_PARTNER/A_Customer?filter=${encodeURIComponent(`Customer eq '${orderData.SoldToParty}'`)}&top=1`);
            const cData = await cRes.json();
            if (cData.success && cData.data?.length > 0) {
              setCustomerName(cData.data[0].CustomerName || cData.data[0].CustomerFullName || '');
            }
          } catch {
            // Customer name fetch failure is non-critical
          }
        }
        // Fetch material names
        const items = orderData?.to_Item || [];
        if (items.length > 0) {
          try {
            const pRes = await fetch('/api/sap/API_PRODUCT_SRV/A_Product?top=200');
            const pJson = await pRes.json();
            const products = (pJson.data || []) as { Product: string; ProductDescription: string }[];
            const nameMap: Record<string, string> = {};
            for (const item of items) {
              const p = products.find(x => x.Product === item.Material);
              if (p) nameMap[item.Material] = p.ProductDescription;
            }
            setMaterialNames(nameMap);
          } catch { /* ignore */ }
        }
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
    { label: '创建人', value: order.CreatedByUser || '-' },
  ];

  const items = order.to_Item || [];

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
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>数量</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>单位</th>
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>净额</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.SalesOrderItem} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 tabular-nums">{item.SalesOrderItem}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--primary)' }}>{item.Material}{materialNames[item.Material] ? ` (${materialNames[item.Material]})` : ''}</td>
                      <td className="px-4 py-3">{item.SalesOrderItemText || '-'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.RequestedQuantity ?? '-'}</td>
                      <td className="px-4 py-3">{item.RequestedQuantityUnit || '-'}</td>
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
                      {item.Material}{materialNames[item.Material] ? ` (${materialNames[item.Material]})` : ''}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                      行 {item.SalesOrderItem}
                    </span>
                  </div>
                  <div className="text-sm mb-1">{item.SalesOrderItemText || '-'}</div>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    <span>数量: {item.RequestedQuantity ?? '-'} {item.RequestedQuantityUnit || ''}</span>
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
      {order.to_Partner && order.to_Partner.length > 0 && (
        <div className="rounded-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="font-semibold text-sm">业务伙伴</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {order.to_Partner.map((partner, idx) => (
              <div key={idx} className="px-4 py-2 flex items-center justify-between">
                <span className="text-sm">{PARTNER_FUNCTION_MAP[partner.PartnerFunction] || partner.PartnerFunction}</span>
                <span className="text-sm font-medium">{partner.Customer}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
