// ============================================================
// MediLedger — Root Application & Protected Routing with RBAC
// ============================================================

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/AppShell';
import { ToastContainer } from './components/ui';
import Unauthorized from './components/Unauthorized';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Records from './pages/Records';
import AccessRequests from './pages/AccessRequests';
import ConsentManagement from './pages/ConsentManagement';
import AuditTrail from './pages/AuditTrail';
import NetworkOrgs from './pages/NetworkOrgs';
import SecurityPolicies from './pages/SecurityPolicies';
import Benchmarks from './pages/Benchmarks';
import Settings from './pages/Settings';
import type { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <AppShell>{children}</AppShell>;
};

interface RoleGuardProps {
  allowedRoles: UserRole[];
  resourceName: string;
  children: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, resourceName, children }) => {
  const { currentUser } = useAuth();
  if (!allowedRoles.includes(currentUser.role)) {
    return <Unauthorized requiredRoles={allowedRoles} resourceName={resourceName} />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
      
      {/* Patient Directory — Doctors, Admins, and Compliance Auditors */}
      <Route path="/patients" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={['admin', 'doctor', 'auditor']} resourceName="the Consortium Patient Directory">
            <Patients />
          </RoleGuard>
        </ProtectedRoute>
      } />
      
      <Route path="/patients/:id" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={['admin', 'doctor', 'auditor']} resourceName="Detailed Patient Clinical Workspaces">
            <PatientDetail />
          </RoleGuard>
        </ProtectedRoute>
      } />
      
      {/* Records Vault — Adaptive for all authenticated roles */}
      <Route path="/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
      
      {/* Access Requests — Inbound (Patient/Admin) & Outbound (Doctor) */}
      <Route path="/access-requests" element={<ProtectedRoute><AccessRequests /></ProtectedRoute>} />
      
      {/* Consent Directives & Registry — Adaptive */}
      <Route path="/consent" element={<ProtectedRoute><ConsentManagement /></ProtectedRoute>} />
      
      {/* Immutable Audit Ledger — Restricted to Compliance Auditors & Node Admins */}
      <Route path="/audit" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={['admin', 'auditor']} resourceName="the Immutable Hyperledger Consortium Audit Trail">
            <AuditTrail />
          </RoleGuard>
        </ProtectedRoute>
      } />
      
      {/* Peer Node Topology & Channel RAFT — Restricted to Node Administrators */}
      <Route path="/network" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={['admin']} resourceName="Consortium Peer Node Topology & Channel Operations">
            <NetworkOrgs />
          </RoleGuard>
        </ProtectedRoute>
      } />

      {/* Empirical Evaluation — Table II & III benchmark results */}
      <Route path="/benchmarks" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={['admin', 'doctor', 'auditor']} resourceName="the Empirical Evaluation & Benchmark Results">
            <Benchmarks />
          </RoleGuard>
        </ProtectedRoute>
      } />
      
      {/* ABAC Policies & Simulator — Admins, Clinicians, and Auditors */}
      <Route path="/security" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={['admin', 'doctor', 'auditor']} resourceName="the ABAC Policy Authoring & Simulator Console">
            <SecurityPolicies />
          </RoleGuard>
        </ProtectedRoute>
      } />
      
      {/* Platform & Cryptographic Settings — Restricted to Node Administrators */}
      <Route path="/settings" element={
        <ProtectedRoute>
          <RoleGuard allowedRoles={['admin']} resourceName="Consortium Cryptographic & Node Parameters">
            <Settings />
          </RoleGuard>
        </ProtectedRoute>
      } />
      
      <Route path="*" element={
        <ProtectedRoute>
          <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>404</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Page not found</div>
            <a href="/" style={{ color: 'var(--color-teal)' }}>Return to Overview →</a>
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppRoutes />
    <ToastContainer />
  </AuthProvider>
);

export default App;
