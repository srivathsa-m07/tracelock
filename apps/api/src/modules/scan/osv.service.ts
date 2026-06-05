/**
 * OSV Service
 *
 * Thin client for the OSV.dev vulnerability API.
 * https://osv.dev/docs/
 *
 * Isolated here so the rest of the codebase never touches HTTP directly.
 */

const OSV_BASE = 'https://api.osv.dev/v1';

export interface OsvVulnerability {
  id: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  published?: string;
  modified?: string;
  severity?: Array<{ type: string; score: string }>;
  affected?: Array<{
    package?: { name: string; ecosystem: string };
    ranges?: Array<{
      type: string;
      events?: Array<{ introduced?: string; fixed?: string }>;
    }>;
    versions?: string[];
  }>;
}

interface OsvQueryResponse {
  vulns?: OsvVulnerability[];
}

/**
 * Query OSV for all vulnerabilities affecting a specific package version.
 * Uses the /query endpoint with package name + version.
 */
export async function queryOsvVulnerabilities(
  name: string,
  version: string,
  ecosystem = 'npm'
): Promise<OsvVulnerability[]> {
  // Strip semver range characters — OSV needs a concrete version
  const cleanVersion = version.replace(/^[\^~>=<*]/, '').trim();

  const body = {
    version: cleanVersion || undefined,
    package: { name, ecosystem },
  };

  try {
    const res = await fetch(`${OSV_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as OsvQueryResponse;
    return data.vulns ?? [];
  } catch {
    // Network failure — degrade gracefully, don't block the scan
    return [];
  }
}

/**
 * Extract the highest CVSS severity label from an OSV advisory.
 * Falls back to a heuristic based on CVSS score ranges.
 */
export function extractSeverity(vuln: OsvVulnerability): string {
  if (!vuln.severity?.length) return 'UNKNOWN';

  for (const s of vuln.severity) {
    if (s.type === 'CVSS_V3' || s.type === 'CVSS_V2') {
      const score = parseCvssScore(s.score);
      if (score !== null) return cvssScoreToLevel(score);
    }
  }
  return 'UNKNOWN';
}

export function extractCvssScore(vuln: OsvVulnerability): number | null {
  for (const s of vuln.severity ?? []) {
    const score = parseCvssScore(s.score);
    if (score !== null) return score;
  }
  return null;
}

/**
 * Extract all affected version strings from an OSV advisory.
 */
export function extractAffectedVersions(vuln: OsvVulnerability): string[] {
  const versions = new Set<string>();
  for (const affected of vuln.affected ?? []) {
    for (const v of affected.versions ?? []) versions.add(v);
  }
  return [...versions].slice(0, 50); // cap to avoid huge arrays
}

/**
 * Extract fixed version strings from range events.
 */
export function extractFixedVersions(vuln: OsvVulnerability): string[] {
  const fixed = new Set<string>();
  for (const affected of vuln.affected ?? []) {
    for (const range of affected.ranges ?? []) {
      for (const event of range.events ?? []) {
        if (event.fixed) fixed.add(event.fixed);
      }
    }
  }
  return [...fixed];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseCvssScore(score: string): number | null {
  // CVSS vector strings start with "CVSS:" — extract base score from the end
  // e.g. "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" → need numeric score
  // OSV sometimes provides numeric score directly
  const numeric = parseFloat(score);
  if (!isNaN(numeric)) return numeric;
  return null;
}

function cvssScoreToLevel(score: number): string {
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  return 'LOW';
}
