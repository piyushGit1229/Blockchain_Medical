// ============================================================
// MediLedger — Role-Based Access Control (RBAC) System
// ============================================================

import type { UserRole } from '../types';
import {
  LayoutDashboard, Users, FileText, Inbox, Shield, Activity,
  Network, Lock, Settings, Stethoscope, UserCheck, Eye, BarChart3
} from 'lucide-react';

export type Permission =
  | 'view_consortium_overview'
  | 'view_doctor_overview'
  | 'view_patient_overview'
  | 'view_auditor_overview'
  | 'view_all_patients'
  | 'view_all_records'
  | 'view_own_records'
  | 'upload_clinical_record'
  | 'manage_consents'
  | 'view_consents'
  | 'request_access'
  | 'approve_access_requests'
  | 'view_audit_trail'
  | 'view_network_topology'
  | 'manage_security_policies'
  | 'manage_platform_settings'
  | 'trigger_break_glass';

export interface RoleConfig {
  role: UserRole;
  title: string;
  badgeLabel: string;
  badgeVariant: 'info' | 'success' | 'warning' | 'neutral';
  description: string;
  scope: string;
  permissions: Permission[];
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    role: 'admin',
    title: 'Consortium Node Administrator',
    badgeLabel: 'ADMIN',
    badgeVariant: 'info',
    description: 'Full supervisory authority over consortium peers, channel consensus, and cryptographic ledger parameters.',
    scope: 'Consortium-wide (All Nodes, Patients & Smart Contracts)',
    permissions: [
      'view_consortium_overview',
      'view_all_patients',
      'view_all_records',
      'upload_clinical_record',
      'manage_consents',
      'view_consents',
      'approve_access_requests',
      'view_audit_trail',
      'view_network_topology',
      'manage_security_policies',
      'manage_platform_settings',
      'trigger_break_glass'
    ]
  },
  doctor: {
    role: 'doctor',
    title: 'Attending Physician & Clinician',
    badgeLabel: 'DOCTOR',
    badgeVariant: 'success',
    description: 'Clinical access to assigned patient records, diagnostic uploads, cross-hospital access requests, and HIPAA emergency break-glass.',
    scope: 'Clinical Scope (Patients with Active Consent & Emergency Override)',
    permissions: [
      'view_doctor_overview',
      'view_all_patients',
      'view_all_records',
      'upload_clinical_record',
      'view_consents',
      'request_access',
      'trigger_break_glass'
    ]
  },
  patient: {
    role: 'patient',
    title: 'Patient (Self-Sovereign Identity)',
    badgeLabel: 'PATIENT',
    badgeVariant: 'warning',
    description: 'Self-sovereign control over health records, cryptographic consent grant/revocation directives, and access approval oversight.',
    scope: 'Sovereign Scope (Personal Records & Consent Directives Only)',
    permissions: [
      'view_patient_overview',
      'view_own_records',
      'manage_consents',
      'approve_access_requests'
    ]
  },
  auditor: {
    role: 'auditor',
    title: 'Regulatory & Compliance Auditor',
    badgeLabel: 'AUDITOR',
    badgeVariant: 'neutral',
    description: 'Forensic inspection of immutable blockchain logs, HIPAA/GDPR statutory compliance, and emergency break-glass investigations.',
    scope: 'Oversight Scope (Ledger Audit Logs, Metadata & Policy Traces — PHI Redacted)',
    permissions: [
      'view_auditor_overview',
      'view_all_patients',
      'view_all_records',
      'view_consents',
      'view_audit_trail',
      'manage_security_policies'
    ]
  }
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_CONFIGS[role]?.permissions.includes(permission) ?? false;
}

export interface NavItem {
  path: string;
  label: string;
  icon: any;
  exact?: boolean;
  requiredPermission?: Permission;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function getNavGroupsForRole(role: UserRole): NavGroup[] {
  switch (role) {
    case 'admin':
      return [
        {
          label: 'Overview',
          items: [
            { path: '/', label: 'Consortium Dashboard', icon: LayoutDashboard, exact: true },
          ],
        },
        {
          label: 'Clinical Data',
          items: [
            { path: '/patients', label: 'Patient Directory', icon: Users },
            { path: '/records', label: 'Medical Records', icon: FileText },
            { path: '/access-requests', label: 'Access Requests', icon: Inbox },
            { path: '/consent', label: 'Consent Management', icon: Shield },
          ],
        },
        {
          label: 'Ledger Operations',
          items: [
            { path: '/audit', label: 'Audit Trail', icon: Activity },
            { path: '/network', label: 'Network & Orgs', icon: Network },
            { path: '/security', label: 'Security & Policies', icon: Lock },
            { path: '/benchmarks', label: 'Benchmarks', icon: BarChart3 },
          ],
        },
        {
          label: 'System',
          items: [
            { path: '/settings', label: 'Platform Settings', icon: Settings },
          ],
        },
      ];

    case 'doctor':
      return [
        {
          label: 'Clinical Practice',
          items: [
            { path: '/', label: 'Clinical Workspace', icon: Stethoscope, exact: true },
            { path: '/patients', label: 'Attending Patients', icon: Users },
            { path: '/records', label: 'Medical Records & EHR', icon: FileText },
          ],
        },
        {
          label: 'Consents & Requests',
          items: [
            { path: '/access-requests', label: 'Cross-Hospital Requests', icon: Inbox },
            { path: '/consent', label: 'Verified Consents', icon: Shield },
          ],
        },
        {
          label: 'Governance & Security',
          items: [
            { path: '/security', label: 'Policy Rules & Simulator', icon: Lock },
          ],
        },
      ];

    case 'patient':
      return [
        {
          label: 'My Health Sovereignty',
          items: [
            { path: '/', label: 'My Health Portal', icon: UserCheck, exact: true },
            { path: '/records', label: 'My Medical Records', icon: FileText },
          ],
        },
        {
          label: 'Privacy Directives',
          items: [
            { path: '/consent', label: 'My Consent Directives', icon: Shield },
            { path: '/access-requests', label: 'Access Requests Received', icon: Inbox },
          ],
        },
      ];

    case 'auditor':
      return [
        {
          label: 'Audit & Compliance',
          items: [
            { path: '/', label: 'Compliance Overview', icon: Eye, exact: true },
            { path: '/audit', label: 'Immutable Audit Trail', icon: Activity },
          ],
        },
        {
          label: 'Regulatory Registry',
          items: [
            { path: '/consent', label: 'Consent Registry', icon: Shield },
            { path: '/records', label: 'Records (Metadata View)', icon: FileText },
            { path: '/patients', label: 'Patient Directory', icon: Users },
          ],
        },
        {
          label: 'Policy Governance',
          items: [
            { path: '/security', label: 'ABAC Rules & Simulator', icon: Lock },
          ],
        },
      ];
  }
}
