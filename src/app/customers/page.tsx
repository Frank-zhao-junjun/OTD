'use client';
import { useRouter } from 'next/navigation';

import { useState, useEffect, useCallback } from 'react';
import { FioriBadge, FioriFab } from '@/components/fiori';
import { Users, Search, RotateCcw, Inbox, LayoutList, Table2 } from 'lucide-react';
import { formatSapDate } from '@/lib/utils';

interface Customer {
  Customer: string;
  CustomerName: string;
  CustomerFullName: string;
  BPCustomerName?: string;
  BPCustomerFullName?: string;
  CustomerAccountGroup: string;
  CreationDate: string;
  CustomerCorporateGroup: string;
  Industry: string;
  Supplier: string;
}

const GROUP_COLORS: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  'CUST': 'info',
  '001': 'success',
  '002': 'warning',
};

export default function CustomersPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ top: '50', count: 'true' });
      if (searchQuery) {
        // Step 1: 在本地DB中按名称/编号模糊搜索，获取精确代码
        const searchRes = await fetch(`/api/sap/search?type=customer&q=${encodeURIComponent(searchQuery)}`);
        const searchJson = await searchRes.json();
        if (searchJson.success && searchJson.data && searchJson.data.length > 0) {
          // Step 2: 用精确代码列表过滤SAP数据
          const codes = searchJson.data.map((d: { customer: string }) => d.customer);
          params.set('filter', codes.map((c: string) => `Customer eq '${c}'`).join(' or '));
        } else {
          // 没有匹配结果，直接返回空
          setData([]); setTotalCount(0); setLoading(false); return;
        }
      }
      const res = await fetch(`/api/sap/API_BUSINESS_PARTNER/A_Customer?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setData(json.data || []); setTotalCount(json.totalCount || json.count || 0);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unknown error'); }
    finally { setLoading(false); }
  }, [searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="lg:hidden"><h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>客户管理</h1></div>

      <div className="fiori-filterbar">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            <input type="text" placeholder="客户编号 / 名称（模糊搜索）" className="w-full h-8 pl-8 pr-3 text-sm rounded border outline-none" style={{ background: 'var(--background)', borderColor: 'var(--border)' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchData()} />
          </div>
        </div>
        <div className="hidden lg:flex items-center border rounded overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <button className={`h-8 w-8 flex items-center justify-center ${viewMode === 'card' ? 'text-white' : ''}`} style={viewMode === 'card' ? { background: 'var(--primary)' } : { background: 'var(--card)', color: 'var(--muted-foreground)' }} onClick={() => setViewMode('card')}><LayoutList className="w-4 h-4" /></button>
          <button className={`h-8 w-8 flex items-center justify-center ${viewMode === 'table' ? 'text-white' : ''}`} style={viewMode === 'table' ? { background: 'var(--primary)' } : { background: 'var(--card)', color: 'var(--muted-foreground)' }} onClick={() => setViewMode('table')}><Table2 className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-4 text-sm rounded font-medium text-white" style={{ background: 'var(--primary)' }} onClick={fetchData} disabled={loading}><Search className="w-3.5 h-3.5 inline mr-1" /> 查询</button>
          <button className="h-8 px-3 text-sm rounded border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={() => setSearchQuery('')}><RotateCcw className="w-3.5 h-3.5 inline mr-1" /> 清除</button>
        </div>
      </div>

      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>共 {totalCount} 条记录</div>
      {loading && <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>}
      {error && !loading && <div className="text-center py-12" style={{ color: 'var(--color-fiori-error)' }}><p className="text-sm">{error}</p><button className="mt-2 text-sm underline" onClick={fetchData}>重试</button></div>}
      {!loading && !error && data.length === 0 && <div className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}><Inbox className="w-10 h-10 mx-auto mb-2" /><p className="text-sm">暂无数据</p></div>}

      {!loading && !error && data.length > 0 && (
        <div className={`space-y-2 ${viewMode === 'table' ? 'lg:hidden' : ''}`}>
          {data.map((item) => {
            const groupColor = GROUP_COLORS[item.CustomerAccountGroup] || 'neutral';
            return (
              <div key={item.Customer} className="fiori-oli cursor-pointer" onClick={() => router.push(`/customers/${item.Customer}`)}>
                <div className={`fiori-oli-bar fiori-oli-bar--${groupColor}`} />
                <div className="fiori-oli-content">
                  <div className="fiori-oli-title">{item.Customer} <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span> {item.CustomerName}</div>
                  {item.CustomerFullName && item.CustomerFullName !== item.CustomerName && (
                    <div className="fiori-oli-subtitle" style={{ color: 'var(--muted-foreground)' }}>{item.CustomerFullName}</div>
                  )}
                  <div className="fiori-oli-subtitle">{item.Industry || '-'}</div>
                  <div className="flex items-center gap-2">
                    <FioriBadge variant={groupColor}>{item.CustomerAccountGroup}</FioriBadge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && data.length > 0 && viewMode === 'table' && (
        <div className="hidden lg:block rounded-lg border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: 'var(--muted)' }}>
              <th className="px-4 py-2 text-left">客户编号</th>
              <th className="px-4 py-2 text-left">名称</th>
              <th className="px-4 py-2 text-left">全名</th>
              <th className="px-4 py-2 text-left">行业</th>
              <th className="px-4 py-2 text-center">账户组</th>
            </tr></thead>
            <tbody>{data.map((item) => {
              const groupColor = GROUP_COLORS[item.CustomerAccountGroup] || 'neutral';
              return <tr key={item.Customer} className="border-t cursor-pointer hover:bg-muted/50" style={{ borderColor: 'var(--border)' }} onClick={() => router.push(`/customers/${item.Customer}`)}>
                <td className="px-4 py-3 font-medium">{item.Customer}</td>
                <td className="px-4 py-3">{item.CustomerName}</td>
                <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>{item.CustomerFullName || '-'}</td>
                <td className="px-4 py-3">{item.Industry || '-'}</td>
                <td className="px-4 py-3 text-center"><FioriBadge variant={groupColor}>{item.CustomerAccountGroup}</FioriBadge></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchData} ariaLabel="刷新查询" />
    </div>
  );
}
