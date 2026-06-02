'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Customer {
  Customer: string;
  CustomerName?: string;
  CityName?: string;
  Country?: string;
  CustomerGroup?: string;
  CustomerType?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      
      if (searchQuery) {
        params.set('filter', `substringof('${searchQuery}',Customer) or substringof('${searchQuery}',CustomerName)`);
      }

      const response = await fetch(`/api/sap/API_BUSINESS_PARTNER/A_Customer?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch customers');
      }

      setCustomers(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = () => fetchCustomers();
  const handleClear = () => {
    setSearchQuery('');
    fetchCustomers();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">客户管理</h1>
        <p className="text-slate-600 mt-1">查询 SAP 客户主数据</p>
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
                placeholder="输入客户编号或名称"
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
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[200px]" />
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
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>暂无数据，请调整查询条件</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">客户编号</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead className="w-[150px]">城市</TableHead>
                  <TableHead className="w-[80px]">国家</TableHead>
                  <TableHead className="w-[100px]">客户类型</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.Customer}>
                    <TableCell className="font-medium text-blue-600">
                      {customer.Customer}
                    </TableCell>
                    <TableCell>{customer.CustomerName || '-'}</TableCell>
                    <TableCell>{customer.CityName || '-'}</TableCell>
                    <TableCell>{customer.Country || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.CustomerType || '-'}</Badge>
                    </TableCell>
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