// ============================================================
// MediLedger — Consortium Login & PKI Authentication
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Key, Lock, Server, CheckCircle, ArrowRight,
  UserCheck, Building2, Stethoscope, Users, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_PERSONAS, DEMO_ORGANIZATIONS } from '../data/demo';
import { Badge, AlertBox } from '../components/ui';
import type { CurrentUser } from '../types';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedPersona, setSelectedPersona] = useState<CurrentUser>(DEMO_PERSONAS[0]);
  const [authMode, setAuthMode] = useState<'persona' | 'certificate'>('persona');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [certOrg, setCertOrg] = useState(DEMO_ORGANIZATIONS[0].id);

  const handleLogin = (userToLogin: CurrentUser) => {
    setIsAuthenticating(true);
    setTimeout(() => {
      login(userToLogin);
      setIsAuthenticating(false);
      navigate('/');
    }, 600);
  };

  return (
    <div
      className="login-page"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(13, 148, 136, 0.12), transparent 70%), var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: 'var(--color-text-primary)'
      }}
    >
      <div style={{ maxWidth: 540, width: '100%' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 54,
              height: 54,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #0d9488 0%, #1e40af 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(13, 148, 136, 0.25)',
              marginBottom: 16
            }}
          >
            <Shield size={28} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            MediLedger Healthcare Network
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Permissioned Blockchain Medical Data Exchange · Hyperledger Fabric mTLS
          </p>
        </div>

        {/* Card */}
        <div className="card login-card" style={{ padding: 28, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--color-bg)',
              padding: 4,
              borderRadius: 8,
              marginBottom: 24,
              border: '1px solid var(--color-border)'
            }}
          >
            <button
              type="button"
              onClick={() => setAuthMode('persona')}
              style={{
                border: 'none',
                background: authMode === 'persona' ? 'var(--color-surface)' : 'transparent',
                color: authMode === 'persona' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: 600,
                fontSize: 12,
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: authMode === 'persona' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Demo Personas
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('certificate')}
              style={{
                border: 'none',
                background: authMode === 'certificate' ? 'var(--color-surface)' : 'transparent',
                color: authMode === 'certificate' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: 600,
                fontSize: 12,
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: authMode === 'certificate' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              X.509 Certificate (PKI)
            </button>
          </div>

          {authMode === 'persona' ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Select an Operator Persona:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {DEMO_PERSONAS.map(p => {
                  const isSelected = selectedPersona.id === p.id;
                  const roleIcons: Record<string, any> = {
                    admin: Shield,
                    doctor: Stethoscope,
                    patient: Users,
                    auditor: Eye
                  };
                  const Icon = roleIcons[p.role] || UserCheck;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPersona(p)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: `1.5px solid ${isSelected ? 'var(--color-teal)' : 'var(--color-border)'}`,
                        background: isSelected ? 'rgba(13, 148, 136, 0.05)' : 'var(--color-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: isSelected ? 'var(--color-teal)' : '#334155',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {p.avatarInitials}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
                            {p.name}
                          </span>
                          <Badge variant={p.role === 'admin' ? 'info' : p.role === 'doctor' ? 'success' : p.role === 'patient' ? 'warning' : 'neutral'} size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icon size={11} />
                            <span>{p.role.toUpperCase()}</span>
                          </Badge>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Building2 size={11} />
                          <span>{p.organization.name}</span>
                          <span>·</span>
                          <span style={{ fontFamily: 'monospace' }}>{p.organization.mspId}</span>
                        </div>
                      </div>

                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? 'var(--color-teal)' : 'var(--color-border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-teal)' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                disabled={isAuthenticating}
                onClick={() => handleLogin(selectedPersona)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                {isAuthenticating ? (
                  <span>Verifying mTLS Handshake...</span>
                ) : (
                  <>
                    <span>Enter MediLedger Console as {selectedPersona.name}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div>
              <AlertBox variant="info" style={{ marginBottom: 16 }}>
                Authenticate with an enterprise smartcard, Hardware Security Module (HSM), or local encrypted certificate.
              </AlertBox>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    Consortium Organization MSP
                  </label>
                  <select
                    className="input"
                    value={certOrg}
                    onChange={(e) => setCertOrg(e.target.value)}
                  >
                    {DEMO_ORGANIZATIONS.map(org => (
                      <option key={org.id} value={org.id}>{org.name} ({org.mspId})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    Client Identity Certificate
                  </label>
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}
                  >
                    <Key size={18} style={{ color: 'var(--color-teal)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        cert-dr-sarah-chen-mountsinai.crt
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                        SHA-256: 8f4c92a1... · ECDSA secp256k1
                      </div>
                    </div>
                    <CheckCircle size={16} color="#16a34a" />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                    HSM PIN / Passphrase
                  </label>
                  <input
                    type="password"
                    className="input"
                    defaultValue="••••••••••••"
                    placeholder="Enter PKCS#11 token PIN"
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                disabled={isAuthenticating}
                onClick={() => handleLogin(DEMO_PERSONAS[0])}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                <Lock size={16} />
                <span>Sign & Verify mTLS Certificate</span>
              </button>
            </div>
          )}
        </div>

        {/* Security Compliance Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24, fontSize: 11, color: 'var(--color-text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Shield size={12} /> HIPAA §164.312
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Server size={12} /> Fabric 2.5 RAFT
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Key size={12} /> AES-256-GCM
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
