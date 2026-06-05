import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
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

  if (isLoading) return <div className="dashboard-status">Loading analytics…</div>;

  return (
    <div className="dashboard-page">
      <section className="dashboard-summary">
        <div className="summary-copy">
          <p className="eyebrow">Executive overview</p>
          <h2>Historical security posture and trends</h2>
          <p>Vulnerability trends, posture improvement, and risk concentration across all scans.</p>
        </div>
      </section>

      <section className="metrics-grid">
        <Card title="Posture improvement" className="metric-card">
          <p className="metric-value">
            {summary.postureImprovement != null ? `${summary.postureImprovement}%` : '—'}
          </p>
          <p className="metric-note">Change in total vulnerabilities since first scan</p>
        </Card>
        <Card title="Critical reduction" className="metric-card">
          <p className="metric-value">
            {summary.criticalReduction != null ? `${summary.criticalReduction}%` : '—'}
          </p>
          <p className="metric-note">Critical advisories — first vs latest scan</p>
        </Card>
        <Card title="Scans analysed" className="metric-card">
          <p className="metric-value">{summary.scans ?? 0}</p>
          <p className="metric-note">Total scan sessions in history</p>
        </Card>
      </section>

      {!hasEnoughData ? (
        <Card>
          <div className="empty-state-block">
            <p className="empty-state-title">Not enough scan history</p>
            <p className="empty-state-body">
              Run at least 2 scans to see trend charts. Historical trend analysis requires multiple data points over time.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card title="Vulnerability trend over time">
            <div style={{ height: 220 }}>
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

          <Card title="Dependency exposure over time">
            <div style={{ height: 220 }}>
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
        </>
      )}
    </div>
  );
}
