// ============================================================
// MediLedger — Security & ABAC Policies
// ============================================================

import React, { useState } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, XCircle,
  Play, RefreshCw, Key, FileCheck, Eye
} from 'lucide-react';
import { DEMO_POLICIES, DEMO_PATIENTS, DEMO_ORGANIZATIONS } from '../data/demo';
import {
  Badge, DemoBadge, Modal, AlertBox, showToast
} from '../components/ui';
import type { Policy, UserRole, PolicyEffect } from '../types';

export const SecurityPolicies: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>(DEMO_POLICIES);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyPatientId, setEmergencyPatientId] = useState(DEMO_PATIENTS[0]?.id || '');

  // Simulator state
  const [simRole, setSimRole] = useState<UserRole>('doctor');
  const [simOrg, setSimOrg] = useState(DEMO_ORGANIZATIONS[0]?.id || '');
  const [simPatientId, setSimPatientId] = useState(DEMO_PATIENTS[0]?.id || '');
  const [simAction, setSimAction] = useState('read');
  const [simResource, setSimResource] = useState('record');
  const [simPurpose, setSimPurpose] = useState('treatment');
  const [simResult, setSimResult] = useState<{
    decision: PolicyEffect;
    matchedPolicy: string;
    reason: string;
    timestamp: string;
  } | null>(null);

  // Toggle policy status
  const handleTogglePolicy = (id: string) => {
    setPolicies(prev => prev.map(p => {
      if (p.id === id) {
        const nextState = !p.enabled;
        showToast(nextState ? 'Policy enabled' : 'Policy disabled', 'info');
        return { ...p, enabled: nextState };
      }
      return p;
    }));
  };

  // Run simulation
  const handleRunSimulator = () => {
    // ABAC rule evaluator
    let decision: PolicyEffect = 'deny';
    let matchedPolicy = 'Default Deny Policy';
    let reason = 'No matching active policy permitted this attribute combination.';

    if (simRole === 'admin') {
      decision = 'allow';
      matchedPolicy = 'POL-ADMIN-FULL';
      reason = 'System Administrator role has administrative ledger access.';
    } else if (simRole === 'doctor') {
      if (simPurpose === 'emergency') {
        decision = 'allow';
        matchedPolicy = 'POL-003: Emergency Break-Glass Access';
        reason = 'Emergency override active under HIPAA §164.512. Action logged with HIGH priority audit event.';
      } else if (simPurpose === 'treatment') {
        decision = 'allow';
        matchedPolicy = 'POL-001: Attending Physician Patient Data Access';
        reason = 'Active consent grant verified on chain for treatment purpose with valid peer endorsement.';
      } else {
        decision = 'deny';
        matchedPolicy = 'POL-002: Minimum Necessary Clinical Disclosure';
        reason = `Access denied: Doctor attempted ${simAction} with non-clinical purpose '${simPurpose}' without explicit research consent.`;
      }
    } else if (simRole === 'patient') {
      if (simAction === 'read' || simAction === 'manage_consent') {
        decision = 'allow';
        matchedPolicy = 'POL-004: Patient Self-Sovereign Data Access';
        reason = 'Patient has sovereign right to inspect records and manage consent grants.';
      } else {
        decision = 'deny';
        matchedPolicy = 'POL-004: Patient Self-Sovereign Data Access';
        reason = 'Patients cannot perform direct write or administrative operations.';
      }
    } else if (simRole === 'auditor') {
      if (simAction === 'read' && (simResource === 'audit' || simResource === 'consent')) {
        decision = 'allow';
        matchedPolicy = 'POL-005: Compliance & Auditor Read-Only Policy';
        reason = 'Auditor role is granted immutable read access to audit logs and consent transactions.';
      } else {
        decision = 'deny';
        matchedPolicy = 'POL-005: Compliance & Auditor Read-Only Policy';
        reason = 'Auditors are restricted from directly viewing raw unredacted clinical records without court order.';
      }
    }

    setSimResult({
      decision,
      matchedPolicy,
      reason,
      timestamp: new Date().toISOString()
    });

    showToast(`Simulation complete: ${decision.toUpperCase()}`, decision === 'allow' ? 'success' : 'error');
  };

  // Trigger emergency override
  const handleTriggerEmergency = () => {
    if (!emergencyReason.trim()) {
      showToast('Please specify a clinical justification for break-glass', 'error');
      return;
    }
    showToast('Emergency Break-Glass initiated — transaction written to ledger with high-priority audit alarm', 'warning');
    setEmergencyModalOpen(false);
    setEmergencyReason('');
  };

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Security & ABAC Policies
            </h1>
            <DemoBadge />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Cryptographic standards, Hyperledger endorsement policies, and Attribute-Based Access Control rules
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-warning"
            onClick={() => setEmergencyModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <AlertTriangle size={15} />
            Break-Glass Override
          </button>
        </div>
      </div>

      {/* Security Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Active ABAC Policies</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {policies.filter(p => p.enabled).length} of {policies.length}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            Rules enforced on every smart contract invocation
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Endorsement Policy</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>MAJORITY (2 of 3)</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            Mount Sinai, Mayo Clinic, Cleveland Clinic peers
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Encryption Standard</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>AES-256-GCM</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            ECDSA secp256k1 keys + IPFS off-chain storage
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Break-Glass Protocol</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>STANDBY</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            HIPAA §164.512 emergency access capability ready
          </div>
        </div>
      </div>

      {/* Grid: Policies List & Interactive Simulator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(360px, 1fr)', gap: 24, alignItems: 'start' }}>
        
        {/* Policies List */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>Attribute-Based Access Rules</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Automated on-chain enforcement logic</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-teal)' }}>
              {policies.length} Rules Defined
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {policies.map((p, idx) => (
              <div
                key={p.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: idx === policies.length - 1 ? 'none' : '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{p.name}</span>
                      <Badge variant={p.effect === 'allow' ? 'success' : 'error'} size="sm">
                        {p.effect.toUpperCase()}
                      </Badge>
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                        P{p.priority}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      {p.description}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelectedPolicy(p)}
                      title="Inspect Policy JSON"
                    >
                      <Eye size={14} />
                    </button>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={() => handleTogglePolicy(p.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </label>
                  </div>
                </div>

                {/* Conditions Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {p.conditions.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'monospace'
                      }}
                    >
                      {c.key} {c.operator} {Array.isArray(c.value) ? c.value.join(',') : c.value}
                    </span>
                  ))}
                  {p.resources.map((r, i) => (
                    <span
                      key={`res-${i}`}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontWeight: 500
                      }}
                    >
                      res:{r}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Policy Simulator */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Play size={18} style={{ color: 'var(--color-teal)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>Policy Simulator</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Evaluate ABAC decisions prior to transaction submission</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Requester Role
              </label>
              <select
                className="input"
                value={simRole}
                onChange={(e) => setSimRole(e.target.value as UserRole)}
              >
                <option value="doctor">Doctor (Physician)</option>
                <option value="patient">Patient (Subject of Care)</option>
                <option value="auditor">Auditor (Compliance Officer)</option>
                <option value="admin">Admin (Ledger Node Operator)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Requesting Organization
              </label>
              <select
                className="input"
                value={simOrg}
                onChange={(e) => setSimOrg(e.target.value)}
              >
                {DEMO_ORGANIZATIONS.map(org => (
                  <option key={org.id} value={org.id}>{org.name} ({org.mspId})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Target Patient
              </label>
              <select
                className="input"
                value={simPatientId}
                onChange={(e) => setSimPatientId(e.target.value)}
              >
                {DEMO_PATIENTS.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Action
                </label>
                <select
                  className="input"
                  value={simAction}
                  onChange={(e) => setSimAction(e.target.value)}
                >
                  <option value="read">Read Record</option>
                  <option value="write">Upload / Append</option>
                  <option value="request_access">Request Access</option>
                  <option value="manage_consent">Manage Consent</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Resource
                </label>
                <select
                  className="input"
                  value={simResource}
                  onChange={(e) => setSimResource(e.target.value)}
                >
                  <option value="record">Medical Record</option>
                  <option value="consent">Consent Grant</option>
                  <option value="audit">Audit Log</option>
                  <option value="identity">Identity Certificate</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Purpose of Access
              </label>
              <select
                className="input"
                value={simPurpose}
                onChange={(e) => setSimPurpose(e.target.value)}
              >
                <option value="treatment">Treatment (Clinical Care)</option>
                <option value="emergency">Emergency (Life Safety)</option>
                <option value="audit">Compliance Audit</option>
                <option value="research">Academic / Medical Research</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleRunSimulator}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 }}
            >
              <RefreshCw size={15} />
              Evaluate Policy Decision
            </button>
          </div>

          {/* Simulation Output Card */}
          {simResult && (
            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 8,
                background: simResult.decision === 'allow' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${simResult.decision === 'allow' ? '#86efac' : '#fca5a5'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: simResult.decision === 'allow' ? '#166534' : '#991b1b' }}>
                  Policy Evaluation Decision
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 13,
                    fontWeight: 700,
                    color: simResult.decision === 'allow' ? '#16a34a' : '#dc2626'
                  }}
                >
                  {simResult.decision === 'allow' ? <CheckCircle size={15} /> : <XCircle size={15} />}
                  {simResult.decision === 'allow' ? 'PERMIT (ALLOW)' : 'DENY'}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                Matched Rule: {simResult.matchedPolicy}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                {simResult.reason}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Policy Details Modal */}
      {selectedPolicy && (
        <Modal
          open={!!selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
          title={`Policy: ${selectedPolicy.name}`}
          subtitle={`ID: ${selectedPolicy.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge variant={selectedPolicy.effect === 'allow' ? 'success' : 'error'}>
                {selectedPolicy.effect.toUpperCase()}
              </Badge>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Priority: {selectedPolicy.priority}</span>
              <span style={{ fontSize: 12, color: selectedPolicy.enabled ? '#16a34a' : '#94a3b8' }}>
                {selectedPolicy.enabled ? '● Active' : '○ Disabled'}
              </span>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{selectedPolicy.description}</div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Rule Conditions</div>
              <pre
                style={{
                  background: 'var(--color-bg)',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 12,
                  overflowX: 'auto',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              >
                {JSON.stringify(selectedPolicy.conditions, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Permitted Actions</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>{selectedPolicy.actions.join(', ')}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Resources</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>{selectedPolicy.resources.join(', ')}</div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Emergency Break Glass Modal */}
      {emergencyModalOpen && (
        <Modal
          open={emergencyModalOpen}
          onClose={() => setEmergencyModalOpen(false)}
          title="Emergency Break-Glass Access Request"
          subtitle="HIPAA §164.512 Exception Protocol"
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setEmergencyModalOpen(false)}>Cancel</button>
              <button className="btn btn-warning" onClick={handleTriggerEmergency}>
                Authorize Override
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AlertBox variant="warning">
              Break-Glass grants temporary immediate 4-hour access to all patient medical records.
              This event will be immutably recorded on the Hyperledger Fabric ledger and reported to the compliance officer.
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
                Clinical Emergency Justification (Mandatory)
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="e.g. Unconscious patient admitted via Trauma ICU, immediate access to allergy and cardiogram history required..."
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

export default SecurityPolicies;
