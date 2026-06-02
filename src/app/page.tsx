'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const QUICK_ACCESS_MODULES = [
  {
    title: '产品管理',
    description: '查询产品主数据、物料组信息',
    icon: '📦',
    path: '/products',
    stats: '实时数据',
    color: 'blue',
  },
  {
    title: '销售订单',
    description: '查询销售订单、订单明细',
    icon: '📝',
    path: '/sales-orders',
    stats: '实时数据',
    color: 'green',
  },
  {
    title: '生产订单',
    description: '查询生产订单、确认状态',
    icon: '🏭',
    path: '/production-orders',
    stats: '实时数据',
    color: 'orange',
  },
  {
    title: '库存查询',
    description: '查询物料库存、批次信息',
    icon: '📊',
    path: '/material-stock',
    stats: '实时数据',
    color: 'purple',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">SAP ERP 数据查询助手</h1>
        <p className="text-slate-600 mt-2">
          快速查询 SAP S/4HANA Cloud 中的产品、订单、库存等业务数据
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_ACCESS_MODULES.map((module) => (
          <Link key={module.path} href={module.path}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl ${
                    module.color === 'blue' ? 'bg-blue-100' :
                    module.color === 'green' ? 'bg-green-100' :
                    module.color === 'orange' ? 'bg-orange-100' :
                    'bg-purple-100'
                  }`}>
                    {module.icon}
                  </span>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-slate-600">
                  {module.description}
                </CardDescription>
                <div className="mt-3 text-xs text-slate-500">
                  {module.stats}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>系统说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">支持的数据模块</h4>
              <ul className="text-slate-600 space-y-1">
                <li>• 产品主数据 (API_PRODUCT_SRV)</li>
                <li>• 销售订单 (CE_SALESORDER_0001)</li>
                <li>• 生产订单 (API_PRODUCTION_ORDER_2_SRV)</li>
                <li>• 物料库存 (API_MATERIAL_STOCK_SRV)</li>
                <li>• 客户主数据 (API_BUSINESS_PARTNER)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">功能特点</h4>
              <ul className="text-slate-600 space-y-1">
                <li>• 实时数据查询</li>
                <li>• 支持筛选和分页</li>
                <li>• 详情数据展示</li>
                <li>• API代理安全保护</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}