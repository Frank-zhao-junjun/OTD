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

interface OutboundDeliveryHeader {
  DeliveryDocument: string;
  DeliveryDocumentType?: string;
  SoldToParty?: string;
  ActualGoodsMovementDate?: string;
  OverallGoodsMovementStatus?: string;
  BillingDocumentDate?: string;
  CreationDate?: string;
  LastChangeDate?: string;
  to_DeliveryDocumentPartner?: {
    results?: Array<{
      PartnerFunction: string;
      Customer: string;
      Supplier: string;
      to_Address?: {
        FullName?: string;
        BusinessPartnerName1?: string;
      };
    }>;
  };
}

interface OutboundDeliveryItem {
  DeliveryDocument: string;
  DeliveryDocumentItem: string;
  ReferenceSDDocument?: string;
  ReferenceSDDocumentItem?: string;
  Material?: string;
  DeliveryDocumentItemText?: string;
  ActualDeliveryQuantity?: string;
  DeliveryQuantityUnit?: string;
  GoodsMovementStatus?: string;
  Plant?: string;
  StorageLocation?: string;
  Batch?: string;
  to_DocumentFlow?: {
    results?: Array<{
      PrecedingDocument: string;
      PrecedingDocumentItem: string;
      Subsequentdocument?: string;
      SubsequentDocumentCategory?: string;
    }>;
  };
}

const GOODS_MOVEMENT_STATUS_MAP: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  'A': { variant: 'outline', label: '未处理' },
  'B': { variant: 'secondary', label: '处理中' },
  'C': { variant: 'default', label: '已完成' },
  'D': { variant: 'destructive', label: '已取消' },
};

const getStatusBadge = (status: string | undefined) => {
  if (!status) return <Badge variant="outline">-</Badge>;
  const mapped = GOODS_MOVEMENT_STATUS_MAP[status];
  if (mapped) return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
};

// SAP /Date(xxx)/ timestamp parser
const parseSapDate = (raw: string | undefined): string => {
  if (!raw) return '-';
  const match = raw.match(/\/Date\((\d+)\)\//);
  if (match) return new Date(parseInt(match[1], 10)).toISOString().split('T')[0];
  return raw.split('T')[0];
};

export default function OutboundDeliveryPage() {
  const [deliveries, setDeliveries] = useState<OutboundDeliveryHeader[]>([]);
  const [items, setItems] = useState<OutboundDeliveryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('C'); // Default: completed PGI
  const [activeTab, setActiveTab] = useState<'headers' | 'items'>('headers');
  const [totalCount, setTotalCount] = useState(0);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'headers') {
        const params = new URLSearchParams();
        params.set('top', '50');

        const filterParts: string[] = [];
        if (filterStatus) filterParts.push(`OverallGoodsMovementStatus eq '${filterStatus}'`);
        if (searchQuery) {
          filterParts.push(`DeliveryDocument eq '${searchQuery}'`);
        }
        if (filterParts.length > 0) {
          params.set('filter', filterParts.join(' and '));
        }
        params.set('orderby', 'DeliveryDocument desc');

        const response = await fetch(`/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader?${params.toString()}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Failed to fetch outbound deliveries');

        setDeliveries(data.data || []);
        setTotalCount(data.count || 0);
      } else {
        // Delivery items — filter by PGI completed and actual qty > 0
        const params = new URLSearchParams();
        params.set('top', '100');

        const filterParts: string[] = [];
        if (filterStatus === 'C') {
          filterParts.push(`GoodsMovementStatus eq 'C'`);
          filterParts.push(`ActualDeliveryQuantity gt 0`);
        }
        if (searchQuery) {
          filterParts.push(`(DeliveryDocument eq '${searchQuery}' or ReferenceSDDocument eq '${searchQuery}')`);
        }
        if (filterParts.length > 0) {
          params.set('filter', filterParts.join(' and '));
        }
        params.set('orderby', 'DeliveryDocument desc');
        params.set('expand', 'to_DocumentFlow');

        const response = await fetch(`/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryItem?${params.toString()}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Failed to fetch delivery items');

        setItems(data.data || []);
        setTotalCount(data.count || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, activeTab]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleSearch = () => fetchDeliveries();
  const handleClear = () => {
    setSearchQuery('');
    setFilterStatus('C');
    setActiveTab('headers');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">交货单</h1>
        <p className="text-slate-600 mt-1">查询 SAP 外向交货单数据 (BD9 - Outbound Delivery)</p>
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
                placeholder="输入交货单号或参考销售订单号"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-[160px]">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="过账状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部状态</SelectItem>
                  <SelectItem value="A">未处理</SelectItem>
                  <SelectItem value="B">处理中</SelectItem>
                  <SelectItem value="C">已完成</SelectItem>
                  <SelectItem value="D">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'headers' ? 'default' : 'outline'}
                onClick={() => setActiveTab('headers')}
                size="sm"
              >
                交货单头
              </Button>
              <Button
                variant={activeTab === 'items' ? 'default' : 'outline'}
                onClick={() => setActiveTab('items')}
                size="sm"
              >
                交货单行
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
            {activeTab === 'headers' ? '交货单头' : '交货单行项目'}
          </CardTitle>
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
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>查询失败: {error}</p>
              <p className="text-sm text-slate-500 mt-2">
                提示: 交货单API需要SAP_COM_0106通信安排已部署且EPC_USER已授权
              </p>
              <Button variant="outline" className="mt-4" onClick={handleSearch}>
                重试
              </Button>
            </div>
          ) : activeTab === 'headers' ? (
            deliveries.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>暂无数据，请调整查询条件</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">交货单号</TableHead>
                    <TableHead className="w-[100px]">单据类型</TableHead>
                    <TableHead>售达方</TableHead>
                    <TableHead className="w-[120px]">过账日期</TableHead>
                    <TableHead className="w-[100px]">过账状态</TableHead>
                    <TableHead className="w-[120px]">创建日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.DeliveryDocument}>
                      <TableCell className="font-medium text-blue-600">
                        {delivery.DeliveryDocument}
                      </TableCell>
                      <TableCell>{delivery.DeliveryDocumentType || '-'}</TableCell>
                      <TableCell>{delivery.SoldToParty || '-'}</TableCell>
                      <TableCell>{parseSapDate(delivery.ActualGoodsMovementDate)}</TableCell>
                      <TableCell>{getStatusBadge(delivery.OverallGoodsMovementStatus)}</TableCell>
                      <TableCell>{parseSapDate(delivery.CreationDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>暂无数据，请调整查询条件</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">交货单号</TableHead>
                  <TableHead className="w-[60px]">行号</TableHead>
                  <TableHead className="w-[120px]">参考订单</TableHead>
                  <TableHead className="w-[100px]">物料</TableHead>
                  <TableHead>物料描述</TableHead>
                  <TableHead className="w-[100px]">交货数量</TableHead>
                  <TableHead className="w-[60px]">单位</TableHead>
                  <TableHead className="w-[100px]">工厂</TableHead>
                  <TableHead className="w-[80px]">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={`${item.DeliveryDocument}-${item.DeliveryDocumentItem}`}>
                    <TableCell className="font-medium text-blue-600">
                      {item.DeliveryDocument}
                    </TableCell>
                    <TableCell>{item.DeliveryDocumentItem}</TableCell>
                    <TableCell>{item.ReferenceSDDocument || '-'}</TableCell>
                    <TableCell>{item.Material || '-'}</TableCell>
                    <TableCell>{item.DeliveryDocumentItemText || '-'}</TableCell>
                    <TableCell className="text-right">{item.ActualDeliveryQuantity || '-'}</TableCell>
                    <TableCell>{item.DeliveryQuantityUnit || '-'}</TableCell>
                    <TableCell>{item.Plant || '-'}</TableCell>
                    <TableCell>{getStatusBadge(item.GoodsMovementStatus)}</TableCell>
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
