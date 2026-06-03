'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriOli, FioriBadge, FioriFilterBar, FioriPageHeader, FioriEmptyState, FioriErrorState, FioriFab, getSapStatusColor } from '@/components/fiori';
import { Receipt, Search, RotateCcw, Inbox } from 'lucide-react';

interface BillingDocument {
  BillingDocument: string;
  BillingDocumentType?: string;
  SoldToParty?: string;
  TotalNetAmount?: string | number;
  TransactionCurrency?: string;
  BillingDocumentDate?: string;
  CreationDate?: string;
  OverallBillingStatus?: string;
}

export default function BillingDocumentsPage() {
  const [invoices, setInvoices] = useState<BillingDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('top', '50');
      params.set('count', 'true');

      const filterParts: string[] = [];
      if (searchQuery) {
        filterParts.push(`(BillingDocument eq '${searchQuery}' or SoldToParty eq '${searchQuery}')`);
      }
      if (filterParts.length > 0) params.set('filter', filterParts.join(' and '));
      params.set('select', 'BillingDocument,BillingDocumentType,SoldToParty,TotalNetAmount,TransactionCurrency,BillingDocumentDate,CreationDate');

      const response = await fetch(`/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument?${params}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setInvoices(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  return (
    <div className="space-y-4">
      <FioriPageHeader icon={<Receipt className="w-5 h-5" />} title="开票单据" count={totalCount} />

      <FioriFilterBar>
        <div className="fiori-filterbar-field flex-1 min-w-[160px]">
          <label>搜索</label>
          <Input placeholder="开票单号 / 客户编号" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchInvoices()} className="h-8 text-sm" />
        </div>
        <Button size="sm" onClick={fetchInvoices} disabled={loading} className="h-8"><Search className="w-3.5 h-3.5 mr-1" /> 查询</Button>
        <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="h-8"><RotateCcw className="w-3.5 h-3.5 mr-1" /> 清除</Button>
      </FioriFilterBar>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="fiori-oli"><div className="fiori-oli-bar fiori-oli-bar--neutral" /><div className="fiori-oli-content" style={{ gap: 6 }}><Skeleton className="h-4 w-[120px]" /><Skeleton className="h-3 w-[180px]" /><Skeleton className="h-3 w-[80px]" /></div></div>
          ))}
        </div>
      ) : error ? (
        <FioriErrorState message={error} onRetry={fetchInvoices} />
      ) : invoices.length === 0 ? (
        <FioriEmptyState icon={<Inbox className="w-10 h-10" />} title="暂无数据" description="请调整查询条件后重试" />
      ) : (
        <div>
          {invoices.map((inv) => (
            <FioriOli
              key={inv.BillingDocument}
              barColor={getSapStatusColor(inv.OverallBillingStatus)}
              title={`${inv.BillingDocument} · ${inv.BillingDocumentType || '-'}`}
              subtitle={`客户 ${inv.SoldToParty || '-'} · ${inv.BillingDocumentDate || '-'}`}
              status={
                <div className="flex items-center gap-2 mt-0.5">
                  <FioriBadge variant={getSapStatusColor(inv.OverallBillingStatus)}>{inv.OverallBillingStatus || '-'}</FioriBadge>
                  {inv.TotalNetAmount && (
                    <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--foreground)' }}>
                      {Number(inv.TotalNetAmount).toLocaleString()} {inv.TransactionCurrency || 'CNY'}
                    </span>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      <FioriFab icon={<Search className="w-5 h-5" />} onClick={fetchInvoices} ariaLabel="刷新查询" />
    </div>
  );
}
