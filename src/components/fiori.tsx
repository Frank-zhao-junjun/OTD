'use client';

import { ReactNode, isValidElement } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  MinusCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

/* =============================================================
 * Fiori 3 Status / Variant type
 * ============================================================= */
export type FioriStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type FioriBandColor = FioriStatus | 'blue' | 'green' | 'orange' | 'red' | 'cyan' | 'purple' | 'pink' | 'teal';

/* =============================================================
 * Fiori ObjectListItem (Fiori 3 standard)
 * Left status bar + head row + 3 attributes + status badge
 * ============================================================= */
interface FioriOliProps {
  barColor: FioriStatus;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  statusVariant?: FioriStatus;
  attributes?: { label: string; value: ReactNode }[];
  numeric?: ReactNode;
  onClick?: () => void;
  href?: string;
}

export function FioriOli({ barColor, title, subtitle, status, statusVariant, attributes, numeric, onClick, href }: FioriOliProps) {
  const inner = (
    <>
      <div className={`fiori-oli-bar fiori-oli-bar--${barColor}`} />
      <div className="fiori-oli-content">
        <div className="fiori-oli-head">
          <div className="fiori-oli-title">{title}</div>
          {numeric && <div className="fiori-oli-numeric">{numeric}</div>}
          {status && (
            <div className="fiori-oli-status-wrap">
              {isValidElement(status) ? status : <FioriBadge variant={statusVariant || 'neutral'}>{status}</FioriBadge>}
            </div>
          )}
        </div>
        {subtitle && <div className="fiori-oli-subtitle">{subtitle}</div>}
        {attributes && attributes.length > 0 && (
          <div className="fiori-oli-attributes">
            {attributes.slice(0, 3).map((attr, i) => (
              <div key={i} className="fiori-oli-attr">
                <span className="fiori-oli-attr-label">{attr.label}</span>
                <span className="fiori-oli-attr-value">{attr.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="fiori-oli">
        {inner}
      </Link>
    );
  }
  return (
    <div className="fiori-oli" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {inner}
    </div>
  );
}

/* =============================================================
 * Fiori Badge - status indicator (pill)
 * ============================================================= */
interface FioriBadgeProps {
  variant: FioriStatus;
  children: ReactNode;
}

export function FioriBadge({ variant, children }: FioriBadgeProps) {
  return <span className={`fiori-badge fiori-badge--${variant}`}>{children}</span>;
}

/* =============================================================
 * Fiori ObjectStatus - semantic colored inline status with icon
 * ============================================================= */
interface FioriObjectStatusProps {
  variant: FioriStatus | 'inverted';
  state?: 'positive' | 'negative' | 'critical' | 'information' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  text: string;
  icon?: LucideIcon;
  showIcon?: boolean;
}

export function FioriObjectStatus({ variant, text, icon, showIcon = true }: FioriObjectStatusProps) {
  const Icon = icon || STATUS_ICON_MAP[statusKey(text)] || MinusCircle;
  return (
    <span className={`fiori-objectstatus fiori-objectstatus--${variant}`}>
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{text}</span>
    </span>
  );
}

type StatusKey = 'success' | 'warning' | 'partial' | 'cancelled' | 'open' | 'released' | 'neutral';

function statusKey(text: string): StatusKey {
  const t = text.toLowerCase();
  if (t.includes('完成') || t.includes('成功') || t.includes('交货') || t.includes('已开票') || t.includes('已确认') || t.includes('已关闭')) return 'success';
  if (t.includes('部分') || t.includes('进行')) return 'partial';
  if (t.includes('取消') || t.includes('失败') || t.includes('拒绝') || t.includes('错误')) return 'cancelled';
  if (t.includes('创建') || t.includes('开放') || t.includes('未') || t.includes('待')) return 'open';
  if (t.includes('释放')) return 'released';
  return 'neutral';
}

const STATUS_ICON_MAP: Record<StatusKey, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  partial: AlertCircle,
  cancelled: XCircle,
  open: AlertTriangle,
  released: Info,
  neutral: MinusCircle,
};

/* =============================================================
 * Fiori FilterBar - search/filter area
 * ============================================================= */
interface FioriFilterBarProps {
  children: ReactNode;
}

export function FioriFilterBar({ children }: FioriFilterBarProps) {
  return <div className="fiori-filterbar">{children}</div>;
}

/* =============================================================
 * Fiori PageHeader with Breadcrumb
 * ============================================================= */
interface FioriBreadcrumbItem {
  label: string;
  href?: string;
}

interface FioriPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  breadcrumbs?: FioriBreadcrumbItem[];
  actions?: ReactNode;
}

export function FioriPageHeader({ title, subtitle, icon: Icon, breadcrumbs, actions }: FioriPageHeaderProps) {
  return (
    <div className="fiori-pageheader">
      <div className="fiori-pageheader-left">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="fiori-breadcrumb">
            {breadcrumbs.map((item, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <span key={i} className="flex items-center gap-1">
                  {item.href && !isLast ? (
                    <Link href={item.href} className="fiori-breadcrumb-item">
                      {item.label}
                    </Link>
                  ) : (
                    <span className={`fiori-breadcrumb-item ${isLast ? 'fiori-breadcrumb-item--current' : ''}`}>
                      {item.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="w-3 h-3 fiori-breadcrumb-sep" />}
                </span>
              );
            })}
          </nav>
        )}
        <div className="fiori-pageheader-title">
          {Icon && (
            <span className="fiori-pageheader-icon">
              <Icon className="w-4 h-4" />
            </span>
          )}
          {title}
        </div>
        {subtitle && <div className="fiori-pageheader-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="fiori-pageheader-actions">{actions}</div>}
    </div>
  );
}

/* =============================================================
 * Fiori KPI Card
 * ============================================================= */
interface FioriKpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: string; direction: 'up' | 'down' | 'flat'; label?: string };
  color?: FioriBandColor;
}

export function FioriKpiCard({ label, value, unit, delta, color = 'blue' }: FioriKpiCardProps) {
  return (
    <div className={`fiori-kpi fiori-kpi--${color}`}>
      <div className="fiori-kpi-label">{label}</div>
      <div className="fiori-kpi-value">
        <span className="fiori-kpi-number">{value}</span>
        {unit && <span className="fiori-kpi-unit">{unit}</span>}
      </div>
      {delta && (
        <div className="fiori-kpi-footer">
          <span className={`fiori-kpi-delta fiori-kpi-delta--${delta.direction}`}>
            {delta.direction === 'up' && <TrendingUp className="w-3 h-3" />}
            {delta.direction === 'down' && <TrendingDown className="w-3 h-3" />}
            {delta.direction === 'flat' && <Minus className="w-3 h-3" />}
            {delta.value}
          </span>
          {delta.label && <span>{delta.label}</span>}
        </div>
      )}
    </div>
  );
}

/* =============================================================
 * Fiori Section Header
 * ============================================================= */
interface FioriSectionProps {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}

export function FioriSection({ title, meta, children }: FioriSectionProps) {
  return (
    <section>
      <div className="fiori-section-header">
        <h2 className="fiori-section-title">{title}</h2>
        {meta !== undefined && <span className="fiori-section-meta">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

/* =============================================================
 * Fiori Activity Stream Item
 * ============================================================= */
interface FioriActivityProps {
  color?: FioriStatus;
  text: ReactNode;
  meta?: ReactNode;
}

export function FioriActivity({ color = 'info', text, meta }: FioriActivityProps) {
  return (
    <div className="fiori-activity">
      <div className={`fiori-activity-bullet fiori-oli-bar--${color}`} style={{ borderRadius: '50%' }} />
      <div className="fiori-activity-content">
        <div className="fiori-activity-text">{text}</div>
        {meta && <div className="fiori-activity-meta">{meta}</div>}
      </div>
    </div>
  );
}

/* =============================================================
 * Fiori Facet Group (key-value table)
 * ============================================================= */
interface FioriFacetGroupProps {
  title?: string;
  rows: { label: string; value: ReactNode }[];
}

export function FioriFacetGroup({ title, rows }: FioriFacetGroupProps) {
  return (
    <div className="fiori-facets">
      {title && <div className="fiori-facet-group-header">{title}</div>}
      <div className="fiori-facet-rows">
        {rows.map((r, i) => (
          <div key={i} className="fiori-facet-row">
            <div className="fiori-facet-label">{r.label}</div>
            <div className="fiori-facet-value">{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============================================================
 * Fiori ObjectHeader (detail page header)
 * ============================================================= */
interface FioriObjectHeaderProps {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  statusSlot?: ReactNode;
  fields: { label: string; value: ReactNode }[];
}

export function FioriObjectHeader({ title, subtitle, icon, statusSlot, fields }: FioriObjectHeaderProps) {
  return (
    <div className="fiori-objheader">
      <div className="fiori-objheader-head">
        {icon && <div className="fiori-objheader-avatar">{icon}</div>}
        <div className="fiori-objheader-head-text">
          <div className="fiori-objheader-title-row">
            <div className="fiori-objheader-title">{title}</div>
            {statusSlot}
          </div>
          {subtitle && <div className="fiori-objheader-subtitle">{subtitle}</div>}
        </div>
      </div>
      {fields.length > 0 && (
        <>
          <div className="fiori-objheader-divider" />
          <div className="fiori-objheader-fields">
            {fields.map((f, i) => (
              <div key={i} className="fiori-objheader-field">
                <span className="fiori-objheader-field-label">{f.label}</span>
                <span className="fiori-objheader-field-value">{f.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* =============================================================
 * Fiori EmptyState
 * ============================================================= */
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

/* =============================================================
 * Fiori ErrorState
 * ============================================================= */
interface FioriErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function FioriErrorState({ message, onRetry }: FioriErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(187,0,0,0.1)' }}>
        <AlertTriangle className="w-5 h-5" style={{ color: '#BB0000' }} />
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

/* =============================================================
 * Fiori FAB - Floating Action Button
 * ============================================================= */
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

/* =============================================================
 * Map SAP status codes to Fiori status color
 * ============================================================= */
export function getSapStatusColor(status: string | undefined): FioriStatus {
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

/* =============================================================
 * Map SAP document status to Chinese label
 * ============================================================= */
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
