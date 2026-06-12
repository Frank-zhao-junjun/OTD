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
  ArrowRight,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  PackageOpen,
} from 'lucide-react';
import { FioriKpiCard, FioriSection, FioriActivity } from '@/components/fiori';

type BandColor = 'blue' | 'green' | 'orange' | 'red' | 'cyan' | 'purple' | 'pink' | 'teal';

const BUSINESS_TILES: Array<{
  title: string;
  subtitle: string;
  kpi: string;
  delta: string;
  direction: 'up' | 'down' | 'flat';
  icon: typeof FileText;
  path: string;
  color: BandColor;
}> = [
  { title: '销售订单', subtitle: '本月新订单', kpi: '23', delta: '+12%', direction: 'up', icon: FileText, path: '/sales-orders', color: 'blue' },
  { title: '生产订单', subtitle: '进行中', kpi: '15', delta: '+5%', direction: 'up', icon: Factory, path: '/production-orders', color: 'cyan' },
  { title: '发货单', subtitle: '今日待发货', kpi: '8', delta: '-2', direction: 'down', icon: Truck, path: '/outbound-delivery', color: 'green' },
  { title: '开票单据', subtitle: '本月已开票', kpi: '42', delta: '+8%', direction: 'up', icon: Receipt, path: '/billing-documents', color: 'purple' },
  { title: '库存查询', subtitle: '低库存物料', kpi: '7', delta: '!', direction: 'flat', icon: BarChart3, path: '/material-stock', color: 'orange' },
  { title: '入库单', subtitle: '今日入库', kpi: '5', delta: '+3', direction: 'up', icon: FileSpreadsheet, path: '/material-documents', color: 'teal' },
];

const MASTER_TILES = [
  { title: '产品管理', subtitle: '产品总数', kpi: '1,286', icon: Package, path: '/products', color: 'pink' as BandColor },
  { title: '客户管理', subtitle: '活跃客户', kpi: '384', icon: Users, path: '/customers', color: 'blue' as BandColor },
];

export default function HomePage() {
  return (
    <div className="space-y-5">
      {/* ===== Hero KPI Row ===== */}
      <FioriSection title="业务概览" meta="实时数据">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FioriKpiCard
            label="本月订单总额"
            value="¥ 2,847,600"
            delta={{ value: '+12.5%', direction: 'up', label: '较上月' }}
            color="blue"
          />
          <FioriKpiCard
            label="订单完成率"
            value="87.5"
            unit="%"
            delta={{ value: '+2.3%', direction: 'up', label: '较上周' }}
            color="green"
          />
          <FioriKpiCard
            label="平均交付天数"
            value="5.2"
            unit="天"
            delta={{ value: '-0.4天', direction: 'up', label: '较上月' }}
            color="cyan"
          />
          <FioriKpiCard
            label="低库存预警"
            value="7"
            unit="项"
            delta={{ value: '+2', direction: 'down', label: '需补货' }}
            color="orange"
          />
        </div>
      </FioriSection>

      {/* ===== Business Tiles ===== */}
      <FioriSection title="业务交易" meta="6 项">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {BUSINESS_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.path} href={tile.path} className="fiori-tile">
                <div className={`fiori-tile-band fiori-tile-band--${tile.color}`} />
                <div className="fiori-tile-body">
                  <div className="flex items-center justify-between">
                    <Icon className={`w-5 h-5 lg:w-6 lg:h-6 fiori-tile-icon--${tile.color}`} />
                    <span className={`fiori-tile-delta fiori-tile-delta--${tile.direction === 'up' ? 'up' : tile.direction === 'down' ? 'down' : 'flat'}`}>
                      {tile.direction === 'up' && <TrendingUp className="w-3 h-3" />}
                      {tile.direction === 'down' && <TrendingUp className="w-3 h-3 rotate-180" />}
                      {tile.direction === 'flat' && <span>—</span>}
                      {tile.delta}
                    </span>
                  </div>
                  <div>
                    <div className={`fiori-tile-kpi fiori-tile-kpi--${tile.color} tabular-nums`}>
                      {tile.kpi}
                    </div>
                    <div className="fiori-tile-title mt-1">{tile.title}</div>
                    <div className="fiori-tile-subtitle">{tile.subtitle}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </FioriSection>

      {/* ===== Master Data Tiles ===== */}
      <FioriSection title="主数据" meta="2 项">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {MASTER_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.path} href={tile.path} className="fiori-tile">
                <div className={`fiori-tile-band fiori-tile-band--${tile.color}`} />
                <div className="fiori-tile-body">
                  <div className="flex items-center justify-between">
                    <Icon className={`w-5 h-5 lg:w-6 lg:h-6 fiori-tile-icon--${tile.color}`} />
                    <ArrowRight className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                  </div>
                  <div>
                    <div className={`fiori-tile-kpi fiori-tile-kpi--${tile.color} tabular-nums`}>
                      {tile.kpi}
                    </div>
                    <div className="fiori-tile-title mt-1">{tile.title}</div>
                    <div className="fiori-tile-subtitle">{tile.subtitle}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </FioriSection>

      {/* ===== Activity Stream + Quick Actions ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <FioriSection title="最近活动" meta="今日">
            <div className="fiori-facets">
              <FioriActivity
                color="success"
                text={<><strong>销售订单 #1,247</strong> 已确认，数量 50 PCS</>}
                meta={<><Clock className="w-3 h-3 inline mr-1" />10 分钟前 · 王经理</>}
              />
              <FioriActivity
                color="info"
                text={<><strong>生产订单 #PO-2024-0389</strong> 已释放，工厂 1010</>}
                meta={<><Clock className="w-3 h-3 inline mr-1" />1 小时前 · 张主管</>}
              />
              <FioriActivity
                color="warning"
                text={<><strong>库存预警</strong>：物料 TG-142-B 库存低于安全水位</>}
                meta={<><Clock className="w-3 h-3 inline mr-1" />2 小时前 · 系统</>}
              />
              <FioriActivity
                color="success"
                text={<><strong>发货单 #8800001245</strong> 已完成拣货，待出库</>}
                meta={<><Clock className="w-3 h-3 inline mr-1" />3 小时前 · 李仓管</>}
              />
              <FioriActivity
                color="neutral"
                text={<><strong>开票单 #900001234</strong> 已生成，金额 ¥ 24,500.00</>}
                meta={<><Clock className="w-3 h-3 inline mr-1" />昨天 17:30 · 财务部</>}
              />
            </div>
          </FioriSection>
        </div>

        <div>
          <FioriSection title="快速入口" meta="常用">
            <div className="fiori-facets" style={{ padding: 8 }}>
              <Link href="/sales-orders" className="fiori-sidebar-item">
                <FileText className="w-4 h-4" />
                <span className="flex-1">新建销售订单</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/production-orders" className="fiori-sidebar-item">
                <Factory className="w-4 h-4" />
                <span className="flex-1">生产订单跟踪</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/outbound-delivery" className="fiori-sidebar-item">
                <Truck className="w-4 h-4" />
                <span className="flex-1">发货管理</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/material-stock" className="fiori-sidebar-item">
                <PackageOpen className="w-4 h-4" />
                <span className="flex-1">库存查询</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </FioriSection>

          <FioriSection title="系统状态" meta="正常">
            <div className="fiori-facets" style={{ padding: 12 }}>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>SAP 接口</span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#107E3E' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> 在线
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>数据同步</span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#107E3E' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> 正常
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>响应时间</span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#107E3E' }}>
                  <Activity className="w-3.5 h-3.5" /> 125ms
                </span>
              </div>
            </div>
          </FioriSection>
        </div>
      </div>
    </div>
  );
}
