'use client';

import { ReactNode, useEffect, useState, useRef } from 'react';
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
  Menu,
  Search,
  Bell,
  User,
  LayoutDashboard,
  X,
  ChevronRight,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { GlobalSearch } from './global-search';

interface UserInfo {
  id: string;
  username: string;
  role: 'admin' | 'user';
  displayName?: string;
  email?: string;
}

const BUSINESS_ITEMS = [
  { id: 'sales-orders', label: '销售订单', icon: FileText, path: '/sales-orders' },
  { id: 'production-orders', label: '生产订单', icon: Factory, path: '/production-orders' },
  { id: 'outbound-delivery', label: '发货单', icon: Truck, path: '/outbound-delivery' },
  { id: 'billing-documents', label: '开票单据', icon: Receipt, path: '/billing-documents' },
  { id: 'material-documents', label: '入库单', icon: FileSpreadsheet, path: '/material-documents' },
  { id: 'material-stock', label: '库存查询', icon: BarChart3, path: '/material-stock' },
];

const MASTER_ITEMS = [
  { id: 'products', label: '产品管理', icon: Package, path: '/products' },
  { id: 'customers', label: '客户管理', icon: Users, path: '/customers' },
];

const SYSTEM_ITEMS = [
  { id: 'settings', label: '设置', icon: Settings, path: '/settings' },
];

const ADMIN_ITEMS = [
  { id: 'admin-users', label: '用户管理', icon: ShieldCheck, path: '/admin/users' },
];

const ALL_ITEMS = [
  { id: 'home', label: '工作台', icon: LayoutDashboard, path: '/' },
  ...BUSINESS_ITEMS,
  ...MASTER_ITEMS,
  ...SYSTEM_ITEMS,
  ...ADMIN_ITEMS,
];

// Mobile tab items (bottom navigation) - 8 items
const MOBILE_TAB_ITEMS = [
  { icon: LayoutDashboard, label: '工作台', path: '/' },
  { icon: FileText, label: '销售', path: '/sales-orders' },
  { icon: Factory, label: '生产', path: '/production-orders' },
  { icon: Truck, label: '发货', path: '/outbound-delivery' },
  { icon: BarChart3, label: '库存', path: '/material-stock' },
  { icon: Receipt, label: '开票', path: '/billing-documents' },
  { icon: Package, label: '产品', path: '/products' },
  { icon: Users, label: '客户', path: '/customers' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Fetch current user
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <div style={{ color: 'var(--muted-foreground)' }} className="text-sm">加载中...</div>
        </div>
      </div>
    );
  }

  const currentPage = ALL_ITEMS.find(item => 
    item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
  );

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--background)' }}>
      {/* ===== Fiori ShellBar ===== */}
      <header className="fiori-shellbar">
        {/* Hamburger - only on mobile/tablet, opens sidebar overlay */}
        <button
          className="fiori-shellbar-btn lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 mr-1">
          <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFF' }}>
            OT
          </div>
        </div>

        {/* Title */}
        <div className="fiori-shellbar-title">
          OTD助手
        </div>

        {/* Page title breadcrumb - PC only */}
        {currentPage && currentPage.path !== '/' && (
          <div className="hidden lg:flex items-center gap-1 mr-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <ChevronRight className="w-4 h-4" />
            <span className="text-sm whitespace-nowrap">{currentPage.label}</span>
          </div>
        )}

        {/* Search - opens GlobalSearch panel */}
        <button
          className="fiori-shellbar-btn hidden sm:flex items-center gap-2 px-3"
          onClick={() => setGlobalSearchOpen(true)}
          aria-label="Search (Cmd+K)"
        >
          <Search className="w-5 h-5" />
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}>
            ⌘K
          </kbd>
        </button>
        <button
          className="fiori-shellbar-btn sm:hidden"
          onClick={() => setGlobalSearchOpen(true)}
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications - PC only */}
        <button className="fiori-shellbar-btn hidden md:flex" aria-label="Notifications">
          <Bell className="w-5 h-5" />
        </button>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button 
            className="fiori-shellbar-btn" 
            aria-label="User menu"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <User className="w-5 h-5" />
          </button>
          
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-lg border z-50" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                  {user?.displayName || user?.username || '用户'}
                </p>
                {user?.email && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {user.email}
                  </p>
                )}
                {user?.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'rgba(0,112,242,0.12)', color: '#0070F2' }}>
                    <ShieldCheck className="w-3 h-3" />
                    管理员
                  </span>
                )}
              </div>
              <div className="p-1">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-[var(--accent)] transition-colors"
                  style={{ color: 'var(--foreground)' }}
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  <span>设置</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm w-full text-left hover:bg-[var(--accent)] transition-colors"
                  style={{ color: '#BB0000' }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ===== Body: Sidebar + Content ===== */}
      <div className="flex flex-1 relative">
        {/* Sidebar Overlay Backdrop - mobile only */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            style={{ top: 'var(--fiori-shell-height)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - PC: always visible sticky | Mobile: overlay */}
        <aside
          className={`fiori-sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{ top: 'var(--fiori-shell-height)' }}
        >
          {/* Home */}
          <Link
            href="/"
            className={`fiori-sidebar-item ${pathname === '/' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <LayoutDashboard className="w-[18px] h-[18px]" />
            <span>工作台</span>
          </Link>

          {/* Business Group */}
          <div className="fiori-sidebar-group-label">业务交易</div>
          {BUSINESS_ITEMS.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`fiori-sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Master Data Group */}
          <div className="fiori-sidebar-group-label">主数据</div>
          {MASTER_ITEMS.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`fiori-sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* System Group */}
          <div className="fiori-sidebar-group-label">系统</div>
          {SYSTEM_ITEMS.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`fiori-sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Admin Group - only visible to admin users */}
          {user?.role === 'admin' && (
            <>
              <div className="fiori-sidebar-group-label">管理</div>
              <Link
                href="/admin/users"
                className={`fiori-sidebar-item ${pathname.startsWith('/admin') ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <ShieldCheck className="w-[18px] h-[18px]" />
                <span>用户管理</span>
              </Link>
            </>
          )}
        </aside>

        {/* ===== Main Content ===== */}
        <main className="flex-1 min-w-0">
          <div className="p-4 md:p-6 pb-20 lg:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* ===== Mobile Bottom Tab Bar (8 items, single row with scroll) ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-around h-14 px-1">
          {MOBILE_TAB_ITEMS.map((tab) => {
            const isActive = tab.path === '/' 
              ? pathname === '/' 
              : pathname.startsWith(tab.path);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.label}
                href={tab.path}
                className="flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors duration-150 min-w-0 flex-1"
                style={{ color: isActive ? 'var(--primary)' : 'var(--muted-foreground)' }}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[10px] leading-tight truncate w-full text-center">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {/* ===== Global Search Panel ===== */}
      <GlobalSearch open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
    </div>
  );
}
