'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Menu,
  X,
  LogOut,
  Settings,
} from 'lucide-react';
import { fetchSession, clearSessionCache, type ClientSessionUser } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

const BUSINESS_ITEMS = [
  { id: 'sales-orders', label: '销售订单', icon: FileText, path: '/sales-orders' },
  { id: 'production-orders', label: '生产订单', icon: Factory, path: '/production-orders' },
  { id: 'outbound-delivery', label: '发货单', icon: Truck, path: '/outbound-delivery' },
  { id: 'billing-documents', label: '开票单据', icon: Receipt, path: '/billing-documents' },
  { id: 'material-stock', label: '库存查询', icon: BarChart3, path: '/material-stock' },
  { id: 'material-documents', label: '入库单', icon: FileSpreadsheet, path: '/material-documents' },
];

const MASTER_ITEMS = [
  { id: 'products', label: '产品管理', icon: Package, path: '/products' },
  { id: 'customers', label: '客户管理', icon: Users, path: '/customers' },
];

const ALL_ITEMS = [
  { id: 'home', label: '工作台', icon: LayoutDashboard, path: '/' },
  ...BUSINESS_ITEMS,
  ...MASTER_ITEMS,
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<ClientSessionUser | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchSession(true).then(setSession);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    clearSessionCache();
    router.push('/login');
    router.refresh();
  };

  if (pathname === '/login') {
    return <>{children}</>;
  }

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
    ? '工作台'
    : ALL_ITEMS.find(item => item.path !== '/' && pathname.startsWith(item.path))?.label || '工作台';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 bottom-0 z-50 flex-col bg-slate-900 text-slate-300 shadow-xl transition-all duration-200 ${
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

          {session?.role === 'admin' && (
            <>
              {!collapsed && (
                <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-widest text-slate-600 font-semibold">
                  系统
                </div>
              )}
              <Link
                href="/admin/users"
                title={collapsed ? '账号映射' : undefined}
                className={`flex items-center gap-3 mx-2 my-0.5 rounded-md cursor-pointer transition-all duration-150 text-sm h-9 ${
                  pathname.startsWith('/admin')
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                } ${collapsed ? 'px-0 justify-center' : 'px-3'}`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                {!collapsed && <span>账号映射</span>}
              </Link>
            </>
          )}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-slate-700/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors duration-150 cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile Overlay Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-0 left-0 bottom-0 w-[260px] bg-slate-900 text-slate-300 shadow-2xl flex flex-col">
            {/* Mobile menu header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  ES
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">ES+OTD助手</div>
                  <div className="text-[10px] text-slate-500">SAP S/4HANA Cloud</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile navigation */}
            <nav className="flex-1 py-2 overflow-y-auto">
              <Link
                href="/"
                className={`flex items-center gap-3 mx-2 my-0.5 rounded-md cursor-pointer transition-all duration-150 text-sm h-10 px-3 ${
                  pathname === '/'
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <span>工作台</span>
              </Link>

              <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-widest text-slate-600 font-semibold">
                业务交易
              </div>
              {BUSINESS_ITEMS.map((item) => {
                const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={`flex items-center gap-3 mx-2 my-0.5 rounded-md cursor-pointer transition-all duration-150 text-sm h-10 px-3 ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 font-medium'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-widest text-slate-600 font-semibold">
                主数据
              </div>
              {MASTER_ITEMS.map((item) => {
                const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={`flex items-center gap-3 mx-2 my-0.5 rounded-md cursor-pointer transition-all duration-150 text-sm h-10 px-3 ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 font-medium'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 min-h-screen transition-all duration-200 ${
          collapsed ? 'md:ml-[60px]' : 'md:ml-[240px]'
        }`}
      >
        {/* Top Bar - Mobile aware */}
        <header className="bg-white border-b border-slate-200 h-12 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Hamburger for mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {pathname !== '/' && (
                <Link href="/" className="hover:text-slate-700 transition-colors cursor-pointer hidden sm:inline">首页</Link>
              )}
              {pathname !== '/' && <span className="text-slate-300 hidden sm:inline">/</span>}
              <span className="font-medium text-slate-800">{currentLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{session.displayName}</span>
                {session.sapUserId ? (
                  <span className="text-slate-400">SAP {session.sapUserId}</span>
                ) : (
                  <span className="text-amber-600">未绑定SAP</span>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 h-8 px-2"
              onClick={handleLogout}
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">退出</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-pb">
        <div className="grid grid-cols-5 h-14">
          {[
            { icon: LayoutDashboard, label: '工作台', path: '/' },
            { icon: FileText, label: '销售', path: '/sales-orders' },
            { icon: Factory, label: '生产', path: '/production-orders' },
            { icon: BarChart3, label: '库存', path: '/material-stock' },
            { icon: Truck, label: '交货', path: '/outbound-delivery' },
          ].map((tab) => {
            const isActive = pathname === tab.path || (tab.path !== '/' && pathname.startsWith(tab.path));
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors duration-150 ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] leading-tight">{tab.label}</span>
              </Link>
            );
          })}
        </div>
        {/* More row */}
        <div className="grid grid-cols-3 h-10 border-t border-slate-100">
          {[
            { icon: Receipt, label: '开票', path: '/billing-documents' },
            { icon: FileSpreadsheet, label: '入库单', path: '/material-documents' },
            { icon: Package, label: '更多', path: '/products' },
          ].map((tab) => {
            const isActive = pathname === tab.path || pathname.startsWith(tab.path);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150 ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px]">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
