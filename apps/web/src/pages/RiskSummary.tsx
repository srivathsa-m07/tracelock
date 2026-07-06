import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
import Chart from '../ui/Chart';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';

export default function RiskSummary() {
  const { scanId } = useParams();
  const { data, isLoading } = useQuery(['risk', scanId], () => api.getRiskSummary(scanId as string), { enabled: !!scanId });

  if (isLoading) {
    return (
      <div className="page">
        <div className="dashboard-status">
          <Spinner size="lg" />
          <p className="text-muted">Loading risk summary…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <EmptyState
          title="Risk data unavailable"
          description="Unable to load the risk summary for this scan. Please try again later."
        />
      </div>
    );
  }

  const topRisks: { id: string; riskScore: number }[] = data.top ?? [];

  /* Derive distribution buckets from top-risk items for Chart */
  const distribution = [
    { name: 'Critical', value: topRisks.filter((t) => t.riskScore >= 9).length },
    { name: 'High', value: topRisks.filter((t) => t.riskScore >= 7 && t.riskScore < 9).length },
    { name: 'Medium', value: topRisks.filter((t) => t.riskScore >= 4 && t.riskScore < 7).length },
    { name: 'Low', value: topRisks.filter((t) => t.riskScore < 4).length },
  ];

  return (
    <div className="page">
      {/* ── Page header ── */}
      <header className="page-header">
        <div>
          <p className="eyebrow">Risk analysis</p>
          <h1 className="page-title">Risk Summary</h1>
          <p className="page-subtitle">
            Top risk dependencies and severity distribution for this scan.
          </p>
        </div>
      </header>

      {/* ── Metrics row ── */}
      <section className="metrics-grid metrics-grid-3">
        <Card className="metric-card">
          <p className="metric-label">Top risk score</p>
          <p className="metric-value">{topRisks.length > 0 ? topRisks[0].riskScore.toFixed(1) : '—'}</p>
          <p className="metric-note">Highest individual risk score</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Packages assessed</p>
          <p className="metric-value">{topRisks.length}</p>
          <p className="metric-note">Dependencies with computed risk</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Critical + High</p>
          <p className="metric-value">{distribution[0].value + distribution[1].value}</p>
          <p className="metric-note">Packages scoring ≥ 7.0</p>
        </Card>
      </section>

      {/* ── Content grid ── */}
      <section className="metrics-grid">
        {/* Top risk dependencies */}
        <Card title="Top risk dependencies">
          {topRisks.length === 0 ? (
            <EmptyState
              title="No risk data"
              description="No dependency risk scores have been computed for this scan."
            />
          ) : (
            <div className="insight-list">
              {topRisks.map((t) => {
                let severity = 'low';
                if (t.riskScore >= 9) severity = 'critical';
                else if (t.riskScore >= 7) severity = 'high';
                else if (t.riskScore >= 4) severity = 'medium';

                return (
                  <div key={t.id} className="insight-item">
                    <span className="insight-label font-mono">{t.id}</span>
                    <span className="insight-value">
                      <span className={`pill pill-${severity}`}>{t.riskScore.toFixed(1)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Distribution chart */}
        <Card title="Risk distribution">
          <Chart data={distribution} />
        </Card>
      </section>
    </div>
  );
}
