import { prisma } from '../../utils/prisma';

/**
 * Historical analytics service.
 * Computes trends across scans using stored scan rows and related dependency/vulnerability counts.
 */
export async function getVulnerabilityHistory() {
  // return array of { scanId, createdAt, totalVulns, critical, high, vulnerablePackages, totalDependencies }
  const scans = await prisma.scan.findMany({ orderBy: { createdAt: 'asc' } });
  const rows = [] as any[];
  for (const s of scans) {
    // count vulnerabilities via join table dependency_vulnerabilities -> vulnerability
    const vulnCount = await prisma.dependencyVulnerability.count({ where: { dependency: { scanId: s.id } } }).catch(() => 0);
    const critical = await prisma.dependencyVulnerability.count({ where: { dependency: { scanId: s.id }, vulnerability: { severity: 'CRITICAL' } } }).catch(() => 0);
    const high = await prisma.dependencyVulnerability.count({ where: { dependency: { scanId: s.id }, vulnerability: { severity: 'HIGH' } } }).catch(() => 0);

    const vulnerablePackages = await prisma.dependency.count({ where: { scanId: s.id, vulnerabilities: { some: {} } } }).catch(() => 0);

    rows.push({ scanId: s.id, createdAt: s.createdAt, totalVulns: vulnCount, critical, high, vulnerablePackages, totalDependencies: s.totalDependencies ?? 0 });
  }
  return rows;
}

export async function getTrends() {
  const history = await getVulnerabilityHistory();
  if (history.length === 0) return { series: [], summary: {} };

  const series = history.map((r) => ({ date: r.createdAt, totalVulns: r.totalVulns, critical: r.critical, high: r.high, vulnerablePackages: r.vulnerablePackages, totalDependencies: r.totalDependencies }));

  // compute basic improvement metrics
  const first = history[0];
  const last = history[history.length - 1];
  const postureImprovement = first.totalVulns > 0 ? Math.round(((first.totalVulns - last.totalVulns) / first.totalVulns) * 100) : 0;
  const criticalReduction = first.critical > 0 ? Math.round(((first.critical - last.critical) / first.critical) * 100) : 0;

  return { series, summary: { postureImprovement, criticalReduction, scans: history.length } };
}

export async function getSecurityPosture() {
  const trends = await getTrends();
  const latest = trends.series[trends.series.length - 1] ?? null;
  return { trends: trends.series, summary: trends.summary, latest };
}
