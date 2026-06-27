'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { formatSapDate } from '@/lib/utils';

/** Format SAP Edm.Time format (PT14H30M0S) to HH:mm:ss */
function formatSapTime(timeStr: string | undefined): string {
  if (!timeStr) return '-';
  const match = timeStr.match(/PT(\d+)H(\d+)M(\d+)S/);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const minutes = match[2].padStart(2, '0');
    const seconds = match[3].padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  return timeStr;
}

const BILLING_STATUS_MAP: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  A: { label: '未处理', color: 'neutral' },
  B: { label: '部分处理', color: 'warning' },
  C: { label: '已完成', color: 'success' },
};

const ACCOUNTING_STATUS_MAP: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  A: { label: '未过账', color: 'neutral' },
  B: { label: '部分过账', color: 'warning' },
  C: { label: '已过账', color: 'success' },
  D: { label: '错误', color: 'error' },
};

interface BillingDocument {
  BillingDocument: string;
  BillingDocumentType?: string;
  SalesOrganization?: string;
  BillingDocumentDate?: string;
  TotalNetAmount?: string;
  TransactionCurrency?: string;
  SoldToParty?: string;
  OverallBillingStatus?: string;
  AccountingPostingStatus?: string;
  CompanyCode?: string;
  Division?: string;
  DistributionChannel?: string;
  CreationTime?: string;
  LastChangeDate?: string;
}

export default function BillingDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [doc, setDoc] = useState<BillingDocument | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setDoc(data.data[0]);
          const soldTo = data.data[0].SoldToParty;
          if (soldTo) {
            const cRes = await fetch('/api/sap/API_BUSINESS_PARTNER/A_Customer?top=200');
            const cJson = await cRes.json();
            const customers = cJson.data as Array<{Customer: string; CustomerName: string}>;
            const c = customers.find(x => x.Customer === soldTo);
            if (c) setCustomerName(c.CustomerName);
          }
        } else {
          setError(data.error || '未找到开票单据');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '请求失败');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchData();
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
        <FioriErrorState message={error || '未找到开票单据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const billingStatus = BILLING_STATUS_MAP[doc.OverallBillingStatus || ''] || { label: doc.OverallBillingStatus || '-', color: 'neutral' as const };
  const accountingStatus = ACCOUNTING_STATUS_MAP[doc.AccountingPostingStatus || ''] || { label: doc.AccountingPostingStatus || '-', color: 'neutral' as const };

  const fields = [
    { label: '开票类型', value: doc.BillingDocumentType || '-' },
    { label: '客户', value: doc.SoldToParty ? `${doc.SoldToParty} ${customerName ? `(${customerName})` : ''}` : '-' },
    { label: '销售组织', value: doc.SalesOrganization || '-' },
    { label: '分销渠道', value: doc.DistributionChannel || '-' },
    { label: '部门', value: doc.Division || '-' },
    { label: '公司代码', value: doc.CompanyCode || '-' },
    { label: '开票日期', value: formatSapDate(doc.BillingDocumentDate) },
    { label: '净金额', value: doc.TotalNetAmount ? `${doc.TotalNetAmount} ${doc.TransactionCurrency || ''}` : '-' },
    { label: '创建时间', value: formatSapTime(doc.CreationTime) },
    { label: '最后更改日期', value: formatSapDate(doc.LastChangeDate) || '-' },
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
            <div className="fiori-objheader-title">{doc.BillingDocument}</div>
            <div className="fiori-objheader-subtitle">
              {doc.TotalNetAmount ? `${doc.TotalNetAmount} ${doc.TransactionCurrency || ''}` : '-'} · {formatSapDate(doc.BillingDocumentDate)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={billingStatus.color}>开票: {billingStatus.label}</FioriBadge>
          <FioriBadge variant={accountingStatus.color}>记账: {accountingStatus.label}</FioriBadge>
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
