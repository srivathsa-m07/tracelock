import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';

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

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-loading">
          <Spinner size="lg" />
          <p className="page-loading-text">Loading dependency tree…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Card>
          <EmptyState
            Icon={
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
            title="Failed to load dependency tree"
            description="An error occurred while fetching dependency data. Please try refreshing the page."
          />
        </Card>
      </div>
    );
  }

  if (!tree) return null;

  const directCount = tree.direct?.length ?? 0;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dependency tree</p>
          <h1 className="page-title">Full dependency hierarchy</h1>
          <p className="page-subtitle">Direct and transitive packages resolved from this scan.</p>
        </div>
        <div className="page-actions">
          <Link to={`/scans/${scanId}`} className="btn btn-secondary btn-sm">← Scan detail</Link>
          <Link to={`/scans/${scanId}/graph`} className="btn btn-secondary btn-sm">Open graph</Link>
        </div>
      </header>

      {/* ── KPI metrics ── */}
      <section className="metrics-grid">
        <Card className="metric-card">
          <p className="metric-label">Direct dependencies</p>
          <p className="metric-value">{directCount}</p>
          <p className="metric-note">Declared in package.json</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Transitive dependencies</p>
          <p className="metric-value">{tree.totalTransitive ?? 0}</p>
          <p className="metric-note">Resolved indirect packages</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Max depth</p>
          <p className="metric-value">{tree.maxDepth ?? 1}</p>
          <p className="metric-note">Deepest dependency chain level</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Total nodes</p>
          <p className="metric-value">{tree.nodeCount ?? tree.totalDependencies}</p>
          <p className="metric-note">All unique packages in graph</p>
        </Card>
      </section>

      {/* ── Direct dependency tree ── */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Direct dependencies</h2>
          <span className="tab-badge">{directCount}</span>
        </div>
        <Card flush>
          {!tree.direct?.length ? (
            <EmptyState
              Icon={
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
              title="No direct dependencies"
              description="No direct dependencies found in this scan."
            />
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
      </section>

      {/* ── Transitive dependency table ── */}
      {tree.transitive?.length > 0 && (
        <section>
          <div className="section-header">
            <h2 className="section-title">Transitive dependencies</h2>
            <span className="tab-badge">{tree.transitive.length}</span>
          </div>
          <Card flush>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Version</th>
                    <th>Depth</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {tree.transitive.map((dep: any) => (
                    <tr key={dep.id}>
                      <td><span className="font-mono" style={{ fontWeight: 600 }}>{dep.name}</span></td>
                      <td className="font-mono text-muted">{dep.version}</td>
                      <td>{dep.depth ?? '—'}</td>
                      <td>{dep.riskLevel
                        ? <span className={`pill pill-${dep.riskLevel.toLowerCase()} pill-type`}>{dep.riskLevel}</span>
                        : <span className="text-faint">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
