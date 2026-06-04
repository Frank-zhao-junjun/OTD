'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SAP_DEFAULTS } from '@/lib/sap-service';
import { fetchSapEntity, fetchSapEntityOptional, logQueryAudit } from '@/lib/sap-api-client';
import { SAP_NO_PERMISSION_MESSAGE } from '@/lib/sap-errors';
import {
  aggregateCrossSloc,
  aggregateMaterialStock,
  AVAILABLE_STOCK_HELPER_TEXT,
  buildMaterialStockFilter,
  defaultMaterialStockFilters,
  DEFAULT_LOW_STOCK_THRESHOLD,
  FERT_PRODUCT_TYPE,
  filterLinesByMaterialCodes,
  filterLowStock,
  formatQty,
  getStockTypeLabel,
  mapMaterialStockLine,
  MATERIAL_STOCK_LINE_SELECT,
  type CrossSlocSummary,
  type MaterialStockLine,
  type MaterialStockRawRow,
  type MaterialStockSummary,
} from '@/lib/sap-material-stock';
import { BarChart3, Search, RotateCcw, AlertCircle, Inbox, Package, Info } from 'lucide-react';

type ViewMode = 'summary' | 'detail' | 'crossSloc' | 'lowStock';

interface ProductRow {
  Product: string;
  ProductType?: string;
}

interface ProductDescriptionRow {
  Product: string;
  ProductDescription?: string;
}

const STOCK_TYPE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  '01': 'default',
  '02': 'secondary',
  '03': 'destructive',
  '04': 'outline',
};

function StockTypeBadge({ type }: { type: string | undefined }) {
  if (!type) return <Badge variant="outline">-</Badge>;
  return (
    <Badge variant={STOCK_TYPE_BADGE_VARIANT[type] ?? 'outline'}>{getStockTypeLabel(type)}</Badge>
  );
}

function QtyCell({ value, highlight }: { value: number; highlight?: 'available' | 'warning' }) {
  const className =
    highlight === 'available'
      ? 'text-right font-medium text-green-700'
      : highlight === 'warning'
        ? 'text-right font-medium text-amber-700'
        : 'text-right';
  return <TableCell className={className}>{formatQty(value)}</TableCell>;
}

export default function MaterialStockPage() {
  const defaults = defaultMaterialStockFilters();

  const [lines, setLines] = useState<MaterialStockLine[]>([]);
  const [summaries, setSummaries] = useState<MaterialStockSummary[]>([]);
  const [crossSlocRows, setCrossSlocRows] = useState<CrossSlocSummary[]>([]);
  const [materialNames, setMaterialNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [material, setMaterial] = useState('');
  const [plant, setPlant] = useState(defaults.plant!);
  const [storageLocation, setStorageLocation] = useState(defaults.storageLocation!);
  const [batch, setBatch] = useState('');
  const [fertOnly, setFertOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [lowStockThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);

  const loadMaterialNames = async (codes: string[]): Promise<Record<string, string>> => {
    const unique = [...new Set(codes.filter(Boolean))];
    if (unique.length === 0) return {};

    const entries = await Promise.all(
      unique.map(async (code) => {
        try {
          const params = new URLSearchParams();
          params.set('filter', `Product eq '${code.replace(/'/g, "''")}'`);
          params.set('select', 'Product,ProductDescription');
          params.set('top', '1');
          const res = await fetchSapEntityOptional<ProductDescriptionRow>(
            'API_PRODUCT_SRV',
            'A_ProductDescription',
            params
          );
          const row = res.data[0];
          return [code, row?.ProductDescription || ''] as const;
        } catch {
          return [code, ''] as const;
        }
      })
    );

    const resolved: Record<string, string> = {};
    entries.forEach(([id, name]) => {
      if (name) resolved[id] = name;
    });

    setMaterialNames((prev) => ({ ...prev, ...resolved }));
    return resolved;
  };

  const fetchFertMaterialCodes = async (): Promise<Set<string>> => {
    const params = new URLSearchParams();
    params.set('filter', `ProductType eq '${FERT_PRODUCT_TYPE}'`);
    params.set('select', 'Product,ProductType');
    params.set('top', '500');
    const res = await fetchSapEntity<ProductRow>('API_PRODUCT_SRV', 'A_Product', params);
    return new Set((res.data ?? []).map((row) => row.Product).filter(Boolean));
  };

  const applySummariesWithNames = (
    rawSummaries: MaterialStockSummary[],
    names: Record<string, string>
  ): MaterialStockSummary[] =>
    rawSummaries.map((s) => ({
      ...s,
      materialName: names[s.material] || s.materialName,
    }));

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters = {
      material: material.trim(),
      plant,
      storageLocation: viewMode === 'crossSloc' ? 'all' : storageLocation,
      batch: batch.trim(),
      fertOnly,
      viewMode,
      lowStockThreshold,
    };
    const auditPayload = {
      ...filters,
      defaultPlant: SAP_DEFAULTS.plant,
      defaultStorageLocation: SAP_DEFAULTS.storageLocation,
    };

    try {
      if (viewMode === 'crossSloc' && !material.trim()) {
        setLines([]);
        setSummaries([]);
        setCrossSlocRows([]);
        setTotalCount(0);
        setError(null);
        setLoading(false);
        return;
      }

      let fertCodes: Set<string> | null = null;
      if (fertOnly) {
        fertCodes = await fetchFertMaterialCodes();
        if (fertCodes.size === 0) {
          throw new Error('未找到 FERT 成品物料主数据');
        }
      }

      const baseFilter = buildMaterialStockFilter({
        material: material.trim() || undefined,
        plant,
        storageLocation: viewMode === 'crossSloc' ? 'all' : storageLocation,
        batch: batch.trim() || undefined,
      });

      // FERT scope is applied client-side to avoid oversized OData OR filters
      const filter = baseFilter;

      const params = new URLSearchParams();
      params.set('top', '500');
      params.set('select', MATERIAL_STOCK_LINE_SELECT);
      if (filter) params.set('filter', filter);

      const data = await fetchSapEntity<MaterialStockRawRow>(
        'API_MATERIAL_STOCK_SRV',
        'A_MatlStkInAcctMod',
        params
      );

      let mapped = (data.data ?? []).map(mapMaterialStockLine);

      if (fertOnly && fertCodes) {
        mapped = filterLinesByMaterialCodes(mapped, fertCodes);
      }

      const aggregated = aggregateMaterialStock(mapped);
      const crossSloc = viewMode === 'crossSloc' && material.trim()
        ? aggregateCrossSloc(mapped, material.trim(), plant)
        : [];

      const codesForNames = [
        ...new Set([
          ...mapped.map((l) => l.material),
          ...aggregated.map((s) => s.material),
        ]),
      ];
      await loadMaterialNames(codesForNames);

      setLines(mapped);
      setSummaries(aggregated);
      setCrossSlocRows(crossSloc);
      setTotalCount(data.count ?? mapped.length);

      await logQueryAudit({
        module: 'material-stock',
        action: viewMode,
        conditions: auditPayload,
        resultCount: data.count ?? mapped.length,
        success: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLines([]);
      setSummaries([]);
      setCrossSlocRows([]);
      setTotalCount(0);
      await logQueryAudit({
        module: 'material-stock',
        action: viewMode,
        conditions: auditPayload,
        success: false,
        error: message,
      });
    } finally {
      setLoading(false);
    }
  }, [material, plant, storageLocation, batch, fertOnly, viewMode, lowStockThreshold]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const handleClear = () => {
    const d = defaultMaterialStockFilters();
    setMaterial('');
    setPlant(d.plant!);
    setStorageLocation(d.storageLocation!);
    setBatch('');
    setFertOnly(false);
    setViewMode('summary');
    setError(null);
  };

  const handleFertShortcut = () => {
    setFertOnly(true);
    setMaterial('');
    setPlant(SAP_DEFAULTS.plant);
    setStorageLocation(SAP_DEFAULTS.storageLocation);
    setViewMode('summary');
  };

  const isPermissionError = error === SAP_NO_PERMISSION_MESSAGE;
  const lowStockSummaries = filterLowStock(summaries, lowStockThreshold);
  const displaySummaries =
    viewMode === 'lowStock' ? lowStockSummaries : summaries;

  const enrichedSummaries = applySummariesWithNames(displaySummaries, materialNames);
  const enrichedCrossSloc = crossSlocRows.map((row) => ({
    ...row,
    materialName: materialNames[row.material] || row.materialName,
  }));

  const resultBadgeLabel = () => {
    if (viewMode === 'detail') return `共 ${totalCount} 条明细`;
    if (viewMode === 'crossSloc') return `${enrichedCrossSloc.length} 个库位 / ${totalCount} 条明细`;
    if (viewMode === 'lowStock') {
      return `${enrichedSummaries.length} 种低库存 (< ${lowStockThreshold}) / ${summaries.length} 种物料`;
    }
    return `${enrichedSummaries.length} 种物料 / ${totalCount} 条明细`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800">成品库存查询</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              默认范围：工厂 {SAP_DEFAULTS.plant} · 库位 {SAP_DEFAULTS.storageLocation} · FERT 成品
            </p>
          </div>
        </div>
        <Button
          variant={fertOnly ? 'default' : 'outline'}
          size="sm"
          onClick={handleFertShortcut}
          className="gap-1.5"
        >
          <Package className="w-4 h-4" />
          FERT 成品快览
        </Button>
      </div>

      <Alert className="border-blue-100 bg-blue-50/50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-slate-600">
          {AVAILABLE_STOCK_HELPER_TEXT}
          {viewMode === 'lowStock' && (
            <span className="block mt-1 text-amber-700">
              低库存阈值：{lowStockThreshold}（可通过 NEXT_PUBLIC_LOW_STOCK_THRESHOLD 配置；TODO：管理端配置）
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-full md:w-[160px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">物料号</label>
              <Input
                placeholder="如 FG10, FG41"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchStocks()}
              />
            </div>
            <div className="w-[130px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">批次</label>
              <Input
                placeholder="批次号"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchStocks()}
              />
            </div>
            <div className="w-[130px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">工厂</label>
              <Select value={plant} onValueChange={setPlant}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部工厂</SelectItem>
                  <SelectItem value="1010">1010 - 生产工厂</SelectItem>
                  <SelectItem value="1000">1000 - 集团工厂</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[130px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">库位</label>
              <Select
                value={storageLocation}
                onValueChange={setStorageLocation}
                disabled={viewMode === 'crossSloc'}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部库位</SelectItem>
                  <SelectItem value="1003">1003 - 成品仓</SelectItem>
                  <SelectItem value="1001">1001 - 原材料仓</SelectItem>
                  <SelectItem value="101A">101A - 发货仓</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(
                [
                  ['summary', '汇总'],
                  ['detail', '明细'],
                  ['crossSloc', '跨库位'],
                  ['lowStock', '低库存'],
                ] as const
              ).map(([mode, label]) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchStocks} className="gap-1.5">
                <Search className="w-4 h-4" />
                查询
              </Button>
              <Button variant="outline" onClick={handleClear} className="gap-1.5">
                <RotateCcw className="w-4 h-4" />
                清除
              </Button>
            </div>
          </div>
          {fertOnly && (
            <Badge variant="secondary" className="text-xs">
              已启用 FERT 成品筛选（ProductType = {FERT_PRODUCT_TYPE}）
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">
              {viewMode === 'detail' && '库存明细'}
              {viewMode === 'summary' && '库存汇总'}
              {viewMode === 'crossSloc' && `跨库位汇总${material.trim() ? ` · ${material.trim()}` : ''}`}
              {viewMode === 'lowStock' && `低可用库存 (< ${lowStockThreshold})`}
            </h2>
            {!loading && !error && (
              <Badge variant="secondary" className="text-xs">{resultBadgeLabel()}</Badge>
            )}
          </div>

          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-10 px-4">
              {isPermissionError ? (
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              ) : null}
              <p className={isPermissionError ? 'text-amber-700 font-medium' : 'text-red-600'}>
                {isPermissionError ? SAP_NO_PERMISSION_MESSAGE : `查询失败: ${error}`}
              </p>
              <Button variant="outline" className="mt-4" onClick={fetchStocks}>
                重试
              </Button>
            </div>
          ) : viewMode === 'detail' ? (
            lines.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>物料号</TableHead>
                      <TableHead>物料名称</TableHead>
                      <TableHead>工厂</TableHead>
                      <TableHead>库位</TableHead>
                      <TableHead>批次</TableHead>
                      <TableHead>库存类型</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead>单位</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, index) => (
                      <TableRow
                        key={`${line.material}-${line.plant}-${line.storageLocation}-${line.batch}-${line.inventoryStockType}-${index}`}
                      >
                        <TableCell className="font-medium text-blue-600">{line.material}</TableCell>
                        <TableCell className="text-slate-600 max-w-[180px] truncate">
                          {materialNames[line.material] || '-'}
                        </TableCell>
                        <TableCell>{line.plant}</TableCell>
                        <TableCell>{line.storageLocation || '-'}</TableCell>
                        <TableCell>{line.batch || '-'}</TableCell>
                        <TableCell>
                          <StockTypeBadge type={line.inventoryStockType} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatQty(line.quantity)}
                        </TableCell>
                        <TableCell>{line.materialBaseUnit || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : viewMode === 'crossSloc' ? (
            enrichedCrossSloc.length === 0 ? (
              <EmptyState hint="请输入物料号后查询跨库位分布" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>物料号</TableHead>
                      <TableHead>物料名称</TableHead>
                      <TableHead>工厂</TableHead>
                      <TableHead>库位</TableHead>
                      <TableHead className="text-right">非限制</TableHead>
                      <TableHead className="text-right">质检</TableHead>
                      <TableHead className="text-right">冻结</TableHead>
                      <TableHead className="text-right">可用</TableHead>
                      <TableHead className="text-right">合计</TableHead>
                      <TableHead>单位</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedCrossSloc.map((row) => (
                      <TableRow key={`${row.material}-${row.plant}-${row.storageLocation}`}>
                        <TableCell className="font-medium text-blue-600">{row.material}</TableCell>
                        <TableCell className="text-slate-600 max-w-[180px] truncate">
                          {row.materialName || '-'}
                        </TableCell>
                        <TableCell>{row.plant}</TableCell>
                        <TableCell>{row.storageLocation || '-'}</TableCell>
                        <QtyCell value={row.unrestrictedQty} />
                        <QtyCell value={row.qualityInspectionQty} />
                        <QtyCell value={row.blockedQty} />
                        <QtyCell value={row.availableQty} highlight="available" />
                        <QtyCell value={row.totalQty} />
                        <TableCell>{row.baseUnit || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : enrichedSummaries.length === 0 ? (
            <EmptyState
              hint={
                viewMode === 'lowStock'
                  ? `当前条件下无可用库存低于 ${lowStockThreshold} 的物料`
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物料号</TableHead>
                    <TableHead>物料名称</TableHead>
                    <TableHead>工厂</TableHead>
                    <TableHead>库位</TableHead>
                    <TableHead className="text-right">非限制</TableHead>
                    <TableHead className="text-right">质检</TableHead>
                    <TableHead className="text-right">冻结</TableHead>
                    <TableHead className="text-right">可用</TableHead>
                    <TableHead className="text-right">合计</TableHead>
                    <TableHead>单位</TableHead>
                    {viewMode === 'summary' && <TableHead className="text-right">批次数</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrichedSummaries.map((s) => (
                    <TableRow key={`${s.material}-${s.plant}-${s.storageLocation}`}>
                      <TableCell className="font-medium text-blue-600">{s.material}</TableCell>
                      <TableCell className="text-slate-600 max-w-[180px] truncate">
                        {s.materialName || '-'}
                      </TableCell>
                      <TableCell>{s.plant}</TableCell>
                      <TableCell>{s.storageLocation || '-'}</TableCell>
                      <QtyCell value={s.unrestrictedQty} />
                      <QtyCell value={s.qualityInspectionQty} />
                      <QtyCell value={s.blockedQty} />
                      <QtyCell
                        value={s.availableQty}
                        highlight={viewMode === 'lowStock' ? 'warning' : 'available'}
                      />
                      <QtyCell value={s.totalQty} />
                      <TableCell>{s.baseUnit || '-'}</TableCell>
                      {viewMode === 'summary' && (
                        <TableCell className="text-right">
                          <Badge variant="secondary">{s.batchCount}</Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ hint }: { hint?: string }) {
  return (
    <div className="text-center py-10 text-slate-500">
      <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-300" />
      <p>{hint || '暂无数据，请调整查询条件'}</p>
    </div>
  );
}
