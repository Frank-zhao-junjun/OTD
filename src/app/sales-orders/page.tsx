'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SALES_ORDER_STATUS_MAP, SAP_DEFAULTS } from '@/lib/sap-service';
import { Search, RotateCcw, ChevronDown, ChevronRight, FileText, AlertCircle, Inbox } from 'lucide-react';

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800">销售订单</h1>
            <p className="text-xs md:text-sm text-slate-500">BD9 Sell from Stock</p>
          </div>
        </div>
      </div>

      {/* Search Card */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-0 md:min-w-[200px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">搜索</label>
              <Input
                placeholder="订单号 / 客户编号 / 客户采购单号"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-full md:w-[160px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">订单类型</label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger><SelectValue placeholder="订单类型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部类型</SelectItem>
                  <SelectItem value="OR">OR - 标准订单</SelectItem>
                  <SelectItem value="CR">CR - 退货订单</SelectItem>
                  <SelectItem value="DR">DR - 借记订单</SelectItem>
                  <SelectItem value="S1">S1 - 免费交货</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">销售组织</label>
              <Select value={salesOrg} onValueChange={setSalesOrg}>
                <SelectTrigger><SelectValue placeholder="销售组织" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部组织</SelectItem>
                  <SelectItem value="1010">1010</SelectItem>
                  <SelectItem value="1020">1020</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={expandItems ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExpandItems(!expandItems)}
              title="展开订单行项目"
            >
              {expandItems ? '行项目: 开' : '行项目: 关'}
            </Button>
            <Button size="sm" onClick={handleSearch} disabled={loading}>
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

      {/* Results Card */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {/* Results Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-700">查询结果</span>
            {!loading && !error && (
              <Badge variant="secondary" className="font-mono text-xs">{totalCount} 条</Badge>
            )}
          </div>
          
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[60px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-sm font-medium text-red-600">查询失败</p>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleSearch}>
                重试
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">暂无数据</p>
              <p className="text-xs text-slate-400 mt-1">请调整查询条件后重试</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="w-[120px] font-medium text-slate-600">订单号</TableHead>
                    <TableHead className="w-[70px] font-medium text-slate-600">类型</TableHead>
                    <TableHead className="font-medium text-slate-600">客户</TableHead>
                    <TableHead className="font-medium text-slate-600">客户采购单号</TableHead>
                    <TableHead className="w-[120px] font-medium text-slate-600 text-right">金额</TableHead>
                    <TableHead className="w-[100px] font-medium text-slate-600">订单日期</TableHead>
                    <TableHead className="w-[80px] font-medium text-slate-600">处理</TableHead>
                    <TableHead className="w-[80px] font-medium text-slate-600">交货</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const isExpanded = selectedOrder?.SalesOrder === order.SalesOrder;
                    const items = expandItems ? getOrderItems(order) : [];
                    return (
                      <>
                        <TableRow
                          key={order.SalesOrder}
                          className={`cursor-pointer transition-colors duration-150 ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                          onClick={() => setSelectedOrder(isExpanded ? null : order)}
                        >
                          <TableCell className="font-mono text-sm text-blue-600 font-medium">
                            {order.SalesOrder}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">{order.SalesOrderType || '-'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{order.SoldToParty || '-'}</TableCell>
                          <TableCell className="text-sm text-slate-500">{order.PurchaseOrderByCustomer || '-'}</TableCell>
                          <TableCell className="text-sm text-right font-mono tabular-nums">
                            {order.TotalNetAmount
                              ? `${Number(order.TotalNetAmount).toLocaleString()} ${order.TransactionCurrency || 'CNY'}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">{order.SalesOrderDate || '-'}</TableCell>
                          <TableCell>{getStatusBadge(order.OverallSDProcessStatus)}</TableCell>
                          <TableCell>{getStatusBadge(order.OverallDeliveryStatus)}</TableCell>
                          <TableCell>
                            {expandItems && items.length > 0 && (
                              isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </TableCell>
                        </TableRow>
                        {/* Expanded items row */}
                        {expandItems && isExpanded && items.length > 0 && (
                          <TableRow key={`${order.SalesOrder}-items`} className="bg-slate-50/60">
                            <TableCell colSpan={9} className="p-4">
                              <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                                <FileText className="w-3 h-3" />
                                行项目明细 ({items.length})
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-xs text-slate-500">行号</TableHead>
                                    <TableHead className="text-xs text-slate-500">产品</TableHead>
                                    <TableHead className="text-xs text-slate-500">描述</TableHead>
                                    <TableHead className="text-xs text-slate-500 text-right">数量</TableHead>
                                    <TableHead className="text-xs text-slate-500">单位</TableHead>
                                    <TableHead className="text-xs text-slate-500 text-right">净额</TableHead>
                                    <TableHead className="text-xs text-slate-500">工厂</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map((item) => (
                                    <TableRow key={item.SalesOrderItem} className="hover:bg-white/60">
                                      <TableCell className="text-xs font-mono">{item.SalesOrderItem}</TableCell>
                                      <TableCell className="text-xs font-medium font-mono">{item.Product || '-'}</TableCell>
                                      <TableCell className="text-xs text-slate-600">{item.SalesOrderItemText || '-'}</TableCell>
                                      <TableCell className="text-xs text-right font-mono tabular-nums">{item.RequestedQuantity || '-'}</TableCell>
                                      <TableCell className="text-xs">{item.RequestedQuantityUnit || '-'}</TableCell>
                                      <TableCell className="text-xs text-right font-mono tabular-nums">{item.NetAmount || '-'}</TableCell>
                                      <TableCell className="text-xs font-mono">{item.Plant || '-'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
