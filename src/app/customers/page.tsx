'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriOli, FioriBadge, FioriFilterBar, FioriPageHeader, FioriEmptyState, FioriErrorState, FioriFab } from '@/components/fiori';
import { Users, Search, RotateCcw, Inbox } from 'lucide-react';

interface Customer {
  Customer: string;
  CustomerName?: string;
  CityName?: string;
  Country?: string;
  PostalCode?: string;
  CustomerGroup?: string;
  SalesOrganization?: string;
  DistributionChannel?: string;
  CreationDate?: string;
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
      params.set('count', 'true');

      const filterParts: string[] = [];
      if (searchQuery) {
        filterParts.push(`(Customer eq '${searchQuery}')`);
      }
      if (filterParts.length > 0) params.set('filter', filterParts.join(' and '));
      params.set('select', 'Customer,CustomerName,CityName,Country,PostalCode,CustomerGroup,SalesOrganization,DistributionChannel');

      const response = await fetch(`/api/sap/API_BUSINESS_PARTNER/A_Customer?${params.toString()}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setCustomers(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  return (
    <div className="space-y-4">
      <FioriPageHeader icon={<Users className="w-5 h-5" />} title="客户管理" count={totalCount} />

      <FioriFilterBar>
        <div className="fiori-filterbar-field flex-1 min-w-[160px]">
          <label>搜索</label>
          <Input placeholder="客户编号" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()} className="h-8 text-sm" />
        </div>
        <Button size="sm" onClick={fetchCustomers} disabled={loading} className="h-8"><Search className="w-3.5 h-3.5 mr-1" /> 查询</Button>
        <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="h-8"><RotateCcw className="w-3.5 h-3.5 mr-1" /> 清除</Button>
      </FioriFilterBar>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="fiori-oli"><div className="fiori-oli-bar fiori-oli-bar--neutral" /><div className="fiori-oli-content" style={{ gap: 6 }}><Skeleton className="h-4 w-[120px]" /><Skeleton className="h-3 w-[180px]" /><Skeleton className="h-3 w-[80px]" /></div></div>
          ))}
        </div>
      ) : error ? (
        <FioriErrorState message={error} onRetry={fetchCustomers} />
      ) : customers.length === 0 ? (
        <FioriEmptyState icon={<Inbox className="w-10 h-10" />} title="暂无数据" description="请调整查询条件后重试" />
      ) : (
        <div>
          {customers.map((c) => (
            <FioriOli
              key={c.Customer}
              barColor="success"
              title={`${c.Customer} · ${c.CustomerName || '-'}`}
              subtitle={`${c.CityName || '-'} ${c.PostalCode || ''} · ${c.Country || '-'}`}
              status={
                <div className="flex items-center gap-2 mt-0.5">
                  {c.CustomerGroup && <FioriBadge variant="info">{c.CustomerGroup}</FioriBadge>}
                  {c.SalesOrganization && (
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {c.SalesOrganization} / {c.DistributionChannel || '-'}
                    </span>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchCustomers} ariaLabel="刷新查询" />
    </div>
  );
}
