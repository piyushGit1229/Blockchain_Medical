// ============================================================
// MediLedger — Doctor / Clinician Practice Workspace
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileText, Inbox, Shield, AlertTriangle,
  Upload, CheckCircle, ChevronRight, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  DEMO_PATIENTS, DEMO_RECORDS, DEMO_ACCESS_REQUESTS,
  DEMO_CONSENTS
} from '../../data/demo';
import {
  Badge, DemoBadge, RecordCategoryBadge, Modal, AlertBox, showToast
} from '../ui';

export const DoctorOverview: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyPatientId, setEmergencyPatientId] = useState(DEMO_PATIENTS[0]?.id || '');

  // Doctor specific metrics
  const attendingPatients = DEMO_PATIENTS.slice(0, 4);
  const pendingRequests = DEMO_ACCESS_REQUESTS.filter(r => r.status === 'pending');
  const recentRecords = DEMO_RECORDS.slice(0, 5);

  const handleTriggerEmergency = () => {
    if (!emergencyReason.trim()) {
      showToast('error', 'Justification Required', 'Please state the medical emergency justification.');
      return;
    }
    showToast(
      'warning',
      'Emergency Break-Glass Granted',
      `Emergency access activated under HIPAA §164.512 for patient. Immutable ledger event logged.`
    );
    setEmergencyModalOpen(false);
    setEmergencyReason('');
  };

  return (
    <div className="role-dashboard role-dashboard--doctor" style={{ padding: '24px 32px' }}>
      {/* Top Banner */}
      <div className="role-dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Clinical Practice Workspace
            </h1>
            <Badge variant="success" size="sm">PHYSICIAN CONSOLE</Badge>
            <DemoBadge />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Welcome back, {currentUser.name} · {currentUser.organization.name} ({currentUser.organization.mspId})
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="role-dashboard-actions" style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-warning"
            onClick={() => setEmergencyModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <AlertTriangle size={15} />
            Break-Glass Override
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/records')}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Upload size={15} />
            Upload Diagnostic Record
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="role-dashboard-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Assigned Patients</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>{attendingPatients.length}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={12} /> Active Treatment Consents
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>EHR & Lab Records</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>{DEMO_RECORDS.length}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            Off-chain IPFS encrypted storage
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Inbox size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Pending Access Requests</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#b45309' }}>{pendingRequests.length}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            Cross-consortium inquiries
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Active Consent Grants</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>{DEMO_CONSENTS.filter(c => c.status === 'active').length}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 10 }}>
            Smart contract verified on chain
          </div>
        </div>
      </div>

      {/* Grid: Attending Patients & Recent Records */}
      <div className="role-dashboard-content" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(360px, 1fr)', gap: 24, alignItems: 'start' }}>
        
        {/* Attending Patients List */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>Patients Under Clinical Care</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Assigned to your clinical department</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patients')} style={{ color: 'var(--color-teal)' }}>
              View All Patients →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {attendingPatients.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => navigate(`/patients/${p.id}`)}
                style={{
                  padding: '14px 20px',
                  borderBottom: idx === attendingPatients.length - 1 ? 'none' : '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                className="table-row-hover"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#0d9488',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    {p.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      MRN: {p.mrn} · {p.age}y / {p.gender} · Blood: {p.bloodType}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{p.recordCount} records</span>
                  <Badge variant="success" size="sm">Consented</Badge>
                  <ChevronRight size={14} color="var(--color-text-muted)" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Cross-Hospital Records & Uploads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Recent Records Card */}
          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>Recent Clinical Reports</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Encrypted diagnostic submissions</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/records')} style={{ color: 'var(--color-teal)' }}>
                View All →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentRecords.map((r, idx) => (
                <div
                  key={r.id}
                  style={{
                    padding: '12px 20px',
                    borderBottom: idx === recentRecords.length - 1 ? 'none' : '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={15} style={{ color: 'var(--color-teal)' }} />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.patientName}</div>
                    </div>
                  </div>
                  <RecordCategoryBadge category={r.category} />
                </div>
              ))}
            </div>
          </div>

          {/* Cross Hospital Request Box */}
          <div className="card" style={{ padding: 18, background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.04) 0%, rgba(37, 99, 235, 0.04) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Inbox size={18} style={{ color: 'var(--color-teal)' }} />
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
                Need Records from Another Hospital?
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Request medical history or specialist imaging from Mayo Clinic, Cleveland Clinic, or Mount Sinai through smart contract consent verification.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/access-requests')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <span>Submit Cross-Consortium Record Request</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Break Glass Modal */}
      {emergencyModalOpen && (
        <Modal
          open={emergencyModalOpen}
          onClose={() => setEmergencyModalOpen(false)}
          title="Emergency Break-Glass Override"
          subtitle="HIPAA §164.512 Clinical Emergency Exception Protocol"
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setEmergencyModalOpen(false)}>Cancel</button>
              <button className="btn btn-warning" onClick={handleTriggerEmergency}>
                Authorize Emergency Override
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AlertBox variant="warning">
              Break-Glass grants immediate temporary 4-hour access to all patient medical records.
              This event will be immutably recorded on the Hyperledger Fabric ledger and flagged for immediate compliance audit.
            </AlertBox>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Target Patient
              </label>
              <select
                className="input"
                value={emergencyPatientId}
                onChange={(e) => setEmergencyPatientId(e.target.value)}
              >
                {DEMO_PATIENTS.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Clinical Justification (Mandatory)
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="e.g. Patient admitted via emergency trauma with acute respiratory distress, critical allergy record required..."
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DoctorOverview;
