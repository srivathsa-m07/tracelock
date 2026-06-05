import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';

export default function Scans() {
  const { data, isLoading } = useQuery(['scans', { page: 1, limit: 50 }], () => api.getScans({ page: 1, limit: 50 }));
  const items = data?.items ?? [];

  return (
    <div className="dashboard-page">
      <section className="dashboard-summary">
        <div className="summary-copy">
          <p className="eyebrow">Scan history</p>
          <h2>All dependency scans</h2>
          <p>Browse every scan session and drill into vulnerabilities, dependency trees, and attack paths.</p>
        </div>
      </section>

      <Card title={`Scan sessions${data?.total ? ` (${data.total})` : ''}`}>
        {isLoading ? (
          <div className="empty-state">Loading scan history…</div>
        ) : items.length === 0 ? (
          <div className="empty-state-block">
            <p className="empty-state-title">No scans recorded</p>
            <p className="empty-state-body">Upload a package.json using the "Run scan" button to begin tracking dependency risk.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scan ID</th>
                  <th>Date</th>
                  <th>Deps</th>
                  <th>Risk</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s: any) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/scans/${s.id}`} className="scan-link">…{s.id.slice(-8)}</Link>
                    </td>
                    <td>{new Date(s.createdAt).toLocaleString()}</td>
                    <td>{s.totalDependencies}</td>
                    <td><span className={`pill pill-${(s.riskLevel ?? 'low').toLowerCase()}`}>{s.riskLevel ?? 'LOW'}</span></td>
                    <td>{s.averageRisk ?? '—'}</td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/scans/${s.id}`} className="row-action-link">Detail</Link>
                        <Link to={`/scans/${s.id}/propagation`} className="row-action-link">Attack paths</Link>
                        <Link to={`/scans/${s.id}/graph`} className="row-action-link">Graph</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
