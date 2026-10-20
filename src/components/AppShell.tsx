// ============================================================
// MediLedger — Application Shell (Sidebar + Header + Layout)
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Settings, ChevronLeft, ChevronRight,
  Bell, Search, ChevronDown, LogOut, UserCircle, Menu,
  Building2, Stethoscope, Key, Copy, Check, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_PERSONAS } from '../data/demo';
import { DropdownMenu, Modal, ConfirmDialog, Badge, showToast } from './ui';
import { getNavGroupsForRole, ROLE_CONFIGS } from '../utils/rbac';

// ── Sidebar ───────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onOpenProfile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  onOpenProfile
}) => {
  const { currentUser } = useAuth();
  const navGroups = getNavGroupsForRole(currentUser.role);
  const roleConfig = ROLE_CONFIGS[currentUser.role];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49 }}
          onClick={onMobileClose}
        />
      )}
      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div className="logo-mark">
              <Stethoscope size={16} color="white" />
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  MediLedger
                </div>
                <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 1 }}>
                  Healthcare Consortium
                </div>
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onToggle}
            style={{ color: '#475569', padding: 4, flexShrink: 0 }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Org Switcher */}
        {!collapsed && (
          <div className="org-switcher" onClick={onOpenProfile} style={{ cursor: 'pointer' }} title="View Organization Credentials">
            <div style={{
              width: 28, height: 28, borderRadius: 6, background: '#1d4ed8',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Building2 size={14} color="white" />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.organization.shortName}
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                {currentUser.organization.mspId}
              </div>
            </div>
            <ChevronDown size={12} color="#475569" style={{ flexShrink: 0 }} />
          </div>
        )}

        {/* Nav Groups */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingTop: 8, paddingBottom: 8 }}>
          {navGroups.map(group => (
            <div key={group.label}>
              {!collapsed && <div className="nav-group-label">{group.label}</div>}
              {group.items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={'exact' in item && item.exact}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    onClick={onMobileClose}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="nav-icon" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile Pill in Sidebar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 8px' }}>
          <div
            className="nav-item"
            style={{ cursor: 'pointer' }}
            onClick={onOpenProfile}
            title={collapsed ? `${currentUser.name} (${roleConfig.badgeLabel})` : undefined}
          >
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: '#0d9488',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0
            }}>
              {currentUser.avatarInitials}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.name}
                  </span>
                  <Badge variant={roleConfig.badgeVariant} size="sm">
                    {roleConfig.badgeLabel}
                  </Badge>
                </div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  {currentUser.organization.shortName}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

// ── Header ────────────────────────────────────────────────────
interface HeaderProps {
  onMobileMenuOpen: () => void;
  onOpenProfile: () => void;
  onOpenSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onMobileMenuOpen,
  onOpenProfile,
  onOpenSignOut
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    if (showNotifications) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifications]);

  // Breadcrumb
  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; path: string }[] = [
    { label: 'MediLedger', path: '/' },
    ...pathParts.map((part, i) => ({
      label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
      path: '/' + pathParts.slice(0, i + 1).join('/'),
    })),
  ];

  const pendingCount = 2; // Demo pending requests

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/patients?search=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
    }
  };

  return (
    <header className="app-header">
      {/* Mobile menu button */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={onMobileMenuOpen}
        style={{ display: 'none' }}
        aria-label="Open menu"
        id="mobile-menu-btn"
      >
        <Menu size={16} />
      </button>

      {/* Breadcrumb */}
      <nav style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {breadcrumbs.map((bc, i) => (
          <React.Fragment key={bc.path}>
            {i > 0 && <span style={{ color: 'var(--color-border)', fontSize: 14 }}>/</span>}
            <button
              onClick={() => navigate(bc.path)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 13, color: i === breadcrumbs.length - 1 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {bc.label}
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* Global Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center' }}>
        <div className="search-input-wrapper" style={{ width: 220 }}>
          <Search className="search-icon" size={14} />
          <input
            type="search"
            className="form-input"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            placeholder="Search patients, records..."
            style={{ fontSize: 13 }}
          />
        </div>
      </form>

      {/* Notifications */}
      <div style={{ position: 'relative' }} ref={notifRef}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowNotifications(v => !v)}
          aria-label="Notifications"
          style={{ position: 'relative' }}
        >
          <Bell size={16} />
          {pendingCount > 0 && (
            <span className="notification-badge">{pendingCount}</span>
          )}
        </button>
        {showNotifications && (
          <div className="dropdown-menu" style={{ right: 0, width: 320, top: 'calc(100% + 8px)' }}>
            <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--color-border)' }}>
              Notifications
            </div>
            <div className="dropdown-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <div style={{ fontWeight: 500 }}>Access Request — Robert Vasquez</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Dr. Angela Torres · Riverside Valley Hospital</div>
            </div>
            <div className="dropdown-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <div style={{ fontWeight: 500 }}>Access Request — Fatima Al-Hassan</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Dr. Sarah Chen · Northstar Medical Center</div>
            </div>
            <div className="dropdown-divider" />
            <div className="dropdown-item" onClick={() => { navigate('/access-requests'); setShowNotifications(false); }}>
              <span style={{ fontSize: 12, color: 'var(--color-blue-muted)' }}>View all access requests →</span>
            </div>
          </div>
        )}
      </div>

      {/* User Menu */}
      <DropdownMenu
        trigger={
          <button className="btn btn-ghost btn-sm" style={{ gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#0d9488',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'white'
            }}>
              {currentUser.avatarInitials}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{currentUser.name}</span>
            <ChevronDown size={12} />
          </button>
        }
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{currentUser.name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
            {currentUser.role} · {currentUser.organization.shortName}
          </div>
        </div>
        <div
          className="dropdown-item"
          onClick={onOpenProfile}
          style={{ cursor: 'pointer' }}
          id="btn-user-profile"
        >
          <UserCircle size={14} /> Profile & Certificate
        </div>
        <div
          className="dropdown-item"
          onClick={() => navigate('/settings')}
          style={{ cursor: 'pointer' }}
          id="btn-user-settings"
        >
          <Settings size={14} /> Platform Settings
        </div>
        <div className="dropdown-divider" />
        <div
          className="dropdown-item danger"
          onClick={onOpenSignOut}
          style={{ cursor: 'pointer', color: '#ef4444' }}
          id="btn-user-signout"
        >
          <LogOut size={14} /> Sign Out
        </div>
      </DropdownMenu>
    </header>
  );
};

// ── App Shell ─────────────────────────────────────────────────
interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);

  const { currentUser, logout, switchPersona } = useAuth();
  const navigate = useNavigate();

  const handleConfirmSignOut = () => {
    setSignOutOpen(false);
    logout();
    navigate('/login');
  };

  const copyFingerprint = (fingerprint: string) => {
    navigator.clipboard.writeText(fingerprint);
    setCopiedFingerprint(true);
    showToast('info', 'Fingerprint Copied', 'X.509 SHA-256 fingerprint copied to clipboard');
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  const fingerprintStr = '8F:4C:92:A1:0B:3E:77:91:D4:CA:55:18:2F:E0:BC:39:7A:B2:1C:E4';

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onOpenProfile={() => setProfileOpen(true)}
      />
      <div className="app-main">
        <Header
          onMobileMenuOpen={() => setMobileOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenSignOut={() => setSignOutOpen(true)}
        />
        <main className="page-content">
          {children}
        </main>
      </div>

      {/* Profile Modal */}
      {profileOpen && (
        <Modal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          title="Operator Identity & X.509 Certificate"
          subtitle="Hyperledger Fabric Membership Service Provider (MSP)"
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setProfileOpen(false);
                  setSignOutOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/settings');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Settings size={14} />
                  Platform Settings
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setProfileOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Operator Header Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                borderRadius: 10,
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0d9488 0%, #1d4ed8 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
                }}
              >
                {currentUser.avatarInitials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {currentUser.name}
                  </span>
                  <Badge variant={currentUser.role === 'admin' ? 'info' : currentUser.role === 'doctor' ? 'success' : currentUser.role === 'patient' ? 'warning' : 'neutral'} size="sm">
                    {currentUser.role.toUpperCase()}
                  </Badge>
                  <span style={{ fontSize: 11, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <CheckCircle size={12} /> mTLS Connected
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Building2 size={13} /> {currentUser.organization.name}
                  </span>
                  <span>·</span>
                  <span>{currentUser.organization.location}</span>
                  <span>·</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{currentUser.organization.mspId}</span>
                </div>
              </div>
            </div>

            {/* Cryptographic Certificate Details */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Key size={14} style={{ color: 'var(--color-teal)' }} />
                X.509 Cryptographic Identity
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                  padding: 14,
                  borderRadius: 8,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  fontSize: 12
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Certificate Subject (DN)</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2, fontFamily: 'monospace', fontSize: 11 }}>
                    CN={currentUser.name.replace(/\s+/g, '.').toLowerCase()}, O={currentUser.organization.shortName}, C=US
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Issuer CA Node</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2 }}>
                    {currentUser.organization.shortName}-Fabric-CA-01
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Digital Signature Algorithm</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2 }}>
                    ECDSA secp256k1 (FIPS 140-2 Level 3)
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Validity Period</div>
                  <div style={{ fontWeight: 600, color: '#16a34a', marginTop: 2 }}>
                    Active · Valid through Dec 31, 2027
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                    Public Key SHA-256 Fingerprint
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      fontFamily: 'monospace',
                      fontSize: 11
                    }}
                  >
                    <span style={{ color: 'var(--color-text-primary)' }}>{fingerprintStr}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => copyFingerprint(fingerprintStr)}
                      style={{ padding: '2px 6px' }}
                      title="Copy fingerprint"
                    >
                      {copiedFingerprint ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Consortium Persona Switcher */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}>
                  Switch Demo Persona (ABAC Testing)
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-teal)', fontWeight: 600 }}>
                  Click to switch instantly
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {DEMO_PERSONAS.map(p => {
                  const isActive = p.id === currentUser.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => switchPersona(p)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: `1.5px solid ${isActive ? 'var(--color-teal)' : 'var(--color-border)'}`,
                        background: isActive ? 'rgba(13, 148, 136, 0.08)' : 'var(--color-bg)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isActive ? 'var(--color-teal)' : '#475569',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {p.avatarInitials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                          {p.role} · {p.organization.shortName}
                        </div>
                      </div>
                      {isActive && <CheckCircle size={15} color="var(--color-teal)" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Sign Out Confirm Dialog */}
      <ConfirmDialog
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={handleConfirmSignOut}
        title="Sign Out of MediLedger"
        message="Are you sure you want to sign out? Your session keys and cached cryptographic certificates will be cleared from memory. You will be redirected to the consortium login portal."
        confirmLabel="Sign Out"
        confirmVariant="danger"
      />
    </>
  );
};

export default AppShell;
