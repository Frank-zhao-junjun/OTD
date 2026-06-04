'use client';
import { useRouter } from 'next/navigation';

import { useState, useEffect, useCallback } from 'react';
import { FioriBadge, FioriFab, getSapStatusColor } from '@/components/fiori';
import { Receipt, Search, RotateCcw, Inbox, LayoutList, Table2 } from 'lucide-react';
import { formatSapDate } from '@/lib/utils';

interface BillingDocument {
  BillingDocument: string;
  BillingDocumentType: string;
  SoldToParty: string;
  BillingDocumentDate: string;
  TotalNetAmount: string;
  TransactionCurrency: string;
  OverallBillingStatus: string;
  AccountingPostingStatus: string;
  SalesOrganization: string;
  CompanyCode: string;
  Division: string;
  DistributionChannel: string;
  CreationTime: string;
  LastChangeDate: string;
}

const BILLING_STATUS: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
  'A': { color: 'info', label: '待过账' },
  'B': { color: 'warning', label: '处理中' },
  'C': { color: 'success', label: '已过账' },
  'D': { color: 'error', label: '已取消' },
};

const ACCOUNTING_STATUS: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
  'A': { color: 'info', label: '未过账' },
  'B': { color: 'warning', label: '处理中' },
  'C': { color: 'success', label: '已过账' },
  'D': { color: 'error', label: '已取消' },
};

function formatAmount(amount: string | undefined, currency: string | undefined): string {
  if (!amount) return '-';
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (currency ? ' ' + currency : '');
}

export default function BillingDocumentsPage() {
  const [data, setData] = useState<BillingDocument[]>([]);
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
      if (searchQuery) params.set('filter', `(BillingDocument eq '${searchQuery}' or SoldToParty eq '${searchQuery}')`);
      const res = await fetch(`/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setData(json.data || []); setTotalCount(json.totalCount || json.count || 0);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unknown error'); }
    finally { setLoading(false); }
  }, [searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="lg:hidden"><h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>开票单据</h1></div>
      <div className="fiori-filterbar">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            <input type="text" placeholder="单据号 / 客户" className="w-full h-8 pl-8 pr-3 text-sm rounded border outline-none" style={{ background: 'var(--background)', borderColor: 'var(--border)' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchData()} />
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

      {!loading && !error && data.length > 0 && viewMode === 'card' && (
        <div className="space-y-2">
          {data.map((item) => {
            const statusInfo = BILLING_STATUS[item.OverallBillingStatus || ''] || { color: getSapStatusColor(item.OverallBillingStatus), label: item.OverallBillingStatus || '-' };
            return (
              <div key={item.BillingDocument} className="fiori-oli cursor-pointer" onClick={() => router.push(`/billing-documents/${item.BillingDocument}`)}>
                <div className={`fiori-oli-bar fiori-oli-bar--${statusInfo.color}`} />
                <div className="fiori-oli-content">
                  <div className="fiori-oli-title">{item.BillingDocument} <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span> {item.BillingDocumentType}</div>
                  <div className="fiori-oli-subtitle">{formatSapDate(item.BillingDocumentDate)} <span className="mx-1.5" style={{ color: 'var(--border)' }}>|</span> 客户: {item.SoldToParty}</div>
                  <div className="flex items-center gap-2">
                    <FioriBadge variant={statusInfo.color}>开票{statusInfo.label}</FioriBadge>
                    {item.TotalNetAmount && <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatAmount(item.TotalNetAmount, item.TransactionCurrency)}</span>}
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
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>单据号</th>
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>类型</th>
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>客户</th>
              <th className="text-left px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>开票日期</th>
              <th className="text-right px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>金额</th>
              <th className="text-center px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>开票状态</th>
              <th className="text-center px-4 py-2 font-semibold text-xs" style={{ color: 'var(--muted-foreground)' }}>过账状态</th>
            </tr></thead>
            <tbody>{data.map((item) => {
              const billingStatus = BILLING_STATUS[item.OverallBillingStatus || ''] || { color: getSapStatusColor(item.OverallBillingStatus), label: item.OverallBillingStatus || '-' };
              const accountingStatus = ACCOUNTING_STATUS[item.AccountingPostingStatus || ''] || { color: getSapStatusColor(item.AccountingPostingStatus), label: item.AccountingPostingStatus || '-' };
              return (<tr key={item.BillingDocument} className="border-t hover:bg-accent/50 transition-colors cursor-pointer" style={{ borderColor: 'var(--border)' }} onClick={() => router.push(`/billing-documents/${item.BillingDocument}`)}>
                <td className="px-4 py-3 font-medium text-[#0070F2]">{item.BillingDocument}</td>
                <td className="px-4 py-3">{item.BillingDocumentType}</td>
                <td className="px-4 py-3">{item.SoldToParty}</td>
                <td className="px-4 py-3 tabular-nums">{formatSapDate(item.BillingDocumentDate)}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{formatAmount(item.TotalNetAmount, item.TransactionCurrency)}</td>
                <td className="px-4 py-3 text-center"><FioriBadge variant={billingStatus.color}>{billingStatus.label}</FioriBadge></td>
                <td className="px-4 py-3 text-center"><FioriBadge variant={accountingStatus.color}>{accountingStatus.label}</FioriBadge></td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}
      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchData} ariaLabel="刷新查询" />
    </div>
  );
}
