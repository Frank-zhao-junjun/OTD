'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MaterialStock {
  Material: string;
  Plant: string;
  StorageLocation?: string;
  Batch?: string;
  MaterialBaseUnit?: string;
  StockLevel?: number;
  InventoryStockType?: string;
}

export default function MaterialStockPage() {
  const [stocks, setStocks] = useState<MaterialStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [plant, setPlant] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '100');
      
      if (searchQuery) {
        params.set('filter', `substringof('${searchQuery}',Material)`);
      }
      if (plant) {
        const existingFilter = params.get('filter');
        const plantFilter = `Plant eq '${plant}'`;
        params.set('filter', existingFilter ? `${existingFilter} and ${plantFilter}` : plantFilter);
      }

      const response = await fetch(`/api/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch material stock');
      }

      setStocks(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, plant]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const handleSearch = () => fetchStocks();
  const handleClear = () => {
    setSearchQuery('');
    setPlant('');
    fetchStocks();
  };

  // Get stock type label
  const getStockTypeLabel = (type: string | undefined) => {
    if (!type) return '-';
    const typeMap: Record<string, string> = {
      '01': '非限制使用',
      '02': '质量检验',
      '03': '冻结',
      '04': '在途',
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">库存查询</h1>
        <p className="text-slate-600 mt-1">查询 SAP 物料库存数据</p>
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
                placeholder="输入物料号"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-[200px]">
              <Select value={plant} onValueChange={setPlant}>
                <SelectTrigger>
                  <SelectValue placeholder="选择工厂" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部工厂</SelectItem>
                  <SelectItem value="1000">1000 - 主工厂</SelectItem>
                  <SelectItem value="2000">2000 - 分工厂</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch}>查询</Button>
            <Button variant="outline" onClick={handleClear}>清除</Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">查询结果</CardTitle>
          {!loading && !error && (
            <Badge variant="secondary">共 {totalCount} 条记录</Badge>
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
          ) : stocks.length === 0 ? (
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
                  <TableHead className="w-[100px]">批次</TableHead>
                  <TableHead className="w-[80px]">库存类型</TableHead>
                  <TableHead className="w-[100px]">库存数量</TableHead>
                  <TableHead className="w-[60px]">单位</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.map((stock, index) => (
                  <TableRow key={`${stock.Material}-${stock.Plant}-${stock.StorageLocation || ''}-${index}`}>
                    <TableCell className="font-medium text-blue-600">
                      {stock.Material}
                    </TableCell>
                    <TableCell>{stock.Plant}</TableCell>
                    <TableCell>{stock.StorageLocation || '-'}</TableCell>
                    <TableCell>{stock.Batch || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getStockTypeLabel(stock.InventoryStockType)}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {stock.StockLevel || 0}
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