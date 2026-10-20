// End-to-end smoke test of the paper's core workflow (Section III-C steps 1-4).
import { buildNetwork } from '../server/network.js';

const app = buildNetwork({ blockCutMs: 10 });
const HOUR = 3600_000;

async function main() {
  // identities across two hospitals
  await app.registerPatient({ patientId: 'PAT-0001', name: 'Aarav Sharma', age: 54, gender: 'M', org: 'HospitalOrg1' });
  await app.registerProvider({ providerId: 'PROV-001', name: 'Dr Meera Nair', role: 'specialist', org: 'HospitalOrg1', department: 'Cardiology', specialty: 'cardiology' });
  await app.registerProvider({ providerId: 'PROV-002', name: 'Dr Rahul Das', role: 'resident', org: 'HospitalOrg2', department: 'Emergency', specialty: 'general' });

  // steps 1-2: encrypt + IPFS upload + on-chain hash anchor
  const up = await app.uploadRecord({
    patientId: 'PAT-0001', recordType: 'discharge-summary',
    metadata: { icd10: 'I21.9', encounterDate: '2025-06-12' },
    payload: { diagnosis: 'Acute myocardial infarction', notes: 'Stent placed in LAD. Discharged stable.', doctor: 'Dr Meera Nair' },
  });
  console.log('uploaded:', up.recordId, '| cid:', up.ipfsCid, '| hash:', up.contentHash.slice(0, 16) + '…');
  if (!up.ipfsCid.startsWith('Qm')) throw new Error('CIDv0 format invalid');

  // step 3: patient grants time-bound consent to PROV-001
  const c = await app.grantConsent({
    patientId: 'PAT-0001', recordId: up.recordId, granteeId: 'PROV-001',
    purposes: ['treatment'], conditions: { department: 'Cardiology', minRole: 'physician' },
    validUntil: Date.now() + HOUR,
  });
  console.log('consent granted:', c.consentId);

  const ok = await app.requestAccess({ providerId: 'PROV-001', recordId: up.recordId, purpose: 'treatment' });
  console.log('authorized access:', ok.granted ? 'GRANT' : 'DENY', '|', ok.reason, '| hash-verified:', ok.verifiedHash, '| dx:', ok.decrypted?.diagnosis);
  if (!ok.granted || !ok.verifiedHash) throw new Error('authorized access failed');

  const deny = await app.requestAccess({ providerId: 'PROV-002', recordId: up.recordId, purpose: 'treatment' });
  console.log('cross-org access:', deny.granted ? 'GRANT' : 'DENY', '|', deny.reason);
  if (deny.granted) throw new Error('ABAC failed: unauthorized grant');

  const wp = await app.requestAccess({ providerId: 'PROV-001', recordId: up.recordId, purpose: 'marketing' });
  console.log('wrong purpose:', wp.granted ? 'GRANT' : 'DENY', '|', wp.reason);
  if (wp.granted) throw new Error('purpose limitation failed');

  await app.revokeConsent({ patientId: 'PAT-0001', consentId: c.consentId });
  const after = await app.requestAccess({ providerId: 'PROV-001', recordId: up.recordId, purpose: 'treatment' });
  console.log('after revoke:', after.granted ? 'GRANT' : 'DENY', '|', after.reason);
  if (after.granted) throw new Error('revocation failed');

  const em = await app.requestAccess({
    providerId: 'PROV-002', recordId: up.recordId, purpose: 'emergency',
    emergency: true, justification: 'Unconscious patient in ER, needs cardiac history immediately',
  });
  console.log('emergency:', em.granted ? 'GRANT' : 'DENY', '|', em.reason, '| valid for', Math.round((em.accessValidUntil - Date.now()) / 60000), 'min');
  if (!em.granted) throw new Error('emergency override failed');

  const audit = await app.auditTrail({ recordId: up.recordId });
  console.log('audit events:', audit.length, '→', audit.map((a) => a.decision).join(','));
  console.log('storage:', JSON.stringify(app.storageStat()));
  console.log('\nSMOKE TEST PASSED');
}

main().catch((e) => { console.error('SMOKE TEST FAILED:', e); process.exit(1); });
