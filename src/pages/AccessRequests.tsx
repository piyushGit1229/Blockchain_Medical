// ============================================================
// MediLedger — Access Requests
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  Inbox, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { DEMO_ACCESS_REQUESTS, DEMO_PATIENTS } from '../data/demo';
import {
  SearchInput, RequestStatusBadge, Badge, RecordCategoryBadge,
  DemoBadge, Modal, AlertBox, EmptyState,
  Pagination, showToast
} from '../components/ui';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import type { AccessRequest } from '../types';

const PAGE_SIZE = 6;

// ── Approve Modal ─────────────────────────────────────────────
const ApproveModal: React.FC<{
  request: AccessRequest;
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
}> = ({ request, open, onClose, onApprove }) => {
  const patient = DEMO_PATIENTS.find(p => p.id === request.patientId);

  return (
    <Modal
      open={open} onClose={onClose}
      title="Approve Access Request"
      subtitle="Review what access will be granted before confirming"
      size="md"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-teal" onClick={onApprove}>
            <CheckCircle size={14} /> Approve Access
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--color-surface-muted)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Access Grant Summary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            <div>
              <div className="form-label">Patient</div>
              <div style={{ fontWeight: 600 }}>{request.patientName}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{patient?.mrn}</div>
            </div>
            <div>
              <div className="form-label">Requesting Doctor</div>
              <div style={{ fontWeight: 600 }}>{request.requestingDoctor}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{request.requestingOrg}</div>
            </div>
            <div>
              <div className="form-label">Purpose</div>
              <div>{request.purpose}</div>
            </div>
            <div>
              <div className="form-label">Expires</div>
              <div>{format(new Date(request.expiresAt), 'MMM d, yyyy')}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="form-label">Record Categories to be Accessible</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {request.categories.map(cat => <RecordCategoryBadge key={cat} category={cat} />)}
          </div>
        </div>

        <div>
          <div className="form-label">Permitted Actions</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {request.requestedPermissions.map(perm => (
              <Badge key={perm} variant="indexed">{perm}</Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="form-label">Clinical Justification</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            {request.clinicalJustification}
          </p>
        </div>

        <AlertBox variant="warning">
          Approving this request will create a consent grant on the ledger. This action is logged and cannot be undone. The patient can revoke access at any time.
          <div style={{ marginTop: 4, fontWeight: 600 }}>DEMO: No real consent transaction will be submitted.</div>
        </AlertBox>
      </div>
    </Modal>
  );
};

// ── Deny Modal ────────────────────────────────────────────────
const DenyModal: React.FC<{
  request: AccessRequest;
  open: boolean;
  onClose: () => void;
  onDeny: (reason: string) => void;
}> = ({ request, open, onClose, onDeny }) => {
  const [reason, setReason] = useState('');

  return (
    <Modal
      open={open} onClose={onClose}
      title="Deny Access Request"
      subtitle="Provide a reason for the denial"
      size="sm"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={() => { if (reason.trim()) { onDeny(reason); setReason(''); } }} disabled={!reason.trim()}>
            <XCircle size={14} /> Deny Request
          </button>
        </>
      }
    >
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        Denying access request from <strong>{request.requestingDoctor}</strong> for patient <strong>{request.patientName}</strong>.
      </div>
      <div>
        <label className="form-label">Reason for Denial *</label>
        <textarea
          className="form-input form-textarea"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Explain why this request is being denied…"
          style={{ minHeight: 100 }}
        />
      </div>
    </Modal>
  );
};

// ── Request Row ───────────────────────────────────────────────
const RequestRow: React.FC<{
  request: AccessRequest;
  onView: () => void;
  onApprove?: () => void;
  onDeny?: () => void;
}> = ({ request, onView, onApprove, onDeny }) => {
  const isPending = request.status === 'pending';

  return (
    <tr onClick={onView} style={{ cursor: 'pointer' }}>
      <td>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{request.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {DEMO_PATIENTS.find(p => p.id === request.patientId)?.mrn}
        </div>
      </td>
      <td>
        <div style={{ fontSize: 13 }}>{request.requestingDoctor}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{request.requestingOrg.split(' ')[0]}</div>
      </td>
      <td style={{ maxWidth: 180 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {request.categories.map(c => (
            <span key={c} style={{ fontSize: 11, padding: '1px 6px', background: 'var(--color-blue-light)', color: '#1e40af', borderRadius: 4 }}>
              {c.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </td>
      <td style={{ fontSize: 12, color: 'var(--color-text-secondary)', maxWidth: 180 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{request.purpose}</div>
      </td>
      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
        {format(new Date(request.requestedAt), 'MMM d, HH:mm')}
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {new Date(request.expiresAt) < new Date() && request.status === 'pending' && (
            <AlertTriangle size={12} color="#b45309" />
          )}
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {format(new Date(request.expiresAt), 'MMM d')}
          </span>
        </div>
      </td>
      <td><RequestStatusBadge status={request.status} /></td>
      <td>
        {isPending ? (
          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-teal btn-sm" onClick={onApprove}>
              <CheckCircle size={12} /> Approve
            </button>
            <button className="btn btn-outline btn-sm" onClick={onDeny} style={{ color: 'var(--color-red)' }}>
              Deny
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {request.resolvedAt ? format(new Date(request.resolvedAt), 'MMM d') : '—'}
          </span>
        )}
      </td>
    </tr>
  );
};

// ── Access Requests Page ──────────────────────────────────────
const AccessRequests: React.FC = () => {
  const [search, setSearch] = useState('');
  const { currentUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [requests, setRequests] = useState(DEMO_ACCESS_REQUESTS);
  const [approvingReq, setApprovingReq] = useState<AccessRequest | null>(null);
  const [denyingReq, setDenyingReq] = useState<AccessRequest | null>(null);
  const [viewingReq, setViewingReq] = useState<AccessRequest | null>(null);

  const filtered = useMemo(() => {
    let result = [...requests];
    if (currentUser.role === 'patient') {
      result = result.filter(r => r.patientId === 'pat-001' || r.patientName.toLowerCase().includes(currentUser.name.toLowerCase()));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.patientName.toLowerCase().includes(q) ||
        r.requestingDoctor.toLowerCase().includes(q) ||
        r.requestingOrg.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter);
    return result.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [currentUser, requests, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleApprove = (req: AccessRequest) => {
    setRequests(prev => prev.map(r => r.id === req.id ? {
      ...r, status: 'approved' as const,
      resolvedAt: new Date().toISOString(),
      resolvedBy: currentUser.name,
    } : r));
    setApprovingReq(null);
    showToast('success', 'Access Request Approved', `Access to ${req.patientName}'s records has been granted.`);
  };

  const handleDeny = (req: AccessRequest, reason: string) => {
    setRequests(prev => prev.map(r => r.id === req.id ? {
      ...r, status: 'denied' as const,
      resolvedAt: new Date().toISOString(),
      resolvedBy: currentUser.name,
      denialReason: reason,
    } : r));
    setDenyingReq(null);
    showToast('info', 'Access Request Denied', `Request from ${req.requestingDoctor} has been denied.`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">
              {currentUser.role === 'patient'
                ? 'Access Requests for My Records'
                : currentUser.role === 'doctor'
                ? 'Clinical Access Requests'
                : 'Access Requests'}
            </h1>
            <Badge variant={currentUser.role === 'admin' ? 'info' : currentUser.role === 'doctor' ? 'success' : currentUser.role === 'patient' ? 'warning' : 'neutral'} size="sm">
              {currentUser.role.toUpperCase()} SCOPE
            </Badge>
          </div>
          <p className="page-subtitle">
            {currentUser.role === 'patient'
              ? 'Physicians and specialists requesting sovereign consent to review your health data · '
              : `${pendingCount} pending request${pendingCount !== 1 ? 's' : ''} requiring attention · `}
            <DemoBadge />
          </p>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <div>
            <strong>{pendingCount} access request{pendingCount !== 1 ? 's' : ''} pending review.</strong>
            {' '}Review each request carefully before approving access to patient medical records.
          </div>
        </div>
      )}

      <div className="filter-bar">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Search by patient or doctor…"
          width={260}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'pending', 'approved', 'denied', 'expired'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s === 'pending' && pendingCount > 0 && (
                <span style={{
                  marginLeft: 4, background: '#dc2626', color: 'white',
                  borderRadius: 100, fontSize: 10, padding: '1px 5px', fontWeight: 700
                }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {paginated.length === 0 ? (
          <EmptyState
            icon={<Inbox size={48} />}
            title="No requests found"
            description="No access requests match your current filters."
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Requesting Doctor</th>
                    <th>Categories</th>
                    <th>Purpose</th>
                    <th>Requested</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(req => (
                    <RequestRow
                      key={req.id}
                      request={req}
                      onView={() => setViewingReq(req)}
                      onApprove={() => setApprovingReq(req)}
                      onDeny={() => setDenyingReq(req)}
                    />
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

      {/* View Modal */}
      {viewingReq && (
        <Modal
          open={true}
          onClose={() => setViewingReq(null)}
          title={`Access Request — ${viewingReq.patientName}`}
          size="md"
          footer={
            viewingReq.status === 'pending' ? (
              <>
                <button className="btn btn-outline" onClick={() => { setDenyingReq(viewingReq); setViewingReq(null); }} style={{ color: 'var(--color-red)' }}>
                  Deny
                </button>
                <button className="btn btn-teal" onClick={() => { setApprovingReq(viewingReq); setViewingReq(null); }}>
                  Approve
                </button>
              </>
            ) : undefined
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
              <div><div className="form-label">Patient</div><div style={{ fontWeight: 600 }}>{viewingReq.patientName}</div></div>
              <div><div className="form-label">Status</div><RequestStatusBadge status={viewingReq.status} /></div>
              <div><div className="form-label">Requesting Doctor</div><div>{viewingReq.requestingDoctor}</div></div>
              <div><div className="form-label">Organization</div><div>{viewingReq.requestingOrg}</div></div>
              <div><div className="form-label">Requested</div><div>{format(new Date(viewingReq.requestedAt), 'MMM d, yyyy HH:mm')}</div></div>
              <div><div className="form-label">Expires</div><div>{format(new Date(viewingReq.expiresAt), 'MMM d, yyyy')}</div></div>
            </div>
            <div>
              <div className="form-label">Purpose</div>
              <div style={{ fontSize: 13 }}>{viewingReq.purpose}</div>
            </div>
            <div>
              <div className="form-label">Clinical Justification</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{viewingReq.clinicalJustification}</p>
            </div>
            <div>
              <div className="form-label">Requested Record Categories</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {viewingReq.categories.map(c => <RecordCategoryBadge key={c} category={c} />)}
              </div>
            </div>
            <div>
              <div className="form-label">Requested Permissions</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {viewingReq.requestedPermissions.map(p => <Badge key={p} variant="indexed">{p}</Badge>)}
              </div>
            </div>
            {viewingReq.denialReason && (
              <AlertBox variant="error">
                <div><strong>Denial Reason:</strong> {viewingReq.denialReason}</div>
              </AlertBox>
            )}
            {viewingReq.txId && (
              <div>
                <div className="form-label">Transaction Reference</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {viewingReq.txId} <span style={{ color: '#b45309' }}>[DEMO]</span>
                </div>
              </div>
            )}
            <DemoBadge />
          </div>
        </Modal>
      )}

      {/* Approve/Deny Modals */}
      {approvingReq && (
        <ApproveModal
          request={approvingReq}
          open={true}
          onClose={() => setApprovingReq(null)}
          onApprove={() => handleApprove(approvingReq)}
        />
      )}
      {denyingReq && (
        <DenyModal
          request={denyingReq}
          open={true}
          onClose={() => setDenyingReq(null)}
          onDeny={(reason) => handleDeny(denyingReq, reason)}
        />
      )}
    </div>
  );
};

export default AccessRequests;
