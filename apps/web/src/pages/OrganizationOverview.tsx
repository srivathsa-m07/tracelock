import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
import { useQuery as useScansQuery } from '@tanstack/react-query';

export default function OrganizationOverview() {
  const { data: repos, isLoading: reposLoading } = useQuery(['repos'], () => api.getRepositories());
  const { data: scansData } = useScansQuery(['scans', { page: 1, limit: 1 }], () => api.getScans({ page: 1, limit: 1 }));

  const totalRepos = (repos ?? []).length;
  const totalScans = scansData?.total ?? 0;

  if (reposLoading) return <div className="dashboard-status">Loading organization data…</div>;

  return (
    <div className="dashboard-page">
      <section className="dashboard-summary">
        <div className="summary-copy">
          <p className="eyebrow">Organization overview</p>
          <h2>Repository security at a glance</h2>
          <p>Security posture across all tracked repositories and scan sessions.</p>
        </div>
      </section>

      <section className="metrics-grid">
        <Card title="Repositories" className="metric-card">
          <p className="metric-value">{totalRepos}</p>
          <p className="metric-note">Tracked repositories</p>
        </Card>
        <Card title="Total scans" className="metric-card">
          <p className="metric-value">{totalScans}</p>
          <p className="metric-note">Scan sessions across all projects</p>
        </Card>
      </section>

      {totalRepos === 0 ? (
        <Card>
          <div className="empty-state-block">
            <p className="empty-state-title">No repositories yet</p>
            <p className="empty-state-body">
              Repositories are created automatically when scans are associated with a project.
              Run a scan and link it to a repository to see organisation-level analytics here.
            </p>
          </div>
        </Card>
      ) : (
        <Card title="Repositories">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Description</th><th>Created</th></tr>
              </thead>
              <tbody>
                {(repos ?? []).map((r: any) => (
                  <tr key={r.id}>
                    <td className="vuln-pkg-name">{r.name}</td>
                    <td>{r.description ?? <span className="text-muted">—</span>}</td>
                    <td className="scan-id-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
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
