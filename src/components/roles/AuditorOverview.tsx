// ============================================================
// MediLedger — Auditor & Regulatory Compliance Console
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Shield, CheckCircle, AlertTriangle,
  Download, Lock, Server, RefreshCw, Key
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEMO_AUDIT_EVENTS } from '../../data/demo';
import {
  Badge, DemoBadge, AuditOutcomeBadge, HashDisplay, Modal, AlertBox, showToast
} from '../ui';
import { format } from 'date-fns';
import type { AuditEvent } from '../../types';

export const AuditorOverview: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [verifyingChain, setVerifyingChain] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const emergencyEvents = DEMO_AUDIT_EVENTS.filter(e => e.metadata?.override === 'emergency' || e.policyDecision?.includes('EMERGENCY'));
  const deniedEvents = DEMO_AUDIT_EVENTS.filter(e => e.outcome === 'denied');

  const handleVerifyLedger = () => {
    setVerifyingChain(true);
    setTimeout(() => {
      setVerifyingChain(false);
      showToast(
        'success',
        'Ledger Integrity Verified',
        'Cryptographic hash chain verified across 3 peer nodes. Zero block discrepancies detected.'
      );
    }, 800);
  };

  const handleExportReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DEMO_AUDIT_EVENTS, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mediledger-compliance-report-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('info', 'Report Generated', 'HIPAA Statutory Audit Report downloaded as JSON.');
  };

  return (
    <div className="role-dashboard role-dashboard--auditor" style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div className="role-dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Consortium Compliance & Forensic Audit Console
            </h1>
            <Badge variant="neutral" size="sm">AUDITOR CONSOLE</Badge>
            <DemoBadge />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Supervisory oversight for {currentUser.name} · {currentUser.organization.name} ({currentUser.organization.mspId})
          </p>
        </div>

        <div className="role-dashboard-actions" style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={handleVerifyLedger}
            disabled={verifyingChain}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <RefreshCw size={15} className={verifyingChain ? 'animate-spin' : ''} />
            <span>{verifyingChain ? 'Verifying Block Hashes...' : 'Verify Ledger Integrity'}</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={handleExportReport}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={15} />
            Export Compliance Report
          </button>
        </div>
      </div>

      {/* Compliance Metrics Grid */}
      <div className="role-dashboard-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>HIPAA §164.312 Audit Score</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>100%</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={12} /> Compliant with Security Rule
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total Immutable Events</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>{DEMO_AUDIT_EVENTS.length}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            Cryptographically sealed blocks
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Break-Glass Overrides</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: emergencyEvents.length > 0 ? '#b45309' : 'var(--color-text-primary)' }}>
                {emergencyEvents.length}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            Under mandatory regulatory review
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>ABAC Access Denials</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{deniedEvents.length}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            Prevented by smart contract rules
          </div>
        </div>
      </div>

      {/* Main Forensic Grid */}
      <div className="role-dashboard-content" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(360px, 1fr)', gap: 24, alignItems: 'start' }}>
        
        {/* Audit Log Stream */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>Forensic Transaction Stream</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Live Hyperledger Fabric channel events</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit')} style={{ color: 'var(--color-teal)' }}>
              Open Full Audit Ledger →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {DEMO_AUDIT_EVENTS.slice(0, 7).map((ev, idx) => (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                style={{
                  padding: '12px 20px',
                  borderBottom: idx === 6 ? 'none' : '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: 12
                }}
                className="table-row-hover"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AuditOutcomeBadge outcome={ev.outcome} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {ev.actor} · <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>{ev.actorOrg}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      Action: <strong style={{ color: 'var(--color-text-primary)' }}>{ev.eventType}</strong> · {ev.patientName ? `Patient: ${ev.patientName}` : 'System scope'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {format(new Date(ev.timestamp), 'HH:mm:ss')}
                  </div>
                  {ev.txId && (
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                      {ev.txId.slice(0, 10)}...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cryptographic Chain & Statutory Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Merkle Root & RAFT Consensus */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Server size={18} style={{ color: '#2563eb' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                  Ledger Cryptographic Verification
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Fabric 2.5 RAFT Consensus State
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-bg)', padding: 12, borderRadius: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Channel Block Height:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-text-primary)' }}>#1,492</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Endorsing Peers:</span>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>3 / 3 Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Orderer Cluster:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>RAFT Quorum Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Hash Integrity:</span>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>VALID (Zero Tampering)</span>
              </div>
            </div>

            <AlertBox variant="info" style={{ marginTop: 14 }}>
              Auditor identities possess read-only statutory access to immutable ledger transactions. Personal Health Information (PHI) is redacted in compliance with HIPAA minimum necessary rules.
            </AlertBox>
          </div>

          {/* Quick Access to ABAC Simulator */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Key size={16} style={{ color: 'var(--color-teal)' }} />
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
                ABAC Smart Contract Simulator
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Verify rule conditions, trace authorization evaluations, and validate break-glass audit alarms before policy changes are endorsed.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/security')}
              style={{ width: '100%' }}
            >
              Launch Policy Simulator →
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedEvent && (
        <Modal
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Forensic Event: ${selectedEvent.eventType.toUpperCase()}`}
          subtitle={`Audit ID: ${selectedEvent.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AuditOutcomeBadge outcome={selectedEvent.outcome} />
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {format(new Date(selectedEvent.timestamp), 'PPpp')}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
              <div>
                <div style={{ color: 'var(--color-text-secondary)' }}>Actor</div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedEvent.actor} ({selectedEvent.actorRole})</div>
              </div>
              <div>
                <div style={{ color: 'var(--color-text-secondary)' }}>Organization</div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedEvent.actorOrg}</div>
              </div>
            </div>

            {selectedEvent.policyDecision && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 2 }}>Policy Decision Evaluation</div>
                <div style={{ padding: '8px 10px', background: 'var(--color-bg)', borderRadius: 6, fontSize: 12, border: '1px solid var(--color-border)', fontFamily: 'monospace' }}>
                  {selectedEvent.policyDecision}
                </div>
              </div>
            )}

            {selectedEvent.txId && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 2 }}>Hyperledger Fabric Tx Hash</div>
                <HashDisplay value={selectedEvent.txId} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditorOverview;
