'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FioriBadge, FioriErrorState, getSapStatusColor } from '@/components/fiori';
import {
  ArrowLeft, FileText, Package, Truck, Receipt, ChevronRight,
  ExternalLink, Factory, DollarSign, Hash, Calendar, CheckCircle2,
  AlertCircle, Clock, Users, MapPin, Globe, Phone, Mail, GitBranch
} from 'lucide-react';
import { SALES_ORDER_STATUS_MAP } from '@/lib/sap-service';
import { formatSapDate } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────

interface SalesOrderItem {
  SalesOrder: string;
  SalesOrderItem: string;
  Product: string;
  SalesOrderItemText: string;
  SalesOrderItemCategory: string;
  RequestedQuantity: string | number;
  ConfdDelivQtyInOrderQtyUnit: string | number;
  OrderQuantitySAPUnit: string;
  NetAmount: string | number;
  TaxAmount: string | number;
  TransactionCurrency: string;
  Plant: string;
  ShippingPoint: string;
  ConfirmedDeliveryDate: string;
  RequestedDeliveryDate: string;
  DeliveryStatus: string;
  SDProcessStatus: string;
  ItemGeneralIncompletionStatus: string;
  ProfitCenter: string;
  StorageLocation: string;
}

interface SalesOrderPartner {
  PartnerFunction: string;
  Customer: string;
  Supplier: string;
  Personnel: string;
  BusinessPartnerName1?: string;
  BusinessPartnerName2?: string;
  CityName?: string;
  Country?: string;
  StreetName?: string;
  HouseNumber?: string;
  PostalCode?: string;
  PhoneNumber?: string;
  EmailAddress?: string;
  CorrespondenceLanguage?: string;
}

interface PricingElement {
  ConditionType: string;
  PriceElementDescription: string;
  ConditionRateAmount: string | number;
  ConditionAmount: string | number;
  ConditionCurrency: string;
  ConditionQuantity: string | number;
  ConditionQuantitySAPUnit: string;
  ConditionIsForStatistics: boolean | null;
  TransactionCurrency: string;
}

interface DeliveryItem {
  DeliveryDocument: string;
  DeliveryDocumentItem: string;
  ActualDeliveryQuantity: string;
  DeliveryDate: string;
  DeliveryDocumentStatus?: string;
  ActualGoodsMovementDate?: string;
}

interface BillingItem {
  BillingDocument: string;
  BillingDocumentItem: string;
  NetAmount: string;
  TransactionCurrency: string;
  BillingDocumentDate: string;
  BillingDocumentStatus?: string;
}

interface ProductionOrderItem {
  ProductionOrder: string;
  SalesOrder: string;
  SalesOrderItem: string;
  Product?: string;
  ProductionPlant: string;
  ProductionOrderType?: string;
  OrderPlannedTotalQty?: string | number;
  ActualDeliveredQuantity?: string | number;
}

interface SalesOrder {
  SalesOrder: string;
  SalesOrderType: string;
  SoldToParty: string;
  SalesOrganization: string;
  DistributionChannel: string;
  OrganizationDivision: string;
  TotalNetAmount: string | number;
  TransactionCurrency: string;
  SalesOrderDate: string;
  OverallSDProcessStatus: string;
  OverallDeliveryStatus: string;
  OverallOrdReltdBillgStatus: string;
  PurchaseOrderByCustomer: string;
  CreatedByUser: string;
  RequestedDeliveryDate: string;
  CompleteDeliveryIsDefined: boolean;
  IncotermsClassification: string;
  IncotermsLocation1: string;
  CustomerPaymentTerms: string;
  ShippingCondition: string;
  _Item?: SalesOrderItem[];
  _Partner?: SalesOrderPartner[];
  _PricingElement?: PricingElement[];
}

// ─── Constants ───────────────────────────────────────────

const PARTNER_FUNCTION_MAP: Record<string, string> = {
  'SP': '售达方', 'SH': '送达方', 'BP': '收款方', 'PY': '付款方',
};

const ITEM_STATUS_MAP: Record<string, { label: string; color: string }> = {
  'C': { label: '已完成', color: 'success' },
  'A': { label: '未完成', color: 'warning' },
  'B': { label: '处理中', color: 'info' },
};

// ─── Helpers ─────────────────────────────────────────────

function num(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

function fmtAmount(amount: string | number | undefined | null, currency?: string): string {
  const n = num(amount);
  if (n === 0 && !amount) return '-';
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (currency ? ' ' + currency : '');
}

function deliveryStatusSummary(items: SalesOrderItem[]): { delivered: number; total: number; pct: number } {
  let delivered = 0;
  let total = 0;
  for (const item of items) {
    total += num(item.RequestedQuantity);
    delivered += num(item.ConfdDelivQtyInOrderQtyUnit);
  }
  return { delivered, total, pct: total > 0 ? Math.round((delivered / total) * 100) : 0 };
}

// ─── Page Component ──────────────────────────────────────

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [materialNames, setMaterialNames] = useState<Record<string, string>>({});
  const [deliveryByItem, setDeliveryByItem] = useState<Record<string, DeliveryItem[]>>({});
  const [billingByItem, setBillingByItem] = useState<Record<string, BillingItem[]>>({});
  const [productionByItem, setProductionByItem] = useState<Record<string, ProductionOrderItem[]>>({});
  const [selectedItem, setSelectedItem] = useState<SalesOrderItem | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use V4 API for richer data
        const searchParams = new URLSearchParams();
        searchParams.set('id', id);
        searchParams.set('expand', '_Item,_Partner,_PricingElement');

        const response = await fetch(`/api/sap/CE_SALESORDER_0001/SalesOrder?${searchParams.toString()}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        const orderData: SalesOrder = results[0] || null;
        setOrder(orderData);

        if (!orderData) throw new Error('Order not found');

        // Fetch customer name
        if (orderData.SoldToParty) {
          try {
            const cRes = await fetch(`/api/sap/API_BUSINESS_PARTNER/A_Customer?filter=${encodeURIComponent(`Customer eq '${orderData.SoldToParty}'`)}&top=1`);
            const cData = await cRes.json();
            if (cData.success && cData.data?.length > 0) {
              setCustomerName(cData.data[0].CustomerName || cData.data[0].CustomerFullName || '');
            }
          } catch { /* non-critical */ }
        }

        // Fetch material names
        const items = orderData._Item || [];
        if (items.length > 0) {
          try {
            const pRes = await fetch('/api/sap/API_PRODUCT_SRV/A_Product?top=200');
            const pJson = await pRes.json();
            const products = (pJson.data || []) as { Product: string; ProductDescription: string }[];
            const nameMap: Record<string, string> = {};
            for (const item of items) {
              const p = products.find(x => x.Product === item.Product);
              if (p) nameMap[item.Product] = p.ProductDescription;
            }
            setMaterialNames(nameMap);
          } catch { /* ignore */ }
        }

        // Fetch related documents
        try {
          const relRes = await fetch(`/api/sap/sales-order/${id}/related`);
          const relJson = await relRes.json();
          if (relJson.success && relJson.data) {
            setDeliveryByItem(relJson.data.deliveryByItem || {});
            setBillingByItem(relJson.data.billingByItem || {});
            setProductionByItem(relJson.data.productionByItem || {});
          }
        } catch { /* ignore */ }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  // ─── Loading ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24 rounded mb-2" />
        <div className="fiori-objheader">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div><Skeleton className="h-6 w-[180px] mb-1" /><Skeleton className="h-4 w-[240px]" /></div>
          </div>
          <div className="fiori-objheader-fields">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="fiori-objheader-field">
                <Skeleton className="h-3 w-[60px] mb-1" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-[200px] rounded-lg" />
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────

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

  // ─── Computed ──────────────────────────────────────────

  const items = order._Item || [];
  const partners = order._Partner || [];
  const pricingElements = order._PricingElement || [];
  const processStatus = SALES_ORDER_STATUS_MAP[order.OverallSDProcessStatus || '']?.label || order.OverallSDProcessStatus || '-';
  const ds = deliveryStatusSummary(items);

  // Pricing summary (non-statistical)
  const realPricing = pricingElements.filter(p => !p.ConditionIsForStatistics);
  const netPricing = realPricing.find(p => p.ConditionType === '' && p.PriceElementDescription === 'Net Amount');
  const taxPricing = realPricing.find(p => p.ConditionType === '' && p.PriceElementDescription === 'Tax Amount');
  const grossPricing = realPricing.find(p => p.ConditionType === '' && p.PriceElementDescription === 'Gross Amount');

  const headerFields = [
    { label: '订单类型', value: order.SalesOrderType || '-' },
    { label: '客户编号', value: order.SoldToParty || '-' },
    { label: '客户名称', value: customerName || '-' },
    { label: '客户采购单号', value: order.PurchaseOrderByCustomer || '-' },
    { label: '销售组织', value: order.SalesOrganization || '-' },
    { label: '分销渠道', value: order.DistributionChannel || '-' },
    { label: '产品组', value: order.OrganizationDivision || '-' },
    { label: '订单日期', value: formatSapDate(order.SalesOrderDate) },
    { label: '请求交货日期', value: formatSapDate(order.RequestedDeliveryDate) },
    { label: '国际贸易条款', value: order.IncotermsClassification ? `${order.IncotermsClassification} ${order.IncotermsLocation1 || ''}` : '-' },
    { label: '付款条款', value: order.CustomerPaymentTerms || '-' },
    { label: '创建人', value: order.CreatedByUser || '-' },
  ];

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/sales-orders')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>

      {/* ── ObjectHeader ── */}
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

        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={getSapStatusColor(order.OverallSDProcessStatus)}>
            处理状态: {processStatus}
          </FioriBadge>
          {order.OverallDeliveryStatus && (
            <FioriBadge variant={getSapStatusColor(order.OverallDeliveryStatus)}>
              交货: {order.OverallDeliveryStatus === 'C' ? '已完成' : order.OverallDeliveryStatus}
            </FioriBadge>
          )}
        </div>

        <div className="fiori-objheader-fields">
          {headerFields.map((field) => (
            <div key={field.label} className="fiori-objheader-field">
              <span className="fiori-objheader-field-label">{field.label}</span>
              <span className="fiori-objheader-field-value">{field.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>订单金额</span>
          </div>
          <div className="text-xl font-bold tabular-nums">{fmtAmount(order.TotalNetAmount, order.TransactionCurrency)}</div>
          {netPricing && <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>净额 {fmtAmount(netPricing.ConditionAmount, netPricing.TransactionCurrency)}</div>}
        </div>
        <div className="rounded-lg border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Hash className="w-4 h-4" style={{ color: '#107E3E' }} />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>行项目</span>
          </div>
          <div className="text-xl font-bold tabular-nums">{items.length}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>已完成 {items.filter(i => i.SDProcessStatus === 'C').length} 项</div>
        </div>
        <div className="rounded-lg border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-4 h-4" style={{ color: '#E9730C' }} />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>交货进度</span>
          </div>
          <div className="text-xl font-bold tabular-nums">{ds.pct}%</div>
          <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{ds.delivered} / {ds.total} 已交货</div>
        </div>
        <div className="rounded-lg border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4" style={{ color: '#0A6ED1' }} />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>开票状态</span>
          </div>
          <div className="text-xl font-bold">
            {order.OverallOrdReltdBillgStatus === 'C' ? (
              <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-5 h-5" />已完成</span>
            ) : order.OverallOrdReltdBillgStatus ? (
              <span className="text-amber-600 flex items-center gap-1"><Clock className="w-5 h-5" />{order.OverallOrdReltdBillgStatus}</span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1"><AlertCircle className="w-5 h-5" />未开票</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Pricing Elements ── */}
      {realPricing.length > 0 && (
        <div className="rounded-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <DollarSign className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <span className="font-semibold text-sm">定价明细</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--muted)' }}>
                  <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>步骤</th>
                  <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>条件类型</th>
                  <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>描述</th>
                  <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>费率</th>
                  <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>金额</th>
                  <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>货币</th>
                </tr>
              </thead>
              <tbody>
                {realPricing.map((p, idx) => (
                  <tr key={idx} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-2 tabular-nums">{pricingElements.indexOf(p) + 1}</td>
                    <td className="px-4 py-2 font-medium" style={{ color: p.ConditionType ? 'var(--primary)' : 'var(--muted-foreground)' }}>{p.ConditionType || '-'}</td>
                    <td className="px-4 py-2">{p.PriceElementDescription || '-'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{num(p.ConditionRateAmount) > 0 ? fmtAmount(p.ConditionRateAmount) : '-'}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmtAmount(p.ConditionAmount, p.TransactionCurrency)}</td>
                    <td className="px-4 py-2 text-right">{p.TransactionCurrency || p.ConditionCurrency || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--border)' }}>
                  <td colSpan={4} className="px-4 py-2 text-right">合计净额</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtAmount(netPricing?.ConditionAmount, netPricing?.TransactionCurrency)}</td>
                  <td className="px-4 py-2"></td>
                </tr>
                {taxPricing && (
                  <tr className="font-semibold">
                    <td colSpan={4} className="px-4 py-2 text-right">税额</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtAmount(taxPricing.ConditionAmount, taxPricing.TransactionCurrency)}</td>
                    <td className="px-4 py-2"></td>
                  </tr>
                )}
                <tr className="border-t-2 font-bold text-base" style={{ borderColor: 'var(--border)' }}>
                  <td colSpan={4} className="px-4 py-2 text-right">总计</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtAmount(grossPricing?.ConditionAmount || order.TotalNetAmount, order.TransactionCurrency)}</td>
                  <td className="px-4 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Line Items ── */}
      <div className="rounded-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <Package className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span className="font-semibold text-sm">行项目 ({items.length})</span>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-6" style={{ color: 'var(--muted-foreground)' }}>
            <p className="text-sm">暂无行项目数据</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--muted)' }}>
                    <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>行号</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>产品</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>描述</th>
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>订单数量</th>
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>已确认</th>
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>已交货</th>
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>净额</th>
                    <th className="text-center px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>状态</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const deliveries = deliveryByItem[item.SalesOrderItem] || [];
                    const billings = billingByItem[item.SalesOrderItem] || [];
                    const deliveredQty = deliveries.reduce((sum, d) => sum + num(d.ActualDeliveryQuantity), 0);
                    const itemStatus = ITEM_STATUS_MAP[item.DeliveryStatus || item.SDProcessStatus || ''];

                    return (
                      <tr key={item.SalesOrderItem} className="border-t cursor-pointer hover:bg-muted/50 transition-colors" style={{ borderColor: 'var(--border)' }} onClick={() => setSelectedItem(item)}>
                        <td className="px-4 py-3 tabular-nums font-medium">{item.SalesOrderItem}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--primary)' }}>
                          {item.Product}{materialNames[item.Product] ? ` (${materialNames[item.Product]})` : ''}
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate">{item.SalesOrderItemText || '-'}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{num(item.RequestedQuantity)} {item.OrderQuantitySAPUnit}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {num(item.ConfdDelivQtyInOrderQtyUnit) > 0 ? (
                            <span>{num(item.ConfdDelivQtyInOrderQtyUnit)} {item.OrderQuantitySAPUnit}</span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {deliveredQty > 0 ? (
                            <span className="text-green-600 font-medium">{deliveredQty} {item.OrderQuantitySAPUnit}</span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtAmount(item.NetAmount, item.TransactionCurrency)}</td>
                        <td className="px-4 py-3 text-center">
                          {itemStatus && (
                            <FioriBadge variant={itemStatus.color as 'success' | 'warning' | 'info' | 'error' | 'neutral'}>
                              {itemStatus.label}
                            </FioriBadge>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <ChevronRight className="w-4 h-4 inline text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {items.map((item) => {
                const deliveries = deliveryByItem[item.SalesOrderItem] || [];
                const deliveredQty = deliveries.reduce((sum, d) => sum + num(d.ActualDeliveryQuantity), 0);
                const itemStatus = ITEM_STATUS_MAP[item.DeliveryStatus || item.SDProcessStatus || ''];
                const progressPct = num(item.RequestedQuantity) > 0
                  ? Math.round((deliveredQty / num(item.RequestedQuantity)) * 100)
                  : 0;

                return (
                  <div key={item.SalesOrderItem} className="px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedItem(item)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm" style={{ color: 'var(--primary)' }}>
                        {item.Product}{materialNames[item.Product] ? ` (${materialNames[item.Product]})` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        {itemStatus && <FioriBadge variant={itemStatus.color as 'success' | 'warning' | 'info' | 'error' | 'neutral'}>{itemStatus.label}</FioriBadge>}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="text-sm mb-2">{item.SalesOrderItemText || '-'}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      <div>行号: <span className="font-medium tabular-nums" style={{ color: 'var(--foreground)' }}>{item.SalesOrderItem}</span></div>
                      <div>工厂: <span className="font-medium" style={{ color: 'var(--foreground)' }}>{item.Plant || '-'}</span></div>
                      <div>订单数量: <span className="font-medium tabular-nums" style={{ color: 'var(--foreground)' }}>{num(item.RequestedQuantity)} {item.OrderQuantitySAPUnit}</span></div>
                      <div>已确认: <span className="font-medium tabular-nums" style={{ color: 'var(--foreground)' }}>{num(item.ConfdDelivQtyInOrderQtyUnit)} {item.OrderQuantitySAPUnit}</span></div>
                    </div>
                    {/* Progress bar */}
                    {num(item.RequestedQuantity) > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1"><Truck className="w-3 h-3" />已交货 {deliveredQty}/{num(item.RequestedQuantity)}</span>
                          <span className="tabular-nums font-medium" style={{ color: progressPct >= 100 ? '#107E3E' : 'var(--primary)' }}>{progressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--muted)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(progressPct, 100)}%`,
                              background: progressPct >= 100 ? '#107E3E' : 'var(--primary)',
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                        {fmtAmount(item.NetAmount, item.TransactionCurrency)}
                      </span>
                      {item.ConfirmedDeliveryDate && (
                        <span style={{ color: 'var(--muted-foreground)' }}>
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {formatSapDate(item.ConfirmedDeliveryDate)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Partner Information ── */}
      {partners.length > 0 && (
        <div className="rounded-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <Users className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <span className="font-semibold text-sm">业务伙伴</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {partners.map((partner, idx) => {
              const hasAddress = partner.CityName || partner.StreetName || partner.Country;
              return (
                <div key={idx} className="px-4 py-3 border-b md:border-r last:border-r-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                      {PARTNER_FUNCTION_MAP[partner.PartnerFunction] || partner.PartnerFunction}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                      {partner.PartnerFunction}
                    </span>
                  </div>
                  <div className="text-sm font-medium mb-1">
                    {partner.BusinessPartnerName1 || partner.Customer || partner.Supplier || partner.Personnel || '-'}
                  </div>
                  {partner.BusinessPartnerName2 && (
                    <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{partner.BusinessPartnerName2}</div>
                  )}
                  {hasAddress && (
                    <div className="mt-2 text-xs space-y-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      {partner.StreetName && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{[partner.StreetName, partner.HouseNumber].filter(Boolean).join(' ')}</span>
                        </div>
                      )}
                      {(partner.CityName || partner.PostalCode || partner.Country) && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>{[partner.PostalCode, partner.CityName, partner.Country].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                      {partner.PhoneNumber && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{partner.PhoneNumber}</span>
                        </div>
                      )}
                      {partner.EmailAddress && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{partner.EmailAddress}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Document Flow Timeline ── */}
      {items.length > 0 && (
        <div className="rounded-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <GitBranch className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <span className="font-semibold text-sm">单据流</span>
          </div>
          <div className="p-4">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5" style={{ background: 'var(--border)' }} />
              <div className="space-y-4">
                {/* Sales Order Node */}
                <div className="flex items-start gap-3 relative">
                  <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(0,112,242,0.1)', border: '2px solid var(--primary)' }}>
                    <FileText className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">销售订单 {order.SalesOrder}</div>
                    <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {fmtAmount(order.TotalNetAmount, order.TransactionCurrency)} · {formatSapDate(order.SalesOrderDate)}
                    </div>
                  </div>
                </div>

                {/* Delivery Nodes */}
                {(() => {
                  const allDeliveries = Object.values(deliveryByItem).flat();
                  const uniqueDeliveries = Array.from(new Map(allDeliveries.map(d => [d.DeliveryDocument, d])).values());
                  return uniqueDeliveries.map((d) => (
                    <div key={d.DeliveryDocument} className="flex items-start gap-3 relative">
                      <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(16,126,62,0.1)', border: '2px solid #107E3E' }}>
                        <Truck className="w-5 h-5" style={{ color: '#107E3E' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">
                          <span
                            className="cursor-pointer hover:underline"
                            style={{ color: '#107E3E' }}
                            onClick={() => router.push(`/outbound-delivery/${d.DeliveryDocument}`)}
                          >
                            交货单 {d.DeliveryDocument}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          数量: {d.ActualDeliveryQuantity ?? '-'} · {formatSapDate(d.DeliveryDate)}
                        </div>
                      </div>
                    </div>
                  ));
                })()}

                {/* Billing Nodes */}
                {(() => {
                  const allBillings = Object.values(billingByItem).flat();
                  const uniqueBillings = Array.from(new Map(allBillings.map(b => [b.BillingDocument, b])).values());
                  return uniqueBillings.map((b) => (
                    <div key={b.BillingDocument} className="flex items-start gap-3 relative">
                      <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(10,110,209,0.1)', border: '2px solid #0A6ED1' }}>
                        <Receipt className="w-5 h-5" style={{ color: '#0A6ED1' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">
                          <span
                            className="cursor-pointer hover:underline"
                            style={{ color: '#0A6ED1' }}
                            onClick={() => router.push(`/billing-documents/${b.BillingDocument}`)}
                          >
                            开票单据 {b.BillingDocument}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          金额: {fmtAmount(b.NetAmount, b.TransactionCurrency)} · {formatSapDate(b.BillingDocumentDate)}
                        </div>
                      </div>
                    </div>
                  ));
                })()}

                {/* Production Order Nodes */}
                {(() => {
                  const allProds = Object.values(productionByItem).flat();
                  const uniqueProds = Array.from(new Map(allProds.map(p => [p.ProductionOrder, p])).values());
                  return uniqueProds.map((p) => (
                    <div key={p.ProductionOrder} className="flex items-start gap-3 relative">
                      <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(233,115,12,0.1)', border: '2px solid #E9730C' }}>
                        <Factory className="w-5 h-5" style={{ color: '#E9730C' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">
                          <span
                            className="cursor-pointer hover:underline"
                            style={{ color: '#E9730C' }}
                            onClick={() => router.push(`/production-orders/${p.ProductionOrder}`)}
                          >
                            生产订单 {p.ProductionOrder}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          计划: {num(p.OrderPlannedTotalQty) || '-'} · 产出: {num(p.ActualDeliveredQuantity) || '-'}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Item Detail Dialog ── */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              行项目详情 - {selectedItem?.SalesOrderItem}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 mt-2">
              {/* Item Basic Info */}
              <div className="rounded-lg border p-4" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
                <div className="font-medium mb-1">{selectedItem.Product}{materialNames[selectedItem.Product] ? ` (${materialNames[selectedItem.Product]})` : ''}</div>
                <div className="text-sm mb-3">{selectedItem.SalesOrderItemText || '-'}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div>订单数量: <span className="font-medium tabular-nums">{num(selectedItem.RequestedQuantity)} {selectedItem.OrderQuantitySAPUnit}</span></div>
                  <div>已确认数量: <span className="font-medium tabular-nums">{num(selectedItem.ConfdDelivQtyInOrderQtyUnit)} {selectedItem.OrderQuantitySAPUnit}</span></div>
                  <div>净额: <span className="font-medium tabular-nums">{fmtAmount(selectedItem.NetAmount, selectedItem.TransactionCurrency)}</span></div>
                  <div>税额: <span className="font-medium tabular-nums">{fmtAmount(selectedItem.TaxAmount, selectedItem.TransactionCurrency)}</span></div>
                  <div>工厂: <span className="font-medium">{selectedItem.Plant || '-'}</span></div>
                  <div>发货点: <span className="font-medium">{selectedItem.ShippingPoint || '-'}</span></div>
                  <div>利润中心: <span className="font-medium">{selectedItem.ProfitCenter || '-'}</span></div>
                  <div>库存地点: <span className="font-medium">{selectedItem.StorageLocation || '-'}</span></div>
                  <div>请求交货日期: <span className="font-medium">{formatSapDate(selectedItem.RequestedDeliveryDate)}</span></div>
                  <div>确认交货日期: <span className="font-medium">{formatSapDate(selectedItem.ConfirmedDeliveryDate)}</span></div>
                </div>
              </div>

              {/* Delivery Items */}
              {(() => {
                const deliveries = deliveryByItem[selectedItem.SalesOrderItem] || [];
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm">已交货单据 ({deliveries.length})</span>
                    </div>
                    {deliveries.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">暂无交货数据</div>
                    ) : (
                      <div className="space-y-2">
                        {deliveries.map((d, idx) => (
                          <div key={idx} className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-sm font-medium cursor-pointer hover:underline"
                                  style={{ color: 'var(--primary)' }}
                                  onClick={() => { setSelectedItem(null); router.push(`/outbound-delivery/${d.DeliveryDocument}`); }}
                                >
                                  {d.DeliveryDocument} <ExternalLink className="w-3 h-3 inline" />
                                </span>
                                <span className="text-xs text-muted-foreground">行 {d.DeliveryDocumentItem}</span>
                              </div>
                              {d.DeliveryDocumentStatus && (
                                <FioriBadge variant={getSapStatusColor(d.DeliveryDocumentStatus)}>
                                  {d.DeliveryDocumentStatus}
                                </FioriBadge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>交货数量: <span className="font-medium tabular-nums">{d.ActualDeliveryQuantity ?? '-'} {selectedItem.OrderQuantitySAPUnit}</span></div>
                              <div>交货日期: <span className="font-medium tabular-nums">{formatSapDate(d.DeliveryDate)}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Billing Items */}
              {(() => {
                const billings = billingByItem[selectedItem.SalesOrderItem] || [];
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-sm">已开票单据 ({billings.length})</span>
                    </div>
                    {billings.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">暂无开票数据</div>
                    ) : (
                      <div className="space-y-2">
                        {billings.map((b, idx) => (
                          <div key={idx} className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-sm font-medium cursor-pointer hover:underline"
                                  style={{ color: 'var(--primary)' }}
                                  onClick={() => { setSelectedItem(null); router.push(`/billing-documents/${b.BillingDocument}`); }}
                                >
                                  {b.BillingDocument} <ExternalLink className="w-3 h-3 inline" />
                                </span>
                                <span className="text-xs text-muted-foreground">行 {b.BillingDocumentItem}</span>
                              </div>
                              {b.BillingDocumentStatus && (
                                <FioriBadge variant={getSapStatusColor(b.BillingDocumentStatus)}>
                                  {b.BillingDocumentStatus}
                                </FioriBadge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>净额: <span className="font-medium tabular-nums text-blue-600">{fmtAmount(b.NetAmount, b.TransactionCurrency)}</span></div>
                              <div>开票日期: <span className="font-medium tabular-nums">{formatSapDate(b.BillingDocumentDate)}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Production Orders */}
              {(() => {
                const prods = productionByItem[selectedItem.SalesOrderItem] || [];
                if (selectedItem.SalesOrderItemCategory === 'TAN') return null;
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Factory className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-sm">生产订单 ({prods.length})</span>
                    </div>
                    {prods.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">暂无生产订单</div>
                    ) : (
                      <div className="space-y-2">
                        {prods.map((p, idx) => (
                          <div key={idx} className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-sm font-medium cursor-pointer hover:underline"
                                  style={{ color: 'var(--primary)' }}
                                  onClick={() => { setSelectedItem(null); router.push(`/production-orders/${p.ProductionOrder}`); }}
                                >
                                  {p.ProductionOrder} <ExternalLink className="w-3 h-3 inline" />
                                </span>
                                <span className="text-xs text-muted-foreground">{p.ProductionOrderType || '-'}</span>
                              </div>
                              <FioriBadge variant="neutral">{p.ProductionOrderType || '-'}</FioriBadge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>计划数量: <span className="font-medium tabular-nums">{num(p.OrderPlannedTotalQty) || '-'}</span></div>
                              <div>实际产出: <span className="font-medium tabular-nums">{num(p.ActualDeliveredQuantity) || '-'}</span></div>
                              <div>工厂: <span className="font-medium">{p.ProductionPlant || '-'}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
