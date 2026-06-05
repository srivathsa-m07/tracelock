import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';

function TreeNode({ dep, isLast }: { dep: any; isLast: boolean }) {
  return (
    <div className="tree-node-row">
      <span className="tree-connector">{isLast ? '└─' : '├─'}</span>
      <span className="tree-pkg-name">{dep.name}</span>
      <span className="tree-pkg-version">@{dep.version}</span>
      {dep.riskLevel && (
        <span className={`pill pill-${dep.riskLevel.toLowerCase()} pill-type`}>{dep.riskLevel}</span>
      )}
      {(dep.children?.length > 0) && (
        <span className="tree-children-badge">{dep.children.length} children</span>
      )}
    </div>
  );
}

export default function DependencyTree() {
  const { scanId } = useParams();

  const { data: tree, isLoading, error } = useQuery(
    ['dep-tree', scanId],
    () => api.getScanDependencyTree(scanId as string),
    { enabled: !!scanId }
  );

  if (isLoading) return <div className="dashboard-status">Loading dependency tree…</div>;
  if (error) return <div className="dashboard-status">Failed to load dependency tree.</div>;
  if (!tree) return null;

  return (
    <div className="dashboard-page">
      <section className="dashboard-summary">
        <div className="summary-copy">
          <p className="eyebrow">Dependency tree</p>
          <h2>Full dependency hierarchy</h2>
          <p>Direct and transitive packages resolved from this scan.</p>
        </div>
        <div className="scan-detail-actions">
          <Link to={`/scans/${scanId}`} className="button button-secondary">← Scan detail</Link>
          <Link to={`/scans/${scanId}/graph`} className="button button-secondary">Open graph</Link>
        </div>
      </section>

      <section className="metrics-grid">
        <Card title="Direct dependencies" className="metric-card">
          <p className="metric-value">{tree.direct?.length ?? 0}</p>
          <p className="metric-note">Declared in package.json</p>
        </Card>
        <Card title="Transitive dependencies" className="metric-card">
          <p className="metric-value">{tree.totalTransitive ?? 0}</p>
          <p className="metric-note">Resolved indirect packages</p>
        </Card>
        <Card title="Max depth" className="metric-card">
          <p className="metric-value">{tree.maxDepth ?? 1}</p>
          <p className="metric-note">Deepest dependency chain level</p>
        </Card>
        <Card title="Total nodes" className="metric-card">
          <p className="metric-value">{tree.nodeCount ?? tree.totalDependencies}</p>
          <p className="metric-note">All unique packages in graph</p>
        </Card>
      </section>

      <Card title={`Direct dependencies (${tree.direct?.length ?? 0})`}>
        {!tree.direct?.length ? (
          <div className="empty-state">No direct dependencies found.</div>
        ) : (
          <div className="tree-list">
            {tree.direct.map((dep: any, i: number) => (
              <div key={dep.id} className="tree-direct-item">
                <TreeNode dep={dep} isLast={i === tree.direct.length - 1} />
                {dep.children?.length > 0 && (
                  <div className="tree-children">
                    {dep.children.slice(0, 8).map((c: any, ci: number) => (
                      <div key={c?.id ?? ci} className="tree-child-row">
                        <span className="tree-child-connector">{ci === Math.min(dep.children.length, 8) - 1 ? '  └─' : '  ├─'}</span>
                        <span className="tree-pkg-name tree-child-name">{c?.name ?? '—'}</span>
                        <span className="tree-pkg-version">@{c?.version ?? '?'}</span>
                      </div>
                    ))}
                    {dep.children.length > 8 && (
                      <div className="tree-child-row tree-more">
                        <span className="tree-child-connector">  └─</span>
                        <span className="tree-more-label">+{dep.children.length - 8} more transitive</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {tree.transitive?.length > 0 && (
        <Card title={`Transitive dependencies (${tree.transitive.length})`}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Package</th><th>Version</th><th>Depth</th><th>Risk</th></tr>
              </thead>
              <tbody>
                {tree.transitive.map((dep: any) => (
                  <tr key={dep.id}>
                    <td className="vuln-pkg-name">{dep.name}</td>
                    <td className="scan-id-cell">{dep.version}</td>
                    <td>{dep.depth ?? '—'}</td>
                    <td>{dep.riskLevel
                      ? <span className={`pill pill-${dep.riskLevel.toLowerCase()} pill-type`}>{dep.riskLevel}</span>
                      : '—'}
                    </td>
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
