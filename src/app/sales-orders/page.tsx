'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SALES_ORDER_STATUS_MAP, SAP_DEFAULTS } from '@/lib/sap-service';
import { FioriOli, FioriBadge, FioriFilterBar, FioriPageHeader, FioriEmptyState, FioriErrorState, FioriFab, getSapStatusColor, getSapStatusLabel } from '@/components/fiori';
import { Search, RotateCcw, Filter, FileText, Inbox } from 'lucide-react';

interface SalesOrder {
  SalesOrder: string;
  SalesOrderType?: string;
  SoldToParty?: string;
  SoldToPartyName?: string;
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
  StatusText?: string;
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState(SAP_DEFAULTS.salesOrderType);
  const [salesOrg, setSalesOrg] = useState(SAP_DEFAULTS.salesOrganization);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilter, setShowFilter] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      params.set('count', 'true');

      const filterParts: string[] = [];
      if (orderType && orderType !== 'all') filterParts.push(`SalesOrderType eq '${orderType}'`);
      if (salesOrg && salesOrg !== 'all') filterParts.push(`SalesOrganization eq '${salesOrg}'`);
      if (orderType !== 'all' || salesOrg !== 'all') {
        filterParts.push(`DistributionChannel eq '${SAP_DEFAULTS.distributionChannel}'`);
        filterParts.push(`OrganizationDivision eq '${SAP_DEFAULTS.division}'`);
      }

      if (searchQuery) {
        filterParts.push(`(SalesOrder eq '${searchQuery}' or SoldToParty eq '${searchQuery}' or PurchaseOrderByCustomer eq '${searchQuery}')`);
      }

      if (filterParts.length > 0) {
        params.set('filter', filterParts.join(' and '));
      }

      const response = await fetch(`/api/sap/CE_SALESORDER_0001/SalesOrder?${params.toString()}`);
      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setOrders(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, orderType, salesOrg]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleClear = () => {
    setSearchQuery('');
    setOrderType(SAP_DEFAULTS.salesOrderType);
    setSalesOrg(SAP_DEFAULTS.salesOrganization);
  };

  const getStatusColor = (status: string | undefined): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    if (!status) return 'neutral';
    const mapped = SALES_ORDER_STATUS_MAP[status];
    if (mapped) {
      switch (mapped.variant) {
        case 'default': return 'success';
        case 'secondary': return 'info';
        case 'outline': return 'neutral';
        case 'destructive': return 'error';
        default: return 'neutral';
      }
    }
    return getSapStatusColor(status);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const match = dateStr.match(/\/Date\((\d+)\)\//);
    if (match) return new Date(parseInt(match[1])).toLocaleDateString('zh-CN');
    return dateStr;
  };

  return (
    <div className="space-y-4">
      <FioriPageHeader icon={<FileText className="w-5 h-5" />} title="销售订单" count={totalCount} />

      {/* FilterBar */}
      <FioriFilterBar>
        <div className="fiori-filterbar-field flex-1 min-w-[160px]">
          <label>搜索</label>
          <Input
            placeholder="订单号 / 客户编号"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
            className="h-8 text-sm"
          />
        </div>
        <Button size="sm" onClick={fetchOrders} disabled={loading} className="h-8">
          <Search className="w-3.5 h-3.5 mr-1" /> 查询
        </Button>
        <Button variant="outline" size="sm" onClick={handleClear} className="h-8">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> 清除
        </Button>

        {showFilter && (
          <>
            <div className="fiori-filterbar-field w-[140px]">
              <label>订单类型</label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="OR">OR - 标准订单</SelectItem>
                  <SelectItem value="CR">CR - 退货订单</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="fiori-filterbar-field w-[120px]">
              <label>销售组织</label>
              <Select value={salesOrg} onValueChange={setSalesOrg}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="1010">1010</SelectItem>
                  <SelectItem value="1020">1020</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={() => setShowFilter(!showFilter)} className="h-8 text-xs">
          <Filter className="w-3.5 h-3.5 mr-1" />
          {showFilter ? '收起' : '筛选'}
        </Button>
      </FioriFilterBar>

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="fiori-oli">
              <div className="fiori-oli-bar fiori-oli-bar--neutral" />
              <div className="fiori-oli-content" style={{ gap: 6 }}>
                <Skeleton className="h-4 w-[140px]" />
                <Skeleton className="h-3 w-[200px]" />
                <Skeleton className="h-3 w-[80px]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <FioriErrorState message={error} onRetry={fetchOrders} />
      ) : orders.length === 0 ? (
        <FioriEmptyState
          icon={<Inbox className="w-10 h-10" />}
          title="暂无数据"
          description="请调整查询条件后重试"
        />
      ) : (
        <div className="space-y-0">
          {orders.map((order) => {
            const statusColor = getStatusColor(order.OverallSDProcessStatus);
            const statusLabel = order.StatusText || SALES_ORDER_STATUS_MAP[order.OverallSDProcessStatus || '']?.label || getSapStatusLabel(order.OverallSDProcessStatus);
            return (
              <Link key={order.SalesOrder} href={`/sales-orders/${order.SalesOrder}`} className="block">
                <FioriOli
                  barColor={statusColor}
                  title={`${order.SalesOrder} · ${order.SoldToPartyName || order.SoldToParty || '-'}`}
                  subtitle={`${formatDate(order.SalesOrderDate)} · ${order.PurchaseOrderByCustomer || '-'}`}
                  status={
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <FioriBadge variant={statusColor}>{statusLabel}</FioriBadge>
                      {order.TotalNetAmount && (
                        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--foreground)' }}>
                          {Number(order.TotalNetAmount).toLocaleString()} {order.TransactionCurrency || 'CNY'}
                        </span>
                      )}
                    </div>
                  }
                />
              </Link>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchOrders} ariaLabel="刷新查询" />
    </div>
  );
}
