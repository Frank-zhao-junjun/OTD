'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Factory,
  BarChart3,
  Truck,
  Receipt,
  FileSpreadsheet,
  Package,
  Users,
  ArrowRight,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  PackageOpen,
  Loader2,
} from 'lucide-react';
import { FioriKpiCard, FioriSection, FioriActivity } from '@/components/fiori';

type BandColor = 'blue' | 'green' | 'orange' | 'red' | 'cyan' | 'purple' | 'pink' | 'teal';

interface KpiData {
  label: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  trendLabel: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
  icon: string;
}

interface ActivityData {
  color: 'success' | 'info' | 'warning' | 'neutral';
  text: string;
  meta: string;
}

interface DashboardData {
  kpis: KpiData[];
  activities: ActivityData[];
  tileCounts: Record<string, number>;
  error?: string;
}

const ICON_MAP: Record<string, typeof FileText> = {
  FileText,
  Factory,
  Truck,
  PackageOpen,
};

const BUSINESS_TILES: Array<{
  title: string;
  subtitle: string;
  icon: typeof FileText;
  path: string;
  color: BandColor;
  countKey: string;
}> = [
  { title: '销售订单', subtitle: '全部订单', icon: FileText, path: '/sales-orders', color: 'blue', countKey: 'salesOrders' },
  { title: '生产订单', subtitle: '进行中', icon: Factory, path: '/production-orders', color: 'cyan', countKey: 'productionOrders' },
  { title: '发货单', subtitle: '全部发货', icon: Truck, path: '/outbound-delivery', color: 'green', countKey: 'deliveries' },
  { title: '开票单据', subtitle: '全部开票', icon: Receipt, path: '/billing-documents', color: 'purple', countKey: 'billingDocs' },
  { title: '入库单', subtitle: '物料凭证', icon: FileSpreadsheet, path: '/material-documents', color: 'teal', countKey: 'materialDocs' },
  { title: '库存查询', subtitle: '库存条目', icon: BarChart3, path: '/material-stock', color: 'orange', countKey: 'materialStock' },
];

const MASTER_TILES: Array<{
  title: string;
  subtitle: string;
  icon: typeof FileText;
  path: string;
  color: BandColor;
  countKey: string;
}> = [
  { title: '产品管理', subtitle: '产品总数', icon: Package, path: '/products', color: 'pink', countKey: 'products' },
  { title: '客户管理', subtitle: '客户总数', icon: Users, path: '/customers', color: 'blue', countKey: 'customers' },
];

function formatNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || '获取数据失败');
          if (json.data) setData(json.data);
        }
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, []);

  const tileCounts = data?.tileCounts || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#0070F2]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          {error}
        </div>
      )}
      {/* ===== Hero KPI Row ===== */}
      <FioriSection title="业务概览" meta={data?.error ? '离线' : '实时数据'}>
        {data?.error ? (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {data.error}
          </div>
        ) : data?.kpis && data.kpis.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {data.kpis.map((kpi) => (
              <FioriKpiCard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                unit={kpi.unit}
                delta={{
                  value: kpi.trendValue,
                  direction: kpi.trend,
                  label: kpi.trendLabel,
                }}
                color={kpi.color}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <FioriKpiCard label="销售订单" value="—" delta={{ value: '—', direction: 'flat', label: '等待数据' }} color="blue" />
            <FioriKpiCard label="生产订单" value="—" delta={{ value: '—', direction: 'flat', label: '等待数据' }} color="green" />
            <FioriKpiCard label="待发货" value="—" delta={{ value: '—', direction: 'flat', label: '等待数据' }} color="orange" />
            <FioriKpiCard label="库存条目" value="—" delta={{ value: '—', direction: 'flat', label: '等待数据' }} color="purple" />
          </div>
        )}
      </FioriSection>

      {/* ===== Business Tiles ===== */}
      <FioriSection title="业务交易" meta={`${BUSINESS_TILES.length} 项`}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {BUSINESS_TILES.map((tile) => {
            const Icon = tile.icon;
            const count = tileCounts[tile.countKey];
            return (
              <Link key={tile.path} href={tile.path} className="fiori-tile">
                <div className={`fiori-tile-band fiori-tile-band--${tile.color}`} />
                <div className="fiori-tile-body">
                  <div className="fiori-tile-kpi">
                    {count !== undefined ? formatNum(count) : '—'}
                  </div>
                  <div className="fiori-tile-title">{tile.title}</div>
                  <div className="fiori-tile-subtitle">{tile.subtitle}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </FioriSection>

      {/* ===== Master Data Tiles ===== */}
      <FioriSection title="主数据" meta={`${MASTER_TILES.length} 项`}>
        <div className="grid grid-cols-2 gap-3">
          {MASTER_TILES.map((tile) => {
            const count = tileCounts[tile.countKey];
            return (
              <Link key={tile.path} href={tile.path} className="fiori-tile">
                <div className={`fiori-tile-band fiori-tile-band--${tile.color}`} />
                <div className="fiori-tile-body">
                  <div className="fiori-tile-kpi">
                    {count !== undefined ? formatNum(count) : '—'}
                  </div>
                  <div className="fiori-tile-title">{tile.title}</div>
                  <div className="fiori-tile-subtitle">{tile.subtitle}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </FioriSection>

      {/* ===== Activity Stream ===== */}
      <FioriSection title="最近动态" meta={data?.activities ? `${data.activities.length} 条` : undefined}>
        <div className="space-y-1">
          {data?.activities && data.activities.length > 0 ? (
            data.activities.map((item, i) => (
              <FioriActivity key={i} color={item.color} text={item.text} meta={item.meta} />
            ))
          ) : (
            <div className="p-4 text-sm text-[#6A6D70] text-center">
              <Clock className="w-4 h-4 inline mr-1" />
              暂无动态
            </div>
          )}
        </div>
      </FioriSection>
    </div>
  );
}
