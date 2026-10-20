// ============================================================
// MediLedger — Medical Records
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Upload, Lock, CheckCircle, XCircle,
  AlertCircle
} from 'lucide-react';
import { fetchPatients, fetchRecords, mapRecord, uploadRecord, type RawPatient } from '../api';
import {
  SearchInput, Badge, RecordCategoryBadge, DemoBadge,
  HashDisplay, Modal, StepIndicator, AlertBox, EmptyState,
  SortHeader, Pagination, showToast
} from '../components/ui';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import type { RecordCategory, MedicalRecord } from '../types';

const PAGE_SIZE = 8;

// ── Upload Flow ───────────────────────────────────────────────
const UPLOAD_STEPS = ['File Selection', 'Metadata', 'Review', 'Processing'];

const UploadModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processSteps, setProcessSteps] = useState<{ label: string; status: 'pending' | 'running' | 'done' | 'demo' }[]>([]);
  const [formData, setFormData] = useState({
    file: null as File | null,
    patientId: '',
    category: '' as RecordCategory | '',
    title: '',
    description: '',
  });
  const [livePatients, setLivePatients] = useState<RawPatient[]>([]);
  const [uploadResult, setUploadResult] = useState<{
    recordId: string;
    ipfsCid: string | null;
    contentHash: string;
    txId: string;
    latencyMs: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchPatients()
      .then(setLivePatients)
      .catch(() => undefined);
  }, [open]);

  const CATEGORY_TO_RECORD_TYPE: Record<string, string> = {
    lab_report: 'lab-report',
    imaging: 'imaging-report',
    prescription: 'prescription',
    clinical_note: 'clinical-note',
    discharge_summary: 'discharge-summary',
    vaccination: 'clinical-note',
    pathology: 'lab-report',
    radiology: 'imaging-report',
  };

  const runProcessing = async () => {
    const steps = [
      { label: 'Validating file integrity', status: 'pending' as const },
      { label: 'Encrypting file (AES-256-GCM)', status: 'pending' as const },
      { label: 'Uploading to IPFS', status: 'pending' as const },
      { label: 'Anchoring content hash to Fabric ledger', status: 'pending' as const },
      { label: 'Recording audit event', status: 'pending' as const },
    ];
    setProcessSteps(steps);
    setProcessing(true);

    const advance = (i: number) => {
      setProcessSteps(prev => prev.map((s, idx) => ({
        ...s,
        status: idx < i ? 'done' : idx === i ? 'running' : 'pending',
      })));
    };

    try {
      advance(0);
      const text = formData.file ? await formData.file.text() : '';

      advance(1);
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        fileName: formData.file?.name ?? 'record.txt',
        content: text,
      };

      advance(2);
      const res = await uploadRecord({
        patientId: formData.patientId,
        recordType: CATEGORY_TO_RECORD_TYPE[formData.category] ?? 'clinical-note',
        metadata: {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          fileName: formData.file?.name ?? 'record.txt',
        },
        payload,
      });

      advance(3);
      advance(4);
      setProcessSteps(prev => prev.map(s => ({ ...s, status: 'done' })));
      setUploadResult({
        recordId: res.recordId,
        ipfsCid: res.ipfsCid,
        contentHash: res.contentHash,
        txId: res.txId,
        latencyMs: res.latencyMs,
      });
    } catch (err) {
      setProcessSteps(prev => prev.map(s => ({ ...s, status: 'demo' })));
      showToast('error', 'Upload Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setProcessing(false);
    setProcessSteps([]);
    setUploadResult(null);
    setFormData({ file: null, patientId: '', category: '', title: '', description: '' });
    onClose();
  };

  const handleComplete = () => {
    showToast('success', 'Record uploaded successfully', uploadResult
      ? `Anchored as ${uploadResult.recordId} · tx ${uploadResult.txId.slice(0, 12)}… · ${uploadResult.latencyMs.toFixed(1)} ms`
      : 'File validated and encrypted.');
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Upload Medical Record"
      subtitle="Encrypt, store, and anchor a new medical record"
      size="lg"
      footer={
        step === 3 ? (
          processSteps.length > 0 && !processing ? (
            <button className="btn btn-teal" onClick={handleComplete}>Complete Upload</button>
          ) : null
        ) : (
          <>
            <button className="btn btn-outline" onClick={step === 0 ? handleClose : () => setStep(s => s - 1)} disabled={processing}>
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (step < 2) setStep(s => s + 1);
                else { setStep(3); runProcessing(); }
              }}
              disabled={
                (step === 0 && !formData.file) ||
                (step === 1 && (!formData.patientId || !formData.category || !formData.title)) ||
                processing
              }
            >
              {step === 2 ? 'Start Upload' : 'Next →'}
            </button>
          </>
        )
      }
    >
      <StepIndicator steps={UPLOAD_STEPS} current={step} />

      {step === 0 && (
        <div>
          <div
            style={{
              border: '2px dashed var(--color-border)', borderRadius: 10, padding: 40,
              textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s',
              background: formData.file ? 'var(--color-teal-light)' : 'var(--color-surface-muted)',
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) setFormData(prev => ({ ...prev, file, title: prev.title || file.name.replace(/\.[^.]+$/, '') }));
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.jpg,.png,.dicom,.dcm,.txt,.docx';
              input.onchange = e => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) setFormData(prev => ({ ...prev, file, title: prev.title || file.name.replace(/\.[^.]+$/, '') }));
              };
              input.click();
            }}
          >
            {formData.file ? (
              <div>
                <CheckCircle size={40} color="var(--color-teal)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, fontSize: 14 }}>{formData.file.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {(formData.file.size / 1024).toFixed(0)} KB
                </div>
              </div>
            ) : (
              <div>
                <Upload size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Drop file or click to browse</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>PDF, JPEG, PNG, DICOM, DOCX · Max 50 MB</div>
              </div>
            )}
          </div>
          <AlertBox variant="info" style={{ marginTop: 16 } as any}>
            Files are encrypted client-side before upload. The application API and backend handle encryption key management. Never upload real patient files in demo mode.
          </AlertBox>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Patient *</label>
            <select
              className="form-input form-select"
              value={formData.patientId}
              onChange={e => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
            >
              <option value="">Select patient…</option>
              {livePatients.map(p => (
                <option key={p.patientId} value={p.patientId}>{p.name} — {p.patientId}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Record Category *</label>
            <select
              className="form-input form-select"
              value={formData.category}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as RecordCategory }))}
            >
              <option value="">Select category…</option>
              <option value="lab_report">Lab Report</option>
              <option value="imaging">Imaging</option>
              <option value="prescription">Prescription</option>
              <option value="clinical_note">Clinical Note</option>
              <option value="discharge_summary">Discharge Summary</option>
              <option value="vaccination">Vaccination</option>
              <option value="pathology">Pathology</option>
              <option value="radiology">Radiology</option>
            </select>
          </div>
          <div>
            <label className="form-label">Record Title *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. HbA1c Panel Q4 2026"
            />
          </div>
          <div>
            <label className="form-label">Clinical Description</label>
            <textarea
              className="form-input form-textarea"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief summary of the record contents and clinical relevance…"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <AlertBox variant="warning">
            Review all details carefully before uploading. Once anchored to the blockchain, record metadata cannot be altered.
          </AlertBox>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            <div style={{ padding: '10px 14px', background: 'var(--color-surface-muted)', borderRadius: 8 }}>
              <div className="form-label">File</div>
              <div style={{ fontWeight: 500 }}>{formData.file?.name}</div>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--color-surface-muted)', borderRadius: 8 }}>
              <div className="form-label">Patient</div>
              <div style={{ fontWeight: 500 }}>{livePatients.find(p => p.patientId === formData.patientId)?.name || '—'}</div>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--color-surface-muted)', borderRadius: 8 }}>
              <div className="form-label">Category</div>
              <div style={{ fontWeight: 500 }}>{formData.category.replace(/_/g, ' ')}</div>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--color-surface-muted)', borderRadius: 8 }}>
              <div className="form-label">Encryption</div>
              <div style={{ fontWeight: 500, color: 'var(--color-teal)' }}>AES-256-GCM ✓</div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-surface-muted)', borderRadius: 8 }}>
            <div className="form-label">Title</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{formData.title}</div>
          </div>
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-blue-light)', borderRadius: 8, fontSize: 12, color: '#1e3a8a' }}>
            Upload sequence: Validate → Encrypt → Store on IPFS → Anchor hash on Hyperledger Fabric → Record audit event.
            <span style={{ marginLeft: 4, color: '#b45309', fontWeight: 600 }}>Steps 3–5 are simulated in demo mode.</span>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {processSteps.map((s, i) => (
              <div key={i} className="process-step">
                <div className="process-step-icon" style={{
                  background: s.status === 'done' ? '#dcfce7' :
                    s.status === 'demo' ? 'rgba(245,158,11,0.1)' :
                    s.status === 'running' ? 'var(--color-blue-light)' : 'var(--color-surface-muted)',
                }}>
                  {s.status === 'done' && <CheckCircle size={14} color="#16a34a" />}
                  {s.status === 'demo' && <AlertCircle size={14} color="#b45309" />}
                  {s.status === 'running' && (
                    <div style={{ width: 14, height: 14, border: '2px solid var(--color-blue-muted)', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
                  )}
                  {s.status === 'pending' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-border)' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
                  {s.status === 'demo' && (
                    <div style={{ fontSize: 11, color: '#b45309' }}>Step did not complete</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!processing && processSteps.length > 0 && uploadResult && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--color-surface-muted)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><div className="form-label">Record ID</div><div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{uploadResult.recordId}</div></div>
                <div><div className="form-label">Transaction</div><div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{uploadResult.txId.slice(0, 20)}…</div></div>
                <div><div className="form-label">IPFS CID</div><div style={{ fontWeight: 600, fontFamily: 'monospace', wordBreak: 'break-all' }}>{uploadResult.ipfsCid ?? '—'}</div></div>
                <div><div className="form-label">Anchor Latency</div><div style={{ fontWeight: 600 }}>{uploadResult.latencyMs.toFixed(1)} ms</div></div>
              </div>
              <div><div className="form-label">Content Hash (SHA-256)</div><div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{uploadResult.contentHash}</div></div>
            </div>
          )}
          {!processing && processSteps.length > 0 && !uploadResult && (
            <AlertBox variant="warning" style={{ marginTop: 16 } as any}>
              The upload did not complete. Check the console for details and retry.
            </AlertBox>
          )}
        </div>
      )}
    </Modal>
  );
};

// ── Records Page ──────────────────────────────────────────────
const Records: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('uploadedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);

  useEffect(() => {
    Promise.all([fetchRecords(), fetchPatients()])
      .then(([raw, patients]) => {
        const pName = new Map(patients.map((p) => [p.patientId, p.name]));
        setRecords(raw.map((r) => mapRecord(r, pName.get(r.patientId) ?? '—')));
        setLiveLoaded(true);
      })
      .catch(() => setLiveLoaded(false));
  }, []);

  const handleSort = (field: string) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let result = [...records];
    if (currentUser.role === 'patient') {
      result = result.filter(r => r.patientId === 'pat-001' || r.patientName.toLowerCase().includes(currentUser.name.toLowerCase()));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') {
      result = result.filter(r => r.category === categoryFilter);
    }
    result.sort((a, b) => {
      const av = (a as any)[sortField];
      const bv = (b as any)[sortField];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [currentUser, search, categoryFilter, sortField, sortDir, records]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">
              {currentUser.role === 'patient'
                ? 'My Encrypted Health Records'
                : currentUser.role === 'auditor'
                ? 'Consortium Medical Records (Forensic Index)'
                : 'Medical Records'}
            </h1>
            <Badge variant={currentUser.role === 'admin' ? 'info' : currentUser.role === 'doctor' ? 'success' : currentUser.role === 'patient' ? 'warning' : 'neutral'} size="sm">
              {currentUser.role.toUpperCase()} SCOPE
            </Badge>
          </div>
          <p className="page-subtitle">
            {currentUser.role === 'patient'
              ? 'Personal encrypted health documents · Controlled by your sovereign smart contract consent · '
              : currentUser.role === 'auditor'
              ? 'HIPAA §164.514 Minimum Necessary · PHI metadata and cryptographic content hashes · '
              : `${records.length} records indexed · Encrypted off-chain storage via IPFS · `}
            {liveLoaded ? <Badge variant="success">Live Ledger</Badge> : <DemoBadge />}
          </p>
        </div>
        {currentUser.role !== 'auditor' && currentUser.role !== 'patient' && (
          <button className="btn btn-teal" onClick={() => setUploadOpen(true)}>
            <Upload size={14} /> Upload Record
          </button>
        )}
      </div>

      {currentUser.role === 'auditor' && (
        <AlertBox variant="info" style={{ marginBottom: 16 }}>
          Regulatory Compliance View: Patient Personal Identifiable Information is protected. You have read-only access to verify IPFS CIDs, SHA-256 integrity hashes, and transaction timestamps.
        </AlertBox>
      )}

      <div className="filter-bar">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Search by title, patient, or description…"
          width={280}
        />
        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Categories</option>
          <option value="lab_report">Lab Report</option>
          <option value="imaging">Imaging</option>
          <option value="prescription">Prescription</option>
          <option value="clinical_note">Clinical Note</option>
          <option value="discharge_summary">Discharge Summary</option>
          <option value="vaccination">Vaccination</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {paginated.length === 0 ? (
          <EmptyState
            icon={<FileText size={48} />}
            title="No records found"
            description="Try adjusting your search or filters."
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <SortHeader label="Record" field="title" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th>Patient</th>
                    <th>Category</th>
                    <th>Organization</th>
                    <th>Encryption</th>
                    <th>IPFS CID</th>
                    <SortHeader label="Uploaded" field="uploadedAt" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(rec => (
                    <tr key={rec.id} onClick={() => setSelectedRecord(rec)}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{rec.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {(rec.fileSize / 1024).toFixed(0)} KB · {rec.fileType}
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 0', fontWeight: 500, fontSize: 13, color: 'var(--color-blue-muted)' }}
                          onClick={e => { e.stopPropagation(); navigate(`/patients/${rec.patientId}`); }}
                        >
                          {rec.patientName}
                        </button>
                      </td>
                      <td><RecordCategoryBadge category={rec.category} /></td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {rec.uploadedByOrg.split(' ')[0]}
                      </td>
                      <td>
                        {rec.encryptionStatus === 'encrypted' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Lock size={12} color="var(--color-teal)" />
                            <span style={{ fontSize: 12, color: 'var(--color-teal)', fontWeight: 500 }}>Encrypted</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <XCircle size={12} color="var(--color-red)" />
                            <span style={{ fontSize: 12, color: 'var(--color-red)' }}>Unencrypted</span>
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {rec.ipfsCid ? (
                          <>{rec.ipfsCid.slice(0, 16)}… <span style={{ color: '#b45309' }}>[DEMO]</span></>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {format(new Date(rec.uploadedAt), 'MMM d, yyyy')}
                      </td>
                      <td><Badge variant={rec.status}>{rec.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onChange={setPage} total={filtered.length} pageSize={PAGE_SIZE} />
            )}
          </>
        )}
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />

      {/* Record Detail */}
      {selectedRecord && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedRecord(null); }}
        >
          <div style={{ background: 'var(--color-surface)', borderRadius: 12, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <RecordCategoryBadge category={selectedRecord.category} />
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 6 }}>{selectedRecord.title}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRecord(null)}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <AlertBox variant="info">
                This record is encrypted and stored off-chain. Content shown below is the clinical summary only — not the raw file contents.
              </AlertBox>
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  ['Patient', selectedRecord.patientName],
                  ['Category', selectedRecord.category.replace(/_/g, ' ')],
                  ['Uploaded By', selectedRecord.uploadedBy],
                  ['Organization', selectedRecord.uploadedByOrg],
                  ['Upload Date', format(new Date(selectedRecord.uploadedAt), 'MMMM d, yyyy · HH:mm')],
                  ['File Size', `${(selectedRecord.fileSize / 1024).toFixed(0)} KB`],
                  ['File Type', selectedRecord.fileType],
                  ['Encryption', selectedRecord.encryptionStatus === 'encrypted' ? '✓ AES-256-GCM' : '✗ Not encrypted'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="form-label">{label}</div>
                    <div style={{ fontSize: 13 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="form-label">Clinical Description</div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{selectedRecord.description}</p>
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <HashDisplay label="IPFS CID" value={selectedRecord.ipfsCid} demo={selectedRecord.isDemo} />
                <HashDisplay label="Content Hash (On-Chain)" value={selectedRecord.contentHash} demo={selectedRecord.isDemo} />
                <HashDisplay label="Transaction ID" value={selectedRecord.txId} demo={selectedRecord.isDemo} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Records;
