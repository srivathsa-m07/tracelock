import { getScanDetails, getScanVulnerabilities, getScanDependencyTree } from './scan.query.service';

/**
 * Simple explainable prioritization engine.
 * Combines vulnerability facts and graph metrics into a 0-100 priority score.
 * Keeps logic isolated and deterministic so it can be extended later.
 */
export async function prioritizeScanRisks(scanId: string) {
  const scanData = await getScanDetails(scanId);
  if (!scanData) throw new Error('Scan not found');

  // vuln groups: [{ dependency, vulnerabilities: [...] }]
  const vulnGroups = await getScanVulnerabilities(scanId);

  // tree may be useful in future; retrieve but don't warn on unused
  await getScanDependencyTree(scanId);

  const findings: any[] = [];

  if (!vulnGroups) return findings;

  for (const group of vulnGroups) {
    const dep: any = group.dependency;
    for (const vuln of group.vulnerabilities) {
      // Base score from vulnerability severity / count
      const baseSeverity = mapSeverityToScore(vuln.severity ?? 'UNKNOWN');
      const vulnCountFactor = Math.min(1, (group.vulnerabilities.length) / 5); // more vulns -> slightly higher

      // Blast radius: prefer larger blast radiuses
      const blastRadius = ((dep as any).blastRadius ?? 0) || estimateBlastRadius(dep);
      const blastFactor = Math.min(1, blastRadius / 100);

      // Propagation score: how much this dependency propagates risk (0-100)
      const propagation = ((dep as any).propagationScore ?? 0) / 100;

      // Transitive exposure: deeper deps are less immediate
      const depthVal = (dep as any).depth ?? 1;
      const transitivePenalty = depthVal && depthVal > 1 ? Math.min(0.4, (depthVal - 1) * 0.05) : 0;

      // Prod vs dev
      const prodBonus = dep.type === 'devDependency' ? 0 : 0.15;

      // Fix availability: if fixes available, increase priority (so action is possible)
      const fixAvailable = Array.isArray(vuln.fixedVersions) && vuln.fixedVersions.length > 0;
      const fixBonus = fixAvailable ? 0.12 : 0;

      // Dependency criticality (heuristic from scan summary / risk score)
      const criticality = Math.min(1, ((dep as any).riskScore ?? 0) / 100);

      // Compose score
      let score = baseSeverity * 0.5 + (vulnCountFactor * 100) * 0.05 + (blastFactor * 100) * 0.2 + (propagation * 100) * 0.15 + (criticality * 100) * 0.1;
      score = score * (1 - transitivePenalty) + prodBonus * 100 + fixBonus * 100;
      score = Math.max(0, Math.min(100, Math.round(score)));

      const reasons: string[] = [];
      if (dep.type !== 'devDependency') reasons.push('Affects production dependency');
      if (blastRadius > 50) reasons.push('Large blast radius');
      if (propagation > 0.2) reasons.push('High propagation across graph');
      if (fixAvailable) reasons.push('Fix available');
      if (criticality > 0.7) reasons.push('High dependency criticality');

      const recommendedAction = determineRecommendedAction(score, fixAvailable);

      findings.push({
        package: { id: dep.id, name: dep.name, version: dep.version, type: dep.type },
        vulnerability: { id: vuln.id, severity: vuln.severity, summary: vuln.summary },
        score,
        level: scoreToLevel(score),
        reasons,
        recommendedAction,
      });
    }
  }

  // sort descending
  findings.sort((a, b) => b.score - a.score);
  return findings;
}

function mapSeverityToScore(sev?: string) {
  switch ((sev || '').toUpperCase()) {
    case 'CRITICAL': return 95;
    case 'HIGH': return 80;
    case 'MEDIUM': return 55;
    case 'LOW': return 30;
    default: return 40;
  }
}

function estimateBlastRadius(dep: any) {
  // heuristic: use riskScore or fallback
  return Math.min(100, Math.round((dep.riskScore ?? 50) * 0.8));
}

function determineRecommendedAction(score: number, fixAvailable: boolean) {
  if (score >= 85 && fixAvailable) return 'Apply patch / upgrade immediately';
  if (score >= 85) return 'Investigate and mitigate immediately (backport/compensating controls)';
  if (score >= 65 && fixAvailable) return 'Schedule patching in next release';
  if (score >= 65) return 'Review and create remediation plan';
  return 'Monitor and plan fix';
}

function scoreToLevel(score: number) {
  if (score >= 85) return 'CRITICAL';
  if (score >= 65) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}
