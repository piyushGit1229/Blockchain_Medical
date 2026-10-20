// ============================================================
// MediLedger — Patient Detail Workspace
// ============================================================

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, FileText, Shield, Activity, Edit,
  Upload, Phone, Mail, MapPin, Droplets, Calendar,
  Lock, Hash, CheckCircle, XCircle
} from 'lucide-react';
import {
  DEMO_PATIENTS, DEMO_RECORDS, DEMO_CONSENTS, DEMO_AUDIT_EVENTS,
  SEEDED_DEMO_PATIENT_PROFILES, SEEDED_DEMO_RECORDS, SEEDED_DEMO_CONSENTS, SEEDED_DEMO_AUDIT_EVENTS,
} from '../data/demo';
import {
  Avatar, Tabs, Badge, ConsentStatusBadge, DemoBadge,
  HashDisplay, AlertBox, EmptyState, RecordCategoryBadge, AuditOutcomeBadge
} from '../components/ui';
import { format } from 'date-fns';
import type { MedicalRecord } from '../types';

// ── Record Card ───────────────────────────────────────────────
const RecordCard: React.FC<{ record: MedicalRecord; onClick: () => void }> = ({ record, onClick }) => (
  <div
    className="card card-sm"
    onClick={onClick}
    style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
    onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'}
    onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ''}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
      <RecordCategoryBadge category={record.category} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {record.encryptionStatus === 'encrypted' && (
          <span title="AES-256 Encrypted"><Lock size={12} color="var(--color-teal)" /></span>
        )}
        <Badge variant={record.status}>{record.status}</Badge>
      </div>
    </div>
    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{record.title}</div>
    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
      {record.description.slice(0, 100)}{record.description.length > 100 ? '…' : ''}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
      <span>{record.uploadedBy}</span>
      <span>{format(new Date(record.uploadedAt), 'MMM d, yyyy')}</span>
    </div>
    {record.ipfsCid && (
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Hash size={10} color="var(--color-text-muted)" />
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)' }}>
          {record.ipfsCid.slice(0, 24)}…
          <span style={{ marginLeft: 4, color: '#b45309' }}>[DEMO]</span>
        </span>
      </div>
    )}
  </div>
);

// ── Record Detail Modal ───────────────────────────────────────
const RecordDetailPanel: React.FC<{ record: MedicalRecord; onClose: () => void }> = ({ record, onClose }) => (
  <div
    style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div style={{
      background: 'var(--color-surface)', borderRadius: 12, width: '100%', maxWidth: 640,
      maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <RecordCategoryBadge category={record.category} />
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 6 }}>{record.title}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>
      <div style={{ padding: 24 }}>
        <AlertBox variant="info">
          This record is encrypted and stored off-chain on IPFS. Only authorized parties with valid consent grants can decrypt and access the raw content.
        </AlertBox>
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div className="form-label">Uploaded By</div>
            <div style={{ fontSize: 13 }}>{record.uploadedBy}</div>
          </div>
          <div>
            <div className="form-label">Organization</div>
            <div style={{ fontSize: 13 }}>{record.uploadedByOrg}</div>
          </div>
          <div>
            <div className="form-label">Upload Date</div>
            <div style={{ fontSize: 13 }}>{format(new Date(record.uploadedAt), 'MMMM d, yyyy · HH:mm')}</div>
          </div>
          <div>
            <div className="form-label">File Type</div>
            <div style={{ fontSize: 13 }}>{record.fileType}</div>
          </div>
          <div>
            <div className="form-label">File Size</div>
            <div style={{ fontSize: 13 }}>{(record.fileSize / 1024).toFixed(0)} KB</div>
          </div>
          <div>
            <div className="form-label">Encryption</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {record.encryptionStatus === 'encrypted' ? (
                <><CheckCircle size={14} color="var(--color-teal)" /><span style={{ fontSize: 13 }}>AES-256 Encrypted</span></>
              ) : (
                <><XCircle size={14} color="var(--color-red)" /><span style={{ fontSize: 13 }}>Not encrypted</span></>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div className="form-label">Description / Clinical Summary</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{record.description}</p>
        </div>

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <HashDisplay label="IPFS CID (Off-Chain Storage)" value={record.ipfsCid} demo={record.isDemo} />
          <HashDisplay label="Content Hash (On-Chain Anchor)" value={record.contentHash} demo={record.isDemo} />
          <HashDisplay label="Transaction ID" value={record.txId} demo={record.isDemo} />
        </div>

        <div className="alert alert-warning" style={{ marginTop: 20 }}>
          <Lock size={13} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12 }}>
            Blockchain anchoring and IPFS storage values shown above are sample demonstration values and do not represent a real transaction.
          </span>
        </div>
      </div>
    </div>
  </div>
);

// ── Patient Detail ────────────────────────────────────────────
const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('records');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  const isSeededApiPatient = /^PAT-\d{4}$/.test(id ?? '');
  const patient = DEMO_PATIENTS.find(p => p.id === id)
    ?? SEEDED_DEMO_PATIENT_PROFILES.find(p => p.id === id);
  if (!patient) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>404</div>
        <div style={{ fontWeight: 600 }}>Patient not found</div>
        <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/patients')}>
          ← Back to Patients
        </button>
      </div>
    );
  }

  const records = (isSeededApiPatient ? SEEDED_DEMO_RECORDS : DEMO_RECORDS).filter(r => r.patientId === id);
  const consents = (isSeededApiPatient ? SEEDED_DEMO_CONSENTS : DEMO_CONSENTS).filter(c => c.patientId === id);
  const auditEvents = (isSeededApiPatient ? SEEDED_DEMO_AUDIT_EVENTS : DEMO_AUDIT_EVENTS).filter(e => e.patientId === id);

  const tabs = [
    { id: 'records', label: 'Medical Records', count: records.length },
    { id: 'consents', label: 'Consent Grants', count: consents.length },
    { id: 'audit', label: 'Audit Activity', count: auditEvents.length },
  ];

  return (
    <div className="patient-profile-page">
      {/* Back */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/patients')}
        style={{ marginBottom: 16 }}
      >
        <ChevronLeft size={14} /> Back to Patients
      </button>

      {/* Patient Header */}
      <div className="card patient-profile-header" style={{ marginBottom: 20 }}>
        <div className="patient-profile-layout" style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Avatar initials={patient.initials} size="xl" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{patient.name}</h1>
              <DemoBadge />
            </div>
            <div className="patient-profile-meta" style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                DOB: {format(new Date(patient.dob), 'MMMM d, yyyy')} · Age {patient.age}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <Droplets size={12} style={{ display: 'inline', marginRight: 4 }} />
                {patient.bloodType}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                {patient.mrn}
              </span>
            </div>
            <div className="patient-profile-contact" style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <Mail size={12} style={{ display: 'inline', marginRight: 4 }} />
                {patient.email}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <Phone size={12} style={{ display: 'inline', marginRight: 4 }} />
                {patient.phone}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                {patient.address}
              </span>
            </div>
          </div>
          <div className="patient-profile-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm"><Edit size={14} /> Edit</button>
              <button className="btn btn-teal btn-sm" onClick={() => navigate('/records')}>
                <Upload size={14} /> Upload Record
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{patient.recordCount}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Records</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{patient.activeConsents}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Active Consents</div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnoses */}
        {patient.diagnoses.length > 0 && (
          <div className="patient-profile-diagnoses" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            <div className="form-label">Recorded Diagnoses</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {patient.diagnoses.map((d, i) => (
                <span key={i} style={{
                  fontSize: 12, padding: '3px 10px', borderRadius: 6,
                  background: 'var(--color-blue-light)', color: '#1e3a8a',
                  border: '1px solid rgba(29,78,216,0.15)', fontWeight: 500
                }}>{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div>
          {records.length === 0 ? (
            <EmptyState
              icon={<FileText size={48} />}
              title="No records yet"
              description="No medical records have been uploaded for this patient."
              action={<button className="btn btn-primary"><Upload size={14} /> Upload First Record</button>}
            />
          ) : (
            <div className="grid-3">
              {records.map(rec => (
                <RecordCard key={rec.id} record={rec} onClick={() => setSelectedRecord(rec)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Consents Tab */}
      {activeTab === 'consents' && (
        <div>
          {consents.length === 0 ? (
            <EmptyState
              icon={<Shield size={48} />}
              title="No consent grants"
              description="This patient has not authorized any record-sharing consents."
              action={<button className="btn btn-primary" onClick={() => navigate('/consent')}>Create Consent Grant</button>}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {consents.map(con => (
                <div key={con.id} className={`card card-sm consent-${con.status}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {con.grantedTo} · {con.grantedToOrg}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        Purpose: {con.purpose}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <ConsentStatusBadge status={con.status} />
                      <DemoBadge />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    <span>
                      <strong>Valid:</strong> {format(new Date(con.validFrom), 'MMM d, yyyy')} → {format(new Date(con.validUntil), 'MMM d, yyyy')}
                    </span>
                    <span>
                      <strong>Categories:</strong> {con.categories.map(c => c.replace(/_/g, ' ')).join(', ')}
                    </span>
                    <span>
                      <strong>Permissions:</strong> {con.permissions.join(', ')}
                    </span>
                  </div>
                  {con.revokedAt && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-red)' }}>
                      Revoked on {format(new Date(con.revokedAt), 'MMM d, yyyy')}: {con.revocationReason}
                    </div>
                  )}
                  {con.txId && (
                    <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>
                      TX: {con.txId.slice(0, 40)}… <span style={{ color: '#b45309' }}>[DEMO]</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div>
          {auditEvents.length === 0 ? (
            <EmptyState
              icon={<Activity size={48} />}
              title="No audit events"
              description="No audit events have been recorded for this patient."
            />
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Actor</th>
                    <th>Organization</th>
                    <th>Outcome</th>
                    <th>Timestamp</th>
                    <th>Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.map(evt => (
                    <tr key={evt.id}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>
                        {evt.eventType.replace(/_/g, ' ')}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div>{evt.actor}</div>
                        <div style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{evt.actorRole}</div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{evt.actorOrg.split(' ')[0]}</td>
                      <td><AuditOutcomeBadge outcome={evt.outcome} /></td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {format(new Date(evt.timestamp), 'MMM d, HH:mm')}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {evt.txId ? <>{evt.txId.slice(0, 20)}… <span style={{ color: '#b45309' }}>[DEMO]</span></> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <RecordDetailPanel record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
};

export default PatientDetail;
