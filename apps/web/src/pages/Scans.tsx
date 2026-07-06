import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';

export default function Scans() {
  const { data, isLoading } = useQuery(['scans', { page: 1, limit: 50 }], () => api.getScans({ page: 1, limit: 50 }));
  const items = data?.items ?? [];
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = search.trim()
    ? items.filter((s: any) =>
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        (s.riskLevel ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  return (
    <div className="page">
      {/* ── Page header ── */}
      <header className="page-header">
        <div>
          <p className="eyebrow">Scan history</p>
          <h1 className="page-title">All dependency scans</h1>
          <p className="page-subtitle">
            Browse every scan session and drill into vulnerabilities, dependency trees, and attack paths.
          </p>
        </div>
        {items.length > 0 && (
          <div className="page-actions">
            <span className="badge-low text-sm">{data?.total ?? items.length} scan{(data?.total ?? items.length) !== 1 ? 's' : ''}</span>
          </div>
        )}
      </header>

      {/* ── Search filter ── */}
      {items.length > 0 && (
        <div className="search-filter-bar">
          <div className="search-input-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Filter by scan ID or risk level…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      {isLoading ? (
        <div className="dashboard-status">
          <Spinner size="lg" />
          <p className="text-muted" style={{ marginTop: '1rem' }}>Loading scan history…</p>
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            Icon={
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            }
            title="No scans recorded"
            description="Upload a package.json using the Run scan button to begin tracking dependency risk across your projects."
            ctaLabel="Run your first scan"
            onCtaClick={() => navigate('/scans/new')}
          />
        </Card>
      ) : (
        <Card flush>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scan ID</th>
                  <th>Date</th>
                  <th>Dependencies</th>
                  <th>Risk level</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <tr key={s.id}>
                    <td className="scan-id-cell">
                      <Link to={`/scans/${s.id}`} className="scan-link font-mono">…{s.id.slice(-8)}</Link>
                    </td>
                    <td className="text-muted text-sm">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="font-mono">{s.totalDependencies}</td>
                    <td>
                      <span className={`pill pill-${(s.riskLevel ?? 'low').toLowerCase()}`}>
                        {s.riskLevel ?? 'LOW'}
                      </span>
                    </td>
                    <td className="font-mono">{s.averageRisk ?? '—'}</td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/scans/${s.id}`} className="row-action-link">Detail</Link>
                        <Link to={`/scans/${s.id}/propagation`} className="row-action-link">Attack paths</Link>
                        <Link to={`/scans/${s.id}/graph`} className="row-action-link">Graph</Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && search.trim() && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      <p className="text-muted">No scans matching "{search}"</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
