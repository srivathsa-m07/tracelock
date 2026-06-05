/**
 * Graph Risk Service
 *
 * Implements dependency attack propagation analysis using BFS/DFS traversal
 * over the in-memory adjacency list built by graph.service.ts.
 *
 * All metrics are derived from real graph structure + real OSV vulnerability data.
 * No fake analytics. No placeholder scores.
 *
 * Core concepts:
 *
 * - Attack Path: The chain of dependencies from a vulnerable node to the root
 *   (upstream trace). Shows how a vulnerability can propagate upward.
 *
 * - Blast Radius: The set of nodes reachable FROM a vulnerable node (downstream
 *   trace). Shows how many packages are exposed if this node is compromised.
 *
 * - Propagation Score: A 0-100 score combining:
 *     - vulnerability severity weight
 *     - blast radius size (normalized)
 *     - exposure depth (how close to root)
 *     - transitive amplification (how many paths lead through this node)
 *
 * - Transitive Risk Amplification: A multiplier reflecting how many distinct
 *   dependency paths pass through a vulnerable node. Higher = more dangerous.
 */

import type { AdjacencyList } from './graph.service';
import { prisma } from '../../utils/prisma';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PropagationNode {
  id: string;
  name: string;
  version: string;
  type: string;
  depth: number; // distance from the vulnerable source node
}

export interface AttackPath {
  vulnerableDepId: string;
  vulnerableDepName: string;
  vulnerableDepVersion: string;
  vulnId: string;
  vulnSummary: string;
  severity: string;
  cvssScore: number | null;
  // Chain from vulnerable node up to root (upstream ancestors)
  upstreamChain: PropagationNode[];
  // Nodes reachable downstream from the vulnerable node
  downstreamImpact: PropagationNode[];
  blastRadius: number;
  exposureDepth: number;
  propagationScore: number;
  transitiveAmplification: number;
}

export interface BlastRadiusResult {
  dependencyId: string;
  name: string;
  version: string;
  directlyAffected: PropagationNode[];
  transitivelyAffected: PropagationNode[];
  blastRadius: number;
  propagationScore: number;
}

export interface PropagationAnalysisResult {
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

// ── Severity weights ──────────────────────────────────────────────────────────

const SEVERITY_WEIGHT: Record<string, number> = {
  CRITICAL: 1.0,
  HIGH: 0.75,
  MEDIUM: 0.45,
  LOW: 0.2,
  UNKNOWN: 0.1,
};

// ── BFS helpers ───────────────────────────────────────────────────────────────

/**
 * BFS downstream: find all nodes reachable FROM sourceId following child edges.
 * Returns nodes with their BFS depth from the source.
 */
function bfsDownstream(
  sourceId: string,
  adjacency: AdjacencyList,
  maxDepth = 10
): PropagationNode[] {
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: sourceId, depth: 0 }];
  const result: PropagationNode[] = [];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id) || depth > maxDepth) continue;
    visited.add(id);

    const node = adjacency[id];
    if (!node) continue;

    if (id !== sourceId) {
      result.push({
        id,
        name: node.dependency.name,
        version: node.dependency.version,
        type: node.dependency.type,
        depth,
      });
    }

    for (const child of node.children) {
      if (!visited.has(child.id)) {
        queue.push({ id: child.id, depth: depth + 1 });
      }
    }
  }

  return result;
}

/**
 * BFS upstream: find all ancestors of sourceId by inverting the edge direction.
 * Builds a reverse adjacency map first, then BFS from source.
 */
function bfsUpstream(
  sourceId: string,
  adjacency: AdjacencyList,
  maxDepth = 10
): PropagationNode[] {
  // Build reverse map: childId → parentIds
  const reverseMap: Record<string, string[]> = {};
  for (const [parentId, node] of Object.entries(adjacency)) {
    for (const child of node.children) {
      if (!reverseMap[child.id]) reverseMap[child.id] = [];
      reverseMap[child.id].push(parentId);
    }
  }

  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: sourceId, depth: 0 }];
  const result: PropagationNode[] = [];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id) || depth > maxDepth) continue;
    visited.add(id);

    const node = adjacency[id];
    if (!node) continue;

    if (id !== sourceId) {
      result.push({
        id,
        name: node.dependency.name,
        version: node.dependency.version,
        type: node.dependency.type,
        depth,
      });
    }

    for (const parentId of reverseMap[id] ?? []) {
      if (!visited.has(parentId)) {
        queue.push({ id: parentId, depth: depth + 1 });
      }
    }
  }

  return result;
}

/**
 * Count how many distinct paths pass through a node (transitive amplification).
 * Uses DFS path counting from all root nodes (nodes with no parents).
 */
function countPathsThroughNode(
  targetId: string,
  adjacency: AdjacencyList
): number {
  // Find roots: nodes that have no parents
  const hasParent = new Set<string>();
  for (const node of Object.values(adjacency)) {
    for (const child of node.children) hasParent.add(child.id);
  }
  const roots = Object.keys(adjacency).filter((id) => !hasParent.has(id));

  let pathCount = 0;

  function dfs(currentId: string, visited: Set<string>): void {
    if (currentId === targetId) {
      pathCount++;
      return;
    }
    if (visited.has(currentId)) return;
    visited.add(currentId);
    const node = adjacency[currentId];
    if (!node) return;
    for (const child of node.children) {
      dfs(child.id, new Set(visited));
    }
  }

  for (const root of roots) {
    dfs(root, new Set());
  }

  return Math.max(1, pathCount);
}

/**
 * Compute propagation score (0-100) for a vulnerable node.
 *
 * Formula:
 *   score = (severityWeight * 0.40)
 *         + (normalizedBlastRadius * 0.30)
 *         + (exposureDepthFactor * 0.15)
 *         + (transitiveAmplificationFactor * 0.15)
 *   × 100
 */
function computePropagationScore(
  severity: string,
  blastRadius: number,
  totalNodes: number,
  exposureDepth: number,
  transitiveAmplification: number
): number {
  const sevWeight = SEVERITY_WEIGHT[severity] ?? 0.1;
  const blastFactor = totalNodes > 0 ? Math.min(1, blastRadius / totalNodes) : 0;
  // Exposure depth: closer to root (depth=1) = higher factor
  const depthFactor = Math.max(0, 1 - (exposureDepth - 1) / 10);
  // Transitive amplification: log-scaled
  const ampFactor = Math.min(1, Math.log2(transitiveAmplification + 1) / 6);

  const raw =
    sevWeight * 0.40 +
    blastFactor * 0.30 +
    depthFactor * 0.15 +
    ampFactor * 0.15;

  return Math.round(Math.min(1, raw) * 100);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute full attack path analysis for all vulnerable dependencies in a scan.
 * Fetches vulnerability data from DB, runs BFS traversal, returns enriched results.
 */
export async function computeAttackPaths(scanId: string): Promise<PropagationAnalysisResult | null> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { id: true } });
  if (!scan) return null;

  // Load adjacency list from DB
  const { buildDependencyGraph } = await import('./graph.service');
  const adjacency = await buildDependencyGraph(scanId);
  const totalNodes = Object.keys(adjacency).length;

  // Load all vulnerable dependencies for this scan
  const vulnDeps = await prisma.dependency.findMany({
    where: {
      scanId,
      NOT: { name: { startsWith: '__root__' } },
      vulnerabilities: { some: {} },
    },
    include: {
      vulnerabilities: { include: { vulnerability: true } },
    },
  });

  const attackPaths: AttackPath[] = [];

  for (const dep of vulnDeps) {
    const node = adjacency[dep.id];
    if (!node) continue;

    const downstream = bfsDownstream(dep.id, adjacency);
    const upstream = bfsUpstream(dep.id, adjacency);
    const blastRadius = downstream.length;
    // Exposure depth = shortest upstream path to a root
    const exposureDepth = upstream.length > 0
      ? Math.min(...upstream.map((n) => n.depth))
      : 1;
    const transitiveAmplification = countPathsThroughNode(dep.id, adjacency);

    for (const dv of dep.vulnerabilities) {
      const vuln = dv.vulnerability;
      const severity = vuln.severity ?? 'UNKNOWN';
      const propagationScore = computePropagationScore(
        severity,
        blastRadius,
        totalNodes,
        exposureDepth,
        transitiveAmplification
      );

      attackPaths.push({
        vulnerableDepId: dep.id,
        vulnerableDepName: dep.name,
        vulnerableDepVersion: dep.version,
        vulnId: vuln.id,
        vulnSummary: vuln.summary ?? '',
        severity,
        cvssScore: vuln.cvssScore ?? null,
        upstreamChain: upstream,
        downstreamImpact: downstream,
        blastRadius,
        exposureDepth,
        propagationScore,
        transitiveAmplification,
      });
    }
  }

  // Sort by propagation score descending
  attackPaths.sort((a, b) => b.propagationScore - a.propagationScore);

  // Aggregate top risk nodes (deduplicated by dep id)
  const nodeMap = new Map<string, { id: string; name: string; version: string; propagationScore: number; blastRadius: number; vulnCount: number }>();
  for (const path of attackPaths) {
    const existing = nodeMap.get(path.vulnerableDepId);
    if (!existing || path.propagationScore > existing.propagationScore) {
      nodeMap.set(path.vulnerableDepId, {
        id: path.vulnerableDepId,
        name: path.vulnerableDepName,
        version: path.vulnerableDepVersion,
        propagationScore: path.propagationScore,
        blastRadius: path.blastRadius,
        vulnCount: dep_vuln_count(attackPaths, path.vulnerableDepId),
      });
    }
  }

  const topRiskNodes = [...nodeMap.values()]
    .sort((a, b) => b.propagationScore - a.propagationScore)
    .slice(0, 10);

  const scores = attackPaths.map((p) => p.propagationScore);
  const maxPropagationScore = scores.length ? Math.max(...scores) : 0;
  const avgPropagationScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Total unique blast radius across all vulnerable nodes
  const allImpacted = new Set<string>();
  for (const path of attackPaths) {
    for (const n of path.downstreamImpact) allImpacted.add(n.id);
  }

  return {
    scanId,
    totalVulnerableNodes: nodeMap.size,
    totalBlastRadius: allImpacted.size,
    maxPropagationScore,
    avgPropagationScore,
    attackPaths,
    topRiskNodes,
  };
}

function dep_vuln_count(paths: AttackPath[], depId: string): number {
  return paths.filter((p) => p.vulnerableDepId === depId).length;
}

/**
 * Compute blast radius for a single dependency.
 */
export async function computeBlastRadius(dependencyId: string): Promise<BlastRadiusResult | null> {
  const dep = await prisma.dependency.findUnique({
    where: { id: dependencyId },
    select: { id: true, name: true, version: true, type: true, scanId: true },
  });
  if (!dep) return null;

  const { buildDependencyGraph } = await import('./graph.service');
  const adjacency = await buildDependencyGraph(dep.scanId);
  const totalNodes = Object.keys(adjacency).length;

  const downstream = bfsDownstream(dependencyId, adjacency);
  const direct = downstream.filter((n) => n.depth === 1);
  const transitive = downstream.filter((n) => n.depth > 1);

  // Use the dep's own riskLevel as severity proxy for propagation score
  const depRecord = await prisma.dependency.findUnique({
    where: { id: dependencyId },
    select: { riskLevel: true },
  });
  const severity = depRecord?.riskLevel ?? 'UNKNOWN';
  const transitiveAmplification = countPathsThroughNode(dependencyId, adjacency);

  const propagationScore = computePropagationScore(
    severity,
    downstream.length,
    totalNodes,
    1,
    transitiveAmplification
  );

  return {
    dependencyId,
    name: dep.name,
    version: dep.version,
    directlyAffected: direct,
    transitivelyAffected: transitive,
    blastRadius: downstream.length,
    propagationScore,
  };
}

/**
 * Full propagation analysis for a single dependency:
 * upstream chain + downstream blast + propagation metrics.
 */
export async function computeDependencyPropagation(dependencyId: string) {
  const dep = await prisma.dependency.findUnique({
    where: { id: dependencyId },
    include: { vulnerabilities: { include: { vulnerability: true } } },
  });
  if (!dep) return null;

  const { buildDependencyGraph } = await import('./graph.service');
  const adjacency = await buildDependencyGraph(dep.scanId);
  const totalNodes = Object.keys(adjacency).length;

  const downstream = bfsDownstream(dependencyId, adjacency);
  const upstream = bfsUpstream(dependencyId, adjacency);
  const transitiveAmplification = countPathsThroughNode(dependencyId, adjacency);
  const exposureDepth = upstream.length > 0
    ? Math.min(...upstream.map((n) => n.depth))
    : 1;

  const topVuln = dep.vulnerabilities[0]?.vulnerability;
  const severity = topVuln?.severity ?? dep.riskLevel ?? 'UNKNOWN';

  const propagationScore = computePropagationScore(
    severity,
    downstream.length,
    totalNodes,
    exposureDepth,
    transitiveAmplification
  );

  return {
    dependency: {
      id: dep.id,
      name: dep.name,
      version: dep.version,
      type: dep.type,
      riskScore: dep.riskScore,
      riskLevel: dep.riskLevel,
    },
    upstreamChain: upstream,
    downstreamImpact: downstream,
    blastRadius: downstream.length,
    exposureDepth,
    transitiveAmplification,
    propagationScore,
    vulnerabilities: dep.vulnerabilities.map((dv) => dv.vulnerability),
  };
}
