'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { id: 'products', label: '产品管理', icon: '📦', path: '/products' },
  { id: 'sales-orders', label: '销售订单', icon: '📝', path: '/sales-orders' },
  { id: 'production-orders', label: '生产订单', icon: '🏭', path: '/production-orders' },
  { id: 'material-stock', label: '库存查询', icon: '📊', path: '/material-stock' },
  { id: 'customers', label: '客户管理', icon: '👥', path: '/customers' },
  { id: 'outbound-delivery', label: '交货单', icon: '🚚', path: '/outbound-delivery' },
  { id: 'billing-documents', label: '开票单据', icon: '🧾', path: '/billing-documents' },
  { id: 'material-documents', label: '物料凭证', icon: '📄', path: '/material-documents' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-slate-200 flex flex-col fixed top-0 left-0 bottom-0 z-50 overflow-y-auto shadow-lg">
        {/* Logo */}
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-lg">
              ES
            </div>
            <div>
              <div className="text-base font-semibold text-slate-100">ES+OTD助手</div>
              <div className="text-xs text-slate-400">SAP S/4HANA Cloud</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <div className="px-4 py-2 text-xs uppercase text-slate-500 font-semibold tracking-wider">
            数据查询
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`flex items-center gap-3 px-5 py-3 mx-2 rounded-md cursor-pointer transition-all duration-150 text-sm
                  ${isActive 
                    ? 'bg-blue-600/20 text-white font-semibold border-l-3 border-blue-500' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100 border-l-3 border-transparent'
                  }`}
              >
                <span className="w-6 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            U
          </div>
          <div className="text-sm">
            <div className="text-slate-200 font-medium">用户</div>
            <div className="text-xs text-slate-500">EPC_USER</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 min-h-screen bg-slate-50">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 shadow-sm h-12 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="text-sm text-slate-600">
            {pathname === '/' ? (
              <span className="font-semibold text-slate-800">首页</span>
            ) : (
              <>
                数据查询 / <span className="font-semibold text-slate-800">
                  {NAV_ITEMS.find(item => pathname.startsWith(item.path))?.label || '首页'}
                </span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-500">
            SAP ERP 数据查询助手
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
