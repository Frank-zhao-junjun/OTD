'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { formatSapDate } from '@/lib/utils';
import { formatCustomerName } from '@/lib/bilingual-display';
import {
  normalizeODataList,
  summarizeAddress,
  formatCountryRegion,
  formatBusinessPartnerType,
  formatArchivingFlag,
  fetchBusinessPartnerDetail,
  fetchCustomerContacts,
  type BusinessPartnerRecord,
  type CustomerContactDetail,
} from '@/lib/customer-master';

interface Customer {
  Customer: string;
  CustomerFullName?: string;
  CustomerName?: string;
  BPCustomerName?: string;
  BPCustomerFullName?: string;
  CustomerAccountGroup?: string;
  CreationDate?: string;
  CustomerCorporateGroup?: string;
  Industry?: string;
  Supplier?: string;
}

const LANG_MAP: Record<string, string> = {
  ZH: '中文',
  EN: '英文',
  DE: '德文',
  FR: '法文',
  JA: '日文',
  KO: '韩文',
  ES: '西班牙文',
  PT: '葡萄牙文',
  IT: '意大利文',
  RU: '俄文',
  AR: '阿拉伯文',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bpData, setBpData] = useState<BusinessPartnerRecord | null>(null);
  const [contacts, setContacts] = useState<CustomerContactDetail[]>([]);
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
          return;
        }

        const [bp, contactRows] = await Promise.all([
          fetchBusinessPartnerDetail(id),
          fetchCustomerContacts(id),
        ]);
        if (bp) setBpData(bp);
        setContacts(contactRows);
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

  const addressSummary = summarizeAddress(normalizeODataList(bpData?.to_BusinessPartnerAddress));
  const bpAddresses = normalizeODataList(bpData?.to_BusinessPartnerAddress);
  const uniqueLangAddresses = bpAddresses.reduce<typeof bpAddresses>((acc, addr) => {
    if (!acc.find((a) => a.Language === addr.Language)) acc.push(addr);
    return acc;
  }, []);

  const fields = [
    { label: '客户编号', value: customer.Customer || '-' },
    { label: '客户名称', value: formatCustomerName(customer) },
    { label: 'BP名称', value: bpData?.BusinessPartnerName || '-' },
    { label: 'BP全名', value: bpData?.BusinessPartnerFullName || '-' },
    { label: '城市', value: addressSummary.city || '-' },
    { label: '国家/地区', value: formatCountryRegion(addressSummary.country, addressSummary.region) },
    { label: '业务伙伴类型', value: formatBusinessPartnerType(bpData?.BusinessPartnerType, bpData?.BusinessPartnerCategory) },
    { label: '归档标记', value: formatArchivingFlag(bpData?.IsMarkedForArchiving) },
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
            <div className="fiori-objheader-subtitle">{formatCustomerName(customer)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {customer.CustomerAccountGroup && <FioriBadge variant="info">{customer.CustomerAccountGroup}</FioriBadge>}
          {bpData?.IsMarkedForArchiving && <FioriBadge variant="warning">待归档</FioriBadge>}
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

      {uniqueLangAddresses.length > 0 && (
        <div className="fiori-objheader">
          <div className="fiori-objheader-title text-base mb-3">多语言名称</div>
          <div className="space-y-2">
            {uniqueLangAddresses.map((addr) => (
              <div key={`${addr.AddressID}-${addr.Language}`} className="flex items-baseline gap-3 px-1 py-1.5 border-b border-[#E4E4E4] last:border-b-0">
                <span className="text-xs font-medium text-[#6A6D70] uppercase tracking-wide w-16 shrink-0">
                  {LANG_MAP[addr.Language || ''] || addr.Language}
                </span>
                <span className="text-sm text-[#1A2228]">{addr.FullName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fiori-objheader">
        <div className="fiori-objheader-title text-base mb-3">联系人信息</div>
        {contacts.length === 0 ? (
          <p className="text-sm text-[#6A6D70]">暂无联系人信息</p>
        ) : (
          <div className="hidden lg:block rounded-lg border overflow-hidden" style={{ borderColor: '#E4E4E4' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F5F6F7' }}>
                  <th className="px-4 py-2 text-left">姓名</th>
                  <th className="px-4 py-2 text-left">职能</th>
                  <th className="px-4 py-2 text-left">部门</th>
                  <th className="px-4 py-2 text-left">电话</th>
                  <th className="px-4 py-2 text-left">邮箱</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.relationshipNumber} className="border-t" style={{ borderColor: '#E4E4E4' }}>
                    <td className="px-4 py-3">{c.personName}</td>
                    <td className="px-4 py-3">{c.functionName || '-'}</td>
                    <td className="px-4 py-3">{c.departmentName || '-'}</td>
                    <td className="px-4 py-3">{c.phone || '-'}</td>
                    <td className="px-4 py-3">{c.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {contacts.length > 0 && (
          <div className="space-y-2 lg:hidden">
            {contacts.map((c) => (
              <div key={c.relationshipNumber} className="border rounded-md p-3" style={{ borderColor: '#E4E4E4' }}>
                <div className="font-medium text-sm">{c.personName}</div>
                <div className="text-xs text-[#6A6D70] mt-1">{[c.functionName, c.departmentName].filter(Boolean).join(' · ') || '-'}</div>
                {c.phone && <div className="text-xs mt-1">电话: {c.phone}</div>}
                {c.email && <div className="text-xs mt-0.5">邮箱: {c.email}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
