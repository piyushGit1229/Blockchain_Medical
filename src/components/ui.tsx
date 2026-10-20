// ============================================================
// MediLedger — Shared UI Components
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { RecordCategory, ConsentStatus, AccessRequestStatus, AuditEventType, AuditOutcome, PatientStatus } from '../types';

// ── Badge ─────────────────────────────────────────────────────
interface BadgeProps {
  variant: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ variant, children, size, className = '', style }) => (
  <span className={`badge badge-${variant} ${size ? `badge-${size}` : ''} ${className}`.trim()} style={style}>{children}</span>
);

export const DemoBadge: React.FC = () => (
  <span className="badge badge-demo">DEMO DATA</span>
);

// ── Status Badges ─────────────────────────────────────────────
export const ConsentStatusBadge: React.FC<{ status: ConsentStatus }> = ({ status }) => {
  const labels: Record<ConsentStatus, string> = {
    active: 'Active', pending: 'Pending', expired: 'Expired',
    revoked: 'Revoked', denied: 'Denied'
  };
  return <Badge variant={status}>{labels[status]}</Badge>;
};

export const RequestStatusBadge: React.FC<{ status: AccessRequestStatus }> = ({ status }) => {
  const labels: Record<AccessRequestStatus, string> = {
    pending: 'Pending', approved: 'Approved', denied: 'Denied', expired: 'Expired'
  };
  return <Badge variant={status}>{labels[status]}</Badge>;
};

export const PatientStatusBadge: React.FC<{ status: PatientStatus }> = ({ status }) => {
  const labels: Record<PatientStatus, string> = {
    active: 'Active', inactive: 'Inactive', pending: 'Pending'
  };
  return <Badge variant={status}>{labels[status]}</Badge>;
};

export const RecordCategoryBadge: React.FC<{ category: RecordCategory }> = ({ category }) => {
  const labels: Record<RecordCategory, string> = {
    lab_report: 'Lab Report', imaging: 'Imaging', prescription: 'Prescription',
    clinical_note: 'Clinical Note', discharge_summary: 'Discharge Summary',
    vaccination: 'Vaccination', pathology: 'Pathology', radiology: 'Radiology'
  };
  return <Badge variant="indexed">{labels[category]}</Badge>;
};

export const AuditOutcomeBadge: React.FC<{ outcome: AuditOutcome }> = ({ outcome }) => {
  const map: Record<AuditOutcome, { label: string; variant: string }> = {
    success: { label: 'Success', variant: 'active' },
    denied: { label: 'Denied', variant: 'denied' },
    error: { label: 'Error', variant: 'failed' },
    warning: { label: 'Warning', variant: 'pending' },
  };
  return <Badge variant={map[outcome].variant}>{map[outcome].label}</Badge>;
};

// ── Avatar ────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#dbeafe', '#1e40af'], ['#dcfce7', '#166534'], ['#fce7f3', '#9d174d'],
  ['#f3e8ff', '#6b21a8'], ['#fef3c7', '#92400e'], ['#e0f2fe', '#0c4a6e'],
  ['#f0fdf4', '#14532d'], ['#fdf4ff', '#701a75'],
];

function getAvatarColor(initials: string): [string, string] {
  const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] as [string, string];
}

interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ initials, size = 'md', className = '' }) => {
  const [bg, color] = getAvatarColor(initials);
  return (
    <div
      className={`avatar avatar-${size === 'md' ? '' : size} ${className}`}
      style={{ background: bg, color, fontWeight: 700 }}
    >
      {initials}
    </div>
  );
};

// ── Toast System ──────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

let _toastCallback: ((toast: Omit<ToastItem, 'id'>) => void) | null = null;

export function showToast(arg1: ToastType | string, arg2?: string, arg3?: string) {
  if (!_toastCallback) return;
  const isType = (val: string): val is ToastType => ['success', 'error', 'warning', 'info'].includes(val);
  
  if (isType(arg1)) {
    _toastCallback({ type: arg1, title: arg2 || '', message: arg3 });
  } else if (arg2 && isType(arg2)) {
    _toastCallback({ type: arg2, title: arg1, message: arg3 });
  } else {
    _toastCallback({ type: 'info', title: arg1, message: arg2 });
  }
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    _toastCallback = (toast) => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { ...toast, id }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    return () => { _toastCallback = null; };
  }, []);

  const icons = { success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info };

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const Icon = icons[toast.type];
        return (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{toast.title}</div>
              {toast.message && <div style={{ opacity: 0.8, marginTop: 2 }}>{toast.message}</div>}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ── Modal ─────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, size = 'md', children, footer }) => {
  useEffect(() => {
    if (open) {
      const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

// ── Confirm Dialog ────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'teal';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm',
  confirmVariant = 'primary', loading = false
}) => (
  <Modal open={open} onClose={onClose} title={title} size="sm"
    footer={
      <>
        <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
        <button className={`btn btn-${confirmVariant}`} onClick={onConfirm} disabled={loading}>
          {loading ? <span className="animate-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : null}
          {confirmLabel}
        </button>
      </>
    }
  >
    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{message}</p>
  </Modal>
);

// ── Skeleton ──────────────────────────────────────────────────
export const Skeleton: React.FC<{ width?: string | number; height?: string | number; className?: string }> = ({
  width = '100%', height = 16, className = ''
}) => (
  <div className={`skeleton ${className}`} style={{ width, height }} />
);

// ── Search Input ──────────────────────────────────────────────
interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string | number;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = 'Search...', width = 240 }) => (
  <div className="search-input-wrapper" style={{ width }}>
    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input
      type="search"
      className="form-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

// ── Dropdown Menu ─────────────────────────────────────────────
interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="dropdown" ref={ref}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      {open && <div className="dropdown-menu" onClick={() => setOpen(false)}>{children}</div>}
    </div>
  );
};

// ── Tabs ──────────────────────────────────────────────────────
interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange }) => (
  <div className="tabs">
    {tabs.map(tab => (
      <div
        key={tab.id}
        className={`tab-item ${active === tab.id ? 'active' : ''}`}
        onClick={() => onChange(tab.id)}
        role="tab"
        aria-selected={active === tab.id}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onChange(tab.id); }}
      >
        {tab.label}
        {tab.count !== undefined && (
          <span style={{
            marginLeft: 6, fontSize: 11, fontWeight: 600, padding: '1px 6px',
            background: active === tab.id ? 'var(--color-navy)' : 'var(--color-border)',
            color: active === tab.id ? 'white' : 'var(--color-text-secondary)',
            borderRadius: 100
          }}>{tab.count}</span>
        )}
      </div>
    ))}
  </div>
);

// ── Pagination ────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  total: number;
  pageSize: number;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onChange, total, pageSize }) => {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginRight: 'auto' }}>
        {start}–{end} of {total}
      </span>
      <button className="page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        let p = i + 1;
        if (totalPages > 5) {
          if (page <= 3) p = i + 1;
          else if (page >= totalPages - 2) p = totalPages - 4 + i;
          else p = page - 2 + i;
        }
        return (
          <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        );
      })}
      <button className="page-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
};

// ── Step Indicator ────────────────────────────────────────────
interface StepIndicatorProps {
  steps: string[];
  current: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, current }) => (
  <div className="step-indicator">
    {steps.map((step, i) => (
      <React.Fragment key={i}>
        <div className="step-item">
          <div className={`step-circle ${i < current ? 'completed' : i === current ? 'active' : ''}`}>
            {i < current ? '✓' : i + 1}
          </div>
          <span style={{ fontSize: 12, color: i === current ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: i === current ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {step}
          </span>
        </div>
        {i < steps.length - 1 && <div className={`step-line ${i < current ? 'completed' : ''}`} />}
      </React.Fragment>
    ))}
  </div>
);

// ── Hash Display ──────────────────────────────────────────────
export const HashDisplay: React.FC<{ value: string | null; label?: string; demo?: boolean }> = ({
  value, label, demo = false
}) => {
  const [copied, setCopied] = useState(false);
  const display = value || '—';

  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div>
      {label && <div className="form-label">{label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="hash-display" style={{ flex: 1 }}>
          {demo && <span style={{ color: '#b45309', marginRight: 4 }}>[DEMO]</span>}
          {display}
        </div>
        {value && (
          <button className="btn btn-ghost btn-sm" onClick={copy} style={{ flexShrink: 0 }}>
            {copied ? '✓' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Timeline Item ─────────────────────────────────────────────
interface TimelineItemProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle?: string;
  time: string;
  children?: React.ReactNode;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ icon, color, title, subtitle, time, children }) => (
  <div className="timeline-item">
    <div className="timeline-dot" style={{ background: color, borderColor: color, color: 'white' }}>
      {icon}
    </div>
    <div className="timeline-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{time}</div>
      </div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{subtitle}</div>}
      {children}
    </div>
  </div>
);

// ── Loading Spinner ───────────────────────────────────────────
export const LoadingSpinner: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'var(--color-navy)' }) => (
  <div style={{
    width: size, height: size, border: `2px solid rgba(0,0,0,0.1)`,
    borderTopColor: color, borderRadius: '50%'
  }} className="animate-spin" />
);

// ── Empty State ───────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <div className="empty-state-title">{title}</div>
    <p className="empty-state-desc">{description}</p>
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </div>
);

// ── Audit Event Type Display ──────────────────────────────────
export function getAuditEventLabel(type: AuditEventType): string {
  const map: Record<AuditEventType, string> = {
    patient_registered: 'Patient Registered',
    record_uploaded: 'Record Uploaded',
    record_accessed: 'Record Accessed',
    access_requested: 'Access Requested',
    access_granted: 'Access Granted',
    access_denied: 'Access Denied',
    consent_created: 'Consent Created',
    consent_revoked: 'Consent Revoked',
    policy_evaluated: 'Policy Evaluated',
    org_joined: 'Organization Joined',
    login: 'Login',
    logout: 'Logout',
  };
  return map[type] || type;
}

export function getRecordCategoryLabel(cat: RecordCategory): string {
  const map: Record<RecordCategory, string> = {
    lab_report: 'Lab Report', imaging: 'Imaging', prescription: 'Prescription',
    clinical_note: 'Clinical Note', discharge_summary: 'Discharge Summary',
    vaccination: 'Vaccination', pathology: 'Pathology', radiology: 'Radiology'
  };
  return map[cat] || cat;
}

// ── Alert Box ─────────────────────────────────────────────────
interface AlertBoxProps {
  variant: 'warning' | 'error' | 'success' | 'info';
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const AlertBox: React.FC<AlertBoxProps> = ({ variant, children, style, className = '' }) => {
  const icons = { warning: AlertTriangle, error: AlertCircle, success: CheckCircle, info: Info };
  const Icon = icons[variant];
  return (
    <div className={`alert alert-${variant} ${className}`.trim()} style={style}>
      <Icon size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
};

// ── Sort Header ───────────────────────────────────────────────
interface SortHeaderProps {
  label: string;
  field: string;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export const SortHeader: React.FC<SortHeaderProps> = ({ label, field, sortField, sortDir, onSort }) => (
  <th onClick={() => onSort(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {label}
      {sortField === field ? (
        <span style={{ color: 'var(--color-navy)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
      ) : (
        <span style={{ opacity: 0.3 }}>↕</span>
      )}
    </span>
  </th>
);
