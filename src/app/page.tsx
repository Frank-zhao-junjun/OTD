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
  Activity,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const BUSINESS_MODULES = [
  {
    title: '销售订单',
    description: '查询销售订单、行项目明细',
    icon: FileText,
    path: '/sales-orders',
    api: 'CE_SALESORDER_0001',
    version: 'V4',
    accent: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    title: '生产订单',
    description: '查询生产订单、工序、组件',
    icon: Factory,
    path: '/production-orders',
    api: 'CE_PRODUCTIONORDER_0001',
    version: 'V4',
    accent: 'from-amber-500 to-amber-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    title: '库存查询',
    description: '查询物料库存、批次信息',
    icon: BarChart3,
    path: '/material-stock',
    api: 'API_MATERIAL_STOCK_SRV',
    version: 'V2',
    accent: 'from-violet-500 to-violet-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  {
    title: '交货单',
    description: '查询外向交货、行项目明细',
    icon: Truck,
    path: '/outbound-delivery',
    api: 'API_OUTBOUND_DELIVERY_SRV',
    version: 'V2',
    accent: 'from-teal-500 to-teal-600',
    bgLight: 'bg-teal-50',
    textColor: 'text-teal-600',
  },
  {
    title: '开票单据',
    description: '查询开票凭证、行项目金额',
    icon: Receipt,
    path: '/billing-documents',
    api: 'API_BILLING_DOCUMENT_SRV',
    version: 'V2',
    accent: 'from-rose-500 to-rose-600',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-600',
  },
  {
    title: '物料凭证',
    description: '查询物料移动记录、收发存',
    icon: FileSpreadsheet,
    path: '/material-documents',
    api: 'API_MATERIAL_DOCUMENT_SRV',
    version: 'V2',
    accent: 'from-cyan-500 to-cyan-600',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
];

const MASTER_MODULES = [
  {
    title: '产品管理',
    description: '查询产品主数据、物料组信息',
    icon: Package,
    path: '/products',
    api: 'API_PRODUCT_SRV',
    version: 'V2',
    accent: 'from-indigo-500 to-indigo-600',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  {
    title: '客户管理',
    description: '查询客户主数据、销售范围',
    icon: Users,
    path: '/customers',
    api: 'API_BUSINESS_PARTNER',
    version: 'V2',
    accent: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">工作台</h1>
          <p className="text-slate-500 mt-1 text-sm">
            快速查询 SAP S/4HANA Cloud 中的产品、订单、库存等业务数据
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Activity className="w-3.5 h-3.5 text-green-500" />
          <span>8 个接口服务在线</span>
        </div>
      </div>

      {/* Business Transactions */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-slate-700">业务交易</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">6 个模块</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUSINESS_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.path} href={module.path}>
                <Card className="group hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer h-full border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${module.bgLight} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${module.textColor}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{module.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5 font-mono">{module.api}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all duration-200" />
                    </div>
                    <p className="text-xs text-slate-500 mt-3">{module.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${module.version === 'V4' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {module.version}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {module.version === 'V4' ? '读取+同步' : '只读/读取+同步'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Master Data */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-slate-700">主数据</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">2 个模块</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MASTER_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.path} href={module.path}>
                <Card className="group hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer h-full border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${module.bgLight} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${module.textColor}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{module.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5 font-mono">{module.api}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all duration-200" />
                    </div>
                    <p className="text-xs text-slate-500 mt-3">{module.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">V2</span>
                      <span className="text-[10px] text-slate-400">只读</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* API Architecture */}
      <section>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-700">接口架构</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="font-mono text-slate-600">6x V2</div>
                <div className="text-slate-400 mt-1">SapODataClient</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="font-mono text-blue-600">2x V4</div>
                <div className="text-blue-400 mt-1">SapODataV4Client</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="font-mono text-slate-600">Basic Auth</div>
                <div className="text-slate-400 mt-1">SAP Client 100</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="font-mono text-slate-600">CRUD</div>
                <div className="text-slate-400 mt-1">生产订单完整操作</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
