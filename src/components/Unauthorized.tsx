// ============================================================
// MediLedger — RBAC Unauthorized / Access Denied Guard View
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_CONFIGS } from '../utils/rbac';
import { DEMO_PERSONAS } from '../data/demo';
import { Badge } from './ui';
import type { UserRole } from '../types';

interface UnauthorizedProps {
  requiredRoles: UserRole[];
  resourceName?: string;
}

export const Unauthorized: React.FC<UnauthorizedProps> = ({ requiredRoles, resourceName = 'this restricted consortium workspace' }) => {
  const { currentUser, switchPersona } = useAuth();
  const navigate = useNavigate();
  const currentConfig = ROLE_CONFIGS[currentUser.role];

  // Find a persona that has the required role
  const recommendedPersona = DEMO_PERSONAS.find(p => requiredRoles.includes(p.role));

  return (
    <div
      style={{
        padding: '60px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        maxWidth: 620,
        margin: '0 auto',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}
      >
        <ShieldAlert size={32} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Badge variant="error" size="sm">
          RESTRICTED BY RBAC POLICY
        </Badge>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
          HIPAA §164.308(a)(1)
        </span>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 10px', color: 'var(--color-text-primary)' }}>
        Access Restricted for {currentConfig.title}
      </h1>

      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 24px' }}>
        You do not possess the required consortium permissions to access {resourceName}.
        This resource is restricted to operators with <strong style={{ color: 'var(--color-text-primary)' }}>{requiredRoles.map(r => r.toUpperCase()).join(' or ')}</strong> privileges.
      </p>

      {/* Current Identity Box */}
      <div
        style={{
          width: '100%',
          padding: 16,
          borderRadius: 8,
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          textAlign: 'left',
          marginBottom: 24,
          fontSize: 12
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Current Identity & Scope</span>
          <Badge variant={currentConfig.badgeVariant} size="sm">{currentConfig.badgeLabel}</Badge>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>{currentUser.name}</div>
          <span style={{ color: 'var(--color-text-muted)' }}>·</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>{currentUser.organization.name}</span>
        </div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>
          <strong>Permitted Boundary:</strong> {currentConfig.scope}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <ArrowLeft size={15} />
          Return to Dashboard
        </button>

        {recommendedPersona && (
          <button
            className="btn btn-primary"
            onClick={() => {
              switchPersona(recommendedPersona);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <RefreshCw size={15} />
            Switch to {recommendedPersona.name} ({recommendedPersona.role.toUpperCase()})
          </button>
        )}
      </div>
    </div>
  );
};

export default Unauthorized;
