import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';

interface Vulnerability {
  id: string;
  summary?: string;
  severity?: string;
  cvssScore?: number;
  aliases?: string[];
  fixedVersions?: string[];
  publishedAt?: string;
}

interface VulnGroup {
  dependency: { id: string; name: string; version: string; type: string; riskScore?: number; riskLevel?: string };
  vulnerabilities: Vulnerability[];
}

function SeverityBadge({ level }: { level: string }) {
  return <span className={`pill pill-${(level ?? 'unknown').toLowerCase()}`}>{level ?? 'UNKNOWN'}</span>;
}

function VulnCard({ vuln }: { vuln: Vulnerability }) {
  const cves  = (vuln.aliases ?? []).filter((a) => a.startsWith('CVE-'));
  const ghsas = (vuln.aliases ?? []).filter((a) => a.startsWith('GHSA-'));
  const other = (vuln.aliases ?? []).filter((a) => !a.startsWith('CVE-') && !a.startsWith('GHSA-'));

  return (
    <div className="vuln-card">
      <div className="vuln-card-header">
        <div className="vuln-id-row">
          <span className="vuln-osv-id">{vuln.id}</span>
          {vuln.severity && <SeverityBadge level={vuln.severity} />}
          {vuln.cvssScore != null && <span className="vuln-cvss">CVSS {vuln.cvssScore.toFixed(1)}</span>}
        </div>
        {vuln.summary && <p className="vuln-summary">{vuln.summary}</p>}
      </div>
      <div className="vuln-meta">
        {cves.length > 0 && (
          <div className="vuln-meta-row">
            <span className="vuln-meta-label">CVE</span>
            <div className="vuln-id-list">
              {cves.map((id) => <a key={id} href={`https://nvd.nist.gov/vuln/detail/${id}`} target="_blank" rel="noopener noreferrer" className="vuln-id-chip vuln-id-cve">{id}</a>)}
            </div>
          </div>
        )}
        {ghsas.length > 0 && (
          <div className="vuln-meta-row">
            <span className="vuln-meta-label">GHSA</span>
            <div className="vuln-id-list">
              {ghsas.map((id) => <a key={id} href={`https://github.com/advisories/${id}`} target="_blank" rel="noopener noreferrer" className="vuln-id-chip vuln-id-ghsa">{id}</a>)}
            </div>
          </div>
        )}
        {other.length > 0 && (
          <div className="vuln-meta-row">
            <span className="vuln-meta-label">Aliases</span>
            <div className="vuln-id-list">{other.map((id) => <span key={id} className="vuln-id-chip">{id}</span>)}</div>
          </div>
        )}
        {(vuln.fixedVersions?.length ?? 0) > 0 && (
          <div className="vuln-meta-row">
            <span className="vuln-meta-label">Fixed in</span>
            <div className="vuln-id-list">{vuln.fixedVersions!.map((v) => <span key={v} className="vuln-id-chip vuln-id-fixed">{v}</span>)}</div>
          </div>
        )}
        {vuln.publishedAt && (
          <div className="vuln-meta-row">
            <span className="vuln-meta-label">Published</span>
            <span className="vuln-meta-value">{new Date(vuln.publishedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScanDetail() {
  const { scanId } = useParams();

  const { data: scanData, isLoading: scanLoading } = useQuery(
    ['scan', scanId],
    () => api.getScan(scanId as string),
    { enabled: !!scanId }
  );

  const { data: vulnData, isLoading: vulnLoading } = useQuery(
    ['scan-vulns', scanId],
    () => api.getScanVulnerabilities(scanId as string),
    { enabled: !!scanId }
  );

  if (scanLoading) {
    return (
      <div className="page">
        <div className="dashboard-status">
          <Spinner size="lg" />
          <p className="text-muted">Loading scan details…</p>
        </div>
      </div>
    );
  }

  if (!scanData) {
    return (
      <div className="page">
        <EmptyState
          title="Scan not found"
          description="The requested scan could not be located. It may have been deleted or the ID is invalid."
        />
      </div>
    );
  }

  const scan = scanData.scan;
  const deps: any[] = (scanData.dependencies ?? []).filter((d: any) => !d.name.startsWith('__root__'));
  const vulnGroups: VulnGroup[] = vulnData ?? [];
  const totalVulns = vulnGroups.reduce((s, g) => s + g.vulnerabilities.length, 0);
  const affectedDeps = vulnGroups.length;
  const sevCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
  for (const g of vulnGroups) {
    for (const v of g.vulnerabilities) {
      const s = (v.severity ?? 'UNKNOWN') as keyof typeof sevCounts;
      sevCounts[s] = (sevCounts[s] ?? 0) + 1;
    }
  }

  const handleExport = async (type: 'cyclonedx' | 'spdx') => {
    if (!scanId) return;
    try {
      const data = type === 'cyclonedx' ? await api.getScanSbomCyclone(scanId) : await api.getScanSbomSpdx(scanId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `sbom-${scanId}-${type}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { alert('Failed to export SBOM'); }
  };

  const shortId = scan.id.slice(-8);

  return (
    <div className="page">
      {/* ── Page header ── */}
      <header className="page-header">
        <div>
          <p className="eyebrow">Scan detail</p>
          <h1 className="page-title">Vulnerability intelligence report</h1>
          <p className="page-subtitle">
            Advisory data from{' '}
            <a href="https://osv.dev" target="_blank" rel="noopener noreferrer" className="scan-link">OSV.dev</a>
            {' · '}Scan <span className="scan-id-inline font-mono">…{shortId}</span>
            {' · '}{new Date(scan.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="page-actions">
          <Link to={`/scans/${scan.id}/propagation`} className="btn btn-secondary btn-sm">Attack paths</Link>
          <Link to={`/scans/${scan.id}/dependency-tree`} className="btn btn-secondary btn-sm">Dep. tree</Link>
          <Link to={`/scans/${scan.id}/graph`} className="btn btn-secondary btn-sm">Graph</Link>
          <button className="btn btn-primary btn-sm" onClick={() => handleExport('cyclonedx')}>Export SBOM</button>
        </div>
      </header>

      {/* ── Metrics ── */}
      <section className="metrics-grid">
        <Card className="metric-card">
          <p className="metric-label">Total vulnerabilities</p>
          <p className="metric-value">{vulnLoading ? <Spinner size="sm" /> : totalVulns}</p>
          <p className="metric-note">Advisories matched via OSV.dev</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Affected packages</p>
          <p className="metric-value">{vulnLoading ? <Spinner size="sm" /> : affectedDeps}</p>
          <p className="metric-note">Packages with at least one advisory</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Critical / High</p>
          <p className="metric-value">{vulnLoading ? <Spinner size="sm" /> : `${sevCounts.CRITICAL} / ${sevCounts.HIGH}`}</p>
          <p className="metric-note">Highest-severity findings</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-label">Dependencies</p>
          <p className="metric-value">{scan.totalDependencies}</p>
          <p className="metric-note">{scan.totalDevDependencies} dev · {scan.totalDependencies - scan.totalDevDependencies} prod</p>
        </Card>
      </section>

      {/* ── Severity breakdown ── */}
      {!vulnLoading && totalVulns > 0 && (
        <section className="metrics-grid">
          <Card className="metric-card">
            <p className="metric-label">Critical</p>
            <p className="metric-value"><span className="pill pill-critical">{sevCounts.CRITICAL}</span></p>
          </Card>
          <Card className="metric-card">
            <p className="metric-label">High</p>
            <p className="metric-value"><span className="pill pill-high">{sevCounts.HIGH}</span></p>
          </Card>
          <Card className="metric-card">
            <p className="metric-label">Medium</p>
            <p className="metric-value"><span className="pill pill-medium">{sevCounts.MEDIUM}</span></p>
          </Card>
          <Card className="metric-card">
            <p className="metric-label">Low</p>
            <p className="metric-value"><span className="pill pill-low">{sevCounts.LOW}</span></p>
          </Card>
        </section>
      )}

      {/* ── Vulnerability findings ── */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Vulnerability findings</h2>
          {!vulnLoading && <span className="tab-badge">{totalVulns}</span>}
        </div>

        {vulnLoading ? (
          <Card>
            <div className="dashboard-status">
              <Spinner size="md" />
              <p className="text-muted">Fetching OSV advisory data…</p>
            </div>
          </Card>
        ) : vulnGroups.length === 0 ? (
          <Card>
            <EmptyState
              title="No vulnerabilities found"
              description="No known advisories matched the dependencies in this scan via OSV.dev."
            />
          </Card>
        ) : (
          <Card flush>
            <div className="vuln-findings">
              {vulnGroups.map((group) => (
                <div key={group.dependency.id} className="vuln-dep-group">
                  <div className="vuln-dep-header">
                    <div className="vuln-dep-name">
                      <span className="vuln-pkg-name">{group.dependency.name}</span>
                      <span className="vuln-pkg-version">@{group.dependency.version}</span>
                      <span className={`pill pill-${group.dependency.type === 'devDependency' ? 'medium' : 'low'} pill-type`}>
                        {group.dependency.type === 'devDependency' ? 'dev' : 'prod'}
                      </span>
                    </div>
                    <div className="vuln-dep-count">{group.vulnerabilities.length} advisor{group.vulnerabilities.length === 1 ? 'y' : 'ies'}</div>
                  </div>
                  <div className="vuln-list">
                    {group.vulnerabilities.map((v) => <VulnCard key={v.id} vuln={v} />)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* ── Dependency table ── */}
      <section>
        <div className="section-header">
          <h2 className="section-title">All dependencies</h2>
          <span className="tab-badge">{deps.length}</span>
        </div>

        {deps.length === 0 ? (
          <Card>
            <EmptyState
              title="No dependencies"
              description="No dependencies were recorded for this scan."
            />
          </Card>
        ) : (
          <Card flush>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Version</th>
                    <th>Type</th>
                    <th>Risk level</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {deps.map((d: any) => (
                    <tr key={d.id}>
                      <td className="vuln-pkg-name">{d.name}</td>
                      <td className="scan-id-cell font-mono">{d.version}</td>
                      <td>
                        <span className={`pill pill-${d.type === 'devDependency' ? 'medium' : 'low'} pill-type`}>
                          {d.type === 'devDependency' ? 'dev' : 'prod'}
                        </span>
                      </td>
                      <td>{d.riskLevel ? <SeverityBadge level={d.riskLevel} /> : <span className="text-muted">—</span>}</td>
                      <td className="font-mono">{d.riskScore != null ? Math.round(d.riskScore) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
