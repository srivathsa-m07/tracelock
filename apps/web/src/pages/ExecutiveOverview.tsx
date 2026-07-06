import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

export default function ExecutiveOverview() {
  const { data: trendsData, isLoading } = useQuery(['analytics-trends'], () => api.getAnalyticsTrends());
  const series = trendsData?.series ?? [];
  const summary = trendsData?.summary ?? {};
  const hasEnoughData = series.length >= 2;

  const chartSeries = series.map((s: any) => ({
    date: new Date(s.date).toLocaleDateString(),
    vulns: s.totalVulns,
    critical: s.critical,
    high: s.high,
    deps: s.totalDependencies,
  }));

  if (isLoading) {
    return (
      <div className="page">
        <div className="dashboard-status">
          <Spinner size="lg" />
          <p className="text-muted">Loading analytics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ── Page header ── */}
      <header className="page-header">
        <div>
          <p className="eyebrow">Executive overview</p>
          <h1 className="page-title">Historical security posture</h1>
          <p className="page-subtitle">
            Vulnerability trends, posture improvement, and risk concentration across all scans.
          </p>
        </div>
      </header>

      {/* ── Summary metrics ── */}
      <section className="metrics-grid metrics-grid-3">
        <Card className="metric-card">
          <p className="metric-label">Posture improvement</p>
          <p className="metric-value">
            {summary.postureImprovement != null ? `${summary.postureImprovement}%` : '—'}
          </p>
          <p className="metric-note">Change in total vulnerabilities since first scan</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Critical reduction</p>
          <p className="metric-value">
            {summary.criticalReduction != null ? `${summary.criticalReduction}%` : '—'}
          </p>
          <p className="metric-note">Critical advisories — first vs latest scan</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Scans analysed</p>
          <p className="metric-value">{summary.scans ?? 0}</p>
          <p className="metric-note">Total scan sessions in history</p>
        </Card>
      </section>

      {/* ── Trend charts ── */}
      {!hasEnoughData ? (
        <Card>
          <EmptyState
            title="Not enough scan history"
            description="Run at least 2 scans to see trend charts. Historical trend analysis requires multiple data points over time."
          />
        </Card>
      ) : (
        <>
          <section>
            <div className="section-header">
              <h2 className="section-title">Vulnerability trend over time</h2>
            </div>
            <Card>
              <div style={{ height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={chartSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="vulns" name="Total vulns" stroke="#b80d57" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="critical" name="Critical" stroke="#d64545" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section>
            <div className="section-header">
              <h2 className="section-title">Dependency exposure over time</h2>
            </div>
            <Card>
              <div style={{ height: 280 }}>
                <ResponsiveContainer>
                  <AreaChart data={chartSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="deps" name="Dependencies" stroke="#3751ff" fill="rgba(55,81,255,0.1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
