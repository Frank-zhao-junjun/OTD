'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState, getSapStatusColor } from '@/components/fiori';
import { ArrowLeft, Receipt } from 'lucide-react';

interface BillingDocument {
  BillingDocument: string;
  SoldToParty?: string;
  SoldToPartyName?: string;
  BillingDocumentDate?: string;
  BillingType?: string;
  TotalNetAmount?: string;
  TransactionCurrency?: string;
  BillingDocumentStatus?: string;
  StatusText?: string;
  SalesOrganization?: string;
  DistributionChannel?: string;
  Division?: string;
  NetAmount?: string;
  TaxAmount?: string;
}

const BILLING_STATUS: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
  'A': { color: 'info', label: '待过账' },
  'B': { color: 'warning', label: '处理中' },
  'C': { color: 'success', label: '已过账' },
  'D': { color: 'error', label: '已取消' },
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const match = dateStr.match(/\/Date\((\d+)\)\//);
  if (match) {
    const d = new Date(parseInt(match[1]));
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return dateStr;
}

function formatAmount(amount: string | undefined, currency: string | undefined): string {
  if (!amount) return '-';
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (currency ? ' ' + currency : '');
}

export default function BillingDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [doc, setDoc] = useState<BillingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('id', id);
        const response = await fetch(`/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument?${searchParams.toString()}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        setDoc(results[0] || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDoc();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div className="fiori-objheader">
          <div className="flex items-center gap-3 mb-4"><Skeleton className="w-10 h-10 rounded-lg" /><div><Skeleton className="h-6 w-40 mb-1" /><Skeleton className="h-4 w-60" /></div></div>
          <div className="fiori-objheader-fields">{Array.from({ length: 8 }).map((_, i) => (<div key={i} className="fiori-objheader-field"><Skeleton className="h-3 w-[60px] mb-1" /><Skeleton className="h-4 w-[100px]" /></div>))}</div>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <FioriErrorState message={error || '未找到开票单据数据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const statusInfo = BILLING_STATUS[doc.BillingDocumentStatus || ''] || { color: getSapStatusColor(doc.BillingDocumentStatus), label: doc.StatusText || doc.BillingDocumentStatus || '-' };

  const fields = [
    { label: '开票类型', value: doc.BillingType || '-' },
    { label: '售达方', value: doc.SoldToPartyName || doc.SoldToParty || '-' },
    { label: '开票日期', value: formatDate(doc.BillingDocumentDate) },
    { label: '销售组织', value: doc.SalesOrganization || '-' },
    { label: '分销渠道', value: doc.DistributionChannel || '-' },
    { label: '产品组', value: doc.Division || '-' },
    { label: '净额', value: formatAmount(doc.NetAmount || doc.TotalNetAmount, doc.TransactionCurrency) },
    { label: '税额', value: formatAmount(doc.TaxAmount, doc.TransactionCurrency) },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/billing-documents')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="fiori-objheader">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="fiori-objheader-title">{doc.BillingDocument}</div>
            <div className="fiori-objheader-subtitle">
              {doc.SoldToPartyName || doc.SoldToParty || '-'} · {formatDate(doc.BillingDocumentDate)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={statusInfo.color}>{statusInfo.label}</FioriBadge>
        </div>
        <div className="fiori-objheader-fields">
          {fields.map((field) => (
            <div key={field.label} className="fiori-objheader-field">
              <span className="fiori-objheader-field-label">{field.label}</span>
              <span className="fiori-objheader-field-value">{field.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
