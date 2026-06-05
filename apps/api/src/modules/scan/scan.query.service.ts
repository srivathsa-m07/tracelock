/**
 * Scan Query Service
 *
 * Encapsulates read-only queries for scans, dependencies, graph relationships
 * and risk summaries. Keeps DB logic centralized in services.
 */
import { prisma } from '../../utils/prisma';
import { buildDependencyGraph } from './graph.service';
import { calculateScanRiskSummary } from './risk.service';
import {
  getVulnerabilitiesForScan,
  getVulnerabilitiesForDependency,
} from './vulnerability.service';
import {
  computeAttackPaths,
  computeBlastRadius,
  computeDependencyPropagation,
} from './graph-risk.service';

export async function listScans(opts: { page: number; limit: number }) {
  const offset = (opts.page - 1) * opts.limit;
  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      skip: offset,
      take: opts.limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        totalDependencies: true,
        totalDevDependencies: true,
        averageRisk: true,
        maxRisk: true,
        riskLevel: true,
      },
    }),
    prisma.scan.count(),
  ]);

  return {
    items: scans,
    page: opts.page,
    limit: opts.limit,
    total,
  };
}

export async function getScanDetails(scanId: string) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) return null;

  // Dependencies and edges
  const dependencies = await prisma.dependency.findMany({ where: { scanId }, orderBy: { name: 'asc' } });
  const edges = await prisma.dependencyEdge.findMany({ where: { OR: [{ parentId: { in: dependencies.map((d) => d.id) } }, { childId: { in: dependencies.map((d) => d.id) } }] } });

  // Build adjacency and risk summary
  const adjacency = await buildDependencyGraph(scanId);
  const riskReport = calculateScanRiskSummary(adjacency);

  return {
    scan: {
      id: scan.id,
      createdAt: scan.createdAt,
      totalDependencies: scan.totalDependencies,
      totalDevDependencies: scan.totalDevDependencies,
      averageRisk: scan.averageRisk ?? riskReport.summary.averageRisk,
      maxRisk: scan.maxRisk ?? riskReport.summary.maxRisk,
      riskLevel: scan.riskLevel ?? riskReport.summary.level,
    },
    dependencies,
    edges,
    risk: riskReport,
    adjacency,
  };
}

export async function getScanRiskSummary(scanId: string) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) return null;

  const adjacency = await buildDependencyGraph(scanId);
  const riskReport = calculateScanRiskSummary(adjacency);

  // Build distribution and top offenders
  const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } as Record<string, number>;
  riskReport.perDependency.forEach((p) => {
    distribution[p.riskLevel] = (distribution[p.riskLevel] || 0) + 1;
  });

  const top = [...riskReport.perDependency].sort((a, b) => b.riskScore - a.riskScore).slice(0, 10);

  return {
    averageRisk: riskReport.summary.averageRisk,
    maxRisk: riskReport.summary.maxRisk,
    distribution,
    top,
  };
}

export async function getScanVulnerabilities(scanId: string) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { id: true } });
  if (!scan) return null;
  return getVulnerabilitiesForScan(scanId);
}

export async function getDependencyVulnerabilities(dependencyId: string) {
  const dep = await prisma.dependency.findUnique({ where: { id: dependencyId }, select: { id: true } });
  if (!dep) return null;
  return getVulnerabilitiesForDependency(dependencyId);
}

export async function getScanAttackPaths(scanId: string) {
  return computeAttackPaths(scanId);
}

export async function getDependencyBlastRadius(dependencyId: string) {
  return computeBlastRadius(dependencyId);
}

export async function getDependencyPropagationAnalysis(dependencyId: string) {
  return computeDependencyPropagation(dependencyId);
}

/**
 * Return the full dependency tree for a scan: all deps with their edges,
 * grouped into direct vs transitive, with depth info.
 */
export async function getScanDependencyTree(scanId: string) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { id: true, totalDependencies: true, totalDevDependencies: true } });
  if (!scan) return null;

  // Fetch all deps INCLUDING root so edge source IDs are always in the node set
  const allDeps = await prisma.dependency.findMany({
    where: { scanId },
    select: { id: true, name: true, version: true, type: true, riskScore: true, riskLevel: true },
    orderBy: { name: 'asc' },
  });

  const rootDep = allDeps.find((d) => d.name.startsWith('__root__'));
  const deps = allDeps.filter((d) => !d.name.startsWith('__root__'));
  const depIds = allDeps.map((d) => d.id); // all IDs including root

  const edges = await prisma.dependencyEdge.findMany({
    where: { OR: [{ parentId: { in: depIds } }, { childId: { in: depIds } }] },
    select: { parentId: true, childId: true, depth: true },
  });

  // Build maps using ALL node IDs (including root)
  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string[]>();
  for (const e of edges) {
    if (!childrenOf.has(e.parentId)) childrenOf.set(e.parentId, []);
    childrenOf.get(e.parentId)!.push(e.childId);
    if (!parentOf.has(e.childId)) parentOf.set(e.childId, []);
    parentOf.get(e.childId)!.push(e.parentId);
  }

  const depMap = new Map(allDeps.map((d) => [d.id, d]));

  // Classify: direct = parent is root node
  const rootId = rootDep?.id;
  const directIds = new Set(
    edges.filter((e) => e.parentId === rootId).map((e) => e.childId)
  );

  const direct = deps.filter((d) => directIds.has(d.id));
  const transitive = deps.filter((d) => !directIds.has(d.id));

  // Depth: root→dep edges have depth=1
  const depthMap = new Map<string, number>();
  for (const e of edges) {
    depthMap.set(e.childId, Math.min(depthMap.get(e.childId) ?? 999, e.depth));
  }
  const maxDepth = Math.max(0, ...[...depthMap.values()]);

  // Build validated edges — all node IDs are now in scope
  const validNodeIds = new Set(depIds);
  const validatedEdges: { from: string; to: string; depth: number }[] = [];
  for (const e of edges) {
    if (validNodeIds.has(e.parentId) && validNodeIds.has(e.childId)) {
      validatedEdges.push({ from: e.parentId, to: e.childId, depth: e.depth });
    }
  }

  // Build node list for graph: include root node as 'PROJECT ROOT'
  const graphNodes = [
    ...(rootDep ? [{ ...rootDep, name: 'ROOT', version: '0.0.0', type: 'root', riskScore: null, riskLevel: null }] : []),
    ...deps,
  ];

  return {
    scanId,
    totalDependencies: scan.totalDependencies,
    totalDevDependencies: scan.totalDevDependencies,
    totalTransitive: transitive.length,
    maxDepth,
    nodeCount: graphNodes.length,
    edgeCount: validatedEdges.length,
    direct: direct.map((d) => ({
      ...d,
      depth: 1,
      children: childrenOf.get(d.id)?.map((cid) => depMap.get(cid)).filter(Boolean) ?? [],
    })),
    transitive: transitive.map((d) => ({
      ...d,
      depth: depthMap.get(d.id) ?? 2,
      parents: parentOf.get(d.id)?.map((pid) => depMap.get(pid)).filter(Boolean) ?? [],
    })),
    nodes: graphNodes,
    edges: validatedEdges,
  };
}
