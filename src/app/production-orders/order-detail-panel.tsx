'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PRODUCTION_ORDER_STATUS_MAP } from '@/lib/sap-service';
import {
  deriveProductionOrderStatus,
  PRODUCTION_ORDER_SUMMARY_SELECT,
  type ProductionOrderV4Row,
} from '@/lib/sap-production-order';
import { fetchSapEntity, fetchSapEntityOptional, logQueryAudit, odataEscape, parseSapDate } from '@/lib/sap-api-client';
import { SAP_NO_PERMISSION_MESSAGE } from '@/lib/sap-errors';
import { Loader2 } from 'lucide-react';

interface MaterialDocRow {
  MaterialDocument: string;
  MaterialDocumentYear: string;
  MaterialDocumentItem: string;
  Material?: string;
  MaterialDocumentItemText?: string;
  QuantityInEntryUnit?: string | number;
  EntryUnit?: string;
  GoodsMovementType?: string;
  PostingDate?: string;
  StorageLocation?: string;
  ManufacturingOrder?: string;
}

interface ConfirmationRow {
  OrderID?: string;
  ManufacturingOrder?: string;
  OrderOperation?: string;
  ConfirmationGroup?: string;
  ConfirmationCounter?: string;
  ConfirmationYieldQuantity?: string | number;
  YieldQuantity?: string | number;
  ConfirmationScrapQuantity?: string | number;
  ScrapQuantity?: string | number;
  ConfirmationUnit?: string;
  ProductionUnit?: string;
  PostingDate?: string;
  ConfirmationEntryDate?: string;
  WorkCenter?: string;
}

interface OrderDetailPanelProps {
  productionOrderNo: string | null;
}

function statusBadge(code: string | undefined, label?: string) {
  if (!code && !label) return <Badge variant="outline">-</Badge>;
  const mapped = code ? PRODUCTION_ORDER_STATUS_MAP[code] : undefined;
  if (mapped) return <Badge variant={mapped.variant}>{label ?? mapped.label}</Badge>;
  return <Badge variant="outline">{label ?? code}</Badge>;
}

function confirmationNo(row: ConfirmationRow): string {
  const group = row.ConfirmationGroup ?? '';
  const counter = row.ConfirmationCounter ?? '';
  if (group && counter) return `${group}/${counter}`;
  return group || counter || '-';
}

export function OrderDetailPanel({ productionOrderNo }: OrderDetailPanelProps) {
  const [header, setHeader] = useState<ProductionOrderV4Row | null>(null);
  const [issueDocs, setIssueDocs] = useState<MaterialDocRow[]>([]);
  const [receiptDocs, setReceiptDocs] = useState<MaterialDocRow[]>([]);
  const [confirmations, setConfirmations] = useState<ConfirmationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drillWarnings, setDrillWarnings] = useState<string[]>([]);

  const loadDetail = useCallback(async () => {
    if (!productionOrderNo) {
      setHeader(null);
      setIssueDocs([]);
      setReceiptDocs([]);
      setConfirmations([]);
      setDrillWarnings([]);
      return;
    }

    setLoading(true);
    setError(null);
    setDrillWarnings([]);

    try {
      const orderParams = new URLSearchParams();
      orderParams.set('id', productionOrderNo);
      orderParams.set('select', PRODUCTION_ORDER_SUMMARY_SELECT);

      const orderRes = await fetchSapEntity<ProductionOrderV4Row>(
        'CE_PRODUCTIONORDER_0001',
        'ProductionOrder',
        orderParams
      );
      const order = orderRes.data?.[0] ?? null;
      setHeader(order);

      const po = odataEscape(productionOrderNo);
      const poFilter = `(ManufacturingOrder eq '${po}' or OrderID eq '${po}')`;
      const warnings: string[] = [];

      const issueParams = new URLSearchParams();
      issueParams.set('top', '100');
      issueParams.set('filter', `${poFilter} and GoodsMovementType eq '261'`);
      issueParams.set(
        'select',
        'MaterialDocument,MaterialDocumentYear,MaterialDocumentItem,Material,MaterialDocumentItemText,QuantityInEntryUnit,EntryUnit,GoodsMovementType,PostingDate,StorageLocation,ManufacturingOrder'
      );
      issueParams.set('orderby', 'PostingDate desc');

      const receiptParams = new URLSearchParams();
      receiptParams.set('top', '100');
      receiptParams.set('filter', `${poFilter} and GoodsMovementType eq '101'`);
      receiptParams.set(
        'select',
        'MaterialDocument,MaterialDocumentYear,MaterialDocumentItem,Material,MaterialDocumentItemText,QuantityInEntryUnit,EntryUnit,GoodsMovementType,PostingDate,StorageLocation,ManufacturingOrder'
      );
      receiptParams.set('orderby', 'PostingDate desc');

      const confParams = new URLSearchParams();
      confParams.set('top', '100');
      confParams.set(
        'filter',
        `OrderID eq '${po}' or ManufacturingOrder eq '${po}'`
      );
      confParams.set(
        'select',
        'OrderID,ManufacturingOrder,OrderOperation,ConfirmationGroup,ConfirmationCounter,ConfirmationYieldQuantity,YieldQuantity,ConfirmationScrapQuantity,ScrapQuantity,ConfirmationUnit,ProductionUnit,PostingDate,ConfirmationEntryDate,WorkCenter'
      );
      confParams.set('orderby', 'PostingDate desc,OrderOperation asc');

      const [issueResult, receiptResult, confResult] = await Promise.all([
        fetchSapEntityOptional<MaterialDocRow>('API_MATERIAL_DOCUMENT_SRV', 'A_MaterialDocumentItem', issueParams),
        fetchSapEntityOptional<MaterialDocRow>('API_MATERIAL_DOCUMENT_SRV', 'A_MaterialDocumentItem', receiptParams),
        fetchSapEntityOptional<ConfirmationRow>(
          'API_PROD_ORDER_CONFIRMATION_2_SRV',
          'A_ProdnOrdConf2',
          confParams
        ),
      ]);

      if (issueResult.error) warnings.push(`发料穿透暂不可用：${issueResult.error}`);
      if (receiptResult.error) warnings.push(`收货穿透暂不可用：${receiptResult.error}`);
      if (confResult.error) warnings.push(`报工穿透暂不可用：${confResult.error}`);

      setIssueDocs(issueResult.data);
      setReceiptDocs(receiptResult.data);
      setConfirmations(confResult.data);
      setDrillWarnings(warnings);

      await logQueryAudit({
        module: 'production-orders',
        action: 'detail',
        conditions: { productionOrderNo, drillWarnings: warnings },
        resultCount: issueResult.data.length + receiptResult.data.length + confResult.data.length,
        success: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载明细失败';
      setError(message);
      await logQueryAudit({
        module: 'production-orders',
        action: 'detail',
        conditions: { productionOrderNo },
        success: false,
        error: message,
      });
    } finally {
      setLoading(false);
    }
  }, [productionOrderNo]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (!productionOrderNo) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
        选择生产订单查看发料 / 收货 / 报工穿透
      </div>
    );
  }

  if (loading && !header) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    const isPermission = error === SAP_NO_PERMISSION_MESSAGE;
    return (
      <div
        className={`p-4 rounded-lg text-sm ${
          isPermission
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}
      >
        {error}
      </div>
    );
  }

  const derived = header ? deriveProductionOrderStatus(header) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-500">生产订单</div>
          <div className="font-mono font-medium text-blue-600">{header?.ProductionOrder}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">成品物料</div>
          <div>
            {header?.Product} · {header?.ProductionOrderText ?? '-'}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">工厂</div>
          <div>{header?.ProductionPlant ?? '-'}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">计划 / 确认 / 收货</div>
          <div className="font-mono tabular-nums text-xs">
            {header?.OrderPlannedTotalQty ?? '-'} / {header?.OrderConfirmedYieldQty ?? '-'} /{' '}
            {header?.ActualDeliveredQuantity ?? '-'} {header?.ProductionISOUnit ?? ''}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">系统状态</div>
          <div>{statusBadge(derived?.systemStatus)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">业务状态</div>
          <div>{statusBadge(derived?.code, derived?.label)}</div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          加载穿透数据…
        </div>
      )}

      {drillWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
          {drillWarnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          <p className="text-amber-700/80">
            需在 SAP 侧开通 API_MATERIAL_DOCUMENT_SRV / API_PROD_ORDER_CONFIRMATION_2_SRV 通信配置。
          </p>
        </div>
      )}

      <Tabs defaultValue="issue">
        <TabsList>
          <TabsTrigger value="issue">发料 ({issueDocs.length})</TabsTrigger>
          <TabsTrigger value="receipt">收货入库 ({receiptDocs.length})</TabsTrigger>
          <TabsTrigger value="confirmation">报工 ({confirmations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="issue" className="mt-3">
          <MiniTable
            headers={['物料凭证', '过账日期', '组件物料', '数量', '单位', '移动类型']}
            empty="暂无发料记录"
            rows={issueDocs.map((m) => [
              `${m.MaterialDocument}/${m.MaterialDocumentYear}`,
              parseSapDate(m.PostingDate),
              m.Material ?? '-',
              String(m.QuantityInEntryUnit ?? '-'),
              m.EntryUnit ?? '-',
              m.GoodsMovementType ?? '-',
            ])}
          />
        </TabsContent>

        <TabsContent value="receipt" className="mt-3">
          <MiniTable
            headers={['物料凭证', '过账日期', '成品物料', '数量', '单位', '移动类型', '库位']}
            empty="暂无收货记录"
            rows={receiptDocs.map((m) => [
              `${m.MaterialDocument}/${m.MaterialDocumentYear}`,
              parseSapDate(m.PostingDate),
              m.Material ?? '-',
              String(m.QuantityInEntryUnit ?? '-'),
              m.EntryUnit ?? '-',
              m.GoodsMovementType ?? '-',
              m.StorageLocation ?? '-',
            ])}
          />
        </TabsContent>

        <TabsContent value="confirmation" className="mt-3">
          <MiniTable
            headers={['确认号', '工序', '工作中心', '确认数量', '确认时间', '报废数量']}
            empty="暂无报工记录"
            rows={confirmations.map((c) => [
              confirmationNo(c),
              c.OrderOperation ?? '-',
              c.WorkCenter ?? '-',
              String(c.ConfirmationYieldQuantity ?? c.YieldQuantity ?? '-'),
              parseSapDate(c.PostingDate ?? c.ConfirmationEntryDate),
              String(c.ConfirmationScrapQuantity ?? c.ScrapQuantity ?? '-'),
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">{empty}</p>;
  }
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
