// Benchmark harness implementing the paper's experimental procedure (Section IV-E):
// 1) multi-org Fabric network + channels   2) synthetic data -> IPFS + chaincode
// 3) increasing request load -> throughput/latency   4) ABAC violation testing
// 5-6) repeat for baselines and compare scalability/privacy trade-offs.
//
// Run: npm run bench   (writes server/bench/results.json + markdown tables)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateDataset, mulberry32 } from '../data/dataset.js';
import {
  CentralizedEHR, PublicEthereumSim,
  buildOnChainOnlyNetwork, buildProposedNetwork,
} from '../baselines/baselines.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCALE = { patients: 24, providers: 10, recordsPerPatient: 3, seed: 42 };
const ACCESS_BATCH = 200; // access requests per throughput run
const CONCURRENCY = 20;
const HOUR = 3600_000;

function pct(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/** Ground truth: would the *strict* ABAC policy allow this request? */
function groundTruth({ consentRevoked = false, consentExpired = false, wrongPurpose = false, wrongOrg = false, noConsent = false } = {}) {
  return !(consentRevoked || consentExpired || wrongPurpose || wrongOrg || noConsent);
}

/** Run one configuration end-to-end; returns metrics for Tables II & III. */
async function runConfig(name, sys, dataset) {
  console.log(`\n=== [${name}] seeding ${dataset.patients.length} patients / ${dataset.providers.length} providers / ${dataset.records.length} records ===`);
  const t0 = performance.now();
  for (const p of dataset.patients) await sys.registerPatient(p);
  for (const pr of dataset.providers) await sys.registerProvider(pr);
  const seedMs = performance.now() - t0;

  // --- Phase 2: upload records (encrypt -> IPFS -> anchor hash on-chain) ---
  const uploadLat = [];
  const recordIds = [];
  for (const r of dataset.records) {
    const out = await sys.uploadRecord({
      patientId: r.patientId, recordType: r.recordType,
      metadata: r.metadata, payload: r.payload, doctorId: r.doctorId,
    });
    uploadLat.push(out.latencyMs);
    recordIds.push({ recordId: out.recordId, patientId: r.patientId });
  }
  sys.network?.flush();

  // --- Consents: each patient grants 'treatment' access to a provider ---
  const rng = mulberry32(7);
  const providers = dataset.providers;
  const consents = [];
  for (const { recordId, patientId } of recordIds) {
    const grantee = providers[Math.floor(rng() * providers.length)];
    if (sys.grantConsent) {
      await sys.grantConsent({
        patientId, recordId, granteeId: grantee.providerId,
        purposes: ['treatment'], conditions: { minRole: 'resident' },
        validUntil: Date.now() + HOUR,
      });
    } else if (sys.consents) {
      sys.consents.set(recordId, { patientId, granted: true }); // Ethereum mapping
    } else {
      // Centralized: coarse ACL is implicit (any clinician role).
    }
    consents.push({ recordId, patientId, granteeId: grantee.providerId });
  }
  sys.network?.flush();

  // --- Phase 3: throughput & latency under concurrent load ---
  const latencies = [];
  const tPut = performance.now();
  let issued = 0;
  async function worker() {
    while (issued < ACCESS_BATCH) {
      issued++;
      const c = consents[issued % consents.length];
      const provider = providers[(issued * 7) % providers.length];
      const res = await sys.requestAccess({ providerId: provider.providerId, recordId: c.recordId, purpose: 'treatment' });
      latencies.push(res.latencyMs);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const wallMs = performance.now() - tPut;
  const throughput = (ACCESS_BATCH / wallMs) * 1000;
  sys.network?.flush();

  // --- Phase 4: policy-violation testing with controlled consent states ---
  const violationResults = [];
  const testOne = async (scenario, meta, reqArgs) => {
    const res = await sys.requestAccess(reqArgs);
    const shouldAllow = groundTruth(meta);
    violationResults.push({
      scenario, shouldAllow, granted: !!res.granted,
      wrongGrant: !!res.granted && !shouldAllow,
      wrongDeny: !res.granted && shouldAllow,
      reason: res.reason,
    });
  };
  const mkRecord = async (patientId) => {
    const out = await sys.uploadRecord({
      patientId, recordType: 'lab-report',
      metadata: { icd10: 'Z00.0' }, payload: { note: 'consent-state test', pad: 'y'.repeat(600) },
    });
    return out.recordId;
  };

  const P = dataset.patients[0].patientId;
  const granteeId = consents[0].granteeId;
  const stranger = providers.find((p) => p.providerId !== granteeId) || providers[0];
  const grant = (recordId, over) =>
    sys.grantConsent
      ? sys.grantConsent({ patientId: P, recordId, granteeId, purposes: ['treatment'], conditions: {}, validUntil: Date.now() + HOUR, ...over })
      : Promise.resolve();

  const recValid = await mkRecord(P);
  await grant(recValid, {});
  if (sys.consents) sys.consents.set(recValid, { patientId: P, granted: true });
  await testOne('valid-consent', {}, { providerId: granteeId, recordId: recValid, purpose: 'treatment' });

  const recRevoked = await mkRecord(P);
  if (sys.grantConsent) {
    const c = await grant(recRevoked, {});
    await sys.revokeConsent({ patientId: P, consentId: c.consentId });
  } else if (sys.consents) sys.consents.set(recRevoked, { patientId: P, granted: true, revoked: true });
  await testOne('revoked-consent', { consentRevoked: true }, { providerId: granteeId, recordId: recRevoked, purpose: 'treatment' });

  const recExpired = await mkRecord(P);
  await grant(recExpired, { validUntil: Date.now() - 1000 });
  if (sys.consents) sys.consents.set(recExpired, { patientId: P, granted: true });
  await testOne('expired-consent', { consentExpired: true }, { providerId: granteeId, recordId: recExpired, purpose: 'treatment' });

  const recPurpose = await mkRecord(P);
  await grant(recPurpose, { purposes: ['research'] });
  if (sys.consents) sys.consents.set(recPurpose, { patientId: P, granted: true });
  await testOne('wrong-purpose', { wrongPurpose: true }, { providerId: granteeId, recordId: recPurpose, purpose: 'treatment' });

  const recOrg = await mkRecord(P);
  if (sys.grantConsent) {
    await sys.grantConsent({ patientId: P, recordId: recOrg, granteeId: stranger.providerId, purposes: ['treatment'], conditions: { org: 'HospitalOrg1' }, validUntil: Date.now() + HOUR });
  } else if (sys.consents) sys.consents.set(recOrg, { patientId: P, granted: true });
  await testOne('wrong-org-attribute', { wrongOrg: true }, { providerId: granteeId, recordId: recOrg, purpose: 'treatment' });

  const recNone = await mkRecord(P);
  await testOne('no-consent', { noConsent: true }, { providerId: stranger.providerId, recordId: recNone, purpose: 'treatment' });

  sys.network?.flush();
  const wrongGrants = violationResults.filter((v) => v.wrongGrant).length;
  const shouldDeny = violationResults.filter((v) => !v.shouldAllow).length;
  const storage = sys.storageStat();

  return {
    name,
    uploadLatencyAvgMs: +avg(uploadLat).toFixed(2),
    throughputTps: +throughput.toFixed(2),
    latencyAvgMs: +avg(latencies).toFixed(2),
    latencyP95Ms: +pct(latencies, 95).toFixed(2),
    seedMs: +seedMs.toFixed(0),
    violations: {
      total: violationResults.length,
      shouldDeny,
      wrongGrants,
      rate: shouldDeny ? +(wrongGrants / shouldDeny).toFixed(3) : 0,
      detail: violationResults,
    },
    storage,
  };
}

// ---------------------------------------------------------------- main runner
function fmt(n, unit = '') {
  return typeof n === 'number' ? `${n}${unit}` : String(n);
}

function renderTables(results) {
  const tps = results.map((r) => r.throughputTps);
  const best = Math.max(...tps);
  const worst = Math.min(...tps);
  const lat = results.map((r) => r.latencyAvgMs);
  const bestLat = Math.min(...lat);
  const worstLat = Math.max(...lat);

  const q = (v, arr, higherIsBetter) => {
    const mx = Math.max(...arr), mn = Math.min(...arr);
    if (v === mx) return higherIsBetter ? 'Highest' : 'Lowest';
    if (v === mn) return higherIsBetter ? 'Lowest' : 'Highest';
    return v > (mx + mn) / 2 ? 'High' : 'Moderate';
  };

  let md = '\n### TABLE II — Throughput and latency by configuration (measured)\n\n';
  md += '| Configuration | Throughput (tps) | Avg latency (ms) | P95 latency (ms) | Upload latency avg (ms) | Qualitative |\n';
  md += '|---|---|---|---|---|---|\n';
  for (const r of results) {
    md += `| ${r.name} | ${fmt(r.throughputTps)} | ${fmt(r.latencyAvgMs)} | ${fmt(r.latencyP95Ms)} | ${fmt(r.uploadLatencyAvgMs)} | ${q(r.throughputTps, tps, true)} throughput / ${q(r.latencyAvgMs, lat, false)} latency |\n`;
  }

  md += '\n### TABLE III — Access-control violations and storage distribution (measured)\n\n';
  md += '| Configuration | Policy violation rate | Wrong grants / denied-by-policy | On-chain ledger bytes | Off-chain (IPFS/DB) bytes |\n';
  md += '|---|---|---|---|---|\n';
  for (const r of results) {
    const onchain = r.storage.ledger?.onChainBytes ?? 0;
    const offchain = (r.storage.ipfs?.bytes ?? 0) + (r.storage.dbBytes ?? 0);
    md += `| ${r.name} | ${fmt(r.violations.rate)} | ${r.violations.wrongGrants} / ${r.violations.shouldDeny} | ${onchain} | ${offchain} |\n`;
  }
  void best; void worst; void bestLat; void worstLat;
  return md;
}

async function main() {
  const dataset = generateDataset(SCALE);
  const results = [];

  results.push(await runConfig('Centralized (baseline)', new CentralizedEHR(), dataset));
  results.push(await runConfig('Public Ethereum (baseline)', new PublicEthereumSim(), dataset));
  results.push(await runConfig('On-Chain Only Fabric (baseline)', buildOnChainOnlyNetwork({ blockCutMs: 25 }), dataset));
  results.push(await runConfig('Proposed: Fabric + IPFS + ABAC', buildProposedNetwork({ blockCutMs: 25 }), dataset));

  const tables = renderTables(results);
  const payload = {
    generatedAt: new Date().toISOString(),
    scale: SCALE,
    workload: { accessRequests: ACCESS_BATCH, concurrency: CONCURRENCY, blockCutMs: 25, ethSim: { blockTimeMs: 350 } },
    results,
    tables,
  };
  const outFile = path.join(__dirname, 'results.json');
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(tables);
  console.log(`\nResults written to ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

