// Application layer wiring (paper Section III-C/D): connects the patient/provider
// interface, the Fabric-style network + ABAC chaincode, and IPFS storage into
// the workflow: (1) encrypt + upload to IPFS, (2) anchor hash on-chain,
// (3) ABAC-checked access request with time-limited key release, (4) audit log.
import { FabricNetwork } from './ledger/fabric-sim.js';
import { MedRecChaincode } from './chaincode/medrec.js';
import { IPFSStore } from './storage/ipfs.js';
import {
  generateIdentity, encryptContent, decryptContent,
  wrapKey, unwrapKey, sha256,
} from './crypto/keys.js';
import crypto from 'node:crypto';

export const ORGANIZATIONS = ['HospitalOrg1', 'HospitalOrg2', 'HospitalOrg3'];

export function buildNetwork(opts = {}) {
  const network = new FabricNetwork({
    organizations: ORGANIZATIONS,
    endorsements: opts.endorsements ?? 2,
    blockSizeMax: opts.blockSizeMax ?? 10,
    blockCutMs: opts.blockCutMs ?? 50,
    payloadCostMsPerKB: opts.payloadCostMsPerKB ?? 0,
  });
  const chaincode = new MedRecChaincode({ now: opts.now, strictPolicy: opts.strictPolicy ?? true });
  network.registerChaincode(chaincode);
  const ipfs = new IPFSStore();
  const identities = new Map(); // id -> RSA identity (app-layer "wallet")
  const dekVault = new Map();   // recordId -> { dekWrappedForPatient, iv, tag } (patient key vault)
  const state = { txCounter: 0 };

  const app = {
    network, chaincode, ipfs, identities, dekVault, ORGANIZATIONS,
    storageMode: opts.storageMode ?? 'ipfs', // 'onchain' = baseline: full encrypted content on the ledger

    nextTxId(prefix) {
      state.txCounter++;
      return `${prefix}-${state.txCounter}-${crypto.randomBytes(4).toString('hex')}`;
    },

    submit(fn, args, actorMSP = null) {
      return network.submitTransaction({ fn, args, actorMSP });
    },

    /** Register identities: keys stay off-chain, attributes go on-chain. */
    async registerPatient({ patientId, name, age, gender, org }) {
      const id = generateIdentity({ id: patientId, name, role: 'patient', org, department: 'patient' });
      identities.set(patientId, id);
      const res = await this.submit('RegisterPatient', [{ patientId, name, age, gender, org }], org);
      return { ...res.result, identity: publicOnly(id) };
    },

    async registerProvider({ providerId, name, role, org, department, specialty }) {
      const id = generateIdentity({ id: providerId, name, role, org, department, specialty });
      identities.set(providerId, id);
      const res = await this.submit('RegisterProvider', [{ providerId, role, org, department, specialty, name }], org);
      return { ...res.result, identity: publicOnly(id) };
    },

    /**
     * Steps (1)+(2): encrypt record with a fresh DEK (AES-256-GCM), push the
     * ciphertext to IPFS, anchor only {cid, sha256, de-identified metadata}
     * on-chain. The patient keeps the DEK wrapped to their own public key.
     */
    async uploadRecord({ patientId, recordType, metadata, payload, doctorId }) {
      const patient = identities.get(patientId);
      if (!patient) throw new Error(`unknown patient ${patientId}`);
      const recordId = this.nextTxId('REC');
      const plaintext = Buffer.from(JSON.stringify(payload));
      const { dek, iv, tag, ciphertext } = encryptContent(plaintext);
      const dekWrappedForPatient = wrapKey(dek, patient.publicKeyPem).toString('base64');
      let cid = null;
      let size = ciphertext.length;
      let metadataExtra = {};
      if (this.storageMode === 'onchain') {
        // On-chain-only baseline: the full encrypted record goes into ledger state.
        metadataExtra = { content: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64') };
        size = ciphertext.length * 1.37; // base64 expansion on the ledger
      } else {
        ({ cid, size } = await this.ipfs.add(ciphertext));
      }
      const contentHash = sha256(plaintext);
      dekVault.set(recordId, { dekWrappedForPatient, iv: iv.toString('base64'), tag: tag.toString('base64') });
      const res = await this.submit('UploadRecord', [{
        recordId, patientId, ipfsCid: cid ?? `onchain:${recordId}`, contentHash, recordType,
        doctorId: doctorId || null,
        metadata: { ...metadata, cipher: 'AES-256-GCM', encSize: size, ...metadataExtra },
      }], patient.org);
      return {
        recordId, ipfsCid: cid, contentHash, ciphertextBytes: size,
        dekWrappedForPatient, txId: res.txId, latencyMs: res.endToEndMs,
      };
    },

    /**
     * Patient grants time-bound consent: wrap the record DEK to the grantee's
     * public key + persist ABAC conditions on-chain (purposes, org, department,
     * minRole, specialty, validity window) — the consent contract of Section III-C.
     */
    async grantConsent({ patientId, recordId, granteeId, purposes, conditions = {}, validUntil }) {
      const patient = identities.get(patientId);
      const grantee = identities.get(granteeId);
      if (!patient || !grantee) throw new Error('unknown patient or grantee');
      const vaultEntry = dekVault.get(recordId);
      if (!vaultEntry) throw new Error(`no DEK in patient vault for ${recordId}`);
      const dek = unwrapKey(vaultEntry.dekWrappedForPatient, patient.privateKeyPem);
      const wrappedKeyB64 = wrapKey(dek, grantee.publicKeyPem).toString('base64');
      const consentId = this.nextTxId('CNS');
      const res = await this.submit('GrantConsent', [{
        consentId, patientId, recordId, granteeId,
        purposes, conditions, validFrom: Date.now(), validUntil, wrappedKeyB64,
      }], patient.org);
      return { consentId, granted: true, txId: res.txId, latencyMs: res.endToEndMs };
    },

    async revokeConsent({ patientId, consentId }) {
      const res = await this.submit('RevokeConsent', [{ consentId, patientId }]);
      return { ...res.result, txId: res.txId, latencyMs: res.endToEndMs };
    },

    /**
     * Step (3): provider requests access. Chaincode evaluates the ABAC policy
     * (attributes, purposes, revocation, time window, emergency override) and —
     * only if granted — releases the wrapped DEK; the provider then fetches the
     * ciphertext from IPFS, verifies the on-chain hash, and decrypts end-to-end.
     */
    async requestAccess({ providerId, recordId, purpose, emergency = false, justification = '' }) {
      const provider = identities.get(providerId);
      if (!provider) throw new Error(`unknown provider ${providerId}`);
      const accessId = this.nextTxId('ACC');
      const res = await this.submit(
        'RequestAccess',
        [{ accessId, providerId, recordId, purpose, emergency, justification }],
        provider.org
      );
      const out = { ...res.result, accessId, txId: res.txId, latencyMs: res.endToEndMs };

      // Fetch off-chain (or on-chain baseline) content, verify integrity, decrypt.
      if (out.granted && out.record) {
        let ciphertext;
        if (this.storageMode === 'onchain') {
          const raw = network.worldState.get(`record:${recordId}`);
          const rec = raw ? JSON.parse(raw) : null;
          ciphertext = rec?.metadata?.content ? Buffer.from(rec.metadata.content, 'base64') : null;
        } else {
          ciphertext = await this.ipfs.cat(out.record.ipfsCid);
        }
        const vaultEntry = dekVault.get(recordId) || {};
        if (out.wrappedKeyB64 && ciphertext) {
          try {
            const dek = unwrapKey(out.wrappedKeyB64, provider.privateKeyPem);
            const plaintext = decryptContent({
              dek, iv: vaultEntry.iv, tag: vaultEntry.tag, ciphertext: ciphertext.toString('base64'),
            });
            out.verifiedHash = sha256(plaintext) === out.record.contentHash;
            out.decrypted = JSON.parse(plaintext.toString());
          } catch (e) {
            out.verifiedHash = false;
            out.decrypted = null;
            out.decryptError = String(e.message || e);
          }
        }
      }
      return out;
    },

    async auditTrail(filter = {}) {
      return (await this.submit('ListAudit', [filter])).result;
    },
    async listRecords(filter = {}) {
      return (await this.submit('ListRecords', [filter])).result;
    },
    async listConsents(filter = {}) {
      return (await this.submit('ListConsents', [filter])).result;
    },
    async listPatients() {
      return (await this.submit('ListPatients', [])).result;
    },
    async listProviders() {
      return (await this.submit('ListProviders', [])).result;
    },
    /** Ledger + IPFS storage distribution (Table III). */
    storageStat() {
      return { ledger: network.storageStat(), ipfs: ipfs.stat() };
    },
  };

  return app;
}

function publicOnly(id) {
  const { privateKeyPem, ...rest } = id;
  void privateKeyPem;
  return rest;
}
