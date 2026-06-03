'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRODUCTION_ORDER_STATUS_MAP, SAP_DEFAULTS } from '@/lib/sap-service';
import { Factory, Search, RotateCcw, AlertCircle, Inbox } from 'lucide-react';

interface ProductionOrder {
  ProductionOrder: string;
  Material?: string;
  ProductionPlant?: string;
  ManufacturingOrderType?: string;
  PlannedTotalQty?: string | number;
  MfgOrderPlannedStartDate?: string;
  MfgOrderPlannedEndDate?: string;
  ProductionOrderStatus?: string;
  ProductionOrderStatusText?: string;
  CreationDate?: string;
  LastChangeDateTime?: string;
  TotalQuantity?: string | number;
  ConfirmedQuantity?: string | number;
  MfgOrderActualStartDate?: string;
  MfgOrderActualEndDate?: string;
  // V4 nested
  _Item?: { value?: Array<ProductionOrderItem> };
  _Operation?: { value?: Array<ProductionOrderOperation> };
}

interface ProductionOrderItem {
  ProductionOrder: string;
  ProductionOrderItem: string;
  Material?: string;
  ProductionOrderItemText?: string;
  PlannedTotalQty?: string | number;
  MfgOrderItemPlannedScrapQty?: string | number;
  ProductionPlant?: string;
}

interface ProductionOrderOperation {
  ProductionOrder: string;
  Operation: string;
  WorkCenter?: string;
  OperationText?: string;
  OpPlannedTotalQuantity?: string | number;
  OpConfirmedQty?: string | number;
}

// Status mapping for production orders
const getStatusInfo = (status: string | undefined) => {
  if (!status) return { variant: 'outline' as const, label: '-' };

  // Handle combined status like "REL PCNF" — take the first one
  const primaryStatus = status.split(' ')[0];
  const mapped = PRODUCTION_ORDER_STATUS_MAP[primaryStatus];
  if (mapped) return mapped;
  return { variant: 'outline' as const, label: status };
};

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [plant, setPlant] = useState(SAP_DEFAULTS.plant);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      params.set('count', 'true');

      // Build filter
      const filterParts: string[] = [];
      if (plant) filterParts.push(`ProductionPlant eq '${plant}'`);
      if (searchQuery) {
        filterParts.push(`(ProductionOrder eq '${searchQuery}' or Material eq '${searchQuery}')`);
      }

      if (filterParts.length > 0) {
        params.set('filter', filterParts.join(' and '));
      }

      // Select key fields
      params.set('select', 'ProductionOrder,Material,ProductionPlant,ManufacturingOrderType,PlannedTotalQty,MfgOrderPlannedStartDate,MfgOrderPlannedEndDate,ProductionOrderStatus,ProductionOrderStatusText,CreationDate,TotalQuantity,ConfirmedQuantity,MfgOrderActualStartDate,MfgOrderActualEndDate');

      if (showDetails) {
        params.set('expand', '_Item,_Operation');
      }

      // Use V4 API for better data quality
      const response = await fetch(`/api/sap/CE_PRODUCTIONORDER_0001/ProductionOrder?${params.toString()}`);
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
  }, [searchQuery, plant, showDetails]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = () => fetchOrders();
  const handleClear = () => {
    setSearchQuery('');
    setPlant(SAP_DEFAULTS.plant);
    setShowDetails(false);
    setSelectedOrder(null);
  };

  // Extract items from V4 nested structure
  const getOrderItems = (order: ProductionOrder): ProductionOrderItem[] => {
    const nested = order._Item;
    if (!nested) return [];
    if (nested.value && Array.isArray(nested.value)) return nested.value;
    if (Array.isArray(nested)) return nested;
    return [];
  };

  const getOrderOperations = (order: ProductionOrder): ProductionOrderOperation[] => {
    const nested = order._Operation;
    if (!nested) return [];
    if (nested.value && Array.isArray(nested.value)) return nested.value;
    if (Array.isArray(nested)) return nested;
    return [];
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
                  <SelectItem value="1010">1010 - 主工厂</SelectItem>
                  <SelectItem value="1020">1020</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={showDetails ? 'default' : 'outline'}
              onClick={() => setShowDetails(!showDetails)}
              title="展开订单明细"
            >
              {showDetails ? '明细: 开' : '明细: 关'}
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
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[120px]" />
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
                  <TableHead className="w-[150px]">生产订单号</TableHead>
                  <TableHead className="w-[120px]">物料号</TableHead>
                  <TableHead className="w-[80px]">工厂</TableHead>
                  <TableHead className="w-[100px]">计划数量</TableHead>
                  <TableHead className="w-[100px]">确认数量</TableHead>
                  <TableHead className="w-[100px]">计划开始</TableHead>
                  <TableHead className="w-[100px]">计划结束</TableHead>
                  <TableHead className="w-[100px]">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.ProductionOrderStatus);
                  const isExpanded = selectedOrder?.ProductionOrder === order.ProductionOrder;
                  const items = showDetails && isExpanded ? getOrderItems(order) : [];
                  const operations = showDetails && isExpanded ? getOrderOperations(order) : [];

                  return (
                    <>
                      <TableRow
                        key={order.ProductionOrder}
                        className={`cursor-pointer hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}
                        onClick={() => setSelectedOrder(isExpanded ? null : order)}
                      >
                        <TableCell className="font-medium text-blue-600">
                          {order.ProductionOrder}
                        </TableCell>
                        <TableCell>{order.Material || '-'}</TableCell>
                        <TableCell>{order.ProductionPlant || '-'}</TableCell>
                        <TableCell>{order.PlannedTotalQty || order.TotalQuantity || '-'}</TableCell>
                        <TableCell>{order.ConfirmedQuantity || '-'}</TableCell>
                        <TableCell>{order.MfgOrderPlannedStartDate || '-'}</TableCell>
                        <TableCell>{order.MfgOrderPlannedEndDate || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                      </TableRow>
                      {/* Expanded details */}
                      {showDetails && isExpanded && (items.length > 0 || operations.length > 0) && (
                        <TableRow key={`${order.ProductionOrder}-detail`}>
                          <TableCell colSpan={8} className="bg-slate-50 p-4">
                            {/* Items */}
                            {items.length > 0 && (
                              <div className="mb-4">
                                <div className="text-sm font-medium mb-2 text-slate-600">订单组件</div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>行号</TableHead>
                                      <TableHead>物料</TableHead>
                                      <TableHead>描述</TableHead>
                                      <TableHead>计划数量</TableHead>
                                      <TableHead>工厂</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {items.map((item) => (
                                      <TableRow key={item.ProductionOrderItem}>
                                        <TableCell>{item.ProductionOrderItem}</TableCell>
                                        <TableCell className="font-medium">{item.Material || '-'}</TableCell>
                                        <TableCell>{item.ProductionOrderItemText || '-'}</TableCell>
                                        <TableCell>{item.PlannedTotalQty || '-'}</TableCell>
                                        <TableCell>{item.ProductionPlant || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                            {/* Operations */}
                            {operations.length > 0 && (
                              <div>
                                <div className="text-sm font-medium mb-2 text-slate-600">工序</div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>工序号</TableHead>
                                      <TableHead>工作中心</TableHead>
                                      <TableHead>描述</TableHead>
                                      <TableHead>计划数量</TableHead>
                                      <TableHead>确认数量</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {operations.map((op) => (
                                      <TableRow key={op.Operation}>
                                        <TableCell>{op.Operation}</TableCell>
                                        <TableCell>{op.WorkCenter || '-'}</TableCell>
                                        <TableCell>{op.OperationText || '-'}</TableCell>
                                        <TableCell>{op.OpPlannedTotalQuantity || '-'}</TableCell>
                                        <TableCell>{op.OpConfirmedQty || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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
