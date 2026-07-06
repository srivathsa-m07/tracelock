import { Fragment, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';

interface PropNode {
  id: string;
  name: string;
  version: string;
  type: string;
  depth: number;
}

interface AttackPath {
  vulnerableDepId: string;
  vulnerableDepName: string;
  vulnerableDepVersion: string;
  vulnId: string;
  vulnSummary: string;
  severity: string;
  cvssScore: number | null;
  upstreamChain: PropNode[];
  downstreamImpact: PropNode[];
  blastRadius: number;
  exposureDepth: number;
  propagationScore: number;
  transitiveAmplification: number;
}

interface AnalysisResult {
  scanId: string;
  totalVulnerableNodes: number;
  totalBlastRadius: number;
  maxPropagationScore: number;
  avgPropagationScore: number;
  attackPaths: AttackPath[];
  topRiskNodes: Array<{
    id: string;
    name: string;
    version: string;
    propagationScore: number;
    blastRadius: number;
    vulnCount: number;
  }>;
}

function SeverityBadge({ level }: { level: string }) {
  return (
    <span className={`pill pill-${(level ?? 'unknown').toLowerCase()}`}>
      {level ?? 'UNKNOWN'}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 75 ? '#b80d57' :
    score >= 50 ? '#c0392b' :
    score >= 25 ? '#e67e22' :
    '#27ae60';
  return (
    <div className="prop-score-bar">
      <div className="prop-score-fill" style={{ width: `${score}%`, background: color }} />
      <span className="prop-score-label">{score}</span>
    </div>
  );
}

function AttackPathCard({ path, index }: { path: AttackPath; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="ap-card">
      <div
        className="ap-header"
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}
      >
        <div className="ap-header-left">
          <span className="ap-index">#{index + 1}</span>
          <span className="vuln-pkg-name">{path.vulnerableDepName}</span>
          <span className="vuln-pkg-version">@{path.vulnerableDepVersion}</span>
          <SeverityBadge level={path.severity} />
          {path.cvssScore != null && (
            <span className="vuln-cvss">CVSS {path.cvssScore.toFixed(1)}</span>
          )}
        </div>
        <div className="ap-header-right">
          <div className="ap-stat">
            <span className="ap-stat-label">Propagation</span>
            <ScoreBar score={path.propagationScore} />
          </div>
          <div className="ap-stat">
            <span className="ap-stat-label">Blast radius</span>
            <span className="ap-stat-value">{path.blastRadius}</span>
          </div>
          <div className="ap-stat">
            <span className="ap-stat-label">Amplification</span>
            <span className="ap-stat-value">×{path.transitiveAmplification}</span>
          </div>
          <span className="ap-toggle">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="ap-body">
          {path.vulnSummary && (
            <p className="ap-summary">{path.vulnSummary}</p>
          )}

          <div className="ap-section">
            <div className="ap-section-label">Advisory</div>
            <a
              href={`https://osv.dev/vulnerability/${path.vulnId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="vuln-id-chip"
            >
              {path.vulnId}
            </a>
          </div>

          <div className="ap-section">
            <div className="ap-section-label">
              Exposure metrics
            </div>
            <div className="ap-metrics-row">
              <div className="ap-metric-box">
                <div className="ap-metric-val">{path.exposureDepth}</div>
                <div className="ap-metric-key">Exposure depth</div>
              </div>
              <div className="ap-metric-box">
                <div className="ap-metric-val">{path.blastRadius}</div>
                <div className="ap-metric-key">Downstream packages</div>
              </div>
              <div className="ap-metric-box">
                <div className="ap-metric-val">×{path.transitiveAmplification}</div>
                <div className="ap-metric-key">Path amplification</div>
              </div>
              <div className="ap-metric-box">
                <div className="ap-metric-val">{path.propagationScore}</div>
                <div className="ap-metric-key">Propagation score</div>
              </div>
            </div>
          </div>

          {path.upstreamChain.length > 0 && (
            <div className="ap-section">
              <div className="ap-section-label">Upstream exposure chain</div>
              <div className="ap-chain">
                <div className="ap-chain-node ap-chain-source">
                  <span className="chain-pkg">{path.vulnerableDepName}</span>
                  <span className="chain-version">@{path.vulnerableDepVersion}</span>
                  <span className="chain-badge">VULNERABLE</span>
                </div>
                {path.upstreamChain.slice(0, 6).map((n) => (
                  <Fragment key={n.id}>
                    <span className="ap-chain-arrow">→</span>
                    <div className="ap-chain-node">
                      <span className="chain-pkg">{n.name}</span>
                      <span className="chain-version">@{n.version}</span>
                      <span className="chain-depth-tag">d{n.depth}</span>
                    </div>
                  </Fragment>
                ))}
                {path.upstreamChain.length > 6 && (
                  <span className="ap-chain-more">+{path.upstreamChain.length - 6} more</span>
                )}
              </div>
            </div>
          )}

          {path.downstreamImpact.length > 0 && (
            <div className="ap-section">
              <div className="ap-section-label">
                Downstream blast radius — {path.blastRadius} package{path.blastRadius !== 1 ? 's' : ''} exposed
              </div>
              <div className="ap-blast-tags">
                {path.downstreamImpact.slice(0, 16).map((n) => (
                  <span key={n.id} className="ap-blast-tag">
                    {n.name}
                    <span className="ap-blast-depth">d{n.depth}</span>
                  </span>
                ))}
                {path.downstreamImpact.length > 16 && (
                  <span className="ap-blast-tag ap-blast-more">
                    +{path.downstreamImpact.length - 16} more
                  </span>
                )}
              </div>
            </div>
          )}

          {path.upstreamChain.length === 0 && path.downstreamImpact.length === 0 && (
            <p className="ap-isolated">
              This dependency is isolated — no transitive connections detected in the current graph.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PropagationAnalysis() {
  const { scanId } = useParams();

  const { data, isLoading } = useQuery(
    ['attack-paths', scanId],
    () => api.getScanAttackPaths(scanId as string),
    { enabled: !!scanId }
  );

  const result: AnalysisResult | null = data ?? null;

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-loading">
          <Spinner size="lg" />
          <p className="page-loading-text">Computing propagation analysis…</p>
        </div>
      </div>
    );
  }

  const hasData = result && result.attackPaths.length > 0;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Attack propagation</p>
          <h1 className="page-title">Blast radius analysis</h1>
          <p className="page-subtitle">
            BFS/DFS graph traversal over real dependency relationships combined with OSV advisory
            data. Every metric is computed — no estimates, no placeholders.
          </p>
        </div>
        <div className="page-actions">
          <Link to={`/scans/${scanId}`} className="btn btn-secondary btn-sm">← Scan detail</Link>
        </div>
      </header>

      {!hasData ? (
        <Card>
          <EmptyState
            Icon={
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
            title="No propagation data available"
            description="No vulnerable dependencies were found in this scan. Upload a package.json with known vulnerable packages to see attack path analysis."
          />
          <div style={{ textAlign: 'center', paddingBottom: 24 }}>
            <Link to={`/scans/${scanId}`} className="btn btn-secondary btn-sm">
              ← Back to scan detail
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* ── KPI metrics ── */}
          <section className="metrics-grid">
            <Card className="metric-card">
              <p className="metric-label">Vulnerable nodes</p>
              <p className="metric-value">{result.totalVulnerableNodes}</p>
              <p className="metric-note">Packages with known advisories</p>
            </Card>
            <Card className="metric-card">
              <p className="metric-label">Total blast radius</p>
              <p className="metric-value">{result.totalBlastRadius}</p>
              <p className="metric-note">Unique downstream packages exposed</p>
            </Card>
            <Card className="metric-card">
              <p className="metric-label">Max propagation</p>
              <p className="metric-value">{result.maxPropagationScore}</p>
              <p className="metric-note">Severity × exposure × amplification</p>
            </Card>
            <Card className="metric-card">
              <p className="metric-label">Avg propagation</p>
              <p className="metric-value">{result.avgPropagationScore}</p>
              <p className="metric-note">Mean risk across all attack paths</p>
            </Card>
          </section>

          {/* ── Top risk nodes + Insights ── */}
          <section className="dashboard-grid">
            <Card
              title="Top risk nodes"
              actions={
                <span className="text-muted text-sm">
                  {result.topRiskNodes.length} node{result.topRiskNodes.length !== 1 ? 's' : ''}
                </span>
              }
              flush
            >
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Version</th>
                      <th>Advisories</th>
                      <th>Blast radius</th>
                      <th>Propagation score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.topRiskNodes.map((node) => (
                      <tr key={node.id}>
                        <td><span className="font-mono" style={{ fontWeight: 600 }}>{node.name}</span></td>
                        <td className="font-mono text-muted">{node.version}</td>
                        <td>{node.vulnCount}</td>
                        <td>{node.blastRadius}</td>
                        <td style={{ minWidth: 160 }}>
                          <ScoreBar score={node.propagationScore} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Propagation insights">
              <div className="insight-list">
                <div className="insight-item">
                  <div className="insight-label">Attack paths identified</div>
                  <div className="insight-value">{result.attackPaths.length}</div>
                </div>
                <div className="insight-item">
                  <div className="insight-label">Highest blast radius</div>
                  <div className="insight-value">
                    {result.topRiskNodes[0]
                      ? `${result.topRiskNodes[0].name} (${result.topRiskNodes[0].blastRadius})`
                      : '—'}
                  </div>
                </div>
                <div className="insight-item">
                  <div className="insight-label">Most amplified node</div>
                  <div className="insight-value">
                    {result.attackPaths[0]
                      ? `${result.attackPaths[0].vulnerableDepName} ×${result.attackPaths[0].transitiveAmplification}`
                      : '—'}
                  </div>
                </div>
                <div className="insight-item">
                  <div className="insight-label">Recommended action</div>
                  <div className="insight-value">
                    {result.maxPropagationScore >= 75
                      ? 'Immediate remediation required'
                      : result.maxPropagationScore >= 40
                      ? 'Schedule patching within sprint'
                      : 'Monitor and review at next cycle'}
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* ── Attack path cards ── */}
          <section>
            <div className="section-header">
              <h2 className="section-title">Attack paths</h2>
              <span className="tab-badge">{result.attackPaths.length}</span>
            </div>
            <div className="ap-list">
              {result.attackPaths.map((path, i) => (
                <AttackPathCard
                  key={`${path.vulnerableDepId}-${path.vulnId}`}
                  path={path}
                  index={i}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
