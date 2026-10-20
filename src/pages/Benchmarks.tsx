// ============================================================
// MediLedger — Benchmarks
// Renders evaluation results from `npm run bench`
// (server/bench/benchmark.js): Table II (throughput & latency)
// and Table III (policy violations & storage distribution).
// ============================================================

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Activity, Database, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';

interface BenchResult {
  name: string;
  uploadLatencyAvgMs: number;
  throughputTps: number;
  latencyAvgMs: number;
  latencyP95Ms: number;
  violations: { total: number; shouldDeny: number; wrongGrants: number; rate: number };
  storage: {
    ledger: { txCount: number; blockCount: number; onChainBytes: number; stateKeys: number };
    ipfs: { blocks: number; bytes: number; pinned: number };
  };
}

interface BenchResults {
  generatedAt: string;
  scale: { patients: number; providers: number; recordsPerPatient: number; seed: number };
  workload: { accessRequests: number; concurrency: number; blockCutMs: number };
  results: BenchResult[];
}

const fmtNum = (n: number) =>
  n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toFixed(2);

const Benchmarks: React.FC = () => {
  const [data, setData] = useState<BenchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/bench')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No results yet — run `npm run bench`'))))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <div className="page-loading">Loading benchmark results…</div>;
  if (error) return <div className="empty-state"><AlertTriangle size={18} /> {error}</div>;
  if (!data) return null;

  const throughputData = data.results.map((r) => ({ name: r.name.split(' ')[0], tps: r.throughputTps }));
  const latencyData = data.results.map((r) => ({ name: r.name.split(' ')[0], latency: r.latencyAvgMs, p95: r.latencyP95Ms }));
  const violationData = data.results.map((r) => ({ name: r.name.split(' ')[0], rate: r.violations.rate }));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Benchmark Results</h1>
          <p>Proposed Fabric + IPFS + ABAC system vs. three baseline configurations.</p>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="card">
        <div className="card-header"><Activity size={16} /> Transaction Throughput (Table II)</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={throughputData}>
            <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
            <Tooltip formatter={(v: any) => [fmtNum(Number(v)), 'tps']} />
            <Bar dataKey="tps" radius={[4, 4, 0, 0]}>
              {throughputData.map((_, i) => <Cell key={i} fill={i === throughputData.length - 1 ? '#0d9488' : '#94a3b8'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header"><Activity size={16} /> End-to-End Latency (ms)</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={latencyData}>
            <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
            <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} ms`} /><Legend />
            <Bar dataKey="latency" name="Avg" fill="#1e40af" radius={[4, 4, 0, 0]} />
            <Bar dataKey="p95" name="P95" fill="#60a5fa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header"><ShieldCheck size={16} /> Policy Violation Rate (Table III)</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={violationData}>
            <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} domain={[0, 1]} />
            <Tooltip formatter={(v: any) => [`${(Number(v) * 100).toFixed(0)}%`, 'violation rate']} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
              {violationData.map((e, i) => <Cell key={i} fill={e.rate === 0 ? '#0d9488' : '#dc2626'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header"><Database size={16} /> Storage — On-Chain vs Off-Chain</div>
        <table className="data-table">
          <thead><tr><th>Configuration</th><th>On-Chain</th><th>Off-Chain (IPFS)</th><th>Ledger Txns</th></tr></thead>
          <tbody>
            {data.results.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{fmtNum(r.storage.ledger.onChainBytes / 1024)} KB</td>
                <td>{fmtNum(r.storage.ipfs.bytes / 1024)} KB</td>
                <td>{r.storage.ledger.txCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="bench-footnote">
        Generated {new Date(data.generatedAt).toLocaleString()} · {data.scale.patients} patients × {data.scale.recordsPerPatient} records,
        {data.scale.providers} providers · {data.workload.accessRequests} access requests @ concurrency {data.workload.concurrency}.
      </p>
    </div>
  );
};

export default Benchmarks;
