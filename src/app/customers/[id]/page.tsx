'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { ArrowLeft, Users } from 'lucide-react';

interface Customer {
  Customer: string;
  CustomerName: string;
  Country: string;
  CountryText: string;
  City: string;
  PostalCode: string;
  StreetName?: string;
  PhoneNumber?: string;
  SalesOrganization: string;
  DistributionChannel: string;
  Division: string;
  CustomerGroup: string;
  CustomerGroupText: string;
  Currency: string;
  TaxNumber?: string;
  SearchTerm1?: string;
}

const GROUP_COLORS: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  '01': 'success',
  '02': 'info',
  '03': 'warning',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('id', id);
        const response = await fetch(`/api/sap/API_BUSINESS_PARTNER/A_Customer?${searchParams.toString()}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        setCustomer(results[0] || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCustomer();
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

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <FioriErrorState message={error || '未找到客户数据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const groupColor = GROUP_COLORS[customer.CustomerGroup] || 'neutral';

  const fields = [
    { label: '客户编号', value: customer.Customer },
    { label: '客户名称', value: customer.CustomerName },
    { label: '搜索词', value: customer.SearchTerm1 || '-' },
    { label: '国家', value: customer.CountryText || customer.Country || '-' },
    { label: '城市', value: customer.City || '-' },
    { label: '邮编', value: customer.PostalCode || '-' },
    { label: '街道', value: customer.StreetName || '-' },
    { label: '电话', value: customer.PhoneNumber || '-' },
    { label: '税号', value: customer.TaxNumber || '-' },
    { label: '销售组织', value: customer.SalesOrganization || '-' },
    { label: '分销渠道', value: customer.DistributionChannel || '-' },
    { label: '产品组', value: customer.Division || '-' },
    { label: '币种', value: customer.Currency || '-' },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/customers')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="fiori-objheader">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="fiori-objheader-title">{customer.Customer}</div>
            <div className="fiori-objheader-subtitle">
              {customer.CustomerName} · {customer.City || '-'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={groupColor}>{customer.CustomerGroupText}</FioriBadge>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{customer.Currency}</span>
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
