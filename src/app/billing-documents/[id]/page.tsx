'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { ArrowLeft, FileText } from 'lucide-react';

interface BillingItem {
  BillingDocument: string;
  BillingDocumentType: string;
  BillingDocumentDate: string;
  TotalNetAmount: string;
  TransactionCurrency: string;
  SoldToParty: string;
  SalesOrganization: string;
  OverallBillingStatus: string;
  AccountingPostingStatus: string;
}

import { formatSapDate } from '@/lib/utils';

function formatAmount(amount: string | undefined, currency: string | undefined): string {
  if (!amount) return '-';
  const n = parseFloat(amount);
  if (isNaN(n)) return amount;
  return `${n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} ${currency || ''}`;
}

const BILLING_STATUS_MAP: Record<string, { label: string; variant: 'error' | 'success' | 'warning' | 'info' | 'neutral' }> = {
  'A': { label: '未处理', variant: 'neutral' },
  'B': { label: '处理中', variant: 'warning' },
  'C': { label: '已完成', variant: 'success' },
};

const POSTING_STATUS_MAP: Record<string, { label: string; variant: 'error' | 'success' | 'warning' | 'info' | 'neutral' }> = {
  'A': { label: '未过账', variant: 'neutral' },
  'B': { label: '过账中', variant: 'warning' },
  'C': { label: '已过账', variant: 'success' },
  'D': { label: '错误', variant: 'error' },
};

const BILLING_TYPE_MAP: Record<string, string> = {
  'F2': '发票',
  'F1': '订单相关发票',
  'F8': '贷项凭证',
  'G2': '贷记备忘录',
  'RE': '退货发票',
  'S1': '取消发票',
  'S2': '取消贷项凭证',
};

export default function BillingDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(params.id as string);

  const [item, setItem] = useState<BillingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument?id=${encodeURIComponent(id)}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        setItem(results[0] || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchItem();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div className="fiori-objheader">
          <div className="flex items-center gap-3 mb-4"><Skeleton className="w-10 h-10 rounded-lg" /><div><Skeleton className="h-6 w-40 mb-1" /><Skeleton className="h-4 w-60" /></div></div>
          <div className="fiori-objheader-fields">{Array.from({ length: 6 }).map((_, i) => (<div key={i} className="fiori-objheader-field"><Skeleton className="h-3 w-[60px] mb-1" /><Skeleton className="h-4 w-[100px]" /></div>))}</div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <FioriErrorState message={error || '未找到开票单据数据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const billingStatus = BILLING_STATUS_MAP[item.OverallBillingStatus] || { label: item.OverallBillingStatus, variant: 'outline' as const };
  const postingStatus = POSTING_STATUS_MAP[item.AccountingPostingStatus] || { label: item.AccountingPostingStatus, variant: 'outline' as const };

  const fields = [
    { label: '开票单号', value: item.BillingDocument },
    { label: '开票类型', value: BILLING_TYPE_MAP[item.BillingDocumentType] || item.BillingDocumentType },
    { label: '开票日期', value: formatSapDate(item.BillingDocumentDate) },
    { label: '金额', value: formatAmount(item.TotalNetAmount, item.TransactionCurrency) },
    { label: '售达方', value: item.SoldToParty },
    { label: '销售组织', value: item.SalesOrganization },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/billing-documents')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="fiori-objheader">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="fiori-objheader-title">{item.BillingDocument}</div>
            <div className="fiori-objheader-subtitle">
              {BILLING_TYPE_MAP[item.BillingDocumentType] || item.BillingDocumentType} · {formatAmount(item.TotalNetAmount, item.TransactionCurrency)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={billingStatus.variant}>{billingStatus.label}</FioriBadge>
          <FioriBadge variant={postingStatus.variant}>会计{postingStatus.label}</FioriBadge>
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
