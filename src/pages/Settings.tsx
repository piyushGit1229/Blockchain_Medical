// ============================================================
// MediLedger — Platform & Cryptographic Settings
// ============================================================

import React, { useState } from 'react';
import {
  Server, Database, Key,
  Save, Copy, UserCheck
} from 'lucide-react';
import { DEMO_CURRENT_USER } from '../data/demo';
import { DemoBadge, showToast } from '../components/ui';

export const Settings: React.FC = () => {
  // Fabric Settings
  const [channelName, setChannelName] = useState('mediledger-channel');
  const [peerEndpoint, setPeerEndpoint] = useState('grpcs://peer0.org1.mediledger.io:7051');
  const [caEndpoint, setCaEndpoint] = useState('https://ca.org1.mediledger.io:7054');
  const [mspId, setMspId] = useState('MountSinaiMSP');

  // IPFS Settings
  const [ipfsGateway, setIpfsGateway] = useState('https://ipfs.mediledger.io/ipfs/');
  const [ipfsApiUrl, setIpfsApiUrl] = useState('http://127.0.0.1:5001/api/v0');
  const [ipfsPinningKey, setIpfsPinningKey] = useState('pk_live_sec_9981240182390123');

  // Security & Crypto Settings
  const [kmsType, setKmsType] = useState('pkcs11');
  const [signAlgo, setSignAlgo] = useState('ecdsa-secp256k1');
  const [fileCipher, setFileCipher] = useState('aes-256-gcm');
  const [retentionYears, setRetentionYears] = useState('7');

  // UI preferences
  const [compactTables, setCompactTables] = useState(false);
  const [auditAlerts, setAuditAlerts] = useState(true);

  const handleSave = () => {
    showToast('Platform configuration saved successfully', 'success');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`, 'info');
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Platform Settings & Cryptography
            </h1>
            <DemoBadge />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Consortium node configuration, IPFS cluster endpoints, and MSP cryptographic certificates
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Save size={15} />
          Save Configuration
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* User Certificate Card */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <UserCheck size={18} style={{ color: 'var(--color-teal)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                Active Operator Identity & X.509 Certificate
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Enrolled via Mount Sinai Certificate Authority (CA)
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, background: 'var(--color-bg)', padding: 14, borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Common Name (CN)</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{DEMO_CURRENT_USER.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Role & Organization</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {DEMO_CURRENT_USER.role.toUpperCase()} — {DEMO_CURRENT_USER.organization.name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Membership Service Provider</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {DEMO_CURRENT_USER.organization.mspId}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Certificate Validity</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>Valid until Dec 2027</div>
            </div>
          </div>
        </div>

        {/* Hyperledger Fabric Settings */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Server size={18} style={{ color: '#2563eb' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                Hyperledger Fabric Peer Connection
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                gRPC and channel connection parameters
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Primary Channel Name
              </label>
              <input
                className="input"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Organization MSP ID
              </label>
              <input
                className="input"
                value={mspId}
                onChange={(e) => setMspId(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Endorsing Peer gRPCs URL
              </label>
              <input
                className="input"
                value={peerEndpoint}
                onChange={(e) => setPeerEndpoint(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Fabric CA Server URL
              </label>
              <input
                className="input"
                value={caEndpoint}
                onChange={(e) => setCaEndpoint(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* IPFS Cluster Settings */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Database size={18} style={{ color: '#0d9488' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                IPFS Decentralized Storage Cluster
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Off-chain encrypted payload storage nodes and pinning service
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Dedicated IPFS Gateway URL
              </label>
              <input
                className="input"
                value={ipfsGateway}
                onChange={(e) => setIpfsGateway(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Local IPFS Node API Endpoint
              </label>
              <input
                className="input"
                value={ipfsApiUrl}
                onChange={(e) => setIpfsApiUrl(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Consortium Cluster Pinning Secret Key
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  className="input"
                  style={{ flex: 1 }}
                  value={ipfsPinningKey}
                  onChange={(e) => setIpfsPinningKey(e.target.value)}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => copyToClipboard(ipfsPinningKey, 'IPFS key')}
                  title="Copy secret"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Management & Compliance */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Key size={18} style={{ color: '#9333ea' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                Key Management & Compliance Parameters
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Hardware security modules and statutory data retention
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Key Storage Architecture
              </label>
              <select
                className="input"
                value={kmsType}
                onChange={(e) => setKmsType(e.target.value)}
              >
                <option value="pkcs11">Hardware Security Module (PKCS#11 / HSM Level 3)</option>
                <option value="software">Software Keystore (AES-256 encrypted)</option>
                <option value="cloud">Cloud KMS (AWS / GCP KMS Vault)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                Digital Signature Algorithm
              </label>
              <select
                className="input"
                value={signAlgo}
                onChange={(e) => setSignAlgo(e.target.value)}
              >
                <option value="ecdsa-secp256k1">ECDSA with secp256k1 Curve</option>
                <option value="ecdsa-secp384r1">ECDSA with NIST P-384 Curve</option>
                <option value="ed25519">Ed25519 High-Speed Signatures</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                File Encryption Cipher
              </label>
              <select
                className="input"
                value={fileCipher}
                onChange={(e) => setFileCipher(e.target.value)}
              >
                <option value="aes-256-gcm">AES-256-GCM (Authenticated Encryption)</option>
                <option value="chacha20-poly1305">ChaCha20-Poly1305</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                HIPAA Statutory Ledger Retention (Years)
              </label>
              <input
                type="number"
                className="input"
                value={retentionYears}
                onChange={(e) => setRetentionYears(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Display & Notification Preferences */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 14 }}>
            Interface & Notification Preferences
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={compactTables}
                onChange={(e) => setCompactTables(e.target.checked)}
              />
              <span>Compact table rows (high information density for clinical workflows)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={auditAlerts}
                onChange={(e) => setAuditAlerts(e.target.checked)}
              />
              <span>Real-time audio alert when a DENY or Break-Glass audit event occurs</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
