import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';

export default function OrganizationOverview() {
  const { data: repos, isLoading: reposLoading } = useQuery(['repos'], () => api.getRepositories());
  const { data: scansData } = useQuery(['scans', { page: 1, limit: 1 }], () => api.getScans({ page: 1, limit: 1 }));

  const totalRepos = (repos ?? []).length;
  const totalScans = scansData?.total ?? 0;

  if (reposLoading) {
    return (
      <div className="page">
        <div className="dashboard-status">
          <Spinner size="lg" />
          <p className="text-muted" style={{ marginTop: '1rem' }}>Loading organization data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ── Page header ── */}
      <header className="page-header">
        <div>
          <p className="eyebrow">Organization overview</p>
          <h1 className="page-title">Repository security at a glance</h1>
          <p className="page-subtitle">
            Security posture across all tracked repositories and scan sessions.
          </p>
        </div>
      </header>

      {/* ── KPI metric cards ── */}
      <section className="metrics-grid">
        <Card className="metric-card">
          <p className="metric-label">Repositories</p>
          <p className="metric-value">{totalRepos}</p>
          <p className="metric-note">Tracked repositories</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Total scans</p>
          <p className="metric-value">{totalScans}</p>
          <p className="metric-note">Scan sessions across all projects</p>
        </Card>
      </section>

      {/* ── Repository list or empty state ── */}
      {totalRepos === 0 ? (
        <Card>
          <EmptyState
            Icon={
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            }
            title="No repositories yet"
            description="Repositories are created automatically when scans are associated with a project. Run a scan and link it to a repository to see organisation-level analytics here."
          />
        </Card>
      ) : (
        <Card
          title="Repositories"
          actions={
            <span className="text-muted text-sm">{totalRepos} repositor{totalRepos !== 1 ? 'ies' : 'y'}</span>
          }
          flush
        >
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {(repos ?? []).map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 600 }}>{r.name}</span>
                    </td>
                    <td>{r.description ?? <span className="text-faint">—</span>}</td>
                    <td className="scan-id-cell text-muted text-sm">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
