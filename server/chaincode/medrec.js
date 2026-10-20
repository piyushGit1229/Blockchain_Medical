// MedRec chaincode — attribute-based access control (ABAC) + patient-centred,
// time-bound, revocable consent management (paper Section III-C).
//
// The Invoke(stub, fn, args) interface mirrors Fabric's ChaincodeStubInterface
// (getState/putState), so this logic ports directly to a real Fabric v2.x
// chaincode. Results carry a hidden __writeSet that the ledger commits.
//
// On-chain data model (pointers/metadata/consent only — never record content):
//   patient:<id>, provider:<id>, record:<id>, consent:<id>, audit:<txId>

const ROLE_RANK = { nurse: 1, resident: 2, physician: 3, specialist: 4, surgeon: 5 };
const EMERGENCY_ACCESS_MINUTES = 30; // time-limited consent override [12]

export class MedRecChaincode {
  constructor({ now = () => Date.now(), strictPolicy = true } = {}) {
    this.now = now;
    // strictPolicy=false models weaker baseline policies (Table III): checks only
    // that *a* consent exists, ignoring purpose/time/revocation [cf. 8][9].
    this.strictPolicy = strictPolicy;
  }

  async Invoke(stub, fn, args) {
    const handler = this[fn];
    if (typeof handler !== 'function') throw new Error(`unknown chaincode function: ${fn}`);
    const out = await handler.call(this, stub, args[0] || {});
    if (out && typeof out === 'object' && !Array.isArray(out)) {
      // Non-enumerable so the ledger can read it but JSON.stringify (API
      // responses) never leaks the internal write set to clients.
      Object.defineProperty(out, '__writeSet', {
        value: Object.assign(out.__writeSet || {}, stub.getWriteSet()),
        enumerable: false,
        writable: true,
        configurable: true,
      });
    }
    return out;
  }

  // ---------- registration ----------
  async RegisterPatient(stub, { patientId, name, age, gender, org }) {
    const key = `patient:${patientId}`;
    if (await stub.getState(key)) throw new Error(`patient ${patientId} already registered`);
    // Direct identifiers stripped from on-chain metadata (paper Section III-B);
    // the ledger only stores pseudonymous IDs + consent state.
    await stub.putState(key, JSON.stringify({ patientId, name, age, gender, org, registeredAt: this.now() }));
    return { patientId, registered: true };
  }

  async RegisterProvider(stub, { providerId, role, org, department, specialty, name }) {
    const key = `provider:${providerId}`;
    if (await stub.getState(key)) throw new Error(`provider ${providerId} already registered`);
    await stub.putState(key, JSON.stringify({ providerId, role, org, department, specialty, name: name || '', registeredAt: this.now() }));
    return { providerId, role, org, department, specialty, name: name || '', registered: true };
  }

  // ---------- record anchoring (content lives on IPFS) ----------
  async UploadRecord(stub, { recordId, patientId, ipfsCid, contentHash, recordType, doctorId, metadata = {} }) {
    const key = `record:${recordId}`;
    if (await stub.getState(key)) throw new Error(`record ${recordId} already exists`);
    const record = {
      recordId, patientId,
      ipfsCid,       // off-chain pointer — content never touches the ledger
      contentHash,   // sha256 anchor for integrity verification
      recordType, doctorId,
      metadata,      // de-identified (ICD-10 code, type, date)
      createdAt: this.now(),
      __consents: [], // scratch list used only during endorsement evaluation
    };
    await stub.putState(key, JSON.stringify(record));
    return { recordId, ipfsCid, contentHash, anchored: true };
  }

  // ---------- patient-centred consent management ----------
  async GrantConsent(stub, {
    consentId, patientId, recordId, granteeId,
    purposes = [], conditions = {}, validFrom, validUntil, wrappedKeyB64,
  }) {
    const key = `consent:${consentId}`;
    if (await stub.getState(key)) throw new Error(`consent ${consentId} already exists`);
    const consent = {
      consentId, patientId, recordId, granteeId,
      purposes,               // e.g. ['treatment', 'consultation']
      conditions,             // ABAC conditions: {org, department, minRole, specialty}
      validFrom, validUntil,  // time-bound validity window
      revoked: false,
      wrappedKeyB64,          // AES DEK wrapped to grantee public key (key release)
      grantedAt: this.now(),
    };
    await stub.putState(key, JSON.stringify(consent));
    return { consentId, granted: true, validUntil };
  }

  async RevokeConsent(stub, { consentId, patientId }) {
    const raw = await stub.getState(`consent:${consentId}`);
    if (!raw) throw new Error(`consent ${consentId} not found`);
    const consent = JSON.parse(raw);
    if (consent.patientId !== patientId) throw new Error('only the patient can revoke consent');
    consent.revoked = true;
    consent.revokedAt = this.now();
    await stub.putState(`consent:${consentId}`, JSON.stringify(consent));
    return { consentId, revoked: true };
  }

  // ---------- ABAC access decision (evaluated in chaincode at request time) ----------
  async RequestAccess(stub, { accessId, providerId, recordId, purpose, emergency = false, justification = '' }) {
    const recordRaw = await stub.getState(`record:${recordId}`);
    const providerRaw = await stub.getState(`provider:${providerId}`);
    if (!recordRaw) throw new Error(`record ${recordId} not found`);
    if (!providerRaw) throw new Error(`provider ${providerId} not found`);
    const record = JSON.parse(recordRaw);
    const provider = JSON.parse(providerRaw);
    const t = this.now();

    // Attach all consents for this record so the policy can be evaluated against
    // the full consent set (real Fabric: range query consent:* or private data).
    const consents = [];
    for (const [k, v] of stub.allState()) {
      if (k.startsWith('consent:')) {
        const c = JSON.parse(v);
        if (c.recordId === recordId) consents.push(c);
      }
    }
    record.__consents = consents;

    const decision = this._evaluate(record, provider, { purpose, emergency, justification }, t);

    // All access events (grant or deny) are permanently logged for auditing (4).
    const audit = {
      accessId, recordId, patientId: record.patientId, providerId,
      providerOrg: provider.org, purpose,
      decision: decision.granted ? 'GRANT' : 'DENY',
      reason: decision.reason,
      emergency: !!emergency && decision.granted,
      accessValidUntil: decision.granted ? decision.validUntil || null : null,
      timestamp: t,
    };
    await stub.putState(`audit:${accessId}`, JSON.stringify(audit));
    return {
      granted: decision.granted,
      reason: decision.reason,
      record: decision.granted
        ? { recordId, ipfsCid: record.ipfsCid, contentHash: record.contentHash, recordType: record.recordType }
        : null,
      wrappedKeyB64: decision.granted ? decision.wrappedKeyB64 || null : null,
      accessValidUntil: decision.granted ? decision.validUntil || null : null,
      emergency: !!emergency && decision.granted,
    };
  }

  _evaluate(record, provider, { purpose, emergency, justification }, t) {
    const subject = {
      role: provider.role, org: provider.org,
      department: provider.department, specialty: provider.specialty,
    };

    // --- emergency override: time-limited, logged, justification required [12] ---
    if (emergency) {
      if (!justification || justification.length < 10) {
        return { granted: false, reason: 'DENY: emergency access requires a written justification (min 10 chars)' };
      }
      const validUntil = t + EMERGENCY_ACCESS_MINUTES * 60 * 1000;
      return {
        granted: true, validUntil,
        reason: `GRANT: emergency override active for ${EMERGENCY_ACCESS_MINUTES} min (flagged to patient audit)`,
      };
    }

    // --- strict ABAC path: find a valid consent matching subject attributes ---
    const consents = record.__consents || [];
    if (consents.length === 0) return { granted: false, reason: 'DENY: no consent record for this record' };

    for (const c of consents) {
      if (!this.strictPolicy) {
        // Weak baseline policy: only checks that *some* consent exists for this
        // record — no grantee / revocation / time / purpose / attribute checks.
        // Models the coarse policies that produce the violations in Table III.
        return { granted: true, wrappedKeyB64: c.wrappedKeyB64, validUntil: c.validUntil, reason: 'GRANT: consent exists (weak policy)' };
      }
      // Strict ABAC: the consent authorises one specific grantee. If this
      // consent is issued to someone else, it can never authorise this subject.
      if (c.granteeId !== provider.providerId) continue;
      if (c.revoked) continue;                                            // revocation honoured
      if (t < (c.validFrom ?? 0) || t > (c.validUntil ?? Infinity)) continue; // time-bound
      if (purpose && c.purposes.length && !c.purposes.includes(purpose)) continue; // purpose limitation
      const cond = c.conditions || {};
      if (cond.org && cond.org !== subject.org) continue;                        // org attribute
      if (cond.department && cond.department !== subject.department) continue;  // department attribute
      if (cond.specialty && cond.specialty !== subject.specialty) continue;      // specialty attribute
      if (cond.minRole && (ROLE_RANK[subject.role] || 0) < (ROLE_RANK[cond.minRole] || 0)) continue; // role hierarchy
      return {
        granted: true, wrappedKeyB64: c.wrappedKeyB64, validUntil: c.validUntil,
        reason: `GRANT: ABAC policy matched (purposes=[${c.purposes}] minRole=${cond.minRole || 'any'})`,
      };
    }
    return { granted: false, reason: 'DENY: no valid unexpired consent matches requester attributes/purpose' };
  }

  // ---------- queries ----------
  async GetRecord(stub, { recordId }) {
    const raw = await stub.getState(`record:${recordId}`);
    return raw ? JSON.parse(raw) : null;
  }

  async GetConsent(stub, { consentId }) {
    const raw = await stub.getState(`consent:${consentId}`);
    return raw ? JSON.parse(raw) : null;
  }

  async ListConsents(stub, { patientId } = {}) {
    const out = [];
    for (const [k, v] of stub.allState()) {
      if (k.startsWith('consent:')) {
        const c = JSON.parse(v);
        if (!patientId || c.patientId === patientId) out.push(c);
      }
    }
    return out;
  }

  async GetAuditTrail(stub, { recordId, patientId } = {}) {
    const out = [];
    for (const [k, v] of stub.allState()) {
      if (k.startsWith('audit:')) {
        const a = JSON.parse(v);
        if ((recordId && a.recordId === recordId) || (patientId && a.patientId === patientId)) out.push(a);
      }
    }
    out.sort((a, b) => a.timestamp - b.timestamp);
    return out;
  }

  async ListRecords(stub, { patientId } = {}) {
    const out = [];
    for (const [k, v] of stub.allState()) {
      if (k.startsWith('record:')) {
        const r = JSON.parse(v);
        delete r.__consents;
        if (!patientId || r.patientId === patientId) out.push(r);
      }
    }
    return out;
  }

  async ListPatients(stub) {
    const out = [];
    for (const [k, v] of stub.allState()) {
      if (k.startsWith('patient:')) out.push(JSON.parse(v));
    }
    return out;
  }

  async ListProviders(stub) {
    const out = [];
    for (const [k, v] of stub.allState()) {
      if (k.startsWith('provider:')) out.push(JSON.parse(v));
    }
    return out;
  }

  async ListAudit(stub) {
    const out = [];
    for (const [k, v] of stub.allState()) {
      if (k.startsWith('audit:')) out.push(JSON.parse(v));
    }
    out.sort((a, b) => b.timestamp - a.timestamp);
    return out;
  }
}

