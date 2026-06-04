'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FioriBadge, FioriErrorState } from '@/components/fiori';
import { ArrowLeft, Package } from 'lucide-react';
import { formatSapDate } from '@/lib/utils';

interface ProductDescription {
  Product: string;
  Language: string;
  ProductDescription: string;
}

interface ProductPlant {
  Product: string;
  Plant: string;
  MRPType: string;
  ProductionInvtryManagedLoc: string;
  ProcurementType: string;
  IsBatchManagementRequired: boolean;
  ProfitCenter: string;
  AvailabilityCheckType: string;
  IsMarkedForDeletion: boolean;
}

interface ProductSalesDelivery {
  Product: string;
  ProductSalesOrg: string;
  ProductDistributionChnl: string;
  SupplyingPlant: string;
  AccountDetnProductGroup: string;
  ItemCategoryGroup: string;
  IsMarkedForDeletion: boolean;
}

interface ProductValuation {
  Product: string;
  ValuationArea: string;
  ValuationClass: string;
  StandardPrice: string;
  PriceUnitQty: string;
  MovingAveragePrice: string;
  Currency: string;
  IsMarkedForDeletion: boolean;
}

interface Product {
  Product: string;
  ProductType: string;
  ProductGroup: string;
  BaseUnit: string;
  WeightUnit: string;
  GrossWeight: string;
  NetWeight: string;
  IsMarkedForDeletion: boolean;
  CrossPlantStatus: string;
  CreatedByUser: string;
  CreationDate: string;
  to_Description?: { results: ProductDescription[] } | ProductDescription[];
  to_Plant?: { results: ProductPlant[] } | ProductPlant[];
  to_SalesDelivery?: { results: ProductSalesDelivery[] } | ProductSalesDelivery[];
  to_Valuation?: { results: ProductValuation[] } | ProductValuation[];
}

// Helper: normalize expand result (SAP V2 returns {results:[...]}, proxy may return plain array)
function normalizeExpand<T>(data: { results: T[] } | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  return [];
}

const PRODUCT_TYPE_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  'FERT': { label: '成品', variant: 'success' },
  'HAWA': { label: '贸易品', variant: 'info' },
  'ROH': { label: '原材料', variant: 'warning' },
  'HALB': { label: '半成品', variant: 'neutral' },
};

const PRODUCT_GROUP_MAP: Record<string, string> = {
  'L001': '原材料-电子',
  'L002': '原材料-包装',
  'L003': '半成品',
  'L004': '成品',
};

const PROCUREMENT_TYPE_MAP: Record<string, string> = {
  'E': '自制',
  'F': '外购',
};

function getDescription(product: Product): string {
  const descs = normalizeExpand(product.to_Description);
  const zh = descs.find((d) => d.Language === 'ZH');
  return zh?.ProductDescription || descs[0]?.ProductDescription || product.Product;
}

function getPlant(product: Product): ProductPlant | null {
  const plants = normalizeExpand(product.to_Plant);
  return plants.length > 0 ? plants[0] : null;
}

function getValuation(product: Product): ProductValuation | null {
  const vals = normalizeExpand(product.to_Valuation);
  return vals.length > 0 ? vals[0] : null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(params.id as string);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('filter', `Product eq '${id}'`);
        searchParams.set('top', '1');
        searchParams.set('expand', 'to_Description,to_Plant,to_Valuation');
        searchParams.set('skip_sap_sync', 'true');
        const response = await fetch(`/api/sap/API_PRODUCT_SRV/A_Product?${searchParams.toString()}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch');
        const results = data.data || [];
        setProduct(results[0] || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div className="fiori-objheader">
          <div className="flex items-center gap-3 mb-4"><Skeleton className="w-10 h-10 rounded-lg" /><div><Skeleton className="h-6 w-40 mb-1" /><Skeleton className="h-4 w-60" /></div></div>
          <div className="fiori-objheader-fields">{Array.from({ length: 10 }).map((_, i) => (<div key={i} className="fiori-objheader-field"><Skeleton className="h-3 w-[60px] mb-1" /><Skeleton className="h-4 w-[100px]" /></div>))}</div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <FioriErrorState message={error || '未找到产品数据'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const typeInfo = PRODUCT_TYPE_MAP[product.ProductType] || { label: product.ProductType, variant: 'neutral' as const };
  const desc = getDescription(product);
  const plant = getPlant(product);
  const val = getValuation(product);

  const fields = [
    { label: '产品编号', value: product.Product },
    { label: '产品描述', value: desc },
    { label: '产品类型', value: typeInfo.label },
    { label: '产品组', value: PRODUCT_GROUP_MAP[product.ProductGroup] || product.ProductGroup || '-' },
    { label: '基本单位', value: product.BaseUnit || '-' },
    { label: '重量单位', value: product.WeightUnit || '-' },
    { label: '毛重', value: product.GrossWeight ? `${product.GrossWeight} ${product.WeightUnit || ''}` : '-' },
    { label: '净重', value: product.NetWeight ? `${product.NetWeight} ${product.WeightUnit || ''}` : '-' },
    { label: '跨工厂状态', value: product.CrossPlantStatus || '-' },
    { label: '创建者', value: product.CreatedByUser || '-' },
    { label: '创建日期', value: formatSapDate(product.CreationDate) },
  ];

  const plantFields = plant ? [
    { label: '工厂', value: plant.Plant },
    { label: 'MRP类型', value: plant.MRPType || '-' },
    { label: '采购类型', value: PROCUREMENT_TYPE_MAP[plant.ProcurementType] || plant.ProcurementType || '-' },
    { label: '利润中心', value: plant.ProfitCenter || '-' },
    { label: '批次管理', value: plant.IsBatchManagementRequired ? '是' : '否' },
    { label: '可用性检查', value: plant.AvailabilityCheckType || '-' },
  ] : [];

  const valFields = val ? [
    { label: '评估范围', value: val.ValuationArea },
    { label: '评估类', value: val.ValuationClass || '-' },
    { label: '标准价格', value: val.StandardPrice !== '0.00' ? `${val.StandardPrice} ${val.Currency}` : '-' },
    { label: '移动平均价', value: `${val.MovingAveragePrice} ${val.Currency}` },
  ] : [];

  // 多语言描述
  const descriptions = normalizeExpand(product.to_Description);
  const LANG_MAP: Record<string, string> = {
    'ZH': '中文',
    'EN': '英文',
    'DE': '德文',
    'FR': '法文',
    'JA': '日文',
    'KO': '韩文',
    'ES': '西班牙文',
    'PT': '葡萄牙文',
    'IT': '意大利文',
    'RU': '俄文',
    'AR': '阿拉伯文',
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/products')} className="mb-0">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </Button>
      <div className="fiori-objheader">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="fiori-objheader-title">{product.Product}</div>
            <div className="fiori-objheader-subtitle">{desc}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <FioriBadge variant={typeInfo.variant}>{typeInfo.label}</FioriBadge>
          {product.IsMarkedForDeletion && <FioriBadge variant="error">已标记删除</FioriBadge>}
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

      {descriptions.length > 0 && (
        <div className="fiori-objheader">
          <div className="fiori-objheader-title text-base mb-3">多语言描述</div>
          <div className="space-y-2">
            {descriptions.map((d) => (
              <div key={d.Language} className="flex items-baseline gap-3 px-1 py-1.5 border-b border-[#E4E4E4] last:border-b-0">
                <span className="text-xs font-medium text-[#6A6D70] uppercase tracking-wide w-16 shrink-0">
                  {LANG_MAP[d.Language] || d.Language}
                </span>
                <span className="text-sm text-[#1A2228]">{d.ProductDescription}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {plantFields.length > 0 && (
        <div className="fiori-objheader">
          <div className="fiori-objheader-title text-base mb-3">工厂数据</div>
          <div className="fiori-objheader-fields">
            {plantFields.map((field) => (
              <div key={field.label} className="fiori-objheader-field">
                <span className="fiori-objheader-field-label">{field.label}</span>
                <span className="fiori-objheader-field-value">{field.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {valFields.length > 0 && (
        <div className="fiori-objheader">
          <div className="fiori-objheader-title text-base mb-3">评估数据</div>
          <div className="fiori-objheader-fields">
            {valFields.map((field) => (
              <div key={field.label} className="fiori-objheader-field">
                <span className="fiori-objheader-field-label">{field.label}</span>
                <span className="fiori-objheader-field-value">{field.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
