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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const BUSINESS_MODULES = [
  {
    title: '销售订单',
    description: '查询销售订单及行项目明细',
    icon: FileText,
    path: '/sales-orders',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    title: '生产订单',
    description: '查询生产订单、工序及组件',
    icon: Factory,
    path: '/production-orders',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    title: '发货单',
    description: '查询发货单及行项目明细',
    icon: Truck,
    path: '/outbound-delivery',
    bgLight: 'bg-teal-50',
    textColor: 'text-teal-600',
  },
  {
    title: '开票单据',
    description: '查询开票凭证及行项目金额',
    icon: Receipt,
    path: '/billing-documents',
    bgLight: 'bg-rose-50',
    textColor: 'text-rose-600',
  },
  {
    title: '库存查询',
    description: '查询物料库存及批次信息',
    icon: BarChart3,
    path: '/material-stock',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  {
    title: '入库单',
    description: '查询物料入库及移动记录',
    icon: FileSpreadsheet,
    path: '/material-documents',
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
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  {
    title: '客户管理',
    description: '查询客户主数据、销售范围',
    icon: Users,
    path: '/customers',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">工作台</h1>
        <p className="text-slate-500 mt-1 text-xs md:text-sm">
          快速查询 SAP S/4HANA Cloud 中的产品、订单、库存等业务数据
        </p>
      </div>

      {/* Business Transactions */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-slate-700">业务交易</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">6 个模块</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {BUSINESS_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.path} href={module.path}>
                <Card className="group hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer h-full border-slate-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg ${module.bgLight} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 md:w-5 md:h-5 ${module.textColor}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 text-xs md:text-sm truncate">{module.title}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all duration-200 hidden md:block" />
                    </div>
                    <p className="text-[11px] md:text-xs text-slate-500 mt-2 md:mt-3 line-clamp-2">{module.description}</p>
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
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {MASTER_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.path} href={module.path}>
                <Card className="group hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer h-full border-slate-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg ${module.bgLight} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 md:w-5 md:h-5 ${module.textColor}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 text-xs md:text-sm truncate">{module.title}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all duration-200 hidden md:block" />
                    </div>
                    <p className="text-[11px] md:text-xs text-slate-500 mt-2 md:mt-3 line-clamp-2">{module.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
