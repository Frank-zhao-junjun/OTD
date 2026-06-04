'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRODUCTION_ORDER_STATUS_MAP, SAP_DEFAULTS } from '@/lib/sap-service';
import { fetchSapEntity, logQueryAudit, parseSapDate } from '@/lib/sap-api-client';
import { SAP_NO_PERMISSION_MESSAGE } from '@/lib/sap-errors';
import { buildProductionOrderListFilter } from '@/lib/sap-production-order-filters';
import {
  filterByBusinessStatus,
  mapProductionOrderListRow,
  PRODUCTION_ORDER_STATUS_FILTER_OPTIONS,
  PRODUCTION_ORDER_SUMMARY_SELECT,
  type ProductionOrderListRow,
  type ProductionOrderV4Row,
} from '@/lib/sap-production-order';
import { OrderDetailPanel } from '@/app/production-orders/order-detail-panel';
import { Factory, Search, RotateCcw, AlertCircle, Inbox } from 'lucide-react';

const statusBadge = (code: string, label: string) => {
  const mapped = PRODUCTION_ORDER_STATUS_MAP[code];
  if (mapped) return <Badge variant={mapped.variant}>{label}</Badge>;
  return <Badge variant="outline">{label}</Badge>;
};

export default function ProductionOrdersPage() {
  const [rows, setRows] = useState<ProductionOrderListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);

  const [productionOrderNo, setProductionOrderNo] = useState('');
  const [plant, setPlant] = useState(SAP_DEFAULTS.plant);
  const [material, setMaterial] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState<string>('all');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters = {
      productionOrderNo,
      plant,
      material,
      dateFrom,
      dateTo,
      status,
    };
    const auditPayload = {
      ...filters,
      defaultPlant: SAP_DEFAULTS.plant,
    };

    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      params.set('count', 'true');
      params.set('filter', buildProductionOrderListFilter(filters));
      params.set('orderby', 'CreationDate desc');
      params.set('select', PRODUCTION_ORDER_SUMMARY_SELECT);

      const data = await fetchSapEntity<ProductionOrderV4Row>(
        'CE_PRODUCTIONORDER_0001',
        'ProductionOrder',
        params
      );

      let mapped = (data.data ?? []).map(mapProductionOrderListRow);
      if (status && status !== 'all') {
        mapped = filterByBusinessStatus(
          mapped,
          status as Parameters<typeof filterByBusinessStatus>[1]
        );
      }

      setRows(mapped);
      setTotalCount(status !== 'all' ? mapped.length : (data.count ?? mapped.length));

      await logQueryAudit({
        module: 'production-orders',
        action: 'list',
        conditions: auditPayload,
        resultCount: mapped.length,
        success: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setRows([]);
      setTotalCount(0);
      await logQueryAudit({
        module: 'production-orders',
        action: 'list',
        conditions: auditPayload,
        success: false,
        error: message,
      });
    } finally {
      setLoading(false);
    }
  }, [productionOrderNo, plant, material, dateFrom, dateTo, status]);

  const handleClear = () => {
    setProductionOrderNo('');
    setPlant(SAP_DEFAULTS.plant);
    setMaterial('');
    setDateFrom('');
    setDateTo('');
    setStatus('all');
    setSelectedOrderNo(null);
    setRows([]);
    setTotalCount(0);
    setError(null);
  };

  const isPermissionError = error === SAP_NO_PERMISSION_MESSAGE;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Factory className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">生产订单</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            默认工厂 {SAP_DEFAULTS.plant} · 状态由 V4 字段服务端派生
          </p>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-full md:w-[160px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">生产订单号</label>
              <Input
                placeholder="订单号"
                value={productionOrderNo}
                onChange={(e) => setProductionOrderNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
              />
            </div>
            <div className="w-full md:w-[140px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">物料</label>
              <Input
                placeholder="成品物料编码"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
              />
            </div>
            <div className="w-[120px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">工厂</label>
              <Select value={plant} onValueChange={setPlant}>
                <SelectTrigger>
                  <SelectValue placeholder="工厂" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SAP_DEFAULTS.plant}>{SAP_DEFAULTS.plant} - 主工厂</SelectItem>
                  <SelectItem value="1020">1020</SelectItem>
                  <SelectItem value="all">全部工厂</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">创建日期起</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="w-[140px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">创建日期止</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="w-[130px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">业务状态</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_ORDER_STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={fetchOrders} disabled={loading}>
              <Search className="w-3.5 h-3.5 mr-1" />
              查询
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              清除
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Card className="border-slate-200 xl:col-span-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-700">查询结果</span>
              {!loading && !error && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {totalCount} 条
                </Badge>
              )}
            </div>

            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <AlertCircle
                  className={`w-10 h-10 mb-3 ${isPermissionError ? 'text-amber-500' : 'text-red-400'}`}
                />
                <p
                  className={`text-sm font-medium ${isPermissionError ? 'text-amber-800' : 'text-red-600'}`}
                >
                  {isPermissionError ? SAP_NO_PERMISSION_MESSAGE : '查询失败'}
                </p>
                <p className="text-xs text-slate-500 mt-1">{error}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={fetchOrders}>
                  重试
                </Button>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">暂无数据</p>
                <p className="text-xs text-slate-400 mt-1">设置条件后点击查询</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="font-medium text-slate-600">订单号</TableHead>
                      <TableHead className="font-medium text-slate-600">类型</TableHead>
                      <TableHead className="font-medium text-slate-600">工厂</TableHead>
                      <TableHead className="font-medium text-slate-600">成品物料</TableHead>
                      <TableHead className="font-medium text-slate-600 text-right">计划数量</TableHead>
                      <TableHead className="font-medium text-slate-600 text-right">确认/收货</TableHead>
                      <TableHead className="font-medium text-slate-600">单位</TableHead>
                      <TableHead className="font-medium text-slate-600">计划开始</TableHead>
                      <TableHead className="font-medium text-slate-600">计划结束</TableHead>
                      <TableHead className="font-medium text-slate-600">实际开始</TableHead>
                      <TableHead className="font-medium text-slate-600">实际结束</TableHead>
                      <TableHead className="font-medium text-slate-600">系统状态</TableHead>
                      <TableHead className="font-medium text-slate-600">业务状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const selected = selectedOrderNo === row.productionOrder;
                      return (
                        <TableRow
                          key={row.productionOrder}
                          className={`cursor-pointer transition-colors ${
                            selected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => setSelectedOrderNo(row.productionOrder)}
                        >
                          <TableCell className="font-mono text-sm text-blue-600 font-medium">
                            {row.productionOrder}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {row.orderType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{row.plant}</TableCell>
                          <TableCell className="text-sm">
                            <div className="font-mono text-xs text-slate-500">{row.product}</div>
                            <div className="text-slate-700 truncate max-w-[140px]" title={row.materialName}>
                              {row.materialName}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-right font-mono tabular-nums">
                            {row.plannedQty || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-right font-mono tabular-nums">
                            {row.confirmedQty}/{row.completedQty}
                          </TableCell>
                          <TableCell className="text-sm font-mono">{row.unit}</TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {parseSapDate(row.plannedStartDate)}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {parseSapDate(row.plannedEndDate)}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {parseSapDate(row.actualStartDate)}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {parseSapDate(row.actualEndDate)}
                          </TableCell>
                          <TableCell>{statusBadge(row.systemStatus, row.systemStatus)}</TableCell>
                          <TableCell>
                            {statusBadge(row.businessStatusCode, row.businessStatus)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 xl:col-span-2">
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">订单详情与穿透</h2>
            <OrderDetailPanel productionOrderNo={selectedOrderNo} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
