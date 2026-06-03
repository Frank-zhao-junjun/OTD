'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SAP_DEFAULTS } from '@/lib/sap-service';

// A_MatlStkInAcctMod — composite key stock line entity
interface MaterialStock {
  Material: string;
  Plant: string;
  StorageLocation?: string;
  Batch?: string;
  Supplier?: string;
  InventoryStockType?: string;
  InventorySpecialStockType?: string;
  MaterialBaseUnit?: string;
  MatlWrhsStkQtyInMatlBaseUnit?: string | number;
  // V2 response uses __metadata etc.
}

// Aggregated view per material
interface MaterialStockSummary {
  material: string;
  plant: string;
  storageLocation: string;
  baseUnit: string;
  totalQty: number;
  batchCount: number;
}

export default function MaterialStockPage() {
  const [stocks, setStocks] = useState<MaterialStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [plant, setPlant] = useState(SAP_DEFAULTS.plant);
  const [storageLocation, setStorageLocation] = useState(SAP_DEFAULTS.storageLocation);
  const [viewMode, setViewMode] = useState<'detail' | 'summary'>('summary');
  const [totalCount, setTotalCount] = useState(0);
  const [summaries, setSummaries] = useState<MaterialStockSummary[]>([]);

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '200');

      const filterParts: string[] = [];
      if (searchQuery) {
        // V2 filter for material
        filterParts.push(`Material eq '${searchQuery}'`);
      }
      if (plant) {
        filterParts.push(`Plant eq '${plant}'`);
      }
      if (storageLocation) {
        filterParts.push(`StorageLocation eq '${storageLocation}'`);
      }

      if (filterParts.length > 0) {
        params.set('filter', filterParts.join(' and '));
      }

      const response = await fetch(`/api/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch material stock');
      }

      const results: MaterialStock[] = data.data || [];
      setStocks(results);
      setTotalCount(data.count || results.length);

      // Compute aggregated summary per material
      const map = new Map<string, MaterialStockSummary>();
      for (const s of results) {
        const key = `${s.Material}|${s.Plant}|${s.StorageLocation || ''}`;
        const existing = map.get(key);
        const qty = Number(s.MatlWrhsStkQtyInMatlBaseUnit) || 0;
        if (existing) {
          existing.totalQty += qty;
          existing.batchCount += 1;
        } else {
          map.set(key, {
            material: s.Material,
            plant: s.Plant,
            storageLocation: s.StorageLocation || '-',
            baseUnit: s.MaterialBaseUnit || '-',
            totalQty: qty,
            batchCount: 1,
          });
        }
      }
      setSummaries(Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, plant, storageLocation]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const handleSearch = () => fetchStocks();
  const handleClear = () => {
    setSearchQuery('');
    setPlant(SAP_DEFAULTS.plant);
    setStorageLocation(SAP_DEFAULTS.storageLocation);
  };

  // Get stock type label
  const getStockTypeLabel = (type: string | undefined) => {
    if (!type) return '-';
    const typeMap: Record<string, string> = {
      '01': '非限制',
      '02': '质检',
      '03': '冻结',
      '04': '在途',
    };
    return typeMap[type] || type;
  };

  const getStockTypeBadge = (type: string | undefined) => {
    if (!type) return <Badge variant="outline">-</Badge>;
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      '01': 'default',
      '02': 'secondary',
      '03': 'destructive',
      '04': 'outline',
    };
    return <Badge variant={variantMap[type] || 'outline'}>{getStockTypeLabel(type)}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">库存查询</h1>
        <p className="text-slate-600 mt-1">查询 SAP 物料库存数据 (SAP_COM_0164 | A_MatlStkInAcctMod)</p>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">查询条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="输入物料号 (如 FG10, FG41, TG11)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-[160px]">
              <Select value={plant} onValueChange={setPlant}>
                <SelectTrigger>
                  <SelectValue placeholder="选择工厂" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部工厂</SelectItem>
                  <SelectItem value="1010">1010 - 生产工厂</SelectItem>
                  <SelectItem value="1000">1000 - 集团工厂</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px]">
              <Select value={storageLocation} onValueChange={setStorageLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="存储位置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部位置</SelectItem>
                  <SelectItem value="1003">1003 - 成品仓</SelectItem>
                  <SelectItem value="1001">1001 - 原材料仓</SelectItem>
                  <SelectItem value="101A">101A - 发货仓</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'summary' ? 'default' : 'outline'}
                onClick={() => setViewMode('summary')}
                size="sm"
              >
                汇总视图
              </Button>
              <Button
                variant={viewMode === 'detail' ? 'default' : 'outline'}
                onClick={() => setViewMode('detail')}
                size="sm"
              >
                明细视图
              </Button>
            </div>
            <Button onClick={handleSearch}>查询</Button>
            <Button variant="outline" onClick={handleClear}>清除</Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            {viewMode === 'summary' ? '库存汇总' : '库存明细'}
          </CardTitle>
          {!loading && !error && (
            <Badge variant="secondary">
              {viewMode === 'summary'
                ? `${summaries.length} 种物料 / ${totalCount} 条记录`
                : `共 ${totalCount} 条记录`}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
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
            <div className="text-center py-8 text-red-600">
              <p>查询失败: {error}</p>
              <Button variant="outline" className="mt-4" onClick={handleSearch}>
                重试
              </Button>
            </div>
          ) : viewMode === 'summary' ? (
            summaries.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>暂无数据，请调整查询条件</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">物料号</TableHead>
                    <TableHead className="w-[80px]">工厂</TableHead>
                    <TableHead className="w-[100px]">存储位置</TableHead>
                    <TableHead className="w-[100px]">可用数量</TableHead>
                    <TableHead className="w-[60px]">单位</TableHead>
                    <TableHead className="w-[80px]">批次数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((s) => (
                    <TableRow key={`${s.material}-${s.plant}-${s.storageLocation}`}>
                      <TableCell className="font-medium text-blue-600">
                        {s.material}
                      </TableCell>
                      <TableCell>{s.plant}</TableCell>
                      <TableCell>{s.storageLocation}</TableCell>
                      <TableCell className="text-right font-medium text-green-700">
                        {s.totalQty.toLocaleString()}
                      </TableCell>
                      <TableCell>{s.baseUnit}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.batchCount}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : stocks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>暂无数据，请调整查询条件</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">物料号</TableHead>
                  <TableHead className="w-[70px]">工厂</TableHead>
                  <TableHead className="w-[90px]">存储位置</TableHead>
                  <TableHead className="w-[100px]">批次</TableHead>
                  <TableHead className="w-[80px]">库存类型</TableHead>
                  <TableHead className="w-[90px]">库存数量</TableHead>
                  <TableHead className="w-[60px]">单位</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.map((stock, index) => (
                  <TableRow key={`${stock.Material}-${stock.Plant}-${stock.StorageLocation || ''}-${stock.Batch || ''}-${index}`}>
                    <TableCell className="font-medium text-blue-600">
                      {stock.Material}
                    </TableCell>
                    <TableCell>{stock.Plant}</TableCell>
                    <TableCell>{stock.StorageLocation || '-'}</TableCell>
                    <TableCell>{stock.Batch || '-'}</TableCell>
                    <TableCell>{getStockTypeBadge(stock.InventoryStockType)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(stock.MatlWrhsStkQtyInMatlBaseUnit || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>{stock.MaterialBaseUnit || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
