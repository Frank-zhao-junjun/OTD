'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SalesOrder {
  SalesOrder: string;
  SalesOrderType?: string;
  SoldToParty?: string;
  TotalNetAmount?: number;
  TransactionCurrency?: string;
  SalesOrderDate?: string;
  OverallSDProcessStatus?: string;
  OverallDeliveryStatus?: string;
  OverallBillingStatus?: string;
}

// Status badge colors
const getStatusBadge = (status: string | undefined) => {
  if (!status) return <Badge variant="outline">未知</Badge>;
  
  const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    'A': { variant: 'default', label: '已完成' },
    'B': { variant: 'secondary', label: '处理中' },
    'C': { variant: 'destructive', label: '已取消' },
    'D': { variant: 'outline', label: '已关闭' },
  };
  
  const mapped = statusMap[status] || { variant: 'outline', label: status };
  return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
};

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      
      if (searchQuery) {
        params.set('filter', `substringof('${searchQuery}',SalesOrder) or substringof('${searchQuery}',SoldToParty)`);
      }
      if (orderType) {
        const existingFilter = params.get('filter');
        const typeFilter = `SalesOrderType eq '${orderType}'`;
        params.set('filter', existingFilter ? `${existingFilter} and ${typeFilter}` : typeFilter);
      }

      // Try V2 API first
      const response = await fetch(`/api/sap/API_SALES_ORDER_SRV/A_SalesOrder?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sales orders');
      }

      setOrders(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, orderType]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = () => fetchOrders();
  const handleClear = () => {
    setSearchQuery('');
    setOrderType('');
    fetchOrders();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">销售订单</h1>
        <p className="text-slate-600 mt-1">查询 SAP 销售订单数据</p>
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
                placeholder="输入订单号或客户编号"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-[200px]">
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger>
                  <SelectValue placeholder="订单类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  <SelectItem value="OR">OR - 标准订单</SelectItem>
                  <SelectItem value="CR">CR - 退货订单</SelectItem>
                  <SelectItem value="DR">DR - 借记订单</SelectItem>
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
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[80px]" />
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
                  <TableHead className="w-[120px]">订单号</TableHead>
                  <TableHead className="w-[100px]">订单类型</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead className="w-[120px]">金额</TableHead>
                  <TableHead className="w-[100px]">订单日期</TableHead>
                  <TableHead className="w-[80px]">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.SalesOrder}>
                    <TableCell className="font-medium text-blue-600">
                      {order.SalesOrder}
                    </TableCell>
                    <TableCell>{order.SalesOrderType || '-'}</TableCell>
                    <TableCell>{order.SoldToParty || '-'}</TableCell>
                    <TableCell>
                      {order.TotalNetAmount 
                        ? `${order.TotalNetAmount} ${order.TransactionCurrency || 'CNY'}` 
                        : '-'}
                    </TableCell>
                    <TableCell>{order.SalesOrderDate || '-'}</TableCell>
                    <TableCell>{getStatusBadge(order.OverallSDProcessStatus)}</TableCell>
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