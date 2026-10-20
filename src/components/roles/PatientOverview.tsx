// ============================================================
// MediLedger — Patient Self-Sovereign Health Portal
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, FileText, CheckCircle, XCircle, AlertTriangle,
  Lock, Download, UserCheck, Building2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  DEMO_RECORDS, DEMO_CONSENTS, DEMO_ACCESS_REQUESTS,
  DEMO_PATIENTS
} from '../../data/demo';
import {
  Badge, DemoBadge, RecordCategoryBadge, Modal, AlertBox, showToast
} from '../ui';
import { format } from 'date-fns';

export const PatientOverview: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Find patient record for current user (or fallback to JT)
  const patient = DEMO_PATIENTS[0];
  const myRecords = DEMO_RECORDS.filter(r => r.patientId === patient.id || r.patientId === 'pat-001');
  const myConsents = DEMO_CONSENTS.filter(c => c.status === 'active');
  const inboundRequests = DEMO_ACCESS_REQUESTS.filter(r => r.status === 'pending');

  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [, setSelectedConsentId] = useState<string | null>(null);

  const handleApproveRequest = (_reqId: string, doctorName: string) => {
    showToast(
      'success',
      'Access Authorized',
      `You granted cryptographic consent to ${doctorName}. Smart contract updated on chain.`
    );
  };

  const handleDenyRequest = (_reqId: string, doctorName: string) => {
    showToast(
      'info',
      'Request Denied',
      `Access request from ${doctorName} was declined.`
    );
  };

  const handleRevokeConsent = () => {
    showToast(
      'warning',
      'Consent Revoked',
      'Consent grant revoked immediately. Provider cryptographic keys decommissioned.'
    );
    setRevokeModalOpen(false);
    setSelectedConsentId(null);
  };

  return (
    <div className="role-dashboard role-dashboard--patient" style={{ padding: '24px 32px' }}>
      {/* Patient Sovereign Header Banner */}
      <div
        className="role-dashboard-header role-dashboard-banner"
        style={{
          padding: '24px 28px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(30, 64, 175, 0.1) 100%)',
          border: '1px solid rgba(13, 148, 136, 0.2)',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Welcome, {currentUser.name}
            </span>
            <Badge variant="warning" size="sm">PATIENT SOVEREIGN PORTAL</Badge>
            <DemoBadge />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 650, lineHeight: 1.5 }}>
            Your health records are encrypted and stored across the consortium network. Under HIPAA and GDPR rules, no physician or institution can decrypt your records without your verifiable smart contract consent.
          </p>
        </div>

        <div className="role-dashboard-actions" style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/consent')}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <ShieldCheck size={16} />
            Manage Consent Directives
          </button>
        </div>
      </div>

      {/* Patient Stats Grid */}
      <div className="role-dashboard-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>My Encrypted Records</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>{myRecords.length}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Lock size={12} /> AES-256-GCM Encrypted
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Authorized Providers</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>{myConsents.length}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            Doctors permitted to access
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Access Requests Awaiting You</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#b45309' }}>{inboundRequests.length}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#b45309', marginTop: 10 }}>
            Requires your approval
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Privacy & Integrity</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>100%</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 10 }}>
            Zero unconsented disclosures
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="role-dashboard-content" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(360px, 1fr)', gap: 24, alignItems: 'start' }}>
        
        {/* Left: Pending Doctor Requests & Active Consents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Inbound Access Requests */}
          {inboundRequests.length > 0 && (
            <div className="card" style={{ border: '1.5px solid #fde047' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: '#fefce8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={18} color="#b45309" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#713f12' }}>
                      Inbound Access Request from Clinician
                    </div>
                    <div style={{ fontSize: 12, color: '#854d0e' }}>
                      A doctor is requesting permission to review your medical history
                    </div>
                  </div>
                </div>
                <Badge variant="warning">ACTION REQUIRED</Badge>
              </div>

              <div style={{ padding: '16px 20px' }}>
                {inboundRequests.map(req => (
                  <div key={req.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                          {req.requestingDoctor}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          {req.requestingOrg} · Purpose: <strong style={{ color: 'var(--color-text-primary)' }}>{req.purpose}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, background: 'var(--color-bg)', padding: '6px 10px', borderRadius: 6 }}>
                          "{req.clinicalJustification || 'Routine consultation and allergy verification'}"
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDenyRequest(req.id, req.requestingDoctor)}
                      >
                        <XCircle size={14} />
                        Deny Access
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApproveRequest(req.id, req.requestingDoctor)}
                      >
                        <CheckCircle size={14} />
                        Grant Consent (Authorize)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Provider Consents (Who Can View My Data?) */}
          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                  Who Currently Has Access to My Records?
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Verified smart contract consent agreements
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/consent')} style={{ color: 'var(--color-teal)' }}>
                View All Directives →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {myConsents.map((c, idx) => (
                <div
                  key={c.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: idx === myConsents.length - 1 ? 'none' : '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0d9488', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
                        {c.grantedTo} ({c.grantedToOrg})
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        Scope: {c.categories.join(', ')} · Purpose: {c.purpose}
                      </div>
                      <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>
                        Valid through {c.validUntil ? format(new Date(c.validUntil), 'MMM d, yyyy') : 'Indefinite'}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setSelectedConsentId(c.id);
                      setRevokeModalOpen(true);
                    }}
                    style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: My Encrypted Records List */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>My Health Records</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Decryption hash verified</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/records')} style={{ color: 'var(--color-teal)' }}>
              Open Records Vault →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {myRecords.map((r, idx) => (
              <div
                key={r.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: idx === myRecords.length - 1 ? 'none' : '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={16} style={{ color: 'var(--color-teal)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      {r.uploadedByOrg} · {format(new Date(r.uploadedAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RecordCategoryBadge category={r.category} />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => showToast('info', 'Record Downloaded', `Decrypted payload for ${r.title} saved to downloads.`)}
                    title="Download decrypted report"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revoke Modal */}
      {revokeModalOpen && (
        <Modal
          open={revokeModalOpen}
          onClose={() => setRevokeModalOpen(false)}
          title="Revoke Provider Access"
          subtitle="Smart contract consent termination"
          size="sm"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setRevokeModalOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRevokeConsent}>
                Confirm Immediate Revocation
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AlertBox variant="warning">
              This will write an immutable revocation transaction to the blockchain. The provider will immediately lose decryption access to your records.
            </AlertBox>
            <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>
              Are you sure you want to revoke consent for this healthcare provider?
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PatientOverview;
