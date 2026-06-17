'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Factory, Package, Wrench, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { formatSapDate } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OperationItem {
  ProductionOrderOperation: string;
  OperationDescription?: string;
  WorkCenter?: string;
  OperationStatus?: string;
  OpPlannedStartDate?: string;
  OpActualStartDate?: string;
  OpErlstSchedldExecStrtDte?: string;
  OpErlstSchedldExecEndDte?: string;
  OpActualExecutionStartDate?: string;
  OpActualExecutionEndDate?: string;
  OpPlannedTotalQuantity?: number;
  OpTotalConfirmedYieldQty?: number;
  OpTotalConfirmedScrapQty?: number;
  OperationSAPUnit?: string;
  OperationConfirmation?: string;
}

interface ComponentItem {
  Material: string;
  RequiredQuantity: number;
  WithdrawnQuantity?: number;
  EntrySAPUnit?: string;
  ProductionOrderOperation?: string;
  StorageLocation?: string;
  Reservation?: string;
  ReservationItem?: string;
  GoodsMovementIsAllowed?: boolean;
  MaterialComponentText?: string;
  Batch?: string;
}

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
  _Component?: ComponentItem[];
  _Operation?: OperationItem[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadge(status: string | undefined) {
  if (!status) return <FioriBadge variant="neutral">未知</FioriBadge>;
  const s = status.toUpperCase();
  if (s === 'REL' || s === 'CNF' || s === 'GMPS') return <FioriBadge variant="success">{status}</FioriBadge>;
  if (s === 'CRTD') return <FioriBadge variant="info">{status}</FioriBadge>;
  if (s === 'DLT' || s === 'TECO') return <FioriBadge variant="error">{status}</FioriBadge>;
  return <FioriBadge variant="neutral">{status}</FioriBadge>;
}

function formatDate(d: string | undefined): string {
  if (!d) return '-';
  // Handle /Date(...)/ format
  if (d.startsWith('/Date(')) {
    const ts = parseInt(d.replace(/[^0-9-]/g, ''), 10);
    if (isNaN(ts)) return '-';
    return new Date(ts).toLocaleDateString('zh-CN');
  }
  // Handle ISO format
  const date = new Date(d);
  if (isNaN(date.getTime())) return formatSapDate(d);
  return date.toLocaleDateString('zh-CN');
}

function progressPercent(yieldQty: number | undefined, totalQty: number | undefined): number {
  if (!totalQty || totalQty === 0) return 0;
  return Math.min(100, Math.round(((yieldQty || 0) / totalQty) * 100));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProductionOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [productName, setProductName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder?id=${encodeURIComponent(id)}&expand=_Component,_Operation,_Sequence,_PostingRule`
        );
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const orderData = data.data[0] as ProductionOrder;
          setOrder(orderData);
          const product = orderData.Product;
          if (product) {
            try {
              const pRes = await fetch('/api/sap/API_PRODUCT_SRV/A_Product?top=200');
              const pJson = await pRes.json();
              const products = (pJson.data || []) as { Product: string; ProductDescription: string }[];
              const p = products.find(x => x.Product === product);
              if (p) setProductName(p.ProductDescription);
            } catch { /* ignore */ }
          }
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

  /* --------------------------- Loading --------------------------- */
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div className="fiori-objheader">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div><Skeleton className="h-6 w-40 mb-1" /><Skeleton className="h-4 w-60" /></div>
          </div>
          <div className="fiori-objheader-fields">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="fiori-objheader-field">
                <Skeleton className="h-3 w-[60px] mb-1" /><Skeleton className="h-4 w-[100px]" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  /* --------------------------- Error ----------------------------- */
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

  /* --------------------------- Data ------------------------------ */
  const components = order._Component || [];
  const operations = order._Operation || [];

  const headerFields = [
    { label: '订单类型', value: order.ProductionOrderType || '-' },
    { label: '产品', value: order.Product ? `${order.Product} ${productName ? `(${productName})` : ''}` : '-' },
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
    <div className="space-y-5">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/production-orders')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>

      {/* ============ Object Header ============ */}
      <div className="fiori-objheader">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <div className="fiori-objheader-title">{order.ProductionOrder}</div>
            <div className="fiori-objheader-subtitle">
              {order.Product || '-'}{productName ? ` (${productName})` : ''} · {order.ProductionPlant || '-'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {order.IsCompletelyDelivered && <FioriBadge variant="success">已完全交货</FioriBadge>}
          {order.IsMarkedForDeletion && <FioriBadge variant="error">已标记删除</FioriBadge>}
          {!order.IsCompletelyDelivered && !order.IsMarkedForDeletion && <FioriBadge variant="info">进行中</FioriBadge>}
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

      {/* ============ KPI Cards ============ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-[#E4E4E4] p-4">
          <div className="text-xs uppercase tracking-wide text-[#6A6D70] mb-1">计划数量</div>
          <div className="text-2xl font-bold tabular-nums text-[#1A2228]">{order.OrderPlannedTotalQty || '-'}</div>
        </div>
        <div className="bg-white rounded-lg border border-[#E4E4E4] p-4">
          <div className="text-xs uppercase tracking-wide text-[#6A6D70] mb-1">实际交付</div>
          <div className="text-2xl font-bold tabular-nums text-[#107E3E]">{order.ActualDeliveredQuantity || '0'}</div>
        </div>
        <div className="bg-white rounded-lg border border-[#E4E4E4] p-4">
          <div className="text-xs uppercase tracking-wide text-[#6A6D70] mb-1">组件数</div>
          <div className="text-2xl font-bold tabular-nums text-[#1A2228]">{components.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-[#E4E4E4] p-4">
          <div className="text-xs uppercase tracking-wide text-[#6A6D70] mb-1">工序数</div>
          <div className="text-2xl font-bold tabular-nums text-[#1A2228]">{operations.length}</div>
        </div>
      </div>

      {/* ============ Operations ============ */}
      <div className="bg-white rounded-lg border border-[#E4E4E4] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E4E4E4] flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#0070F2]" />
          <span className="text-sm font-semibold text-[#1A2228]">工序进度</span>
          <span className="text-xs text-[#6A6D70] ml-1">({operations.length})</span>
        </div>
        {operations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#6A6D70]">暂无工序数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E4E4] bg-[#FAFAFA]">
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">工序</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">工作中心</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">状态</th>
                  <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">计划开始</th>
                  <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">实际开始</th>
                  <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">实际结束</th>
                  <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">计划数量</th>
                  <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">合格</th>
                  <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">报废</th>
                  <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">进度</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => {
                  const pct = progressPercent(op.OpTotalConfirmedYieldQty, op.OpPlannedTotalQuantity);
                  return (
                    <tr key={op.ProductionOrderOperation} className="border-b border-[#E4E4E4] hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-4 py-2.5 font-medium text-[#1A2228]">
                        {op.ProductionOrderOperation}
                        {op.OperationDescription && (
                          <div className="text-xs text-[#6A6D70] font-normal">{op.OperationDescription}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[#1A2228]">{op.WorkCenter || '-'}</td>
                      <td className="px-4 py-2.5">{statusBadge(op.OperationStatus)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#1A2228]">{formatDate(op.OpErlstSchedldExecStrtDte)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#1A2228]">{formatDate(op.OpActualExecutionStartDate)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#1A2228]">{formatDate(op.OpActualExecutionEndDate)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#1A2228]">{op.OpPlannedTotalQuantity ?? '-'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#107E3E] font-medium">{op.OpTotalConfirmedYieldQty ?? 0}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#BB0000]">{op.OpTotalConfirmedScrapQty ?? 0}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-[#E4E4E4] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: pct >= 100 ? '#107E3E' : '#0070F2',
                              }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-[#6A6D70] w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ Components ============ */}
      <div className="bg-white rounded-lg border border-[#E4E4E4] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E4E4E4] flex items-center gap-2">
          <Package className="w-4 h-4 text-[#0070F2]" />
          <span className="text-sm font-semibold text-[#1A2228]">组件清单</span>
          <span className="text-xs text-[#6A6D70] ml-1">({components.length})</span>
        </div>
        {components.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#6A6D70]">暂无组件数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E4E4] bg-[#FAFAFA]">
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">物料</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">描述</th>
                  <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">需求数量</th>
                  <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">已提货</th>
                  <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">单位</th>
                  <th className="text-center px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">工序</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">库位</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">预留号</th>
                  <th className="text-center px-4 py-2.5 text-xs uppercase tracking-wide text-[#6A6D70] font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {components.map((comp, idx) => {
                  const fulfilled = (comp.WithdrawnQuantity || 0) >= (comp.RequiredQuantity || 0);
                  const partial = (comp.WithdrawnQuantity || 0) > 0 && !fulfilled;
                  return (
                    <tr key={`${comp.Material}-${comp.ReservationItem || idx}`} className="border-b border-[#E4E4E4] hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-4 py-2.5 font-medium text-[#1A2228]">{comp.Material}</td>
                      <td className="px-4 py-2.5 text-[#6A6D70] max-w-[200px] truncate">{comp.MaterialComponentText || '-'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#1A2228] font-medium">{comp.RequiredQuantity}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: fulfilled ? '#107E3E' : partial ? '#E9730C' : '#6A6D70' }}>
                        {comp.WithdrawnQuantity ?? 0}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#6A6D70]">{comp.EntrySAPUnit || '-'}</td>
                      <td className="px-4 py-2.5 text-center text-[#1A2228]">{comp.ProductionOrderOperation || '-'}</td>
                      <td className="px-4 py-2.5 text-[#1A2228]">{comp.StorageLocation || '-'}</td>
                      <td className="px-4 py-2.5 text-[#1A2228]">
                        {comp.Reservation ? `${comp.Reservation}/${comp.ReservationItem || ''}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {fulfilled ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#107E3E]">
                            <CheckCircle className="w-3 h-3" />已齐套
                          </span>
                        ) : partial ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#E9730C]">
                            <Clock className="w-3 h-3" />部分
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[#6A6D70]">
                            <AlertTriangle className="w-3 h-3" />待提货
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
