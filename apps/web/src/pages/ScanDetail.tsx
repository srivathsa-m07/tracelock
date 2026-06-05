import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import Card from '../ui/Card';

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

  if (scanLoading) return <div className="dashboard-status">Loading scan details…</div>;
  if (!scanData) return <div className="dashboard-status">Scan not found.</div>;

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
    <div className="dashboard-page">
      <section className="dashboard-summary">
        <div className="summary-copy">
          <p className="eyebrow">Scan detail</p>
          <h2>Vulnerability intelligence report</h2>
          <p>
            Advisory data from <a href="https://osv.dev" target="_blank" rel="noopener noreferrer" className="scan-link">OSV.dev</a>
            {' '}· Scan <span className="scan-id-inline">…{shortId}</span>
            {' '}· {new Date(scan.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="scan-detail-actions">
          <Link to={`/scans/${scan.id}/propagation`} className="button button-secondary">Attack paths</Link>
          <Link to={`/scans/${scan.id}/dependency-tree`} className="button button-secondary">Dep. tree</Link>
          <Link to={`/scans/${scan.id}/graph`} className="button button-secondary">Graph</Link>
          <button className="button button-secondary" onClick={() => handleExport('cyclonedx')}>SBOM ↓</button>
        </div>
      </section>

      <section className="metrics-grid">
        <Card title="Total vulnerabilities" className="metric-card">
          <p className="metric-value">{vulnLoading ? '…' : totalVulns}</p>
          <p className="metric-note">Advisories matched via OSV.dev</p>
        </Card>
        <Card title="Affected packages" className="metric-card">
          <p className="metric-value">{vulnLoading ? '…' : affectedDeps}</p>
          <p className="metric-note">Packages with at least one advisory</p>
        </Card>
        <Card title="Critical / High" className="metric-card">
          <p className="metric-value">{vulnLoading ? '…' : `${sevCounts.CRITICAL} / ${sevCounts.HIGH}`}</p>
          <p className="metric-note">Highest-severity findings</p>
        </Card>
        <Card title="Dependencies" className="metric-card">
          <p className="metric-value">{scan.totalDependencies}</p>
          <p className="metric-note">{scan.totalDevDependencies} dev · {scan.totalDependencies - scan.totalDevDependencies} prod</p>
        </Card>
      </section>

      <Card title="Vulnerability findings">
        {vulnLoading ? (
          <div className="empty-state">Fetching OSV advisory data…</div>
        ) : vulnGroups.length === 0 ? (
          <div className="empty-state-block">
            <p className="empty-state-title">No vulnerabilities found</p>
            <p className="empty-state-body">No known advisories matched the dependencies in this scan via OSV.dev.</p>
          </div>
        ) : (
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
        )}
      </Card>

      <Card title={`All dependencies (${deps.length})`}>
        {deps.length === 0 ? (
          <div className="empty-state">No dependencies recorded for this scan.</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Package</th><th>Version</th><th>Type</th><th>Risk</th><th>Score</th></tr>
              </thead>
              <tbody>
                {deps.map((d: any) => (
                  <tr key={d.id}>
                    <td className="vuln-pkg-name">{d.name}</td>
                    <td className="scan-id-cell">{d.version}</td>
                    <td><span className={`pill pill-${d.type === 'devDependency' ? 'medium' : 'low'} pill-type`}>{d.type === 'devDependency' ? 'dev' : 'prod'}</span></td>
                    <td>{d.riskLevel ? <SeverityBadge level={d.riskLevel} /> : <span className="text-muted">—</span>}</td>
                    <td>{d.riskScore != null ? Math.round(d.riskScore) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
