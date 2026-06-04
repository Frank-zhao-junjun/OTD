'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriErrorState } from '@/components/fiori';
import { ArrowLeft, Users } from 'lucide-react';

interface CustomerItem {
  Customer: string;
  CustomerName: string;
  CustomerFullName: string;
  CustomerAccountGroup: string;
  CreationDate: string;
}

import { formatSapDate } from '@/lib/utils';

const ACCOUNT_GROUP_MAP: Record<string, string> = {
  'CUST': '客户',
  'SOLD': '售达方',
  'SHIP': '送达方',
  'PERS': '个人客户',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(params.id as string);

  const [item, setItem] = useState<CustomerItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sap/API_BUSINESS_PARTNER/A_Customer?id=${encodeURIComponent(id)}`);
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
          <div className="fiori-objheader-fields">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="fiori-objheader-field"><Skeleton className="h-3 w-[60px] mb-1" /><Skeleton className="h-4 w-[100px]" /></div>))}</div>
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
        <FioriErrorState message={error || '未找到客户数据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const fields = [
    { label: '客户编号', value: item.Customer },
    { label: '客户名称', value: item.CustomerName || '-' },
    { label: '全称', value: item.CustomerFullName || '-' },
    { label: '账户组', value: ACCOUNT_GROUP_MAP[item.CustomerAccountGroup] || item.CustomerAccountGroup || '-' },
    { label: '创建日期', value: formatSapDate(item.CreationDate) },
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
            <div className="fiori-objheader-title">{item.CustomerName || item.Customer}</div>
            <div className="fiori-objheader-subtitle">
              客户编号 {item.Customer} · {ACCOUNT_GROUP_MAP[item.CustomerAccountGroup] || item.CustomerAccountGroup}
            </div>
          </div>
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
