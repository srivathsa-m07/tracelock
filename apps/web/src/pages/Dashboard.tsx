import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
import Chart from '../ui/Chart';

export default function Dashboard() {
  const { data, isLoading } = useQuery(['scans', { page: 1, limit: 8 }], () => api.getScans({ page: 1, limit: 8 }));
  const scans = data?.items ?? [];
  const totalScans = data?.total ?? scans.length;
  const averageRisk = scans.length
    ? Math.round(scans.reduce((s: number, sc: any) => s + (sc.averageRisk ?? 0), 0) / scans.length)
    : null;
  const totalDependencies = scans.reduce((s: number, sc: any) => s + (sc.totalDependencies ?? 0), 0);
  const highRiskScans = scans.filter((sc: any) => sc.riskLevel === 'HIGH' || sc.riskLevel === 'CRITICAL').length;
  const latestScans = scans.slice(0, 5);

  const riskCounts = scans.reduce(
    (acc: Record<string, number>, sc: any) => {
      const level = sc.riskLevel || 'UNKNOWN';
      acc[level] = (acc[level] ?? 0) + 1;
      return acc;
    },
    { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  );
  const chartData = Object.entries(riskCounts).map(([name, value]) => ({ name, value }));

  if (isLoading) return <div className="dashboard-status">Loading scan metrics…</div>;

  return (
    <div className="dashboard-page">
      <section className="dashboard-summary">
        <div className="summary-copy">
          <p className="eyebrow">Risk operations</p>
          <h2>Scan performance and dependency health</h2>
          <p>Recent scan trends, risk signals, and dependency exposure across your projects.</p>
        </div>
      </section>

      <section className="metrics-grid">
        <Card title="Average risk score" className="metric-card">
          <p className="metric-value">{averageRisk ?? '—'}</p>
          <p className="metric-note">Across the {scans.length} most recent scans</p>
        </Card>
        <Card title="Total scans" className="metric-card">
          <p className="metric-value">{totalScans}</p>
          <p className="metric-note">Completed scan sessions</p>
        </Card>
        <Card title="Dependencies scanned" className="metric-card">
          <p className="metric-value">{totalDependencies}</p>
          <p className="metric-note">Packages evaluated in current window</p>
        </Card>
        <Card title="High-risk scans" className="metric-card">
          <p className="metric-value">{highRiskScans}</p>
          <p className="metric-note">Scans with HIGH or CRITICAL exposure</p>
        </Card>
      </section>

      <section className="dashboard-grid">
        <Card title="Recent scan activity" className="activity-card">
          {latestScans.length === 0 ? (
            <div className="empty-state-block">
              <p className="empty-state-title">No scans yet</p>
              <p className="empty-state-body">Upload a package.json using the "Run scan" button to see risk data here.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr><th>Scan</th><th>Date</th><th>Risk</th><th>Score</th><th>Deps</th></tr>
                </thead>
                <tbody>
                  {latestScans.map((sc: any) => (
                    <tr key={sc.id}>
                      <td>
                        <Link to={`/scans/${sc.id}`} className="scan-link">…{sc.id.slice(-8)}</Link>
                      </td>
                      <td>{new Date(sc.createdAt).toLocaleDateString()}</td>
                      <td><span className={`pill pill-${(sc.riskLevel ?? 'low').toLowerCase()}`}>{sc.riskLevel ?? 'LOW'}</span></td>
                      <td>{sc.averageRisk ?? '—'}</td>
                      <td>{sc.totalDependencies}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="insight-stack">
          <Card title="Risk distribution" className="chart-card">
            {scans.length === 0 ? (
              <div className="empty-state">Run a scan to see risk distribution.</div>
            ) : (
              <Chart data={chartData} />
            )}
          </Card>

          <Card title="Scan insights" className="insight-card">
            {scans.length === 0 ? (
              <div className="empty-state">Run a scan to see insights.</div>
            ) : (
              <div className="insight-list">
                <div className="insight-item">
                  <div className="insight-label">Total packages evaluated</div>
                  <div className="insight-value">{totalDependencies}</div>
                </div>
                <div className="insight-item">
                  <div className="insight-label">High-risk exposure</div>
                  <div className="insight-value">{highRiskScans} scan{highRiskScans !== 1 ? 's' : ''}</div>
                </div>
                <div className="insight-item">
                  <div className="insight-label">Recommended action</div>
                  <div className="insight-value">
                    {highRiskScans > 0 ? 'Review CRITICAL and HIGH dependencies' : 'No critical issues detected'}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
