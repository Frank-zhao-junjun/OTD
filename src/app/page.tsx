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
} from 'lucide-react';

const TILES = [
  {
    title: '销售订单',
    subtitle: '待处理订单',
    kpi: '23',
    icon: FileText,
    path: '/sales-orders',
    statusColor: '#0A6ED1',
  },
  {
    title: '生产订单',
    subtitle: '进行中',
    kpi: '15',
    icon: Factory,
    path: '/production-orders',
    statusColor: '#E9730C',
  },
  {
    title: '发货单',
    subtitle: '待发货',
    kpi: '8',
    icon: Truck,
    path: '/outbound-delivery',
    statusColor: '#107E3E',
  },
  {
    title: '开票单据',
    subtitle: '本月开票',
    kpi: '42',
    icon: Receipt,
    path: '/billing-documents',
    statusColor: '#6A6D70',
  },
  {
    title: '库存查询',
    subtitle: '低库存物料',
    kpi: '7',
    icon: BarChart3,
    path: '/material-stock',
    statusColor: '#BB0000',
  },
  {
    title: '入库单',
    subtitle: '今日入库',
    kpi: '5',
    icon: FileSpreadsheet,
    path: '/material-documents',
    statusColor: '#0A6ED1',
  },
  {
    title: '产品管理',
    subtitle: '产品总数',
    kpi: '1,286',
    icon: Package,
    path: '/products',
    statusColor: '#6A6D70',
  },
  {
    title: '客户管理',
    subtitle: '活跃客户',
    kpi: '384',
    icon: Users,
    path: '/customers',
    statusColor: '#107E3E',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--foreground)' }}>工作台</h1>
        <p className="mt-1 text-xs md:text-sm" style={{ color: 'var(--muted-foreground)' }}>
          快速查询 SAP S/4HANA Cloud 中的产品、订单、库存等业务数据
        </p>
      </div>

      {/* Tile Grid - Business Transactions */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>业务交易</h2>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: 'var(--muted-foreground)', background: 'var(--muted)' }}>6</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TILES.slice(0, 6).map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.path} href={tile.path} className="fiori-tile">
                {/* Top: icon */}
                <div className="flex items-center justify-between">
                  <div className="fiori-tile-icon" style={{ color: tile.statusColor }}>
                    <Icon className="w-7 h-7" />
                  </div>
                </div>
                {/* Middle: KPI number */}
                <div className="fiori-tile-kpi tabular-nums" style={{ color: tile.statusColor }}>
                  {tile.kpi}
                </div>
                {/* Bottom: title + subtitle */}
                <div>
                  <div className="fiori-tile-title">{tile.title}</div>
                  <div className="fiori-tile-subtitle">{tile.subtitle}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Tile Grid - Master Data */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>主数据</h2>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: 'var(--muted-foreground)', background: 'var(--muted)' }}>2</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TILES.slice(6, 8).map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.path} href={tile.path} className="fiori-tile">
                <div className="flex items-center justify-between">
                  <div className="fiori-tile-icon" style={{ color: tile.statusColor }}>
                    <Icon className="w-7 h-7" />
                  </div>
                </div>
                <div className="fiori-tile-kpi tabular-nums" style={{ color: tile.statusColor }}>
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
