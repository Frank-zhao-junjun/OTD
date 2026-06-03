'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Factory,
  BarChart3,
  Truck,
  Receipt,
  FileSpreadsheet,
  Package,
  Users,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';

const BUSINESS_ITEMS = [
  { id: 'sales-orders', label: '销售订单', icon: FileText, path: '/sales-orders' },
  { id: 'production-orders', label: '生产订单', icon: Factory, path: '/production-orders' },
  { id: 'material-stock', label: '库存查询', icon: BarChart3, path: '/material-stock' },
  { id: 'outbound-delivery', label: '交货单', icon: Truck, path: '/outbound-delivery' },
  { id: 'billing-documents', label: '开票单据', icon: Receipt, path: '/billing-documents' },
  { id: 'material-documents', label: '物料凭证', icon: FileSpreadsheet, path: '/material-documents' },
];

const MASTER_ITEMS = [
  { id: 'products', label: '产品管理', icon: Package, path: '/products' },
  { id: 'customers', label: '客户管理', icon: Users, path: '/customers' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <div className="text-slate-400 text-sm">加载中...</div>
        </div>
      </div>
    );
  }

  const currentLabel = pathname === '/'
    ? '首页'
    : [...BUSINESS_ITEMS, ...MASTER_ITEMS].find(item => pathname.startsWith(item.path))?.label || '首页';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col bg-slate-900 text-slate-300 shadow-xl transition-all duration-200 ${
          collapsed ? 'w-[60px]' : 'w-[240px]'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-slate-700/50 h-14 ${collapsed ? 'px-3 justify-center' : 'px-4'}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
            ES
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <div className="text-sm font-semibold text-slate-100 truncate">ES+OTD助手</div>
              <div className="text-[10px] text-slate-500 truncate">SAP S/4HANA Cloud</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {/* Home */}
          <Link
            href="/"
            className={`flex items-center gap-3 mx-2 my-0.5 rounded-md cursor-pointer transition-all duration-150 text-sm h-9 ${
              pathname === '/'
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            } ${collapsed ? 'px-0 justify-center' : 'px-3'}`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!collapsed && <span>工作台</span>}
          </Link>

          {/* Business Transactions */}
          {!collapsed && (
            <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-widest text-slate-600 font-semibold">
              业务交易
            </div>
          )}
          {BUSINESS_ITEMS.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 mx-2 my-0.5 rounded-md cursor-pointer transition-all duration-150 text-sm h-9 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                } ${collapsed ? 'px-0 justify-center' : 'px-3'}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Master Data */}
          {!collapsed && (
            <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-widest text-slate-600 font-semibold">
              主数据
            </div>
          )}
          {MASTER_ITEMS.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 mx-2 my-0.5 rounded-md cursor-pointer transition-all duration-150 text-sm h-9 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                } ${collapsed ? 'px-0 justify-center' : 'px-3'}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-slate-700/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors duration-150 cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 min-h-screen transition-all duration-200 ${
          collapsed ? 'ml-[60px]' : 'ml-[240px]'
        }`}
      >
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 h-12 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {pathname !== '/' && (
              <Link href="/" className="hover:text-slate-700 transition-colors cursor-pointer">首页</Link>
            )}
            {pathname !== '/' && <span className="text-slate-300">/</span>}
            <span className="font-medium text-slate-800">{currentLabel}</span>
          </div>
          <div className="text-xs text-slate-400">
            ES+OTD &middot; SAP ERP 数据查询
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
