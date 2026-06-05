/**
 * Risk Engine Service
 *
 * Provides simple, extensible risk scoring for dependencies and scans.
 * This initial implementation uses three lightweight signals:
 *  - dependency depth (closer to root == higher impact)
 *  - dependency type (production deps weigh more than dev deps)
 *  - number of graph connections (highly connected packages increase risk)
 *
 * Why risk scoring matters:
 * - Automated risk scoring enables prioritization of remediation efforts
 * - Scores act as a baseline to later incorporate CVE feeds, popularity,
 *   maintenance signals, and external threat intelligence
 *
 * Design goals:
 * - Keep the implementation simple and transparent
 * - Keep functions pure and testable
 * - Allow adding new weighted signals without changing callers
 */

import type { AdjacencyList } from './graph.service';
import type { SavedDependency } from './scan.types';

// Risk level thresholds
const LEVELS = {
  LOW: 0,
  MEDIUM: 30,
  HIGH: 60,
  CRITICAL: 85,
} as const;

/**
 * calculateDependencyRisk
 * - Computes a 0-100 risk score for a single dependency given graph context.
 * - Factors (weights are adjustable):
 *    depthWeight: nodes closer to root (smaller depth) increase impact
 *    typeWeight: production deps > dev deps
 *    connWeight: more connections -> higher risk
 */
export function calculateDependencyRisk(
  dep: SavedDependency,
  adjacency: AdjacencyList | null,
  nodeDepth = 1
): { riskScore: number; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } {
  // Weights (tunable)
  const depthWeight = 0.5; // deeper means less impact per path; we invert below
  const typeWeight = 0.3; // production vs dev
  const connWeight = 0.2; // graph connectivity

  // Depth factor: invert so smaller depth (closer to root) -> higher contribution
  const depthFactor = Math.max(1, 10 - nodeDepth) / 10; // range ~0.1..1

  // Type factor
  const typeFactor = dep.type === 'devDependency' ? 0.6 : 1.0;

  // Connectivity factor: number of children + number of parents (if adjacency provided)
  let connFactor = 0.5; // default neutral
  if (adjacency && adjacency[dep.id]) {
    const node = adjacency[dep.id];
    const degree = node.children.length; // out-degree
    connFactor = Math.min(1, 0.1 + degree / 10); // scales up with more children
  }

  // Normalize combined score to 0-100
  const raw = depthWeight * depthFactor + typeWeight * typeFactor + connWeight * connFactor;
  const normalized = Math.min(1, raw / (depthWeight + typeWeight + connWeight));
  const score = Math.round(normalized * 100);

  const level = score >= LEVELS.CRITICAL
    ? 'CRITICAL'
    : score >= LEVELS.HIGH
    ? 'HIGH'
    : score >= LEVELS.MEDIUM
    ? 'MEDIUM'
    : 'LOW';

  return { riskScore: score, riskLevel: level };
}

/**
 * calculateScanRiskSummary
 * - Given an adjacency list for a scan, computes per-dependency risk and
 *   aggregates a scan-level summary (average, max, and derived level).
 */
export function calculateScanRiskSummary(adjacency: AdjacencyList) {
  const deps = Object.values(adjacency).map((n) => n.dependency);
  const per = deps.map((d) => {
    // estimate depth as 1 if not known; in future we can compute shortest path from root
    const depth = 1;
    return { id: d.id, ...calculateDependencyRisk(d, adjacency, depth) };
  });

  const scores = per.map((p) => p.riskScore);
  const averageRisk = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const maxRisk = scores.length ? Math.max(...scores) : 0;

  const level = maxRisk >= LEVELS.CRITICAL
    ? 'CRITICAL'
    : maxRisk >= LEVELS.HIGH
    ? 'HIGH'
    : maxRisk >= LEVELS.MEDIUM
    ? 'MEDIUM'
    : 'LOW';

  return {
    perDependency: per,
    summary: {
      averageRisk,
      maxRisk,
      level,
    },
  };
}
