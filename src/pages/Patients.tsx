// ============================================================
// MediLedger — Patient Directory
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Plus, Download } from 'lucide-react';
import { DEMO_ORGANIZATIONS } from '../data/demo';
import {
  fetchConsents, fetchOrganizations, fetchPatients, fetchRecords, mapPatient,
} from '../api';
import {
  SearchInput, PatientStatusBadge, Avatar, Pagination,
  DemoBadge, EmptyState, SortHeader, Badge
} from '../components/ui';
import { format } from 'date-fns';
import type { Patient } from '../types';

const PAGE_SIZE = 6;

const Patients: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const [orgFilter, setOrgFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);

  useEffect(() => {
    Promise.all([fetchPatients(), fetchRecords(), fetchConsents(), fetchOrganizations()])
      .then(([ps, rs, cs, os]) => {
        setPatients(ps.map(p => mapPatient(p, rs, cs)));
        setOrgs(os);
        setLiveLoaded(true);
      })
      .catch(() => setLiveLoaded(false));
  }, []);

  const handleSort = (field: string) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let result = [...patients];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.diagnoses.some(d => d.toLowerCase().includes(q))
      );
    }
    if (orgFilter !== 'all') {
      result = result.filter(p => p.primaryHospitalId === orgFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    result.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortField === 'name') { av = a.name; bv = b.name; }
      else if (sortField === 'age') { av = a.age; bv = b.age; }
      else if (sortField === 'records') { av = a.recordCount; bv = b.recordCount; }
      else if (sortField === 'activity') { av = a.lastActivity; bv = b.lastActivity; }

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [search, orgFilter, statusFilter, sortField, sortDir, patients]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Directory</h1>
          <p className="page-subtitle">
            {patients.length} registered patients across {orgs.length || DEMO_ORGANIZATIONS.length} organizations · {liveLoaded ? <Badge variant="success">Live Ledger</Badge> : <DemoBadge />}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-primary"><Plus size={14} /> Register Patient</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Search by name, MRN, or diagnosis..."
          width={280}
        />
        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={orgFilter}
          onChange={e => { setOrgFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Organizations</option>
          {orgs.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        <select
          className="form-input form-select"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>
          {filtered.length} patient{filtered.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {paginated.length === 0 ? (
          <EmptyState
            icon={<Users size={48} />}
            title="No patients found"
            description="Try adjusting your search terms or filters to find what you're looking for."
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <SortHeader label="Patient" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th>MRN</th>
                    <SortHeader label="Age" field="age" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th>Blood Type</th>
                    <th>Organization</th>
                    <SortHeader label="Records" field="records" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th>Consents</th>
                    <th>Status</th>
                    <SortHeader label="Last Activity" field="activity" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(patient => (
                    <tr key={patient.id} onClick={() => navigate(`/patients/${patient.id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar initials={patient.initials} size="sm" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{patient.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                              {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)} · DOB {format(new Date(patient.dob), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {patient.mrn}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{patient.age}</td>
                      <td>
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: 'var(--color-text-secondary)',
                          background: 'var(--color-surface-muted)',
                          border: '1px solid var(--color-border)',
                          padding: '2px 8px', borderRadius: 4
                        }}>
                          {patient.bloodType}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {patient.primaryHospital.split(' ')[0]}
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>
                        {patient.recordCount}
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 2 }}>records</span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {patient.activeConsents > 0 ? (
                          <span style={{ color: 'var(--color-teal)', fontWeight: 600 }}>{patient.activeConsents} active</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>None</span>
                        )}
                      </td>
                      <td><PatientStatusBadge status={patient.status} /></td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {format(new Date(patient.lastActivity), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                total={filtered.length}
                pageSize={PAGE_SIZE}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Patients;
