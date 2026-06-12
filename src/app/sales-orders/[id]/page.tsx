'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FioriBadge, FioriErrorState, getSapStatusColor } from '@/components/fiori';
import { ArrowLeft, FileText, Package, Truck, Receipt, ChevronRight, ExternalLink, Factory } from 'lucide-react';
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
  SpecialStockIndicator?: string;
}

interface SalesOrderPartner {
  PartnerFunction: string;
  Customer: string;
}

interface DeliveryItem {
  DeliveryDocument: string;
  DeliveryDocumentItem: string;
  ActualDeliveryQuantity: string;
  DeliveryDate: string;
  DeliveryDocumentStatus: string;
}

interface BillingItem {
  BillingDocument: string;
  BillingDocumentItem: string;
  NetAmount: string;
  TransactionCurrency: string;
  BillingDocumentDate: string;
  BillingDocumentStatus: string;
}

interface ProductionOrderItem {
  ProductionOrder: string;
  SalesOrder: string;
  SalesOrderItem: string;
  Product?: string;
  MaterialName?: string;
  ProductionPlant: string;
  ProductionOrderType?: string;
  ProductionOrderStatus?: string;
  OrderPlannedTotalQty?: string | number;
  ActualDeliveredQuantity?: string | number;
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
  const [deliveryByItem, setDeliveryByItem] = useState<Record<string, unknown[]>>({});
  const [billingByItem, setBillingByItem] = useState<Record<string, unknown[]>>({});
  const [productionByItem, setProductionByItem] = useState<Record<string, unknown[]>>({});
  const [selectedItem, setSelectedItem] = useState<SalesOrderItem | null>(null);

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
        // Fetch delivery and billing items for this sales order
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
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>订单数量</th>
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>已交货</th>
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>已开票金额</th>
                    <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>净额</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const deliveries = (deliveryByItem[item.SalesOrderItem] || []) as Array<Record<string, unknown>>;
                    const billings = (billingByItem[item.SalesOrderItem] || []) as Array<Record<string, unknown>>;
                    const deliveredQty = deliveries.reduce((sum, d) => sum + (parseFloat(String(d.ActualDeliveryQuantity || '0')) || 0), 0);
                    const billedAmt = billings.reduce((sum, b) => sum + (parseFloat(String(b.NetAmount || '0')) || 0), 0);
                    return (
                    <tr key={item.SalesOrderItem} className="border-t cursor-pointer hover:bg-muted/50 transition-colors" style={{ borderColor: 'var(--border)' }} onClick={() => setSelectedItem(item)}>
                      <td className="px-4 py-3 tabular-nums">{item.SalesOrderItem}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--primary)' }}>{item.Material}{materialNames[item.Material] ? ` (${materialNames[item.Material]})` : ''}</td>
                      <td className="px-4 py-3">{item.SalesOrderItemText || '-'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.RequestedQuantity ?? '-'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {deliveredQty > 0 ? (
                          <span className="text-green-600 font-medium">{deliveredQty} {item.RequestedQuantityUnit}</span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {billedAmt > 0 ? (
                          <span className="text-blue-600 font-medium">{formatAmount(billedAmt, item.TransactionCurrency)}</span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatAmount(item.NetAmount, item.TransactionCurrency)}</td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="w-4 h-4 inline text-muted-foreground" />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="lg:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {items.map((item) => {
                const deliveries = (deliveryByItem[item.SalesOrderItem] || []) as Array<Record<string, unknown>>;
                const billings = (billingByItem[item.SalesOrderItem] || []) as Array<Record<string, unknown>>;
                const deliveredQty = deliveries.reduce((sum, d) => sum + (parseFloat(String(d.ActualDeliveryQuantity || '0')) || 0), 0);
                const billedAmt = billings.reduce((sum, b) => sum + (parseFloat(String(b.NetAmount || '0')) || 0), 0);
                return (
                <div key={item.SalesOrderItem} className="px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedItem(item)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm" style={{ color: 'var(--primary)' }}>
                      {item.Material}{materialNames[item.Material] ? ` (${materialNames[item.Material]})` : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                        行 {item.SalesOrderItem}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="text-sm mb-1">{item.SalesOrderItemText || '-'}</div>
                  <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>
                    <span>订单: {item.RequestedQuantity ?? '-'} {item.RequestedQuantityUnit || ''}</span>
                    {deliveredQty > 0 && (
                      <span className="text-green-600">已交货: {deliveredQty}</span>
                    )}
                  </div>
                  {deliveredQty > 0 || billedAmt > 0 ? (
                    <div className="flex items-center justify-between text-xs mb-1">
                      {deliveredQty > 0 && (
                        <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{deliveredQty} {item.RequestedQuantityUnit}</span>
                      )}
                      {billedAmt > 0 && (
                        <span className="flex items-center gap-1 text-blue-600"><Receipt className="w-3 h-3" />{formatAmount(billedAmt, item.TransactionCurrency)}</span>
                      )}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-end text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
                      {formatAmount(item.NetAmount, item.TransactionCurrency)}
                    </span>
                  </div>
                </div>
              );
              })}
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

      {/* Item Details Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                <div className="font-medium mb-2">{selectedItem.Material}{materialNames[selectedItem.Material] ? ` (${materialNames[selectedItem.Material]})` : ''}</div>
                <div className="text-sm mb-2">{selectedItem.SalesOrderItemText || '-'}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>订单数量: <span className="font-medium tabular-nums">{selectedItem.RequestedQuantity ?? '-'} {selectedItem.RequestedQuantityUnit}</span></div>
                  <div>净额: <span className="font-medium tabular-nums">{formatAmount(selectedItem.NetAmount, selectedItem.TransactionCurrency)}</span></div>
                </div>
              </div>

              {/* Delivery Items */}
              {(() => {
                const deliveries = (deliveryByItem[selectedItem.SalesOrderItem] || []) as DeliveryItem[];
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
                                  onClick={() => {
                                    setSelectedItem(null);
                                    router.push(`/outbound-delivery/${d.DeliveryDocument}`);
                                  }}
                                >
                                  {d.DeliveryDocument} <ExternalLink className="w-3 h-3 inline" />
                                </span>
                                <span className="text-xs text-muted-foreground">行 {d.DeliveryDocumentItem}</span>
                              </div>
                              <FioriBadge variant={getSapStatusColor(d.DeliveryDocumentStatus)}>
                                {d.DeliveryDocumentStatus || '-'}
                              </FioriBadge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>交货数量: <span className="font-medium tabular-nums">{d.ActualDeliveryQuantity ?? '-'} {selectedItem.RequestedQuantityUnit}</span></div>
                              <div>交货日期: <span className="font-medium tabular-nums">{formatSapDate(d.DeliveryDate as string)}</span></div>
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
                const billings = (billingByItem[selectedItem.SalesOrderItem] || []) as BillingItem[];
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
                                  onClick={() => {
                                    setSelectedItem(null);
                                    router.push(`/billing-documents/${b.BillingDocument}`);
                                  }}
                                >
                                  {b.BillingDocument} <ExternalLink className="w-3 h-3 inline" />
                                </span>
                                <span className="text-xs text-muted-foreground">行 {b.BillingDocumentItem}</span>
                              </div>
                              <FioriBadge variant={getSapStatusColor(b.BillingDocumentStatus)}>
                                {b.BillingDocumentStatus || '-'}
                              </FioriBadge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>净额: <span className="font-medium tabular-nums text-blue-600">{formatAmount(b.NetAmount, b.TransactionCurrency as string)}</span></div>
                              <div>开票日期: <span className="font-medium tabular-nums">{formatSapDate(b.BillingDocumentDate as string)}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* Production Orders - show when ItemCategory != 'TAN' AND SpecialStockIndicator == 'E' */}
              {(() => {
                const prods = (productionByItem[selectedItem.SalesOrderItem] || []) as ProductionOrderItem[];
                if (selectedItem.SalesOrderItemCategory !== 'TAN') {
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
                                    onClick={() => {
                                      setSelectedItem(null);
                                      router.push(`/production-orders/${p.ProductionOrder}`);
                                    }}
                                  >
                                    {p.ProductionOrder} <ExternalLink className="w-3 h-3 inline" />
                                  </span>
                                  <span className="text-xs text-muted-foreground">{p.ProductionOrderType || '-'}</span>
                                </div>
                                <FioriBadge variant="neutral">
                                  {p.ProductionOrderType || '-'}
                                </FioriBadge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>产品: <span className="font-medium tabular-nums">{p.Product || '-'}</span></div>
                                <div>工厂: <span className="font-medium tabular-nums">{p.ProductionPlant || '-'}</span></div>
                                <div>计划数量: <span className="font-medium tabular-nums">{p.OrderPlannedTotalQty ?? '-'}</span></div>
                                <div>实际产出: <span className="font-medium tabular-nums">{p.ActualDeliveredQuantity ?? '-'}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
