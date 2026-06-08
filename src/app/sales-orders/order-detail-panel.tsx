'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SALES_ORDER_STATUS_MAP } from '@/lib/sap-service';
import { SalesOrderStatusBadge } from '@/app/sales-orders/sales-order-status-badge';
import { SalesOrderStatusSalesGuide } from '@/app/sales-orders/sales-order-status-sales-guide';
import { SalesOrderBillingReconcilePanel } from '@/app/sales-orders/sales-order-billing-reconcile';
import { SalesOrderCancellationPanel } from '@/app/sales-orders/sales-order-cancellation-panel';
import { resolveRejectionStatus } from '@/lib/sap-sales-order-cancellation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { fetchSapEntity, fetchSapEntityOptional, logQueryAudit, odataEscape, parseSapDate } from '@/lib/sap-api-client';
import { SAP_NO_PERMISSION_MESSAGE } from '@/lib/sap-errors';
import { Loader2 } from 'lucide-react';
import { SalesOrderRiskBanner } from '@/app/sales-orders/sales-order-risk-badges';
import { SalesOrderLineProgressTable } from '@/app/sales-orders/sales-order-line-progress';
import { normalizeSalesOrderItemNo } from '@/lib/sap-sales-order-line-fulfillment';
import {
  SALES_ORDER_HEADER_SELECT,
  withBillingStatusNormalized,
} from '@/lib/sap-sales-order-v4-fields';

export interface SalesOrderHeader {
  SalesOrder: string;
  SalesOrderType?: string;
  SoldToParty?: string;
  PurchaseOrderByCustomer?: string;
  TotalNetAmount?: string | number;
  TransactionCurrency?: string;
  SalesOrderDate?: string;
  RequestedDeliveryDate?: string;
  OverallSDProcessStatus?: string;
  OverallDeliveryStatus?: string;
  OverallBillingStatus?: string;
  OverallSDDocumentRejectionSts?: string;
  _Item?: { value?: SalesOrderItem[] } | SalesOrderItem[];
  _Partner?: { value?: SalesOrderPartner[] } | SalesOrderPartner[];
}

export interface SalesOrderItem {
  SalesOrder: string;
  SalesOrderItem: string;
  Product?: string;
  SalesOrderItemText?: string;
  RequestedQuantity?: string | number;
  RequestedQuantityUnit?: string;
  RequestedQuantitySAPUnit?: string;
  NetAmount?: string | number;
  TaxAmount?: string | number;
  Plant?: string;
  StorageLocation?: string;
  SDProcessStatus?: string;
  DeliveryStatus?: string;
  SDDocumentRejectionStatus?: string;
}

interface SalesOrderPartner {
  PartnerFunction?: string;
  Customer?: string;
  BusinessPartnerName1?: string;
}

interface DeliveryItemRow {
  DeliveryDocument: string;
  DeliveryDocumentItem: string;
  ReferenceSDDocument?: string;
  ReferenceSDDocumentItem?: string;
  Material?: string;
  DeliveryDocumentItemText?: string;
  ActualDeliveryQuantity?: string | number;
  DeliveryQuantityUnit?: string;
  deliveryDate?: string;
}

interface MaterialDocRow {
  MaterialDocument: string;
  MaterialDocumentYear: string;
  MaterialDocumentItem: string;
  Material?: string;
  QuantityInEntryUnit?: string | number;
  EntryUnit?: string;
  GoodsMovementType?: string;
  PostingDate?: string;
  Delivery?: string;
  SalesOrder?: string;
  SDDocument?: string;
}

interface BillingItemRow {
  BillingDocument: string;
  BillingDocumentItem: string;
  ReferenceSDDocument?: string;
  ReferenceSDDocumentItem?: string;
  Material?: string;
  BillingDocumentItemText?: string;
  BillingQuantity?: string | number;
  BillingQuantityUnit?: string;
  NetAmount?: string | number;
  TaxAmount?: string | number;
  TransactionCurrency?: string;
  BillingDocumentDate?: string;
}

type FulfillmentSection = 'header' | 'lines' | 'line-progress' | 'delivery' | 'posting' | 'billing';

interface SectionState {
  loading: boolean;
  error: string | null;
}

const EMPTY_DELIVERY = '暂无发货记录';
const EMPTY_POSTING = '暂无过账记录';
const EMPTY_BILLING = '暂无开票记录';
const EMPTY_LINES = '暂无行项目';

function unwrapCollection<T>(nested: { value?: T[] } | T[] | undefined): T[] {
  if (!nested) return [];
  if (Array.isArray(nested)) return nested;
  if (nested.value && Array.isArray(nested.value)) return nested.value;
  return [];
}

function unitNetPrice(item: SalesOrderItem): string {
  const qty = Number(item.RequestedQuantity);
  const net = Number(item.NetAmount);
  if (!qty || !net) return '-';
  return (net / qty).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

async function auditDetailSection(
  orderNo: string,
  section: FulfillmentSection,
  count: number,
  success: boolean,
  error?: string
): Promise<void> {
  await logQueryAudit({
    module: 'sales-orders-detail',
    action: 'section',
    conditions: { orderNo, section },
    resultCount: count,
    success,
    error: error ?? null,
  });
}

function SectionFrame({
  sectionState,
  empty,
  hasRows,
  children,
}: {
  sectionState: SectionState;
  empty: string;
  hasRows: boolean;
  children: ReactNode;
}) {
  if (sectionState.loading) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sectionState.error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {sectionState.error}
        </div>
      )}
      {!sectionState.loading && !hasRows && !sectionState.error ? (
        <p className="text-sm text-slate-400 py-6 text-center">{empty}</p>
      ) : (
        children
      )}
    </div>
  );
}

interface OrderDetailPanelProps {
  salesOrderNo: string | null;
  customerName?: string;
}

export function OrderDetailPanel({ salesOrderNo, customerName }: OrderDetailPanelProps) {
  const [header, setHeader] = useState<SalesOrderHeader | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryItemRow[]>([]);
  const [materialDocs, setMaterialDocs] = useState<MaterialDocRow[]>([]);
  const [billingItems, setBillingItems] = useState<BillingItemRow[]>([]);

  const [headerState, setHeaderState] = useState<SectionState>({ loading: false, error: null });
  const [deliveryState, setDeliveryState] = useState<SectionState>({ loading: false, error: null });
  const [postingState, setPostingState] = useState<SectionState>({ loading: false, error: null });
  const [billingState, setBillingState] = useState<SectionState>({ loading: false, error: null });
  const [activeTab, setActiveTab] = useState('progress');
  const [selectedLineItem, setSelectedLineItem] = useState<string | null>(null);

  const resetAll = useCallback(() => {
    setHeader(null);
    setDeliveries([]);
    setMaterialDocs([]);
    setBillingItems([]);
    setHeaderState({ loading: false, error: null });
    setDeliveryState({ loading: false, error: null });
    setPostingState({ loading: false, error: null });
    setBillingState({ loading: false, error: null });
    setActiveTab('progress');
    setSelectedLineItem(null);
  }, []);

  const loadHeader = useCallback(async (orderNo: string): Promise<boolean> => {
    setHeaderState({ loading: true, error: null });
    try {
      const orderParams = new URLSearchParams();
      orderParams.set('id', orderNo);
      orderParams.set(
        'expand',
        '_Item($select=SalesOrderItem,Product,SalesOrderItemText,RequestedQuantity,RequestedQuantitySAPUnit,NetAmount,TaxAmount,Plant,StorageLocation,SDProcessStatus,DeliveryStatus,SDDocumentRejectionStatus),_Partner'
      );
      orderParams.set('select', SALES_ORDER_HEADER_SELECT);

      const orderRes = await fetchSapEntity<SalesOrderHeader>(
        'CE_SALESORDER_0001',
        'SalesOrder',
        orderParams
      );
      const order = orderRes.data?.[0] ? withBillingStatusNormalized(orderRes.data[0]) : null;
      setHeader(order);
      const lineCount = unwrapCollection(order?._Item).length;
      await auditDetailSection(orderNo, 'header', lineCount, true);
      await auditDetailSection(orderNo, 'lines', lineCount, true);
      setHeaderState({ loading: false, error: null });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载订单头失败';
      setHeader(null);
      setHeaderState({ loading: false, error: message });
      await auditDetailSection(orderNo, 'header', 0, false, message);
      await auditDetailSection(orderNo, 'lines', 0, false, message);
      return false;
    }
  }, []);

  const enrichDeliveryDates = useCallback(async (rows: DeliveryItemRow[]) => {
    const deliveryIds = [...new Set(rows.map((d) => d.DeliveryDocument).filter(Boolean))];
    if (deliveryIds.length === 0) return rows;

    const headerFilter = deliveryIds
      .map((id) => `DeliveryDocument eq '${odataEscape(id)}'`)
      .join(' or ');
    const hdrParams = new URLSearchParams();
    hdrParams.set('top', String(Math.min(deliveryIds.length, 100)));
    hdrParams.set('filter', headerFilter);
    hdrParams.set('select', 'DeliveryDocument,ActualGoodsMovementDate,PlannedGoodsIssueDate');

    const hdrResult = await fetchSapEntityOptional<{
      DeliveryDocument: string;
      ActualGoodsMovementDate?: string;
      PlannedGoodsIssueDate?: string;
    }>('API_OUTBOUND_DELIVERY_SRV', 'A_OutbDeliveryHeader', hdrParams);

    if (hdrResult.data.length === 0) return rows;

    const dateByDoc = new Map(
      hdrResult.data.map((h) => [
        h.DeliveryDocument,
        parseSapDate(h.ActualGoodsMovementDate ?? h.PlannedGoodsIssueDate),
      ])
    );
    return rows.map((row) => ({
      ...row,
      deliveryDate: dateByDoc.get(row.DeliveryDocument) ?? row.deliveryDate ?? '-',
    }));
  }, []);

  const loadDelivery = useCallback(
    async (orderNo: string) => {
      setDeliveryState({ loading: true, error: null });
      const so = odataEscape(orderNo);
      const deliveryParams = new URLSearchParams();
      deliveryParams.set('top', '100');
      deliveryParams.set('filter', `ReferenceSDDocument eq '${so}'`);
      deliveryParams.set(
        'select',
        'DeliveryDocument,DeliveryDocumentItem,ReferenceSDDocument,ReferenceSDDocumentItem,Material,DeliveryDocumentItemText,ActualDeliveryQuantity,DeliveryQuantityUnit'
      );
      deliveryParams.set('orderby', 'DeliveryDocument desc,DeliveryDocumentItem asc');

      const deliveryResult = await fetchSapEntityOptional<DeliveryItemRow>(
        'API_OUTBOUND_DELIVERY_SRV',
        'A_OutbDeliveryItem',
        deliveryParams
      );

      if (deliveryResult.error) {
        setDeliveries([]);
        setDeliveryState({
          loading: false,
          error: `发货查询失败：${deliveryResult.error}`,
        });
        await auditDetailSection(orderNo, 'delivery', 0, false, deliveryResult.error);
        return [];
      }

      const enriched = await enrichDeliveryDates(deliveryResult.data);
      setDeliveries(enriched);
      setDeliveryState({ loading: false, error: null });
      await auditDetailSection(orderNo, 'delivery', enriched.length, true);
      return enriched;
    },
    [enrichDeliveryDates]
  );

  const loadBilling = useCallback(async (orderNo: string) => {
    setBillingState({ loading: true, error: null });
    const so = odataEscape(orderNo);
    const billingParams = new URLSearchParams();
    billingParams.set('top', '100');
    billingParams.set('filter', `ReferenceSDDocument eq '${so}'`);
    billingParams.set(
      'select',
      'BillingDocument,BillingDocumentItem,ReferenceSDDocument,ReferenceSDDocumentItem,Material,BillingDocumentItemText,BillingQuantity,BillingQuantityUnit,NetAmount,TaxAmount,TransactionCurrency'
    );
    billingParams.set('orderby', 'BillingDocument desc,BillingDocumentItem asc');

    const billingResult = await fetchSapEntityOptional<BillingItemRow>(
      'API_BILLING_DOCUMENT_SRV',
      'A_BillingDocumentItem',
      billingParams
    );

    if (billingResult.error) {
      setBillingItems([]);
      setBillingState({
        loading: false,
        error: `开票查询失败：${billingResult.error}`,
      });
      await auditDetailSection(orderNo, 'billing', 0, false, billingResult.error);
      return;
    }

    let billingRows = billingResult.data;
    if (billingRows.length > 0) {
      const billIds = [...new Set(billingRows.map((b) => b.BillingDocument))];
      const billFilter = billIds.map((id) => `BillingDocument eq '${odataEscape(id)}'`).join(' or ');
      const billHdrParams = new URLSearchParams();
      billHdrParams.set('top', String(Math.min(billIds.length, 100)));
      billHdrParams.set('filter', billFilter);
      billHdrParams.set('select', 'BillingDocument,BillingDocumentDate');

      const billHdrResult = await fetchSapEntityOptional<{
        BillingDocument: string;
        BillingDocumentDate?: string;
      }>('API_BILLING_DOCUMENT_SRV', 'A_BillingDocument', billHdrParams);

      if (billHdrResult.data.length > 0) {
        const dateByBill = new Map(
          billHdrResult.data.map((h) => [h.BillingDocument, parseSapDate(h.BillingDocumentDate)])
        );
        billingRows = billingRows.map((row) => ({
          ...row,
          BillingDocumentDate: dateByBill.get(row.BillingDocument),
        }));
      }
    }

    setBillingItems(billingRows);
    setBillingState({ loading: false, error: null });
    await auditDetailSection(orderNo, 'billing', billingRows.length, true);
  }, []);

  const loadPosting = useCallback(async (orderNo: string, deliveryRows: DeliveryItemRow[]) => {
    setPostingState({ loading: true, error: null });
    const so = odataEscape(orderNo);
    const deliveryIds = [...new Set(deliveryRows.map((d) => d.DeliveryDocument).filter(Boolean))];

    const matSelect =
      'MaterialDocument,MaterialDocumentYear,MaterialDocumentItem,Material,QuantityInEntryUnit,EntryUnit,GoodsMovementType,Delivery,SalesOrder';

    const fetchByDelivery = async (): Promise<{ data: MaterialDocRow[]; error?: string }> => {
      if (deliveryIds.length === 0) return { data: [] };
      const docFilter = deliveryIds.map((id) => `Delivery eq '${odataEscape(id)}'`).join(' or ');
      const matParams = new URLSearchParams();
      matParams.set('top', '100');
      matParams.set('filter', docFilter);
      matParams.set('select', matSelect);
      return fetchSapEntityOptional<MaterialDocRow>(
        'API_MATERIAL_DOCUMENT_SRV',
        'A_MaterialDocumentItem',
        matParams
      );
    };

    const fetchBySalesOrder = async (): Promise<{ data: MaterialDocRow[]; error?: string }> => {
      const matParams = new URLSearchParams();
      matParams.set('top', '100');
      matParams.set('filter', `SalesOrder eq '${so}'`);
      matParams.set('select', matSelect);
      return fetchSapEntityOptional<MaterialDocRow>(
        'API_MATERIAL_DOCUMENT_SRV',
        'A_MaterialDocumentItem',
        matParams
      );
    };

    const deliveryResult = await fetchByDelivery();
    let merged = deliveryResult.data;
    const errors: string[] = [];
    if (deliveryResult.error) errors.push(deliveryResult.error);

    if (merged.length === 0 || deliveryIds.length === 0) {
      const soResult = await fetchBySalesOrder();
      if (soResult.data.length > 0) {
        merged = [...merged, ...soResult.data];
      }
      if (soResult.error && merged.length === 0) errors.push(soResult.error);
    }

    const error = errors[0];

    if (merged.length === 0 && error) {
      setMaterialDocs([]);
      setPostingState({
        loading: false,
        error: `过账查询失败：${error}`,
      });
      await auditDetailSection(orderNo, 'posting', 0, false, error);
      return;
    }

    const deduped = [...merged].filter(
      (row, index, arr) =>
        arr.findIndex(
          (r) =>
            r.MaterialDocument === row.MaterialDocument &&
            r.MaterialDocumentYear === row.MaterialDocumentYear &&
            r.MaterialDocumentItem === row.MaterialDocumentItem
        ) === index
    );

    deduped.sort((a, b) => {
      const ta = Date.parse(parseSapDate(a.PostingDate) || '') || 0;
      const tb = Date.parse(parseSapDate(b.PostingDate) || '') || 0;
      return tb - ta;
    });

    setMaterialDocs(deduped);
    const partialError =
      errors.length > 0 && deduped.length > 0 ? `部分过账数据可能不完整：${errors.join('；')}` : null;
    setPostingState({ loading: false, error: partialError });
    await auditDetailSection(orderNo, 'posting', deduped.length, errors.length === 0, errors[0]);
  }, []);

  const loadFulfillmentChain = useCallback(
    async (orderNo: string) => {
      const deliveryRows = await loadDelivery(orderNo);
      await Promise.all([loadBilling(orderNo), loadPosting(orderNo, deliveryRows)]);
      await auditDetailSection(orderNo, 'line-progress', deliveryRows.length, true);
    },
    [loadDelivery, loadBilling, loadPosting]
  );

  useEffect(() => {
    if (!salesOrderNo) {
      resetAll();
      return;
    }

    let cancelled = false;

    (async () => {
      resetAll();
      const headerOk = await loadHeader(salesOrderNo);
      if (cancelled || !headerOk) return;
      await loadFulfillmentChain(salesOrderNo);
    })();

    return () => {
      cancelled = true;
    };
  }, [salesOrderNo, resetAll, loadHeader, loadFulfillmentChain]);

  if (!salesOrderNo) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
        选择订单查看履约进度与穿透（行级进度 / 发货 / 过账 / 开票）
      </div>
    );
  }

  if (headerState.loading && !header) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (headerState.error && !header) {
    const isPermission = headerState.error === SAP_NO_PERMISSION_MESSAGE;
    return (
      <div
        className={`p-4 rounded-lg text-sm ${
          isPermission
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}
      >
        {headerState.error}
      </div>
    );
  }

  const items = unwrapCollection(header?._Item);
  const partners = unwrapCollection(header?._Partner);
  const soldToPartner = partners.find((p) => p.PartnerFunction === 'SP');
  const displayCustomerName =
    customerName ||
    soldToPartner?.BusinessPartnerName1 ||
    header?.SoldToParty ||
    '-';

  const chainBusy = deliveryState.loading || postingState.loading || billingState.loading;

  const lineKey = normalizeSalesOrderItemNo(selectedLineItem ?? '');
  const lineDeliveries = deliveries.filter(
    (d) => normalizeSalesOrderItemNo(d.ReferenceSDDocumentItem) === lineKey
  );
  const lineBilling = billingItems.filter(
    (b) => normalizeSalesOrderItemNo(b.ReferenceSDDocumentItem) === lineKey
  );
  const lineDeliveryIds = new Set(lineDeliveries.map((d) => d.DeliveryDocument).filter(Boolean));
  const linePostings = materialDocs.filter((m) => m.Delivery && lineDeliveryIds.has(m.Delivery));

  return (
    <div className="space-y-3">
      {chainBusy && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          加载发货 / 过账 / 开票…
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="progress">履约进度</TabsTrigger>
          <TabsTrigger value="header">订单头</TabsTrigger>
          <TabsTrigger value="items">订单行 ({items.length})</TabsTrigger>
          <TabsTrigger value="delivery">发货 ({deliveries.length})</TabsTrigger>
          <TabsTrigger value="posting">过账 ({materialDocs.length})</TabsTrigger>
          <TabsTrigger value="billing">开票 ({billingItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-3 space-y-4">
          <SectionFrame
            sectionState={{
              loading: headerState.loading || chainBusy,
              error: null,
            }}
            empty={EMPTY_LINES}
            hasRows={items.length > 0}
          >
            <SalesOrderLineProgressTable
              items={items}
              deliveries={deliveries}
              billing={billingItems}
              header={header ?? undefined}
              selectedLineItem={selectedLineItem}
              onSelectLine={setSelectedLineItem}
            />
          </SectionFrame>

          {selectedLineItem && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 px-3 py-3 space-y-3">
              <p className="text-sm font-medium text-blue-900">
                行 {selectedLineItem} 穿透记录
                <span className="text-xs font-normal text-blue-700/80 ml-2">
                  发货 {lineDeliveries.length} 条 · 过账 {linePostings.length} 条 · 开票 {lineBilling.length} 条
                </span>
              </p>
              {lineDeliveries.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">发货</p>
                  <MiniTable
                    headers={['交货单', '行', '数量', '单位', '日期']}
                    rows={lineDeliveries.map((d) => [
                      d.DeliveryDocument,
                      d.DeliveryDocumentItem,
                      String(d.ActualDeliveryQuantity ?? '-'),
                      d.DeliveryQuantityUnit ?? '-',
                      d.deliveryDate ?? '-',
                    ])}
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500">该行暂无发货记录</p>
              )}
              {linePostings.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">过账（关联交货单）</p>
                  <MiniTable
                    headers={['物料凭证', '年度', '行', '数量', '过账日']}
                    rows={linePostings.map((m) => [
                      m.MaterialDocument,
                      m.MaterialDocumentYear,
                      m.MaterialDocumentItem,
                      String(m.QuantityInEntryUnit ?? '-'),
                      parseSapDate(m.PostingDate),
                    ])}
                  />
                </div>
              ) : null}
              {lineBilling.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">开票</p>
                  <MiniTable
                    headers={['发票', '行', '数量', '单位', '日期']}
                    rows={lineBilling.map((b) => [
                      b.BillingDocument,
                      b.BillingDocumentItem,
                      String(b.BillingQuantity ?? '-'),
                      b.BillingQuantityUnit ?? '-',
                      parseSapDate(b.BillingDocumentDate),
                    ])}
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500">该行暂无开票记录</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="text-xs text-blue-700 hover:underline"
                  onClick={() => setActiveTab('delivery')}
                >
                  查看全部发货
                </button>
                <button
                  type="button"
                  className="text-xs text-blue-700 hover:underline"
                  onClick={() => setActiveTab('posting')}
                >
                  查看全部过账
                </button>
                <button
                  type="button"
                  className="text-xs text-blue-700 hover:underline"
                  onClick={() => setActiveTab('billing')}
                >
                  查看全部开票
                </button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="header" className="mt-3 space-y-3">
          {header && <SalesOrderRiskBanner order={header} />}
          {header && (
            <SalesOrderCancellationPanel
              header={header}
              items={items.map((item) => ({
                SalesOrderItem: item.SalesOrderItem,
                Product: item.Product,
                SDDocumentRejectionStatus: item.SDDocumentRejectionStatus,
              }))}
            />
          )}
          {header && (
            <TooltipProvider delayDuration={200}>
              <SalesOrderStatusSalesGuide
                processStatus={header.OverallSDProcessStatus}
                deliveryStatus={header.OverallDeliveryStatus}
                billingStatus={header.OverallBillingStatus}
              />
            </TooltipProvider>
          )}
          <SectionFrame
            sectionState={headerState}
            empty="-"
            hasRows={Boolean(header)}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">订单号</div>
                <div className="font-mono font-medium text-blue-600">{header?.SalesOrder}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">订单类型</div>
                <div>{header?.SalesOrderType ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">客户编号</div>
                <div className="font-mono text-sm">{header?.SoldToParty ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">客户名称</div>
                <div>{displayCustomerName === header?.SoldToParty ? '-' : displayCustomerName}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">客户采购单号</div>
                <div className="font-mono text-sm text-slate-800">
                  {header?.PurchaseOrderByCustomer?.trim() || '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">系统处理状态</div>
                <div>
                  <SalesOrderStatusBadge status={header?.OverallSDProcessStatus} dimension="process" />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">交货状态</div>
                <div>
                  <SalesOrderStatusBadge status={header?.OverallDeliveryStatus} dimension="delivery" />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">开票状态</div>
                <div>
                  <SalesOrderStatusBadge status={header?.OverallBillingStatus} dimension="billing" />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">订单日期</div>
                <div>{parseSapDate(header?.SalesOrderDate)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">请求交期</div>
                <div>{parseSapDate(header?.RequestedDeliveryDate)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">总金额（净额）</div>
                <div className="font-mono tabular-nums">
                  {header?.TotalNetAmount != null
                    ? `${Number(header.TotalNetAmount).toLocaleString()} ${header.TransactionCurrency || 'CNY'}`
                    : '-'}
                </div>
              </div>
            </div>
          </SectionFrame>
        </TabsContent>

        <TabsContent value="items" className="mt-3">
          <SectionFrame sectionState={headerState} empty={EMPTY_LINES} hasRows={items.length > 0}>
            <MiniTable
              headers={[
                '行号',
                '物料',
                '描述',
                '数量',
                '单位',
                '净价',
                '税额',
                '行金额',
                '工厂',
                '库位',
                '行状态',
                '拒绝状态',
              ]}
              rows={items.map((item) => {
                const rej = item.SDDocumentRejectionStatus;
                const r = resolveRejectionStatus(rej);
                const rejLabel = rej
                  ? r.unknown
                    ? `${rej} · 未知`
                    : `${r.label} (${r.code})`
                  : '-';
                return [
                item.SalesOrderItem,
                item.Product ?? '-',
                item.SalesOrderItemText ?? '-',
                String(item.RequestedQuantity ?? '-'),
                item.RequestedQuantitySAPUnit ?? item.RequestedQuantityUnit ?? '-',
                unitNetPrice(item),
                item.TaxAmount != null ? Number(item.TaxAmount).toLocaleString() : '-',
                item.NetAmount != null ? Number(item.NetAmount).toLocaleString() : '-',
                item.Plant ?? '-',
                item.StorageLocation ?? '-',
                item.SDProcessStatus
                  ? (SALES_ORDER_STATUS_MAP[item.SDProcessStatus]?.label ?? item.SDProcessStatus)
                  : (item.DeliveryStatus ?? '-'),
                rejLabel,
              ];
              })}
            />
          </SectionFrame>
        </TabsContent>

        <TabsContent value="delivery" className="mt-3">
          <SectionFrame
            sectionState={deliveryState}
            empty={EMPTY_DELIVERY}
            hasRows={deliveries.length > 0}
          >
            <MiniTable
              headers={[
                '交货单号',
                '行号',
                '销售订单行',
                '物料',
                '发货数量',
                '单位',
                '发货日期',
              ]}
              rows={deliveries.map((d) => [
                d.DeliveryDocument,
                d.DeliveryDocumentItem,
                `${d.ReferenceSDDocument ?? '-'}/${d.ReferenceSDDocumentItem ?? '-'}`,
                d.Material ?? d.DeliveryDocumentItemText ?? '-',
                String(d.ActualDeliveryQuantity ?? '-'),
                d.DeliveryQuantityUnit ?? '-',
                d.deliveryDate ?? '-',
              ])}
            />
          </SectionFrame>
        </TabsContent>

        <TabsContent value="posting" className="mt-3">
          <SectionFrame
            sectionState={postingState}
            empty={EMPTY_POSTING}
            hasRows={materialDocs.length > 0}
          >
            <MiniTable
              headers={[
                '物料凭证号',
                '年度',
                '行号',
                '移动类型',
                '数量',
                '单位',
                '过账日期',
                '关联交货单',
              ]}
              rows={materialDocs.map((m) => [
                m.MaterialDocument,
                m.MaterialDocumentYear,
                m.MaterialDocumentItem,
                m.GoodsMovementType ?? '-',
                String(m.QuantityInEntryUnit ?? '-'),
                m.EntryUnit ?? '-',
                parseSapDate(m.PostingDate),
                m.Delivery ?? '-',
              ])}
            />
          </SectionFrame>
        </TabsContent>

        <TabsContent value="billing" className="mt-3 space-y-4">
          <SalesOrderBillingReconcilePanel
            header={header}
            items={items}
            billingRows={billingItems}
          />
          <SectionFrame
            sectionState={billingState}
            empty={EMPTY_BILLING}
            hasRows={billingItems.length > 0}
          >
            <MiniTable
              headers={[
                '发票号',
                '行号',
                '销售订单行',
                '物料',
                '开票数量',
                '净额',
                '税额',
                '币种',
                '发票日期',
              ]}
              rows={billingItems.map((b) => [
                b.BillingDocument,
                b.BillingDocumentItem,
                `${b.ReferenceSDDocument ?? '-'}/${b.ReferenceSDDocumentItem ?? '-'}`,
                b.Material ?? b.BillingDocumentItemText ?? '-',
                String(b.BillingQuantity ?? '-'),
                b.NetAmount != null ? Number(b.NetAmount).toLocaleString() : '-',
                b.TaxAmount != null ? Number(b.TaxAmount).toLocaleString() : '-',
                b.TransactionCurrency ?? '-',
                parseSapDate(b.BillingDocumentDate),
              ])}
            />
          </SectionFrame>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto border border-slate-100 rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            {headers.map((h) => (
              <TableHead key={h} className="text-xs font-medium text-slate-600 whitespace-nowrap">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={j} className="text-xs whitespace-nowrap">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
