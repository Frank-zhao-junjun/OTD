'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Search, RotateCcw, AlertCircle, Inbox } from 'lucide-react';

interface Product {
  Product: string;
  ProductType?: string;
  BaseUnit?: string;
  ProductGroup?: string;
  ProductDescription?: string;
  CreationDate?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [productGroup, setProductGroup] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // Fetch products from SAP API
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.set('top', '50');
      
      if (searchQuery) {
        params.set('filter', `substringof('${searchQuery}',Product) or substringof('${searchQuery}',ProductDescription)`);
      }
      if (productGroup) {
        const existingFilter = params.get('filter');
        const groupFilter = `ProductGroup eq '${productGroup}'`;
        params.set('filter', existingFilter ? `${existingFilter} and ${groupFilter}` : groupFilter);
      }

      const response = await fetch(`/api/sap/API_PRODUCT_SRV/A_Product?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      setProducts(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, productGroup]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle search
  const handleSearch = () => {
    fetchProducts();
  };

  // Clear filters
  const handleClear = () => {
    setSearchQuery('');
    setProductGroup('');
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-lg md:text-2xl font-bold text-slate-800">产品管理</h1>
        <p className="text-slate-600 mt-1">查询 SAP 产品主数据</p>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">查询条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-0 md:min-w-[200px]">
              <Input
                placeholder="输入产品编号或描述"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-[200px]">
              <Select value={productGroup} onValueChange={setProductGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="选择物料组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  <SelectItem value="001">001 - 原材料</SelectItem>
                  <SelectItem value="002">002 - 半成品</SelectItem>
                  <SelectItem value="003">003 - 成品</SelectItem>
                  <SelectItem value="004">004 - 包装材料</SelectItem>
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
            // Loading skeleton
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          ) : error ? (
            // Error message
            <div className="text-center py-8 text-red-600">
              <p>查询失败: {error}</p>
              <Button variant="outline" className="mt-4" onClick={handleSearch}>
                重试
              </Button>
            </div>
          ) : products.length === 0 ? (
            // Empty state
            <div className="text-center py-8 text-slate-500">
              <p>暂无数据，请调整查询条件</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">产品编号</TableHead>
                  <TableHead>产品描述</TableHead>
                  <TableHead className="w-[100px]">产品类型</TableHead>
                  <TableHead className="w-[100px]">物料组</TableHead>
                  <TableHead className="w-[80px]">单位</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.Product}>
                    <TableCell className="font-medium text-blue-600">
                      {product.Product}
                    </TableCell>
                    <TableCell>{product.ProductDescription || '-'}</TableCell>
                    <TableCell>{product.ProductType || '-'}</TableCell>
                    <TableCell>{product.ProductGroup || '-'}</TableCell>
                    <TableCell>{product.BaseUnit || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}