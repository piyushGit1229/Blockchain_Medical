// ============================================================
// MediLedger — Overview Dashboard
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, FileText, Inbox, Shield, Activity, AlertTriangle,
  CheckCircle, ArrowRight, Upload,
  Lock, Database, Hash, GitBranch, Server
} from 'lucide-react';
import {
  DEMO_METRICS, DEMO_AUDIT_EVENTS, DEMO_ORGANIZATIONS,
  DEMO_ACTIVITY_TIMELINE, DEMO_STORAGE_DATA, DEMO_ACCESS_REQUESTS,
  DEMO_RECORDS
} from '../data/demo';
import {
  fetchAudit, fetchMetrics, fetchPatients, fetchProviders, fetchStatus,
  mapAuditEvent, orgLabel, storageDistribution, type StorageSlice,
} from '../api';
import type { AuditEvent, DashboardMetrics } from '../types';
import { DemoBadge, AuditOutcomeBadge, Badge } from '../components/ui';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import DoctorOverview from '../components/roles/DoctorOverview';
import PatientOverview from '../components/roles/PatientOverview';
import AuditorOverview from '../components/roles/AuditorOverview';

// ── Architecture Diagram ──────────────────────────────────────
const ArchitectureDiagram: React.FC = () => {
  const layers = [
    {
      id: 'client',
      label: 'Client Layer',
      nodes: [
        { icon: Users, label: 'Patient Portal', color: '#1d4ed8' },
        { icon: Inbox, label: 'Doctor Interface', color: '#1d4ed8' },
        { icon: Lock, label: 'Admin Console', color: '#1d4ed8' },
      ],
    },
    {
      id: 'api',
      label: 'API & Access Control',
      nodes: [
        { icon: Shield, label: 'ABAC Engine', color: '#0d9488' },
        { icon: Lock, label: 'Consent Evaluator', color: '#0d9488' },
        { icon: Activity, label: 'Audit Logger', color: '#0d9488' },
      ],
    },
    {
      id: 'fabric',
      label: 'Hyperledger Fabric',
      nodes: [
        { icon: GitBranch, label: 'Consensus & Ledger', color: '#7c3aed' },
        { icon: Hash, label: 'Content Hashes', color: '#7c3aed' },
        { icon: Activity, label: 'Audit Events', color: '#7c3aed' },
      ],
    },
    {
      id: 'storage',
      label: 'IPFS Encrypted Storage',
      nodes: [
        { icon: Database, label: 'Encrypted Files', color: '#b45309' },
        { icon: Server, label: 'CID References', color: '#b45309' },
        { icon: Lock, label: 'AES-256 Encrypted', color: '#b45309' },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {layers.map((layer, layerIdx) => (
        <React.Fragment key={layer.id}>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 6 }}>
              {layer.label}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {layer.nodes.map((node, i) => {
                const Icon = node.icon;
                return (
                  <div key={i} style={{
                    flex: 1, border: `1px solid ${node.color}22`,
                    background: `${node.color}08`, borderRadius: 8,
                    padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, background: `${node.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Icon size={12} color={node.color} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{node.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {layerIdx < layers.length - 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0', color: 'var(--color-text-muted)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                <div style={{ width: 1, height: 8, background: 'var(--color-border)' }} />
                <span style={{ fontSize: 14, lineHeight: 1 }}>↓</span>
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
      <div className="alert alert-info" style={{ marginTop: 12, fontSize: 11 }}>
        <Lock size={12} style={{ flexShrink: 0, marginTop: 1 }} />
        <span><strong>On-chain:</strong> Content hashes, CID references, consent events, and audit metadata — never raw medical documents.</span>
      </div>
    </div>
  );
};

// ── Metric Card ───────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: number | string;
  icon: React.FC<{ size?: number; color?: string }>;
  iconColor: string;
  iconBg: string;
  trend?: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, iconColor, iconBg, trend, onClick }) => (
  <div className="metric-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
    onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="metric-label">{label}</div>
        <div className="metric-value" style={{ marginTop: 6 }}>{value}</div>
        {trend && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{trend}</div>}
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={iconColor} />
      </div>
    </div>
  </div>
);

// ── Storage Donut ─────────────────────────────────────────────
const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.04) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const Overview: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [liveMetrics, setLiveMetrics] = useState<DashboardMetrics | null>(null);
  const [liveEvents, setLiveEvents] = useState<AuditEvent[] | null>(null);
  const [liveStorage, setLiveStorage] = useState<StorageSlice[] | null>(null);
  const [liveOrgs, setLiveOrgs] = useState<string[] | null>(null);

  useEffect(() => {
    if (currentUser.role !== 'admin') return;
    fetchMetrics().then(setLiveMetrics).catch(() => setLiveMetrics(null));
    fetchStatus()
      .then(s => setLiveStorage(storageDistribution(s)))
      .catch(() => setLiveStorage(null));
    fetchStatus()
      .then(s => setLiveOrgs(s.organizations))
      .catch(() => setLiveOrgs(null));
    Promise.all([fetchAudit(), fetchProviders(), fetchPatients()])
      .then(([raw, providers, patients]) => {
        const pName = new Map(patients.map(p => [p.patientId, p.name]));
        const dName = new Map(providers.map(d => [d.providerId, d.name ?? d.providerId]));
        setLiveEvents(raw.slice(0, 5).map(e => mapAuditEvent(
          e,
          pName.get(e.patientId) ?? '—',
          dName.get(e.providerId) ?? '—',
        )));
      })
      .catch(() => setLiveEvents(null));
  }, [currentUser.role]);

  // Role-customized overviews
  if (currentUser.role === 'doctor') {
    return <DoctorOverview />;
  }
  if (currentUser.role === 'patient') {
    return <PatientOverview />;
  }
  if (currentUser.role === 'auditor') {
    return <AuditorOverview />;
  }

  // Admin / Consortium Infrastructure Overview — live ledger metrics when
  // the backend is reachable, otherwise fall back to demo constants.
  const metrics = liveMetrics ?? DEMO_METRICS;
  const recentEvents = liveEvents ?? DEMO_AUDIT_EVENTS.slice(0, 5);
  const pendingRequests = DEMO_ACCESS_REQUESTS.filter(r => r.status === 'pending');
  const recentRecords = DEMO_RECORDS.slice(0, 4);
  const storageData = liveStorage ?? DEMO_STORAGE_DATA;

  return (
    <div className="admin-overview">
      {/* Demo Banner */}
      <div className="demo-banner">
        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
        <span>
          <strong>{liveMetrics ? 'LIVE LEDGER' : 'DEMO ENVIRONMENT'}</strong> — {liveMetrics
            ? 'Metrics, storage distribution and consortium membership are read live from the Fabric simulator, IPFS store and chaincode.'
            : 'All metrics, records, and network data shown here are fictional and illustrative. No real Hyperledger Fabric network or IPFS nodes are connected.'}
        </span>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Overview</h1>
          <p className="page-subtitle">Northstar Health Consortium · Blockchain Medical Record Infrastructure</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/audit')}>
            <Activity size={14} /> Audit Trail
          </button>
          <button className="btn btn-teal" onClick={() => navigate('/records')}>
            <Upload size={14} /> Upload Record
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-4 admin-overview-metrics" style={{ marginBottom: 24 }}>
        <MetricCard
          label="Total Patients" value={metrics.totalPatients}
          icon={Users} iconColor="#1d4ed8" iconBg="#dbeafe"
          trend="Across 4 organizations"
          onClick={() => navigate('/patients')}
        />
        <MetricCard
          label="Medical Records" value={metrics.totalRecords}
          icon={FileText} iconColor="#0d9488" iconBg="#d1fae5"
          trend={`${metrics.storageOffChain} MB encrypted off-chain`}
          onClick={() => navigate('/records')}
        />
        <MetricCard
          label="Pending Requests" value={metrics.pendingRequests}
          icon={Inbox} iconColor="#b45309" iconBg="#fef3c7"
          trend="Require attention"
          onClick={() => navigate('/access-requests')}
        />
        <MetricCard
          label="Active Consents" value={metrics.activeConsents}
          icon={Shield} iconColor="#7c3aed" iconBg="#ede9fe"
          trend="Patient-authorized grants"
          onClick={() => navigate('/consent')}
        />
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 20 }}>
        {/* Activity Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="section-title">Platform Activity</div>
              <div className="section-subtitle">Records uploaded, consents granted, and access requests — last 7 days</div>
            </div>
            <DemoBadge />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DEMO_ACTIVITY_TIMELINE} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRecords" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConsents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b45309" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 8 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="records" stroke="#0d9488" strokeWidth={2} fill="url(#colorRecords)" name="Records" />
              <Area type="monotone" dataKey="consents" stroke="#7c3aed" strokeWidth={2} fill="url(#colorConsents)" name="Consents" />
              <Area type="monotone" dataKey="requests" stroke="#b45309" strokeWidth={2} fill="url(#colorRequests)" name="Requests" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Storage Distribution */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="section-title">Storage Distribution</div>
              <div className="section-subtitle">On-chain vs. off-chain data</div>
            </div>
            <DemoBadge />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={storageData}
                cx="50%" cy="50%"
                innerRadius={45} outerRadius={70}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {storageData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any, name: any) => [`${(Number(v) / 1024).toFixed(2)} MB`, String(name)]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {storageData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{item.name}</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {item.value < 1024 ? `${item.value} KB` : `${(item.value / 1024).toFixed(1)} MB`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Recent Audit Events */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div className="section-title">Recent Audit Events</div>
              <div className="section-subtitle">Last recorded transactions</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit')}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ padding: '4px 0' }}>
            {recentEvents.map(evt => (
              <div
                key={evt.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-muted)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                onClick={() => navigate('/audit')}
              >
                <AuditOutcomeBadge outcome={evt.outcome} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {evt.actor}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {evt.eventType.replace(/_/g, ' ')} · {evt.actorOrg.split(' ')[0]}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  {format(new Date(evt.timestamp), 'MMM d, HH:mm')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Access Requests */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div className="section-title">Pending Access Requests</div>
              <div className="section-subtitle">Require your review</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/access-requests')}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          {pendingRequests.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
              <CheckCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div>No pending requests</div>
            </div>
          ) : (
            <div style={{ padding: '4px 0' }}>
              {pendingRequests.map(req => (
                <div
                  key={req.id}
                  style={{ padding: '12px 20px', cursor: 'pointer', transition: 'background 0.1s', borderBottom: '1px solid var(--color-border-subtle)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-muted)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  onClick={() => navigate('/access-requests')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {req.patientName}
                    </div>
                    <Badge variant="pending">Pending</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {req.requestingDoctor} · {req.requestingOrg.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {req.purpose}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Architecture Diagram + Network Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Architecture */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">System Architecture</div>
            <div className="section-subtitle">Data flow: patient/doctor → blockchain → encrypted IPFS storage</div>
          </div>
          <ArchitectureDiagram />
        </div>

        {/* Network Orgs */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="section-title">Consortium Organizations</div>
              <div className="section-subtitle">Hyperledger Fabric network members</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/network')}>
              Network <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {liveOrgs
              ? liveOrgs.map(org => (
                <div key={org} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: 'var(--color-surface-muted)', borderRadius: 8,
                  border: '1px solid var(--color-border)'
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: '#dcfce7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', flexShrink: 0
                  }}>
                    {org.replace('HospitalOrg', 'Org ')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {orgLabel(org)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{org}</div>
                  </div>
                  <Badge variant="success badge-sm">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 4 }} />
                    Live
                  </Badge>
                </div>
              ))
              : DEMO_ORGANIZATIONS.map(org => (
              <div key={org.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: 'var(--color-surface-muted)', borderRadius: 8,
                border: '1px solid var(--color-border)'
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: org.status === 'connected' ? '#dcfce7' : org.status === 'degraded' ? '#fef9c3' : '#fee2e2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', flexShrink: 0
                }}>
                  {org.shortName}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {org.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {org.mspId} · {org.peerCount} peers
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <Badge variant={`${org.status} badge-sm`}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 4 }} />
                    {org.status === 'connected' ? 'Demo' : org.status}
                  </Badge>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{org.location}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="alert alert-warning" style={{ marginTop: 12, fontSize: 11 }}>
            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{liveOrgs
              ? 'Organizations are read from the live Fabric channel membership.'
              : 'Network status shown is for demonstration only. No real Fabric peers are connected.'}</span>
          </div>
        </div>
      </div>

      {/* Recent Records */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <div className="section-title">Recent Record Uploads</div>
            <div className="section-subtitle">Latest medical records anchored to the ledger</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/records')}>
            All records <ArrowRight size={12} />
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Record</th>
              <th>Patient</th>
              <th>Category</th>
              <th>Organization</th>
              <th>Uploaded</th>
              <th>IPFS CID</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentRecords.map(rec => (
              <tr key={rec.id} onClick={() => navigate('/records')}>
                <td>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{rec.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{rec.fileType}</div>
                </td>
                <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{rec.patientName}</td>
                <td>
                  <Badge variant="indexed" className="badge-sm">
                    {rec.category.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{rec.uploadedByOrg.split(' ')[0]}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {format(new Date(rec.uploadedAt), 'MMM d, HH:mm')}
                </td>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {rec.ipfsCid ? `${rec.ipfsCid.slice(0, 16)}…` : '—'}
                    {rec.ipfsCid && <span style={{ marginLeft: 4, fontSize: 10, color: '#b45309' }}>[DEMO]</span>}
                  </span>
                </td>
                <td><Badge variant={rec.status}>{rec.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Overview;
