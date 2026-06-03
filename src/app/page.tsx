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
  },
  {
    title: '生产订单',
    subtitle: '进行中',
    kpi: '15',
    icon: Factory,
    path: '/production-orders',
  },
  {
    title: '发货单',
    subtitle: '待发货',
    kpi: '8',
    icon: Truck,
    path: '/outbound-delivery',
  },
  {
    title: '开票单据',
    subtitle: '本月开票',
    kpi: '42',
    icon: Receipt,
    path: '/billing-documents',
  },
  {
    title: '库存查询',
    subtitle: '低库存物料',
    kpi: '7',
    icon: BarChart3,
    path: '/material-stock',
  },
  {
    title: '入库单',
    subtitle: '今日入库',
    kpi: '5',
    icon: FileSpreadsheet,
    path: '/material-documents',
  },
  {
    title: '产品管理',
    subtitle: '产品总数',
    kpi: '1,286',
    icon: Package,
    path: '/products',
  },
  {
    title: '客户管理',
    subtitle: '活跃客户',
    kpi: '384',
    icon: Users,
    path: '/customers',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Tile Grid - Business Transactions */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>业务交易</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
          {TILES.slice(0, 6).map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.path} href={tile.path} className="fiori-tile">
                <div className="flex items-center justify-between">
                  <Icon className="w-6 h-6" style={{ color: 'var(--primary)' }} />
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

      {/* Tile Grid - Master Data */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>主数据</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
          {TILES.slice(6, 8).map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.path} href={tile.path} className="fiori-tile">
                <div className="flex items-center justify-between">
                  <Icon className="w-6 h-6" style={{ color: 'var(--primary)' }} />
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
