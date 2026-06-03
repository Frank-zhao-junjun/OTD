'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SALES_ORDER_STATUS_MAP, SAP_DEFAULTS } from '@/lib/sap-service';

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
  RequestedDeliveryDate?: string;
  OverallSDProcessStatus?: string;
  OverallDeliveryStatus?: string;
  OverallBillingStatus?: string;
  PurchaseOrderByCustomer?: string;
  CreationDate?: string;
  // V4 nested items
  _Item?: { value?: Array<SalesOrderItem> };
  _Partner?: { value?: Array<{ PartnerFunction: string; Customer: string; Supplier: string }> };
}

interface SalesOrderItem {
  SalesOrder: string;
  SalesOrderItem: string;
  Product?: string;
  SalesOrderItemText?: string;
  RequestedQuantity?: string | number;
  RequestedQuantityUnit?: string;
  NetAmount?: string | number;
  Plant?: string;
  DeliveryStatus?: string;
}

// Status badge rendering
const getStatusBadge = (status: string | undefined) => {
  if (!status) return <Badge variant="outline">-</Badge>;
  const mapped = SALES_ORDER_STATUS_MAP[status];
  if (mapped) return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
};

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState(SAP_DEFAULTS.salesOrderType);
  const [salesOrg, setSalesOrg] = useState(SAP_DEFAULTS.salesOrganization);
  const [expandItems, setExpandItems] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      params.set('count', 'true');

      // Build filter — default to sell-from-stock scope
      const filterParts: string[] = [];
      if (orderType) filterParts.push(`SalesOrderType eq '${orderType}'`);
      if (salesOrg) filterParts.push(`SalesOrganization eq '${salesOrg}'`);
      filterParts.push(`DistributionChannel eq '${SAP_DEFAULTS.distributionChannel}'`);
      filterParts.push(`OrganizationDivision eq '${SAP_DEFAULTS.division}'`);

      if (searchQuery) {
        // Search by order number or sold-to party
        filterParts.push(`(SalesOrder eq '${searchQuery}' or SoldToParty eq '${searchQuery}' or PurchaseOrderByCustomer eq '${searchQuery}')`);
      }

      if (filterParts.length > 0) {
        params.set('filter', filterParts.join(' and '));
      }

      if (expandItems) {
        params.set('expand', '_Item');
      }

      // Select key fields for performance
      params.set('select', 'SalesOrder,SalesOrderType,SoldToParty,SalesOrganization,DistributionChannel,OrganizationDivision,TotalNetAmount,TransactionCurrency,SalesOrderDate,RequestedDeliveryDate,OverallSDProcessStatus,OverallDeliveryStatus,OverallBillingStatus,PurchaseOrderByCustomer,CreationDate');

      // Use V4 API (CE_SALESORDER_0001) for better data quality
      const response = await fetch(`/api/sap/CE_SALESORDER_0001/SalesOrder?${params.toString()}`);
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
  }, [searchQuery, orderType, salesOrg, expandItems]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = () => fetchOrders();
  const handleClear = () => {
    setSearchQuery('');
    setOrderType(SAP_DEFAULTS.salesOrderType);
    setSalesOrg(SAP_DEFAULTS.salesOrganization);
    setExpandItems(false);
    setSelectedOrder(null);
  };

  // Extract items from V4 nested structure
  const getOrderItems = (order: SalesOrder): SalesOrderItem[] => {
    const nested = order._Item;
    if (!nested) return [];
    if (nested.value && Array.isArray(nested.value)) return nested.value;
    if (Array.isArray(nested)) return nested;
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">销售订单</h1>
        <p className="text-slate-600 mt-1">查询 SAP 销售订单数据 (BD9 - Sell from Stock)</p>
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
                placeholder="输入订单号/客户编号/客户采购单号"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-[180px]">
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger>
                  <SelectValue placeholder="订单类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部类型</SelectItem>
                  <SelectItem value="OR">OR - 标准订单</SelectItem>
                  <SelectItem value="CR">CR - 退货订单</SelectItem>
                  <SelectItem value="DR">DR - 借记订单</SelectItem>
                  <SelectItem value="S1">S1 - 免费交货</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Select value={salesOrg} onValueChange={setSalesOrg}>
                <SelectTrigger>
                  <SelectValue placeholder="销售组织" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部组织</SelectItem>
                  <SelectItem value="1010">1010</SelectItem>
                  <SelectItem value="1020">1020</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={expandItems ? 'default' : 'outline'}
              onClick={() => setExpandItems(!expandItems)}
              title="展开订单行项目"
            >
              {expandItems ? '行项目: 开' : '行项目: 关'}
            </Button>
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
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>查询失败: {error}</p>
              <p className="text-sm text-slate-500 mt-2">请检查SAP凭证配置和网络连接</p>
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
                  <TableHead className="w-[80px]">类型</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>客户采购单号</TableHead>
                  <TableHead className="w-[120px]">金额</TableHead>
                  <TableHead className="w-[100px]">订单日期</TableHead>
                  <TableHead className="w-[80px]">处理状态</TableHead>
                  <TableHead className="w-[80px]">交货状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <>
                    <TableRow
                      key={order.SalesOrder}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedOrder(selectedOrder?.SalesOrder === order.SalesOrder ? null : order)}
                    >
                      <TableCell className="font-medium text-blue-600">
                        {order.SalesOrder}
                      </TableCell>
                      <TableCell>{order.SalesOrderType || '-'}</TableCell>
                      <TableCell>{order.SoldToParty || '-'}</TableCell>
                      <TableCell>{order.PurchaseOrderByCustomer || '-'}</TableCell>
                      <TableCell>
                        {order.TotalNetAmount
                          ? `${order.TotalNetAmount} ${order.TransactionCurrency || 'CNY'}`
                          : '-'}
                      </TableCell>
                      <TableCell>{order.SalesOrderDate || '-'}</TableCell>
                      <TableCell>{getStatusBadge(order.OverallSDProcessStatus)}</TableCell>
                      <TableCell>{getStatusBadge(order.OverallDeliveryStatus)}</TableCell>
                    </TableRow>
                    {/* Expanded items row */}
                    {expandItems && selectedOrder?.SalesOrder === order.SalesOrder && getOrderItems(order).length > 0 && (
                      <TableRow key={`${order.SalesOrder}-items`}>
                        <TableCell colSpan={8} className="bg-slate-50 p-4">
                          <div className="text-sm font-medium mb-2 text-slate-600">行项目明细</div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>行号</TableHead>
                                <TableHead>产品</TableHead>
                                <TableHead>描述</TableHead>
                                <TableHead>数量</TableHead>
                                <TableHead>单位</TableHead>
                                <TableHead>净额</TableHead>
                                <TableHead>工厂</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getOrderItems(order).map((item) => (
                                <TableRow key={item.SalesOrderItem}>
                                  <TableCell>{item.SalesOrderItem}</TableCell>
                                  <TableCell className="font-medium">{item.Product || '-'}</TableCell>
                                  <TableCell>{item.SalesOrderItemText || '-'}</TableCell>
                                  <TableCell>{item.RequestedQuantity || '-'}</TableCell>
                                  <TableCell>{item.RequestedQuantityUnit || '-'}</TableCell>
                                  <TableCell>{item.NetAmount || '-'}</TableCell>
                                  <TableCell>{item.Plant || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
