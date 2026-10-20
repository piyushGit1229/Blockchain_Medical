// ============================================================
// MediLedger — Consent Management
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield, Plus, CheckCircle, XCircle,
  Calendar
} from 'lucide-react';
import {
  createConsent, fetchConsents, fetchPatients, fetchProviders, fetchRecords,
  mapConsent, revokeConsent,
  type RawPatient, type RawProvider, type RawRecord,
} from '../api';
import {
  SearchInput, ConsentStatusBadge, RecordCategoryBadge, Badge,
  DemoBadge, Modal, StepIndicator, AlertBox, EmptyState,
  Pagination, showToast
} from '../components/ui';
import { format, isPast } from 'date-fns';
import type { ConsentGrant, RecordCategory } from '../types';

const PAGE_SIZE = 6;
const CREATE_STEPS = ['Select Patient', 'Select Provider', 'Record Categories', 'Permissions & Purpose', 'Review & Confirm'];

// ── Consent Status Timeline ───────────────────────────────────
const ConsentTimeline: React.FC<{ consent: ConsentGrant }> = ({ consent }) => {
  const events = [
    { date: consent.createdAt, label: 'Consent granted', color: '#0d9488', icon: <CheckCircle size={12} /> },
    ...(consent.revokedAt ? [{ date: consent.revokedAt, label: `Revoked: ${consent.revocationReason}`, color: '#dc2626', icon: <XCircle size={12} /> }] : []),
    ...(!consent.revokedAt && isPast(new Date(consent.validUntil)) ? [{ date: consent.validUntil, label: 'Consent expired', color: '#94a3b8', icon: <Calendar size={12} /> }] : []),
  ];

  return (
    <div className="timeline" style={{ paddingLeft: 0 }}>
      {events.map((evt, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14, position: 'relative' }}>
          {i < events.length - 1 && (
            <div style={{ position: 'absolute', left: 10, top: 22, bottom: 0, width: 1, background: 'var(--color-border)' }} />
          )}
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: `${evt.color}18`,
            border: `1px solid ${evt.color}40`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0, color: evt.color, zIndex: 1
          }}>
            {evt.icon}
          </div>
          <div style={{ paddingTop: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{evt.label}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {format(new Date(evt.date), 'MMM d, yyyy · HH:mm')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Consent Card ──────────────────────────────────────────────
const ConsentCard: React.FC<{
  consent: ConsentGrant;
  onView: () => void;
  onRevoke?: () => void;
}> = ({ consent, onView, onRevoke }) => {
  const isExpired = isPast(new Date(consent.validUntil));
  const daysLeft = !isExpired && consent.status === 'active'
    ? Math.ceil((new Date(consent.validUntil).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div
      className={`card card-sm consent-${consent.status}`}
      style={{ cursor: 'pointer' }}
      onClick={onView}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{consent.patientName}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            → {consent.grantedTo} · {consent.grantedToOrg}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <ConsentStatusBadge status={consent.status} />
          <DemoBadge />
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-secondary)' }}>
        <span style={{ fontWeight: 500 }}>Purpose:</span> {consent.purpose}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {consent.categories.map(c => <RecordCategoryBadge key={c} category={c} />)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {format(new Date(consent.validFrom), 'MMM d, yyyy')} → {format(new Date(consent.validUntil), 'MMM d, yyyy')}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {daysLeft !== null && daysLeft <= 14 && (
            <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>
              ⚠ {daysLeft}d left
            </span>
          )}
          {consent.status === 'active' && onRevoke && (
            <button
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--color-red)', fontSize: 11 }}
              onClick={e => { e.stopPropagation(); onRevoke(); }}
            >
              Revoke
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Create Consent Wizard ─────────────────────────────────────
const CreateConsentModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    patientId: '',
    providerId: '',
    recordId: '',
    categories: [] as RecordCategory[],
    permissions: [] as string[],
    purpose: '',
    validDays: '90',
  });
  const [livePatients, setLivePatients] = useState<RawPatient[]>([]);
  const [liveProviders, setLiveProviders] = useState<RawProvider[]>([]);
  const [liveRecords, setLiveRecords] = useState<RawRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([fetchPatients(), fetchProviders(), fetchRecords()])
      .then(([ps, ds, rs]) => {
        setLivePatients(ps);
        setLiveProviders(ds);
        setLiveRecords(rs);
      })
      .catch(() => undefined);
  }, [open]);

  const toggleCategory = (cat: RecordCategory) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const togglePermission = (perm: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const patient = livePatients.find(p => p.patientId === form.patientId);
  const provider = liveProviders.find(d => d.providerId === form.providerId);
  const eligibleRecords = liveRecords.filter(r => r.patientId === form.patientId);

  const validFrom = new Date();
  const validUntil = new Date(Date.now() + parseInt(form.validDays) * 86400000);

  const canNext = () => {
    if (step === 0) return !!form.patientId;
    if (step === 1) return !!form.providerId && !!form.recordId;
    if (step === 2) return form.categories.length > 0;
    if (step === 3) return form.permissions.length > 0 && !!form.purpose;
    return true;
  };

  const handleCreate = async () => {
    if (!form.patientId || !form.providerId || !form.recordId) {
      showToast('error', 'Missing Fields', 'Select a patient, provider and record to share.');
      return;
    }
    setSubmitting(true);
    try {
      await createConsent({
        patientId: form.patientId,
        recordId: form.recordId,
        granteeId: form.providerId,
        purposes: [form.purpose.toLowerCase() || 'treatment'],
        validUntil: validUntil.getTime(),
      });
      showToast('success', 'Consent Grant Created', `Access granted to ${provider?.name ?? 'provider'} and recorded on the consortium ledger.`);
      handleClose();
    } catch (err) {
      showToast('error', 'Grant Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setForm({ patientId: '', providerId: '', recordId: '', categories: [], permissions: [], purpose: '', validDays: '90' });
    onClose();
  };

  const CATEGORIES: { id: RecordCategory; label: string }[] = [
    { id: 'lab_report', label: 'Lab Reports' },
    { id: 'imaging', label: 'Imaging' },
    { id: 'prescription', label: 'Prescriptions' },
    { id: 'clinical_note', label: 'Clinical Notes' },
    { id: 'discharge_summary', label: 'Discharge Summaries' },
    { id: 'vaccination', label: 'Vaccinations' },
  ];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Consent Grant"
      subtitle="Authorize controlled access to a patient's medical records"
      size="lg"
      footer={
        <>
          <button className="btn btn-outline" onClick={step === 0 ? handleClose : () => setStep(s => s - 1)}>
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 4 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Next →
            </button>
          ) : (
            <button className="btn btn-teal" onClick={handleCreate} disabled={submitting}>
              <CheckCircle size={14} /> {submitting ? 'Submitting…' : 'Create Consent Grant'}
            </button>
          )}
        </>
      }
    >
      <StepIndicator steps={CREATE_STEPS} current={step} />

      {/* Step 0: Patient */}
      {step === 0 && (
        <div>
          <label className="form-label">Select Patient *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {livePatients.map(p => (
              <div
                key={p.patientId}
                onClick={() => setForm(prev => ({ ...prev, patientId: p.patientId, recordId: '' }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  border: `2px solid ${form.patientId === p.patientId ? 'var(--color-teal)' : 'var(--color-border)'}`,
                  borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.15s',
                  background: form.patientId === p.patientId ? 'var(--color-teal-light)' : 'var(--color-surface)',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                  {p.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.patientId} · {p.org}</div>
                </div>
                {form.patientId === p.patientId && <CheckCircle size={16} color="var(--color-teal)" />}
              </div>
            ))}
            {livePatients.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '12px 0' }}>Loading patients from ledger…</div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Provider */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Authorized Provider *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {liveProviders.map(d => (
                <div
                  key={d.providerId}
                  onClick={() => setForm(prev => ({ ...prev, providerId: d.providerId }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    border: `2px solid ${form.providerId === d.providerId ? 'var(--color-teal)' : 'var(--color-border)'}`,
                    borderRadius: 8, cursor: 'pointer',
                    background: form.providerId === d.providerId ? 'var(--color-teal-light)' : 'var(--color-surface)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name ?? d.providerId}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {d.providerId} · {d.role}{d.department ? ` · ${d.department}` : ''}{d.specialty ? ` · ${d.specialty}` : ''}
                    </div>
                  </div>
                  {form.providerId === d.providerId && <CheckCircle size={16} color="var(--color-teal)" />}
                </div>
              ))}
              {liveProviders.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Loading providers…</div>
              )}
            </div>
          </div>
          <div>
            <label className="form-label">Record to Share *</label>
            <select className="form-input form-select" value={form.recordId} onChange={e => setForm(prev => ({ ...prev, recordId: e.target.value }))}>
              <option value="">Select record…</option>
              {eligibleRecords.map(r => (
                <option key={r.recordId} value={r.recordId}>{r.recordType} · {r.recordId}</option>
              ))}
            </select>
            {form.patientId && eligibleRecords.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
                This patient has no records on the ledger yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Categories */}
      {step === 2 && (
        <div>
          <label className="form-label">Accessible Record Categories * (select all that apply)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            {CATEGORIES.map(cat => (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                style={{
                  padding: '10px 14px', border: `2px solid ${form.categories.includes(cat.id) ? 'var(--color-teal)' : 'var(--color-border)'}`,
                  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  background: form.categories.includes(cat.id) ? 'var(--color-teal-light)' : 'var(--color-surface)',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                }}
              >
                {form.categories.includes(cat.id) ? <CheckCircle size={14} color="var(--color-teal)" /> : <div style={{ width: 14, height: 14, border: '2px solid var(--color-border)', borderRadius: 3 }} />}
                {cat.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Permissions + Purpose */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Permitted Actions *</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {['read', 'share', 'download'].map(perm => (
                <div
                  key={perm}
                  onClick={() => togglePermission(perm)}
                  style={{
                    flex: 1, padding: '10px 14px', border: `2px solid ${form.permissions.includes(perm) ? 'var(--color-navy)' : 'var(--color-border)'}`,
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, textAlign: 'center',
                    background: form.permissions.includes(perm) ? 'var(--color-navy)' : 'var(--color-surface)',
                    color: form.permissions.includes(perm) ? 'white' : 'var(--color-text-primary)',
                    transition: 'all 0.15s', textTransform: 'capitalize',
                  }}
                >
                  {perm}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Purpose of Use *</label>
            <input type="text" className="form-input" value={form.purpose} onChange={e => setForm(prev => ({ ...prev, purpose: e.target.value }))} placeholder="e.g. Cross-facility specialist consultation" />
          </div>
          <div>
            <label className="form-label">Validity Period</label>
            <select className="form-input form-select" value={form.validDays} onChange={e => setForm(prev => ({ ...prev, validDays: e.target.value }))}>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
            </select>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div>
          <AlertBox variant="info">
            Review the complete consent authorization before submitting. This grant will be recorded on the consortium ledger.
          </AlertBox>
          <div style={{ marginTop: 16, background: 'var(--color-surface-muted)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><div className="form-label">Patient</div><div style={{ fontWeight: 600 }}>{patient?.name ?? '—'}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{patient?.patientId}</div></div>
              <div><div className="form-label">Authorized Provider</div><div style={{ fontWeight: 600 }}>{provider?.name ?? '—'}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{provider?.org ?? provider?.providerId}</div></div>
              <div><div className="form-label">Record</div><div style={{ fontWeight: 600 }}>{form.recordId || '—'}</div></div>
              <div><div className="form-label">Valid From</div><div>{format(validFrom, 'MMM d, yyyy')}</div></div>
              <div><div className="form-label">Valid Until</div><div>{format(validUntil, 'MMM d, yyyy')}</div></div>
            </div>
            <div><div className="form-label">Purpose</div><div style={{ fontSize: 13 }}>{form.purpose}</div></div>
            <div>
              <div className="form-label">Record Categories</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {form.categories.map(c => <RecordCategoryBadge key={c} category={c} />)}
              </div>
            </div>
            <div>
              <div className="form-label">Permissions</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {form.permissions.map(p => <Badge key={p} variant="indexed">{p}</Badge>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── Consent Management Page ───────────────────────────────────
const ConsentManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [consents, setConsents] = useState<ConsentGrant[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);

  useEffect(() => {
    Promise.all([fetchConsents(), fetchPatients(), fetchProviders()])
      .then(([raw, patients, providers]) => {
        const pName = new Map(patients.map((p) => [p.patientId, p.name]));
        const prName = new Map(providers.map((d) => [d.providerId, d.name ?? d.providerId]));
        const prOrg = new Map(providers.map((d) => [d.providerId, d.org]));
        setConsents(raw.map((c) => mapConsent(
          c,
          pName.get(c.patientId) ?? '—',
          prName.get(c.granteeId) ?? '—',
          prOrg.get(c.granteeId) ?? '',
        )));
        setLiveLoaded(true);
      })
      .catch(() => setLiveLoaded(false));
  }, []);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewingConsent, setViewingConsent] = useState<ConsentGrant | null>(null);
  const [revokingConsent, setRevokingConsent] = useState<ConsentGrant | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const filtered = useMemo(() => {
    let result = [...consents];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.patientName.toLowerCase().includes(q) ||
        c.grantedTo.toLowerCase().includes(q) ||
        c.grantedToOrg.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(c => c.status === statusFilter);
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [consents, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    active: consents.filter(c => c.status === 'active').length,
    pending: consents.filter(c => c.status === 'pending').length,
    expired: consents.filter(c => c.status === 'expired').length,
    revoked: consents.filter(c => c.status === 'revoked').length,
  };

  const handleRevoke = async () => {
    if (!revokingConsent || !revokeReason.trim()) return;
    const target = revokingConsent;
    setRevokingConsent(null);
    setRevokeReason('');
    try {
      await revokeConsent(target.patientId, target.id);
      setConsents(prev => prev.map(c => c.id === target.id ? {
        ...c, status: 'revoked' as const,
        revokedAt: new Date().toISOString(),
        revocationReason: revokeReason,
      } : c));
      showToast('success', 'Consent Revoked', `Access grant for ${target.patientName} has been revoked on-chain.`);
    } catch (err) {
      showToast('error', 'Revoke Failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Consent Management</h1>
          <p className="page-subtitle">
            Patient-authorized record sharing grants · {counts.active} active · {liveLoaded ? <Badge variant="success">Live Ledger</Badge> : <DemoBadge />}
          </p>
        </div>
        <button className="btn btn-teal" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> Create Consent Grant
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {Object.entries(counts).map(([status, count]) => (
          <div
            key={status}
            className={`card card-sm consent-${status}`}
            style={{ cursor: 'pointer' }}
            onClick={() => { setStatusFilter(status); setPage(1); }}
          >
            <div style={{ fontSize: 24, fontWeight: 700 }}>{count}</div>
            <div style={{ fontSize: 11, textTransform: 'capitalize', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {status}
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Search by patient, provider, or organization…"
          width={280}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'active', 'pending', 'expired', 'revoked'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          icon={<Shield size={48} />}
          title="No consent grants found"
          description="No consent grants match your current filters."
          action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={14} /> Create First Consent</button>}
        />
      ) : (
        <>
          <div className="grid-2">
            {paginated.map(c => (
              <ConsentCard
                key={c.id}
                consent={c}
                onView={() => setViewingConsent(c)}
                onRevoke={() => setRevokingConsent(c)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div style={{ marginTop: 16 }}>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} total={filtered.length} pageSize={PAGE_SIZE} />
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <CreateConsentModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* View Modal */}
      {viewingConsent && (
        <Modal
          open={true}
          onClose={() => setViewingConsent(null)}
          title={`Consent Grant — ${viewingConsent.patientName}`}
          size="md"
          footer={
            viewingConsent.status === 'active' ? (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => { setRevokingConsent(viewingConsent); setViewingConsent(null); }}
              >
                Revoke Consent
              </button>
            ) : undefined
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ConsentStatusBadge status={viewingConsent.status} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><div className="form-label">Patient</div><div style={{ fontWeight: 600 }}>{viewingConsent.patientName}</div></div>
              <div><div className="form-label">Authorized To</div><div>{viewingConsent.grantedTo}<br /><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{viewingConsent.grantedToOrg}</span></div></div>
              <div><div className="form-label">Valid From</div><div>{format(new Date(viewingConsent.validFrom), 'MMM d, yyyy')}</div></div>
              <div><div className="form-label">Valid Until</div><div>{format(new Date(viewingConsent.validUntil), 'MMM d, yyyy')}</div></div>
            </div>
            <div><div className="form-label">Purpose of Use</div><div style={{ fontSize: 13 }}>{viewingConsent.purpose}</div></div>
            <div>
              <div className="form-label">Accessible Categories</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {viewingConsent.categories.map(c => <RecordCategoryBadge key={c} category={c} />)}
              </div>
            </div>
            <div>
              <div className="form-label">Permitted Actions</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {viewingConsent.permissions.map(p => <Badge key={p} variant="indexed">{p}</Badge>)}
              </div>
            </div>
            <div>
              <div className="form-label">Consent History</div>
              <ConsentTimeline consent={viewingConsent} />
            </div>
            {viewingConsent.txId && (
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>
                TX: {viewingConsent.txId} <span style={{ color: '#b45309' }}>[DEMO]</span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Revoke Dialog */}
      {revokingConsent && (
        <Modal
          open={true}
          onClose={() => { setRevokingConsent(null); setRevokeReason(''); }}
          title="Revoke Consent Grant"
          size="sm"
          footer={
            <>
              <button className="btn btn-outline" onClick={() => { setRevokingConsent(null); setRevokeReason(''); }}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRevoke} disabled={!revokeReason.trim()}>Revoke Consent</button>
            </>
          }
        >
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Revoking consent for <strong>{revokingConsent.patientName}</strong> granted to <strong>{revokingConsent.grantedTo}</strong>.
            This action cannot be undone.
          </div>
          <div>
            <label className="form-label">Reason for Revocation *</label>
            <textarea
              className="form-input form-textarea"
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
              placeholder="Explain why this consent is being revoked…"
            />
          </div>
          <AlertBox variant="warning" style={{ marginTop: 12 } as any}>
            DEMO: No real ledger transaction will be submitted upon revocation.
          </AlertBox>
        </Modal>
      )}
    </div>
  );
};

export default ConsentManagement;
