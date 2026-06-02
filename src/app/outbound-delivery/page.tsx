'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OutboundDelivery {
  DeliveryDocument: string;
  DeliveryDocumentType?: string;
  SoldToParty?: string;
  DeliveryDate?: string;
  OverallGoodsMovementStatus?: string;
  OverallDeliveryStatus?: string;
}

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

export default function OutboundDeliveryPage() {
  const [deliveries, setDeliveries] = useState<OutboundDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      
      if (searchQuery) {
        params.set('filter', `substringof('${searchQuery}',DeliveryDocument)`);
      }

      const response = await fetch(`/api/sap/API_OUTBOUND_DELIVERY_SRV/A_OutbDeliveryHeader?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch outbound deliveries');
      }

      setDeliveries(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleSearch = () => fetchDeliveries();
  const handleClear = () => {
    setSearchQuery('');
    fetchDeliveries();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">交货单</h1>
        <p className="text-slate-600 mt-1">查询 SAP 外向交货单数据</p>
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
                placeholder="输入交货单号"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
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
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
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
          ) : deliveries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>暂无数据，请调整查询条件</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">交货单号</TableHead>
                  <TableHead className="w-[100px]">单据类型</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead className="w-[120px]">交货日期</TableHead>
                  <TableHead className="w-[100px]">状态</TableHead>
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
                    <TableCell>{delivery.DeliveryDate || '-'}</TableCell>
                    <TableCell>{getStatusBadge(delivery.OverallDeliveryStatus)}</TableCell>
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