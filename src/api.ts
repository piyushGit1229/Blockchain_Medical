// ============================================================
// MediLedger — Live API Client
// Bridges the React dashboard to the Express + Fabric + IPFS
// backend (server/index.js). Each function fetches live state
// and maps backend shapes into the frontend's view models.
// ============================================================

import type {
  Patient,
  MedicalRecord,
  ConsentGrant,
  AuditEvent,
  DashboardMetrics,
  RecordCategory,
} from './types';

const API_BASE = '/api';

// ── Raw backend shapes (mirror server/network.js / seed data) ──
export interface RawPatient {
  patientId: string;
  name: string;
  age: number;
  gender: string;
  org: string;
  registeredAt?: number;
}

export interface RawProvider {
  providerId: string;
  name?: string;
  role: string;
  org: string;
  department?: string;
  specialty?: string;
}

export interface RawRecord {
  recordId: string;
  patientId: string;
  ipfsCid: string | null;
  contentHash: string;
  recordType: string;
  doctorId: string | null;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface RawConsent {
  consentId: string;
  patientId: string;
  recordId: string;
  granteeId: string;
  purposes: string[];
  conditions: Record<string, unknown>;
  validFrom: number;
  validUntil: number;
  revoked: boolean;
  grantedAt: number;
  revokedAt?: number;
}

export interface RawAuditEvent {
  accessId: string;
  recordId: string;
  patientId: string;
  providerId: string;
  providerOrg: string;
  purpose: string;
  decision: 'GRANT' | 'DENY';
  reason: string;
  emergency: boolean;
  accessValidUntil: number | null;
  timestamp: number;
}

export interface RawStatus {
  organizations: string[];
  channel: string;
  chaincode: string;
  storage: {
    ledger: { txCount: number; blockCount: number; onChainBytes: number; stateKeys: number };
    ipfs: { blocks: number; bytes: number; pinned: number };
  };
  blocks: number;
  txCount: number;
  endorsements: number;
  blockCutMs: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Mapping helpers: backend → frontend view models ──
const ORG_LABELS: Record<string, string> = {
  HospitalOrg1: 'Chandigarh General Hospital',
  HospitalOrg2: 'Mohali Cardiac Institute',
  HospitalOrg3: 'Patiala Trauma Centre',
};

export function orgLabel(org: string): string {
  return ORG_LABELS[org] || org;
}

const RECORD_TYPE_TO_CATEGORY: Record<string, RecordCategory> = {
  'discharge-summary': 'discharge_summary',
  'lab-report': 'lab_report',
  'imaging-report': 'imaging',
  prescription: 'prescription',
  'clinical-note': 'clinical_note',
};

function toCategory(recordType: string): RecordCategory {
  return RECORD_TYPE_TO_CATEGORY[recordType] || 'clinical_note';
}

function isoFromMs(ms: number): string {
  return ms ? new Date(ms).toISOString() : new Date().toISOString();
}

// ── Live data fetchers ──
export const fetchStatus = () => request<RawStatus>('/status');
export const fetchPatients = () => request<RawPatient[]>('/patients');
export const fetchProviders = () => request<RawProvider[]>('/providers');
export const fetchRecords = (patientId?: string) =>
  request<RawRecord[]>(patientId ? `/records?patientId=${patientId}` : '/records');
export const fetchConsents = (patientId?: string) =>
  request<RawConsent[]>(patientId ? `/consents?patientId=${patientId}` : '/consents');
export const fetchAudit = (patientId?: string) =>
  request<RawAuditEvent[]>(patientId ? `/audit?patientId=${patientId}` : '/audit');

/** Consortium organizations as {id, label} pairs, derived from live channel membership. */
export async function fetchOrganizations(): Promise<{ id: string; name: string }[]> {
  const status = await fetchStatus();
  return status.organizations.map(org => ({ id: org, name: orgLabel(org) }));
}

// ── Live mutations ──
export interface GrantConsentInput {
  patientId: string;
  recordId: string;
  granteeId: string;
  purposes?: string[];
  conditions?: Record<string, unknown>;
  validUntil?: number;
}

export interface ConsentMutationResult {
  consentId: string;
  granted?: boolean;
  revoked?: boolean;
  txId?: string;
  latencyMs?: number;
}

export const createConsent = (input: GrantConsentInput) =>
  request<ConsentMutationResult>('/consents', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const revokeConsent = (patientId: string, consentId: string) =>
  request<ConsentMutationResult>('/consents/revoke', {
    method: 'POST',
    body: JSON.stringify({ patientId, consentId }),
  });

export interface UploadRecordInput {
  patientId: string;
  recordType: string;
  metadata?: Record<string, unknown>;
  payload: unknown;
  doctorId?: string;
}

export interface UploadRecordResult {
  recordId: string;
  ipfsCid: string | null;
  contentHash: string;
  ciphertextBytes: number;
  dekWrappedForPatient: string;
  txId: string;
  latencyMs: number;
}

export const uploadRecord = (input: UploadRecordInput) =>
  request<UploadRecordResult>('/records', {
    method: 'POST',
    body: JSON.stringify(input),
  });

/** On-chain vs off-chain storage split, derived from live ledger/IPFS stats. */
export interface StorageSlice {
  name: string;
  value: number; // KB
  color: string;
}

export function storageDistribution(status: RawStatus): StorageSlice[] {
  const onChainKB = Math.round(status.storage.ledger.onChainBytes / 1024);
  const offChainKB = Math.round(status.storage.ipfs.bytes / 1024);
  return [
    { name: 'On-Chain (Fabric)', value: onChainKB, color: '#0d9488' },
    { name: 'Off-Chain (IPFS)', value: offChainKB, color: '#7c3aed' },
  ];
}

export async function fetchMetrics(): Promise<DashboardMetrics> {
  const [status, records, consents, audit, patients] = await Promise.all([
    fetchStatus(), fetchRecords(), fetchConsents(), fetchAudit(), fetchPatients(),
  ]);
  return {
    totalPatients: patients.length,
    totalRecords: records.length,
    pendingRequests: 0,
    activeConsents: consents.filter((c) => !c.revoked).length,
    networkOrgs: status.organizations.length,
    todayEvents: audit.length,
    storageOnChain: Math.round(status.storage.ledger.onChainBytes / 1024),
    storageOffChain: +(status.storage.ipfs.bytes / (1024 * 1024)).toFixed(2),
    isDemo: false,
  };
}

// ── Mapping: backend → frontend models ──
export function mapPatient(p: RawPatient, records: RawRecord[], consents: RawConsent[]): Patient {
  const recordCount = records.filter((r) => r.patientId === p.patientId).length;
  const activeConsents = consents.filter((c) => c.patientId === p.patientId && !c.revoked).length;
  // The ledger stores age, not a birth date — derive an approximate DOB so
  // date formatting in the UI always receives a valid Date.
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - p.age);
  const registeredAt = new Date(p.registeredAt || Date.now()).toISOString();
  const lastActivity = new Date(
    records.filter(r => r.patientId === p.patientId).reduce((max, r) => Math.max(max, r.createdAt), 0)
    || p.registeredAt
    || Date.now(),
  ).toISOString();
  return {
    id: p.patientId,
    mrn: p.patientId,
    name: p.name,
    initials: p.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase(),
    dob: dob.toISOString(),
    age: p.age,
    gender: p.gender === 'M' ? 'male' : p.gender === 'F' ? 'female' : 'other',
    bloodType: '—',
    primaryHospital: orgLabel(p.org),
    primaryHospitalId: p.org,
    recordCount,
    activeConsents,
    status: 'active',
    lastActivity,
    registeredAt,
    email: '',
    phone: '',
    address: '',
    diagnoses: [],
  };
}

export function mapRecord(r: RawRecord, patientName: string): MedicalRecord {
  return {
    id: r.recordId,
    patientId: r.patientId,
    patientName,
    category: toCategory(r.recordType),
    title: `${r.recordType} · ${(r.metadata?.icd10 as string) || '—'}`,
    description: (r.metadata?.diagnosis as string) || r.recordType,
    uploadedBy: r.doctorId || '—',
    uploadedByOrg: '',
    uploadedAt: isoFromMs(r.createdAt),
    encryptionStatus: 'encrypted',
    ipfsCid: r.ipfsCid,
    contentHash: r.contentHash,
    txId: null,
    fileSize: (r.metadata?.encSize as number) || 0,
    fileType: r.recordType,
    status: 'indexed',
    isDemo: false,
  };
}

export function mapConsent(c: RawConsent, patientName: string, granteeName: string, granteeOrg: string = ''): ConsentGrant {
  const status = c.revoked ? 'revoked' : Date.now() > c.validUntil ? 'expired' : 'active';
  return {
    id: c.consentId,
    patientId: c.patientId,
    patientName,
    grantedTo: granteeName,
    grantedToOrg: granteeOrg ? orgLabel(granteeOrg) : '',
    grantedToOrgId: c.granteeId,
    categories: [],
    permissions: ['read'],
    purpose: c.purposes.join(', '),
    validFrom: isoFromMs(c.validFrom),
    validUntil: isoFromMs(c.validUntil),
    status,
    createdAt: isoFromMs(c.grantedAt),
    revokedAt: c.revokedAt ? isoFromMs(c.revokedAt) : undefined,
    txId: null,
    isDemo: false,
  };
}

export function mapAuditEvent(
  e: RawAuditEvent,
  patientName: string = '—',
  providerName: string = '—',
): AuditEvent {
  return {
    id: e.accessId,
    eventType: e.decision === 'GRANT' ? 'access_granted' : 'access_denied',
    timestamp: isoFromMs(e.timestamp),
    actor: providerName,
    actorRole: 'doctor',
    actorOrg: orgLabel(e.providerOrg),
    patientId: e.patientId,
    patientName,
    recordId: e.recordId,
    outcome: e.decision === 'GRANT' ? 'success' : 'denied',
    policyDecision: e.reason,
    txId: null,
    metadata: { purpose: e.purpose, emergency: String(e.emergency) },
    isDemo: false,
  };
}

