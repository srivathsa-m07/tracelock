import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
import Chart from '../ui/Chart';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';

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
  const chartData = Object.entries(riskCounts).map(([name, value]) => ({ name, value: value as number }));

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-status">
          <Spinner size="lg" />
          <p className="text-muted" style={{ marginTop: '1rem' }}>Loading scan metrics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* ── Hero section ── */}
      <section className="dashboard-hero">
        <div className="dashboard-hero-grid">
          <div>
            <p className="dashboard-hero-eyebrow">Risk Operations</p>
            <h1 className="dashboard-hero-title">
              {averageRisk !== null ? (
                <>Risk score: <span className="text-primary">{averageRisk}</span></>
              ) : (
                'No risk data yet'
              )}
            </h1>
            <p className="dashboard-hero-sub">
              Real-time dependency risk analysis across {totalScans} scan {totalScans === 1 ? 'session' : 'sessions'}.
              {highRiskScans > 0
                ? ` ${highRiskScans} scan${highRiskScans !== 1 ? 's' : ''} flagged with elevated exposure.`
                : ' No critical issues detected.'}
            </p>
          </div>

          <div className="dashboard-hero-kpi">
            <div>
              <span className="dashboard-hero-kpi-value">{totalScans}</span>
              <span className="dashboard-hero-kpi-label">Total scans</span>
            </div>
            <div>
              <span className="dashboard-hero-kpi-value">{totalDependencies}</span>
              <span className="dashboard-hero-kpi-label">Packages scanned</span>
            </div>
            <div>
              <span className="dashboard-hero-kpi-value">{highRiskScans}</span>
              <span className="dashboard-hero-kpi-label">High-risk</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI metric cards ── */}
      <section className="metrics-grid">
        <Card className="metric-card">
          <p className="metric-label">Average risk score</p>
          <p className="metric-value">{averageRisk ?? '—'}</p>
          <p className="metric-note">Across the {scans.length} most recent scans</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Total scans</p>
          <p className="metric-value">{totalScans}</p>
          <p className="metric-note">Completed scan sessions</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Dependencies scanned</p>
          <p className="metric-value">{totalDependencies}</p>
          <p className="metric-note">Packages evaluated in current window</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">High-risk scans</p>
          <p className="metric-value">{highRiskScans}</p>
          <p className="metric-note">Scans with HIGH or CRITICAL exposure</p>
        </Card>
      </section>

      {/* ── Main dashboard grid ── */}
      <section className="dashboard-grid">
        {/* Activity table */}
        <Card
          title="Recent scan activity"
          className="activity-card"
          actions={
            latestScans.length > 0 ? (
              <Link to="/scans" className="btn btn-secondary btn-sm">View all scans</Link>
            ) : undefined
          }
          flush
        >
          {latestScans.length === 0 ? (
            <EmptyState
              Icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              }
              title="No scans yet"
              description="Upload a package.json using the Run scan button to see risk data here."
            />
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Scan</th>
                    <th>Date</th>
                    <th>Risk level</th>
                    <th>Score</th>
                    <th>Dependencies</th>
                  </tr>
                </thead>
                <tbody>
                  {latestScans.map((sc: any) => (
                    <tr key={sc.id}>
                      <td className="scan-id-cell">
                        <Link to={`/scans/${sc.id}`} className="scan-link font-mono">…{sc.id.slice(-8)}</Link>
                      </td>
                      <td className="text-muted">{new Date(sc.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`pill pill-${(sc.riskLevel ?? 'low').toLowerCase()}`}>
                          {sc.riskLevel ?? 'LOW'}
                        </span>
                      </td>
                      <td className="font-mono">{sc.averageRisk ?? '—'}</td>
                      <td className="font-mono">{sc.totalDependencies}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Sidebar: chart + insights */}
        <div className="insight-stack">
          <Card title="Risk distribution" className="chart-card">
            {scans.length === 0 ? (
              <EmptyState
                Icon={
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                }
                title="No distribution data"
                description="Run a scan to see risk distribution across your dependencies."
              />
            ) : (
              <Chart data={chartData} />
            )}
          </Card>

          <Card title="Scan insights" className="insight-card">
            {scans.length === 0 ? (
              <EmptyState
                Icon={
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                }
                title="No insights yet"
                description="Run a scan to generate dependency insights."
              />
            ) : (
              <div className="insight-list">
                <div className="insight-item">
                  <div className="insight-label">Total packages evaluated</div>
                  <div className="insight-value font-mono">{totalDependencies}</div>
                </div>
                <div className="insight-item">
                  <div className="insight-label">High-risk exposure</div>
                  <div className="insight-value font-mono">
                    {highRiskScans} scan{highRiskScans !== 1 ? 's' : ''}
                  </div>
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
