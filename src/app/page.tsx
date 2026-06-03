'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const QUICK_ACCESS_MODULES = [
  {
    title: '销售订单',
    description: '查询销售订单、行项目明细',
    icon: '📝',
    path: '/sales-orders',
    api: 'CE_SALESORDER_0001',
    color: 'green',
  },
  {
    title: '生产订单',
    description: '查询生产订单、工序、组件',
    icon: '🏭',
    path: '/production-orders',
    api: 'CE_PRODUCTIONORDER_0001',
    color: 'orange',
  },
  {
    title: '库存查询',
    description: '查询物料库存、批次信息',
    icon: '📊',
    path: '/material-stock',
    api: 'API_MATERIAL_STOCK_SRV',
    color: 'purple',
  },
  {
    title: '交货单',
    description: '查询外向交货、行项目明细',
    icon: '🚚',
    path: '/outbound-delivery',
    api: 'API_OUTBOUND_DELIVERY_SRV',
    color: 'teal',
  },
  {
    title: '开票单据',
    description: '查询开票凭证、行项目金额',
    icon: '🧾',
    path: '/billing-documents',
    api: 'API_BILLING_DOCUMENT_SRV',
    color: 'amber',
  },
  {
    title: '物料凭证',
    description: '查询物料移动记录、收发存',
    icon: '📄',
    path: '/material-documents',
    api: 'API_MATERIAL_DOCUMENT_SRV',
    color: 'rose',
  },
  {
    title: '产品管理',
    description: '查询产品主数据、物料组信息',
    icon: '📦',
    path: '/products',
    api: 'API_PRODUCT_SRV',
    color: 'blue',
  },
  {
    title: '客户管理',
    description: '查询客户主数据、销售范围',
    icon: '👥',
    path: '/customers',
    api: 'API_BUSINESS_PARTNER',
    color: 'cyan',
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
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl bg-slate-100">
                    {module.icon}
                  </span>
                  <div>
                    <CardTitle className="text-base">{module.title}</CardTitle>
                    <span className="text-xs text-slate-400 font-mono">{module.api}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-slate-600">
                  {module.description}
                </CardDescription>
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
              <h4 className="font-semibold text-slate-700 mb-2">8大接口模块</h4>
              <ul className="text-slate-600 space-y-1">
                <li>1. 产品主数据 — API_PRODUCT_SRV (V2)</li>
                <li>2. 客户主数据 — API_BUSINESS_PARTNER (V2)</li>
                <li>3. 销售订单 — CE_SALESORDER_0001 (V4)</li>
                <li>4. 生产订单 — CE_PRODUCTIONORDER_0001 (V4)</li>
                <li>5. 成品库存 — API_MATERIAL_STOCK_SRV (V2)</li>
                <li>6. 外向交货 — API_OUTBOUND_DELIVERY_SRV;v=0002 (V2)</li>
                <li>7. 开票单据 — API_BILLING_DOCUMENT_SRV (V2)</li>
                <li>8. 物料凭证 — API_MATERIAL_DOCUMENT_SRV (V2)</li>
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