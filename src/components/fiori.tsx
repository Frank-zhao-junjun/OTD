'use client';

import { ReactNode } from 'react';

/**
 * Fiori ObjectListItem - standard card row for list pages
 * Left status bar + 3-line content (title, subtitle, status)
 */
interface FioriOliProps {
  barColor: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  title: string;
  subtitle?: string;
  status?: ReactNode;
  onClick?: () => void;
  children?: ReactNode; // extra detail row
}

export function FioriOli({ barColor, title, subtitle, status, onClick, children }: FioriOliProps) {
  return (
    <div className="fiori-oli" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className={`fiori-oli-bar fiori-oli-bar--${barColor}`} />
      <div className="fiori-oli-content">
        <div className="fiori-oli-title">{title}</div>
        {subtitle && <div className="fiori-oli-subtitle">{subtitle}</div>}
        {status && <div>{status}</div>}
        {children}
      </div>
    </div>
  );
}

/**
 * Fiori Badge - status indicator
 */
interface FioriBadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: ReactNode;
}

export function FioriBadge({ variant, children }: FioriBadgeProps) {
  return <span className={`fiori-badge fiori-badge--${variant}`}>{children}</span>;
}

/**
 * Fiori FilterBar - search/filter area
 */
interface FioriFilterBarProps {
  children: ReactNode;
}

export function FioriFilterBar({ children }: FioriFilterBarProps) {
  return <div className="fiori-filterbar">{children}</div>;
}

/**
 * Fiori PageHeader - title + count
 */
interface FioriPageHeaderProps {
  icon: ReactNode;
  title: string;
  count?: number;
}

export function FioriPageHeader({ icon, title, count }: FioriPageHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,112,242,0.1)', color: '#0070F2' }}>
        {icon}
      </div>
      <div className="flex-1">
        <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{title}</h1>
      </div>
      {count !== undefined && (
        <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          {count} 条
        </span>
      )}
    </div>
  );
}

/**
 * Fiori EmptyState
 */
interface FioriEmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function FioriEmptyState({ icon, title, description, action }: FioriEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3" style={{ color: 'var(--muted-foreground)' }}>{icon}</div>
      <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>{title}</p>
      {description && <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Fiori ErrorState
 */
interface FioriErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function FioriErrorState({ message, onRetry }: FioriErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(187,0,0,0.1)' }}>
        <svg className="w-5 h-5" style={{ color: '#BB0000' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: '#BB0000' }}>查询失败</p>
      <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{message}</p>
      {onRetry && (
        <button
          className="mt-4 text-xs font-medium px-4 py-1.5 rounded cursor-pointer"
          style={{ background: 'rgba(187,0,0,0.1)', color: '#BB0000' }}
          onClick={onRetry}
        >
          重试
        </button>
      )}
    </div>
  );
}

/**
 * Fiori FAB - Floating Action Button
 */
interface FioriFabProps {
  icon: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}

export function FioriFab({ icon, onClick, ariaLabel }: FioriFabProps) {
  return (
    <button className="fiori-fab" onClick={onClick} aria-label={ariaLabel || 'Action'}>
      {icon}
    </button>
  );
}

/**
 * Map SAP status codes to Fiori status color
 */
export function getSapStatusColor(status: string | undefined): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (!status) return 'neutral';
  const s = status.toUpperCase();
  // C = Completed, // A = Open/pending
  if (s === 'C' || s === 'CLSD' || s === 'DLV' || s === 'CNF') return 'success';
  if (s === 'B' || s === 'REL' || s === 'PCNF' || s === 'PDLV') return 'warning';
  if (s === 'X') return 'neutral';
  if (s === 'FAIL' || s === 'REJ') return 'error';
  if (s === 'A' || s === 'CRTD' || s === 'OPN') return 'info';
  return 'neutral';
}

/**
 * Map SAP document status to Chinese label
 */
export function getSapStatusLabel(status: string | undefined): string {
  if (!status) return '-';
  const s = status.toUpperCase();
  const labels: Record<string, string> = {
    'A': '开放',
    'B': '进行中',
    'C': '已完成',
    'X': '已取消',
    'CLSD': '已关闭',
    'DLV': '已交货',
    'REL': '已释放',
    'CRTD': '已创建',
    'CNF': '已确认',
    'PCNF': '部分确认',
    'PDLV': '部分交货',
    'OPN': '开放',
    'FAIL': '失败',
    'REJ': '拒绝',
    '': '无',
  };
  return labels[s] || status;
}
