'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { formatSapDate } from '@/lib/utils';

interface Customer {
  Customer: string;
  CustomerFullName?: string;
  CustomerName?: string;
  CustomerAccountGroup?: string;
  CreationDate?: string;
  CustomerCorporateGroup?: string;
  Industry?: string;
  Supplier?: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/sap/API_BUSINESS_PARTNER/A_Customer?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setCustomer(data.data[0]);
        } else {
          setError(data.error || '未找到客户');
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
          <div className="fiori-objheader-fields">{Array.from({ length: 6 }).map((_, i) => (<div key={i} className="fiori-objheader-field"><Skeleton className="h-3 w-[60px] mb-1" /><Skeleton className="h-4 w-[100px]" /></div>))}</div>
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
        <FioriErrorState message={error || '未找到客户'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const fields = [
    { label: '客户编号', value: customer.Customer || '-' },
    { label: '客户全名', value: customer.CustomerFullName || '-' },
    { label: '客户名称', value: customer.CustomerName || '-' },
    { label: '账户组', value: customer.CustomerAccountGroup || '-' },
    { label: '创建日期', value: formatSapDate(customer.CreationDate) },
    { label: '企业集团', value: customer.CustomerCorporateGroup || '-' },
    { label: '行业', value: customer.Industry || '-' },
    { label: '供应商', value: customer.Supplier || '-' },
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
              {customer.CustomerFullName || customer.CustomerName || '-'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {customer.CustomerAccountGroup && <FioriBadge variant="info">{customer.CustomerAccountGroup}</FioriBadge>}
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
