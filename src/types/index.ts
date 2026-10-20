// ============================================================
// MediLedger — Shared TypeScript Types
// ============================================================

export type UserRole = 'admin' | 'doctor' | 'patient' | 'auditor';

export type OrgType = 'hospital' | 'clinic' | 'lab' | 'pharmacy';

export interface Organization {
  id: string;
  name: string;
  shortName: string;
  type: OrgType;
  mspId: string;
  location: string;
  status: 'connected' | 'degraded' | 'disconnected';
  peerCount: number;
  endorsingPeer: string;
  joinedAt: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  organization: Organization;
  avatarInitials: string;
}

export type PatientStatus = 'active' | 'inactive' | 'pending';

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  name: string;
  initials: string;
  dob: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bloodType: string;
  primaryHospital: string;
  primaryHospitalId: string;
  recordCount: number;
  activeConsents: number;
  status: PatientStatus;
  lastActivity: string;
  registeredAt: string;
  email: string;
  phone: string;
  address: string;
  diagnoses: string[];
}

export type RecordCategory =
  | 'lab_report'
  | 'imaging'
  | 'prescription'
  | 'clinical_note'
  | 'discharge_summary'
  | 'vaccination'
  | 'pathology'
  | 'radiology';

export type RecordStatus = 'indexed' | 'pending' | 'failed' | 'revoked';

export interface MedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  category: RecordCategory;
  title: string;
  description: string;
  uploadedBy: string;
  uploadedByOrg: string;
  uploadedAt: string;
  encryptionStatus: 'encrypted' | 'unencrypted';
  ipfsCid: string | null;
  contentHash: string | null;
  txId: string | null;
  fileSize: number;
  fileType: string;
  status: RecordStatus;
  isDemo: boolean;
}

export type ConsentStatus = 'active' | 'pending' | 'expired' | 'revoked' | 'denied';

export interface ConsentGrant {
  id: string;
  patientId: string;
  patientName: string;
  grantedTo: string;
  grantedToOrg: string;
  grantedToOrgId: string;
  categories: RecordCategory[];
  permissions: ('read' | 'share' | 'download')[];
  purpose: string;
  validFrom: string;
  validUntil: string;
  status: ConsentStatus;
  createdAt: string;
  revokedAt?: string;
  revocationReason?: string;
  txId: string | null;
  isDemo: boolean;
}

export type AccessRequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface AccessRequest {
  id: string;
  patientId: string;
  patientName: string;
  requestingDoctor: string;
  requestingDoctorId: string;
  requestingOrg: string;
  requestingOrgId: string;
  categories: RecordCategory[];
  purpose: string;
  clinicalJustification: string;
  requestedPermissions: ('read' | 'share' | 'download')[];
  requestedAt: string;
  expiresAt: string;
  status: AccessRequestStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  denialReason?: string;
  txId: string | null;
  isDemo: boolean;
}

export type AuditEventType =
  | 'patient_registered'
  | 'record_uploaded'
  | 'record_accessed'
  | 'access_requested'
  | 'access_granted'
  | 'access_denied'
  | 'consent_created'
  | 'consent_revoked'
  | 'policy_evaluated'
  | 'org_joined'
  | 'login'
  | 'logout';

export type AuditOutcome = 'success' | 'denied' | 'error' | 'warning';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  actorOrg: string;
  patientId?: string;
  patientName?: string;
  recordId?: string;
  outcome: AuditOutcome;
  policyDecision?: string;
  txId: string | null;
  metadata: Record<string, string>;
  isDemo: boolean;
}

export type ServiceStatus = 'operational' | 'degraded' | 'down' | 'unknown';

export interface NetworkService {
  name: string;
  type: 'fabric_peer' | 'fabric_orderer' | 'ipfs_node' | 'api' | 'ca';
  status: ServiceStatus;
  organization?: string;
  endpoint?: string;
  blockHeight?: number;
  lastPing?: string;
}

export interface DashboardMetrics {
  totalPatients: number;
  totalRecords: number;
  pendingRequests: number;
  activeConsents: number;
  networkOrgs: number;
  todayEvents: number;
  storageOnChain: number; // KB
  storageOffChain: number; // MB
  isDemo: boolean;
}

// ABAC Policy Types
export type PolicyEffect = 'allow' | 'deny';

export interface PolicyAttribute {
  key: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'exists';
  value: string | string[];
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  effect: PolicyEffect;
  conditions: PolicyAttribute[];
  actions: string[];
  resources: string[];
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyEvaluationTrace {
  policyId: string;
  policyName: string;
  matched: boolean;
  effect: PolicyEffect;
  conditions: {
    attribute: string;
    expected: string | string[];
    actual: string;
    passed: boolean;
  }[];
  finalDecision: PolicyEffect;
}
