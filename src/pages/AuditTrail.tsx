// ============================================================
// MediLedger — Audit Trail
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity, Download, ChevronRight,
  CheckCircle, XCircle,
  Upload, UserPlus, Shield, Clock, Eye, ToggleLeft
} from 'lucide-react';
import { fetchAudit, fetchPatients, fetchProviders, mapAuditEvent } from '../api';
import {
  SearchInput, AuditOutcomeBadge, DemoBadge, Modal, Badge,
  EmptyState, Pagination, SortHeader, HashDisplay, AlertBox
} from '../components/ui';
import { format } from 'date-fns';
import type { AuditEvent, AuditEventType } from '../types';

const PAGE_SIZE = 10;

const EVENT_ICONS: Record<AuditEventType, React.FC<any>> = {
  patient_registered: UserPlus,
  record_uploaded: Upload,
  record_accessed: Eye,
  access_requested: Clock,
  access_granted: CheckCircle,
  access_denied: XCircle,
  consent_created: Shield,
  consent_revoked: XCircle,
  policy_evaluated: ToggleLeft,
  org_joined: Activity,
  login: Activity,
  logout: Activity,
};

const EVENT_COLORS: Record<string, string> = {
  success: '#0d9488',
  denied: '#dc2626',
  error: '#b91c1c',
  warning: '#b45309',
};

// ── Event Detail Panel ────────────────────────────────────────
const EventDetailModal: React.FC<{ event: AuditEvent; onClose: () => void }> = ({ event, onClose }) => {
  const Icon = EVENT_ICONS[event.eventType] || Activity;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Audit Event Detail"
      subtitle={`Event ID: ${event.id}`}
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Event Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--color-surface-muted)', borderRadius: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: `${EVENT_COLORS[event.outcome]}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Icon size={18} color={EVENT_COLORS[event.outcome]} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {format(new Date(event.timestamp), 'MMMM d, yyyy · HH:mm:ss')}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <AuditOutcomeBadge outcome={event.outcome} />
          </div>
        </div>

        {/* Actor Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
          <div><div className="form-label">Actor</div><div style={{ fontWeight: 600 }}>{event.actor}</div></div>
          <div><div className="form-label">Role</div><div style={{ textTransform: 'capitalize' }}>{event.actorRole}</div></div>
          <div><div className="form-label">Organization</div><div>{event.actorOrg}</div></div>
          {event.patientName && (
            <div><div className="form-label">Patient</div><div>{event.patientName}</div></div>
          )}
        </div>

        {/* Policy Decision */}
        {event.policyDecision && (
          <div>
            <div className="form-label">Policy Decision (ABAC)</div>
            <div style={{
              padding: '10px 14px',
              background: event.outcome === 'success' ? '#f0fdf4' : event.outcome === 'denied' ? 'var(--color-red-light)' : 'var(--color-surface-muted)',
              border: `1px solid ${event.outcome === 'success' ? '#bbf7d0' : event.outcome === 'denied' ? '#fecaca' : 'var(--color-border)'}`,
              borderRadius: 8, fontFamily: 'monospace', fontSize: 12,
              color: event.outcome === 'success' ? '#14532d' : event.outcome === 'denied' ? '#7f1d1d' : 'var(--color-text-secondary)',
            }}>
              {event.policyDecision}
            </div>
          </div>
        )}

        {/* Metadata */}
        {Object.keys(event.metadata).length > 0 && (
          <div>
            <div className="form-label">Event Metadata</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(event.metadata).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  <div style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)', minWidth: 130, flexShrink: 0 }}>{key}</div>
                  <div style={{ color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}>
                    {val}
                    {(key.toLowerCase().includes('cid') || key.toLowerCase().includes('hash')) && (
                      <span style={{ marginLeft: 6, color: '#b45309', fontSize: 10 }}>[DEMO]</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction */}
        <HashDisplay label="Transaction ID" value={event.txId} demo={event.isDemo} />

        {event.isDemo && (
          <AlertBox variant="warning">
            This audit event is demonstration data. In a production environment, events are immutably recorded on the Hyperledger Fabric ledger with cryptographic proof.
          </AlertBox>
        )}
      </div>
    </Modal>
  );
};

// ── Audit Trail Page ──────────────────────────────────────────
const AuditTrail: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    Promise.all([fetchAudit(), fetchPatients(), fetchProviders()])
      .then(([raw, patients, providers]) => {
        const pName = new Map(patients.map((p) => [p.patientId, p.name]));
        const dName = new Map(providers.map((d) => [d.providerId, d.name ?? d.providerId]));
        if (raw.length) {
          setEvents(raw.map((ev) => mapAuditEvent(ev, pName.get(ev.patientId), dName.get(ev.providerId))));
          setLiveLoaded(true);
        }
      })
      .catch(() => setLiveLoaded(false));
  }, []);

  const handleSort = (field: string) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let result = [...events];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.actor.toLowerCase().includes(q) ||
        e.actorOrg.toLowerCase().includes(q) ||
        (e.patientName?.toLowerCase().includes(q)) ||
        e.eventType.replace(/_/g, ' ').includes(q)
      );
    }
    if (eventTypeFilter !== 'all') result = result.filter(e => e.eventType === eventTypeFilter);
    if (outcomeFilter !== 'all') result = result.filter(e => e.outcome === outcomeFilter);

    result.sort((a, b) => {
      const av = (a as any)[sortField];
      const bv = (b as any)[sortField];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [search, eventTypeFilter, outcomeFilter, sortField, sortDir, events]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const EVENT_TYPES: { id: AuditEventType; label: string }[] = [
    { id: 'patient_registered', label: 'Patient Registration' },
    { id: 'record_uploaded', label: 'Record Upload' },
    { id: 'record_accessed', label: 'Record Access' },
    { id: 'access_requested', label: 'Access Request' },
    { id: 'access_granted', label: 'Access Granted' },
    { id: 'access_denied', label: 'Access Denied' },
    { id: 'consent_created', label: 'Consent Created' },
    { id: 'consent_revoked', label: 'Consent Revoked' },
    { id: 'policy_evaluated', label: 'Policy Evaluation' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">
            Immutable record of all platform actions · {events.length} events · {liveLoaded ? <Badge variant="success">Live Ledger</Badge> : <DemoBadge />}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm"><Download size={14} /> Export Log</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Events', value: events.length, color: 'var(--color-navy)' },
          { label: 'Successful', value: events.filter(e => e.outcome === 'success').length, color: '#0d9488' },
          { label: 'Denied', value: events.filter(e => e.outcome === 'denied').length, color: '#dc2626' },
          { label: 'Warnings', value: events.filter(e => e.outcome === 'warning').length, color: '#b45309' },
        ].map(stat => (
          <div key={stat.label} className="card card-sm">
            <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Search actor, patient, or event type…"
          width={260}
        />
        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={eventTypeFilter}
          onChange={e => { setEventTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Event Types</option>
          {EVENT_TYPES.map(et => <option key={et.id} value={et.id}>{et.label}</option>)}
        </select>
        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={outcomeFilter}
          onChange={e => { setOutcomeFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Outcomes</option>
          <option value="success">Success</option>
          <option value="denied">Denied</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {paginated.length === 0 ? (
          <EmptyState
            icon={<Activity size={48} />}
            title="No audit events found"
            description="Try adjusting your filters."
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event Type</th>
                    <th>Actor</th>
                    <th>Organization</th>
                    <th>Patient / Record</th>
                    <th>Outcome</th>
                    <SortHeader label="Timestamp" field="timestamp" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th>Transaction</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(evt => {
                    const Icon = EVENT_ICONS[evt.eventType] || Activity;
                    return (
                      <tr key={evt.id} onClick={() => setSelectedEvent(evt)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: 6,
                              background: `${EVENT_COLORS[evt.outcome]}14`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                              <Icon size={13} color={EVENT_COLORS[evt.outcome]} />
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>
                              {evt.eventType.replace(/_/g, ' ')}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{evt.actor}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{evt.actorRole}</div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          {evt.actorOrg.split(' ')[0]}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {evt.patientName ? (
                            <><div style={{ fontWeight: 500 }}>{evt.patientName}</div></>
                          ) : '—'}
                        </td>
                        <td><AuditOutcomeBadge outcome={evt.outcome} /></td>
                        <td style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {format(new Date(evt.timestamp), 'MMM d, HH:mm:ss')}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {evt.txId ? (
                            <>{evt.txId.slice(0, 16)}… <span style={{ color: '#b45309' }}>[D]</span></>
                          ) : <span style={{ color: 'var(--color-border)' }}>—</span>}
                        </td>
                        <td>
                          <ChevronRight size={14} color="var(--color-text-muted)" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onChange={setPage} total={filtered.length} pageSize={PAGE_SIZE} />
            )}
          </>
        )}
      </div>

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
};

export default AuditTrail;
