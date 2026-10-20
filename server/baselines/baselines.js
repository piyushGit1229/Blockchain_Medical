// Baseline configurations for comparison (paper Section IV-C):
//  (1) Centralized cloud EHR — no blockchain, role-based ACL only [4][15]
//  (2) Public Ethereum-like — permissionless, gas/latency model, weak contract [19]
//  (3) On-chain-only Fabric — full encrypted records on the ledger [7]
import { buildNetwork } from '../network.js';
import { generateIdentity } from '../crypto/keys.js';
import crypto from 'node:crypto';

// Simulated permissionless-chain parameters (documented assumptions, cf. [19]):
export const ETH_SIM = { blockTimeMs: 350, gasPerTx: 101_000, gasPerBlock: 3_000_000 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- (1) central
export class CentralizedEHR {
  constructor() {
    this.db = new Map(); // recordId -> record (plaintext, operator-controlled)
    this.identities = new Map();
  }

  async registerPatient(p) {
    this.identities.set(p.patientId, generateIdentity({ id: p.patientId, name: p.name, role: 'patient', org: p.org }));
    return { patientId: p.patientId, registered: true };
  }

  async registerProvider(p) {
    this.identities.set(p.providerId, generateIdentity({ id: p.providerId, name: p.name, role: p.role, org: p.org, department: p.department, specialty: p.specialty }));
    return { providerId: p.providerId, registered: true };
  }

  /** Direct write to the hospital database — no consensus, no anchors. */
  async uploadRecord({ patientId, recordType, metadata, payload }) {
    const t0 = performance.now();
    const recordId = `CEN-${crypto.randomBytes(6).toString('hex')}`;
    this.db.set(recordId, { recordId, patientId, recordType, metadata, content: Buffer.from(JSON.stringify(payload)).toString('base64') });
    return { recordId, latencyMs: performance.now() - t0 };
  }

  /** Coarse role-based ACL: any clinician may read — no consent/purpose/time checks. */
  async requestAccess({ providerId, recordId }) {
    const t0 = performance.now();
    const provider = this.identities.get(providerId);
    const rec = this.db.get(recordId);
    const granted = !!(provider && rec && ['nurse', 'resident', 'physician', 'specialist', 'surgeon'].includes(provider.role));
    return { granted, reason: granted ? 'GRANT: role-based ACL' : 'DENY: unknown subject', latencyMs: performance.now() - t0 };
  }

  storageStat() {
    let bytes = 0;
    for (const r of this.db.values()) bytes += Buffer.byteLength(JSON.stringify(r));
    return { ledger: { onChainBytes: 0, txCount: this.db.size, note: 'all storage operator-side' }, ipfs: { blocks: 0, bytes: 0 }, dbBytes: bytes };
  }
}

// ------------------------------------------------------- (2) public Ethereum
export class PublicEthereumSim {
  constructor() {
    this.chain = []; // simulated blocks
    this.identities = new Map();
    this.consents = new Map();
    this.txCount = 0;
    this.pendingInBlock = 0;
  }

  async registerPatient(p) {
    this.identities.set(p.patientId, generateIdentity({ id: p.patientId, name: p.name, role: 'patient', org: p.org }));
    return { patientId: p.patientId, registered: true };
  }

  async registerProvider(p) {
    this.identities.set(p.providerId, generateIdentity({ id: p.providerId, name: p.name, role: p.role, org: p.org, department: p.department, specialty: p.specialty }));
    return { providerId: p.providerId, registered: true };
  }

  /** Pay gas + wait for block inclusion: writes the full record into calldata. */
  async uploadRecord({ patientId, recordType, metadata, payload }) {
    const t0 = performance.now();
    const recordId = `0x${crypto.randomBytes(16).toString('hex')}`;
    const calldata = JSON.stringify({ recordId, patientId, recordType, metadata, payload });
    await this._mineTx(calldata.length);
    this.consents.set(recordId, { patientId, granted: true });
    return { recordId, latencyMs: performance.now() - t0, gasUsed: ETH_SIM.gasPerTx, calldataBytes: calldata.length };
  }

  /**
   * Solidity-style contract check: only verifies the record is registered to
   * the patient — no purpose, time-window, revocation, or attribute logic.
   */
  async requestAccess({ providerId, recordId, purpose }) {
    void purpose;
    const t0 = performance.now();
    const provider = this.identities.get(providerId);
    await this._mineTx(2200);
    const c = this.consents.get(recordId);
    const granted = !!(provider && c && c.granted);
    return { granted, reason: granted ? 'GRANT: contract mapping lookup' : 'DENY', latencyMs: performance.now() - t0 };
  }

  async _mineTx(bytes) {
    // Larger calldata occupies more block space (throughput penalty).
    const base = ETH_SIM.blockTimeMs * (0.5 + Math.random());
    const sizePenalty = (bytes / 1024) * 3;
    this.txCount++;
    this.pendingInBlock++;
    if (this.pendingInBlock * ETH_SIM.gasPerTx >= ETH_SIM.gasPerBlock) {
      this.chain.push({ number: this.chain.length, txs: this.pendingInBlock });
      this.pendingInBlock = 0;
    }
    await sleep(base + sizePenalty);
  }

  storageStat() {
    let bytes = 0;
    for (const c of this.consents.values()) bytes += Buffer.byteLength(JSON.stringify(c));
    return { ledger: { onChainBytes: bytes + this.txCount * 1200, txCount: this.txCount, blocks: this.chain.length }, ipfs: { blocks: 0, bytes: 0 } };
  }
}

// ------------------------------------------------- (3) on-chain-only Fabric
export function buildOnChainOnlyNetwork(opts = {}) {
  // Same ABAC chaincode, but full encrypted record content is committed to the
  // ledger; payloadCostMsPerKB models validation/ordering cost of large writes [7].
  return buildNetwork({ storageMode: 'onchain', payloadCostMsPerKB: opts.payloadCostMsPerKB ?? 2.5, endorsements: 2, ...opts });
}

// ------------------------------------------------------- (4) proposed system
export function buildProposedNetwork(opts = {}) {
  return buildNetwork({ storageMode: 'ipfs', strictPolicy: true, ...opts });
}
