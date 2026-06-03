'use client';

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
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

const BUSINESS_TILES = [
  {
    title: '销售订单',
    subtitle: '待处理订单',
    kpi: '23',
    icon: FileText,
    path: '/sales-orders',
    color: 'var(--primary)',
  },
  {
    title: '生产订单',
    subtitle: '进行中',
    kpi: '15',
    icon: Factory,
    path: '/production-orders',
    color: 'var(--primary)',
  },
  {
    title: '发货单',
    subtitle: '待发货',
    kpi: '8',
    icon: Truck,
    path: '/outbound-delivery',
    color: 'var(--primary)',
  },
  {
    title: '开票单据',
    subtitle: '本月开票',
    kpi: '42',
    icon: Receipt,
    path: '/billing-documents',
    color: 'var(--primary)',
  },
  {
    title: '库存查询',
    subtitle: '低库存物料',
    kpi: '7',
    icon: BarChart3,
    path: '/material-stock',
    color: 'var(--color-fiori-warning)',
  },
  {
    title: '入库单',
    subtitle: '今日入库',
    kpi: '5',
    icon: FileSpreadsheet,
    path: '/material-documents',
    color: 'var(--primary)',
  },
];

const MASTER_TILES = [
  {
    title: '产品管理',
    subtitle: '产品总数',
    kpi: '1,286',
    icon: Package,
    path: '/products',
    color: 'var(--primary)',
  },
  {
    title: '客户管理',
    subtitle: '活跃客户',
    kpi: '384',
    icon: Users,
    path: '/customers',
    color: 'var(--primary)',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Page Title - mobile shows inline, PC has it in ShellBar breadcrumb */}
      <div className="lg:hidden">
        <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>工作台</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>SAP S/4HANA Cloud 数据查询</p>
      </div>

      {/* Quick Stats Bar - PC only */}
      <div className="hidden lg:flex items-center gap-6 py-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>本月订单总额</span>
          <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>¥ 2,847,600</span>
        </div>
        <div className="w-px h-6" style={{ background: 'var(--border)' }} />
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>订单完成率</span>
          <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-fiori-success)' }}>87.5%</span>
        </div>
      </div>

      {/* ===== Business Transactions ===== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>业务交易</h2>
          <span className="text-xs hidden lg:inline" style={{ color: 'var(--muted-foreground)' }}>6 项</span>
        </div>

        {/* PC: 3-column Tile grid | Mobile: 2-column compact Tile */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {BUSINESS_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.path} href={tile.path} className="fiori-tile">
                <div className="flex items-center justify-between">
                  <Icon className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: tile.color }} />
                  <ArrowRight className="w-4 h-4 hidden lg:block" style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <div className="fiori-tile-kpi tabular-nums">
                  {tile.kpi}
                </div>
                <div>
                  <div className="fiori-tile-title">{tile.title}</div>
                  <div className="fiori-tile-subtitle">{tile.subtitle}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ===== Master Data ===== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>主数据</h2>
          <span className="text-xs hidden lg:inline" style={{ color: 'var(--muted-foreground)' }}>2 项</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {MASTER_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.path} href={tile.path} className="fiori-tile">
                <div className="flex items-center justify-between">
                  <Icon className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: tile.color }} />
                  <ArrowRight className="w-4 h-4 hidden lg:block" style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <div className="fiori-tile-kpi tabular-nums">
                  {tile.kpi}
                </div>
                <div>
                  <div className="fiori-tile-title">{tile.title}</div>
                  <div className="fiori-tile-subtitle">{tile.subtitle}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
