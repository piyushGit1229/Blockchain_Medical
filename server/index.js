// REST API layer for the blockchain medical-record sharing prototype.
// Serves the React dashboard and exposes the paper's workflow operations:
// registration, IPFS+ledger record upload, ABAC consent management,
// access requests, audit trail, ledger explorer, storage stats, benchmarks.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildNetwork, ORGANIZATIONS } from './network.js';
import { generateDataset } from './data/dataset.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const HOUR = 3600_000;

const app = buildNetwork({ blockCutMs: 25 });
const api = express();
api.use(express.json({ limit: '2mb' }));

// ---------- demo seeding (Section IV: synthetic multi-institutional dataset) ----------
async function seedDemo() {
  const ds = generateDataset({ patients: 25, providers: 13, recordsPerPatient: 2, seed: 11 });
  for (const p of ds.patients) await app.registerPatient(p);
  for (const pr of ds.providers) await app.registerProvider(pr);
  const recordIds = [];
  for (const r of ds.records) {
    const out = await app.uploadRecord({
      patientId: r.patientId, recordType: r.recordType,
      metadata: r.metadata, payload: r.payload, doctorId: r.doctorId,
    });
    recordIds.push({ recordId: out.recordId, patientId: r.patientId });
  }
  // consents: valid, plus one revoked and one expired for demoing policy checks
  const prov = ds.providers;
  const consents = [];
  // Leave one record without a grant so the seeded demo includes a realistic
  // no-consent access denial while keeping consent totals within target.
  for (let i = 0; i < recordIds.length - 1; i++) {
    const { recordId, patientId } = recordIds[i];
    const grantee = prov[i % prov.length];
    const c = await app.grantConsent({
      patientId, recordId, granteeId: grantee.providerId,
      purposes: ['treatment'], conditions: { minRole: 'resident' },
      validUntil: Date.now() + HOUR,
    });
    consents.push({ consentId: c.consentId, patientId, recordId, granteeId: grantee.providerId, state: 'active' });
  }
  if (consents.length >= 3) {
    await app.revokeConsent({ patientId: consents[1].patientId, consentId: consents[1].consentId });
    consents[1].state = 'revoked';
    const expired = await app.grantConsent({
      patientId: consents[2].patientId, recordId: consents[2].recordId,
      granteeId: consents[2].granteeId, purposes: ['treatment'], conditions: {},
      validUntil: Date.now() - HOUR, // already expired
    });
    consents.push({ consentId: expired.consentId, patientId: consents[2].patientId, recordId: consents[2].recordId, granteeId: consents[2].granteeId, state: 'expired' });
  }
  app.network.flush();
  return { patients: ds.patients.length, providers: ds.providers.length, records: recordIds.length, consents: consents.length };
}

// ---------- helpers ----------
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => res.status(400).json({ error: String(e.message || e) }));

// ---------- system ----------
api.get('/api/status', (req, res) => {
  res.json({
    organizations: ORGANIZATIONS,
    channel: 'medchannel',
    chaincode: 'medrec',
    storage: app.storageStat(),
    blocks: app.network.blockchain.length,
    txCount: app.network.stats.txCount,
    endorsements: app.network.endorsements,
    blockCutMs: app.network.blockCutMs,
  });
});

// ---------- identities ----------
api.get('/api/patients', wrap(async (req, res) => res.json(await app.listPatients())));
api.get('/api/providers', wrap(async (req, res) => res.json(await app.listProviders())));
api.post('/api/patients', wrap(async (req, res) => res.json(await app.registerPatient(req.body))));
api.post('/api/providers', wrap(async (req, res) => res.json(await app.registerProvider(req.body))));

// ---------- records ----------
api.get('/api/records', wrap(async (req, res) => res.json(await app.listRecords(req.query.patientId ? { patientId: req.query.patientId } : {}))));
api.post('/api/records', wrap(async (req, res) => {
  const { patientId, recordType, metadata, payload, doctorId } = req.body;
  res.json(await app.uploadRecord({ patientId, recordType, metadata: metadata || {}, payload, doctorId }));
}));

// ---------- consents ----------
api.get('/api/consents', wrap(async (req, res) => res.json(await app.listConsents(req.query.patientId ? { patientId: req.query.patientId } : {}))));
api.post('/api/consents', wrap(async (req, res) => {
  const { patientId, recordId, granteeId, purposes, conditions, validUntil } = req.body;
  res.json(await app.grantConsent({
    patientId, recordId, granteeId,
    purposes: purposes || ['treatment'],
    conditions: conditions || {},
    validUntil: validUntil || Date.now() + HOUR,
  }));
}));
api.post('/api/consents/revoke', wrap(async (req, res) => {
  const { patientId, consentId } = req.body;
  res.json(await app.revokeConsent({ patientId, consentId }));
}));

// ---------- access requests (ABAC decision + optional decryption) ----------
api.post('/api/access', wrap(async (req, res) => {
  const { providerId, recordId, purpose, emergency, justification } = req.body;
  res.json(await app.requestAccess({
    providerId, recordId,
    purpose: purpose || 'treatment',
    emergency: !!emergency,
    justification: justification || '',
  }));
}));

// ---------- audit + ledger ----------
api.get('/api/audit', wrap(async (req, res) => {
  const filter = {};
  if (req.query.recordId) filter.recordId = req.query.recordId;
  if (req.query.patientId) filter.patientId = req.query.patientId;
  res.json(await app.auditTrail(filter));
}));
api.get('/api/ledger/blocks', (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit || '25', 10));
  const offset = parseInt(req.query.offset || '0', 10);
  res.json(app.network.getBlocks(limit, offset));
});
api.get('/api/ledger/storage', (req, res) => res.json(app.storageStat()));

// ---------- benchmark results ----------
api.get('/api/bench', (req, res) => {
  const file = path.join(__dirname, 'bench', 'results.json');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'no benchmark results yet — run npm run bench' });
  res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
});
api.post('/api/bench/rerun', (req, res) => {
  const child = spawn('node', [path.join(__dirname, 'bench', 'benchmark.js')], { detached: true, stdio: 'ignore' });
  child.unref();
  res.json({ started: true, pid: child.pid });
});

// ---------- start ----------
const demo = await seedDemo();
console.log(`Seeded demo dataset: ${demo.patients} patients, ${demo.providers} providers, ${demo.records} records, ${demo.consents} consents`);

// Serve the built dashboard (npm run build) if present.
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  api.use(express.static(dist));
  api.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

api.listen(PORT, () => {
  console.log(`MedRec API listening on http://localhost:${PORT}`);
  console.log(`Consortium: ${ORGANIZATIONS.join(', ')} | channel: medchannel | chaincode: medrec`);
});

