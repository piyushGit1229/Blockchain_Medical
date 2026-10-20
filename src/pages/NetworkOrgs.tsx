// ============================================================
// MediLedger — Network & Organizations
// ============================================================

import React from 'react';
import {
  Server, Database, AlertTriangle, Activity,
  Building2, Globe
} from 'lucide-react';
import { DEMO_ORGANIZATIONS, DEMO_NETWORK_SERVICES } from '../data/demo';
import { DemoBadge, AlertBox } from '../components/ui';
import { format } from 'date-fns';
import type { ServiceStatus } from '../types';

const StatusDot: React.FC<{ status: ServiceStatus }> = ({ status }) => {
  const colors: Record<ServiceStatus, string> = {
    operational: '#16a34a',
    degraded: '#d97706',
    down: '#dc2626',
    unknown: '#94a3b8',
  };
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: colors[status], flexShrink: 0,
    }} />
  );
};

const ServiceRow: React.FC<{ service: typeof DEMO_NETWORK_SERVICES[0] }> = ({ service }) => {
  const typeLabels: Record<string, string> = {
    fabric_peer: 'Fabric Peer',
    fabric_orderer: 'Orderer',
    ipfs_node: 'IPFS Node',
    api: 'API Gateway',
    ca: 'Certificate Authority',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        {service.type === 'fabric_peer' ? <Server size={16} color="var(--color-text-muted)" /> :
         service.type === 'fabric_orderer' ? <Activity size={16} color="var(--color-text-muted)" /> :
         service.type === 'ipfs_node' ? <Database size={16} color="var(--color-text-muted)" /> :
         service.type === 'api' ? <Globe size={16} color="var(--color-text-muted)" /> :
         <Server size={16} color="var(--color-text-muted)" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{service.name}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {service.endpoint}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
        {typeLabels[service.type]}
      </div>
      {service.organization && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>
          {service.organization.split(' ')[0]}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <StatusDot status={service.status} />
        <span style={{ fontSize: 12, textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>
          {service.status}
        </span>
      </div>
    </div>
  );
};

// ── Network Topology Diagram ──────────────────────────────────
const TopologyDiagram: React.FC = () => {
  const orgs = DEMO_ORGANIZATIONS;

  return (
    <div style={{ padding: 20 }}>
      {/* Orderer in center top */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{
          padding: '10px 20px', border: '1px solid var(--color-border)',
          borderRadius: 8, background: '#f5f3ff', fontSize: 12, fontWeight: 600,
          color: '#6d28d9', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <Activity size={14} color="#7c3aed" />
          Ordering Service (RAFT)
          <span style={{ fontSize: 10, color: '#b45309' }}>[Not connected · DEMO]</span>
        </div>
      </div>

      {/* Connecting line */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{ width: 1, height: 24, background: 'var(--color-border)' }} />
      </div>

      {/* Channel bar */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 20px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#1e40af', marginBottom: 12 }}>
        Fabric Channel: mediledger-channel
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div style={{ width: 1, height: 16, background: 'var(--color-border)' }} />
      </div>

      {/* Org Peers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {orgs.map(org => (
          <div key={org.id} style={{
            border: '1px solid var(--color-border)', borderRadius: 8,
            overflow: 'hidden', background: 'var(--color-surface)'
          }}>
            <div style={{
              padding: '8px 12px', borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-muted)', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <Building2 size={13} color="var(--color-text-muted)" />
              <span style={{ fontSize: 12, fontWeight: 700 }}>{org.shortName}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#b45309' }}>[DEMO]</span>
            </div>
            {Array.from({ length: org.peerCount }).map((_, i) => (
              <div key={i} style={{
                padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: i < org.peerCount - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                fontSize: 11, color: 'var(--color-text-secondary)'
              }}>
                <Server size={10} />
                peer{i}.{org.shortName.toLowerCase()}.net
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* IPFS */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
        <div style={{
          padding: '10px 20px', border: '1px solid #fde68a',
          borderRadius: 8, background: 'var(--color-amber-light)', fontSize: 12, fontWeight: 600,
          color: '#92400e', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <Database size={14} color="#b45309" />
          IPFS Network — Off-Chain Encrypted Storage
          <span style={{ fontSize: 10, color: '#b45309' }}>[Not connected · DEMO]</span>
        </div>
      </div>
    </div>
  );
};

// ── Network Page ──────────────────────────────────────────────
const NetworkOrgs: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Network & Organizations</h1>
          <p className="page-subtitle">
            Northstar Health Consortium · Hyperledger Fabric infrastructure · <DemoBadge />
          </p>
        </div>
      </div>

      <AlertBox variant="warning">
        <div>
          <strong>No live infrastructure connection.</strong> Network topology, peer status, block heights, and service indicators
          shown below are for demonstration only. Green/connected status does not reflect any actual running Hyperledger Fabric
          or IPFS infrastructure. All values are illustrative.
        </div>
      </AlertBox>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        {/* Organizations */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <div className="section-title">Consortium Members</div>
              <div className="section-subtitle">Registered organizations in the Fabric network</div>
            </div>
            {DEMO_ORGANIZATIONS.map(org => (
              <div key={org.id} style={{
                padding: '14px 20px', borderBottom: '1px solid var(--color-border-subtle)',
                display: 'flex', alignItems: 'center', gap: 14
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: '#1e40af', flexShrink: 0
                }}>
                  {org.shortName}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{org.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {org.mspId} · {org.location} · {org.peerCount} peers
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {org.endorsingPeer}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }} />
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Unknown</span>
                    <span style={{ fontSize: 10, color: '#b45309' }}>[DEMO]</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                    Joined {format(new Date(org.joinedAt), 'MMM yyyy')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Ledger Info */}
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <div className="section-title">Ledger Information</div>
              <div className="section-subtitle">Hyperledger Fabric channel status</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Channel Name', value: 'mediledger-channel', isLive: false },
                { label: 'Channel ID', value: 'mediledger-channel-v1', isLive: false },
                { label: 'Block Height', value: '—', isLive: true },
                { label: 'Latest Block Hash', value: '—', isLive: true },
                { label: 'Orderer Consensus', value: 'RAFT (3-node)', isLive: false },
                { label: 'Policy', value: 'MAJORITY endorsement', isLive: false },
              ].map(({ label, value, isLive }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                    {value}
                    {isLive && <span style={{ marginLeft: 6, fontSize: 10, color: '#b45309' }}>[Not connected]</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Topology Diagram */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <div className="section-title">Network Topology</div>
              <div className="section-subtitle">Fabric peer and IPFS connectivity diagram</div>
            </div>
            <TopologyDiagram />
          </div>

          {/* Service Health */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <div className="section-title">Service Status</div>
              <div className="section-subtitle">Infrastructure component health</div>
            </div>
            {DEMO_NETWORK_SERVICES.map((service, i) => (
              <ServiceRow key={i} service={service} />
            ))}
            <div style={{ padding: '10px 16px', background: 'var(--color-surface-muted)', borderTop: '1px solid var(--color-border)', fontSize: 11, color: '#b45309', display: 'flex', gap: 6, alignItems: 'center' }}>
              <AlertTriangle size={12} />
              All services shown as "Unknown" — no live infrastructure is connected in demo mode.
            </div>
          </div>
        </div>
      </div>

      {/* IPFS Info */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div className="section-title">IPFS Storage Layer</div>
          <div className="section-subtitle">Off-chain encrypted medical record storage</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            ['IPFS Node Endpoint', import.meta.env.VITE_IPFS_URL || 'ipfs.mediledger.net:5001 (DEMO)', 'endpoint'],
            ['Storage Used', '7.2 MB (DEMO)', 'storage'],
            ['Pinned Objects', `${DEMO_ORGANIZATIONS.reduce((a, o) => a + o.peerCount, 0) * 2} files (DEMO)`, 'files'],
            ['Encryption Standard', 'AES-256-GCM per record', 'encryption'],
            ['Key Management', 'Server-side (API-managed)', 'keys'],
            ['Pin Status', 'Managed by Pinata (DEMO)', 'pin'],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: '10px 14px', background: 'var(--color-surface-muted)', borderRadius: 8 }}>
              <div className="form-label">{label}</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
        <AlertBox variant="info" style={{ marginTop: 14 } as any}>
          Medical records are never stored on the Hyperledger Fabric ledger. Only the IPFS CID and content hash are anchored on-chain. The IPFS layer stores AES-256-GCM encrypted file blobs. Keys are managed server-side and never exposed to the frontend.
        </AlertBox>
      </div>
    </div>
  );
};

export default NetworkOrgs;
