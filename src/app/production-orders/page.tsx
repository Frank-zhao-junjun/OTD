'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductionOrder {
  ProductionOrder: string;
  Material?: string;
  ProductionPlant?: string;
  ManufacturingOrderType?: string;
  PlannedTotalQty?: number;
  ConfirmedQty?: number;
  ProductionOrderStatus?: string;
  CreationDate?: string;
  OrderStartDate?: string;
  OrderEndDate?: string;
}

// Status mapping for production orders
const getStatusInfo = (status: string | undefined) => {
  if (!status) return { variant: 'outline' as const, label: '未知' };
  
  // SAP Production Order Status codes
  const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    'CRTD': { variant: 'outline', label: '已创建' },
    'REL': { variant: 'default', label: '已释放' },
    'PCNF': { variant: 'secondary', label: '部分确认' },
    'CNF': { variant: 'default', label: '已确认' },
    'PDLV': { variant: 'secondary', label: '部分交货' },
    'DLV': { variant: 'default', label: '已交货' },
    'TECO': { variant: 'outline', label: '技术完成' },
    'CLSD': { variant: 'outline', label: '已关闭' },
    'DLFL': { variant: 'destructive', label: '已删除' },
  };
  
  // Handle combined status like "REL PCNF"
  const primaryStatus = status.split(' ')[0];
  return statusMap[primaryStatus] || { variant: 'outline', label: status };
};

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [plant, setPlant] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      
      if (searchQuery) {
        params.set('filter', `substringof('${searchQuery}',ProductionOrder) or substringof('${searchQuery}',Material)`);
      }
      if (plant) {
        const existingFilter = params.get('filter');
        const plantFilter = `ProductionPlant eq '${plant}'`;
        params.set('filter', existingFilter ? `${existingFilter} and ${plantFilter}` : plantFilter);
      }

      const response = await fetch(`/api/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch production orders');
      }

      setOrders(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, plant]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = () => fetchOrders();
  const handleClear = () => {
    setSearchQuery('');
    setPlant('');
    fetchOrders();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">生产订单</h1>
        <p className="text-slate-600 mt-1">查询 SAP 生产订单数据</p>
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
                placeholder="输入生产订单号或物料号"
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
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[80px]" />
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
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>暂无数据，请调整查询条件</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">生产订单号</TableHead>
                  <TableHead className="w-[120px]">物料号</TableHead>
                  <TableHead className="w-[80px]">工厂</TableHead>
                  <TableHead className="w-[100px]">计划数量</TableHead>
                  <TableHead className="w-[100px]">确认数量</TableHead>
                  <TableHead className="w-[100px]">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.ProductionOrderStatus);
                  return (
                    <TableRow key={order.ProductionOrder}>
                      <TableCell className="font-medium text-blue-600">
                        {order.ProductionOrder}
                      </TableCell>
                      <TableCell>{order.Material || '-'}</TableCell>
                      <TableCell>{order.ProductionPlant || '-'}</TableCell>
                      <TableCell>
                        {order.PlannedTotalQty 
                          ? `${order.PlannedTotalQty}` 
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {order.ConfirmedQty 
                          ? `${order.ConfirmedQty}` 
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}