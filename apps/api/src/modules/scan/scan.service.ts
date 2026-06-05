/**
 * Scan Service
 *
 * Parses package.json and lockfiles, persists full transitive dependency graphs.
 */

import type { ParsedDependency, ParsedScanResult, ScanResult } from './scan.types';
import { prisma } from '../../utils/prisma';
import { enrichDependenciesWithVulnerabilities } from './vulnerability.service';
import { parseLockfile, buildDependencyTree } from './lockfile-parser.service';
import type { DependencyNode, DependencyTree } from './lockfile-parser.service';

interface RawPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name?: string;
  [key: string]: unknown;
}

function mapDeps(
  deps: Record<string, string> | undefined,
  type: ParsedDependency['type']
): ParsedDependency[] {
  if (!deps) return [];
  return Object.entries(deps).map(([name, version]) => ({ name, version, type }));
}

/** Parse package.json string into a ParsedScanResult. */
export function parsePackageJson(raw: string): ParsedScanResult {
  let parsed: RawPackageJson;
  try {
    parsed = JSON.parse(raw) as RawPackageJson;
  } catch {
    throw new Error('Invalid JSON: could not parse uploaded file.');
  }
  if (!parsed.dependencies && !parsed.devDependencies) {
    throw new Error('No dependencies or devDependencies found in package.json.');
  }
  const deps = mapDeps(parsed.dependencies, 'dependency');
  const devDeps = mapDeps(parsed.devDependencies, 'devDependency');
  return {
    totalDependencies: deps.length,
    totalDevDependencies: devDeps.length,
    dependencies: [...deps, ...devDeps],
  };
}

/**
 * Parse package.json + optional lockfile.
 * Returns the flat ParsedScanResult plus the full transitive tree if a lockfile was provided.
 */
export function parseWithLockfile(
  packageJsonRaw: string,
  lockfileRaw?: string,
  lockfileFilename?: string
): { result: ParsedScanResult; tree?: DependencyTree; lockfileType?: string; rootName?: string } {
  let parsed: RawPackageJson;
  try {
    parsed = JSON.parse(packageJsonRaw) as RawPackageJson;
  } catch {
    throw new Error('Invalid JSON: could not parse package.json.');
  }
  if (!parsed.dependencies && !parsed.devDependencies) {
    throw new Error('No dependencies or devDependencies found in package.json.');
  }

  const deps = mapDeps(parsed.dependencies, 'dependency');
  const devDeps = mapDeps(parsed.devDependencies, 'devDependency');
  const result: ParsedScanResult = {
    totalDependencies: deps.length,
    totalDevDependencies: devDeps.length,
    dependencies: [...deps, ...devDeps],
  };

  if (!lockfileRaw || !lockfileFilename) {
    return { result };
  }

  try {
    const lockfile = parseLockfile(lockfileRaw, lockfileFilename);
    const rootName = parsed.name || 'root';
    const tree = buildDependencyTree(lockfile, rootName);
    return { result, tree, lockfileType: lockfile.type, rootName };
  } catch (err) {
    console.warn('Lockfile parse failed, continuing without transitive graph:', err);
    return { result };
  }
}

/**
 * Persist a scan to the database.
 * If a lockfile tree is provided, builds full transitive edges.
 * Otherwise falls back to direct-only edges.
 */
export async function saveScanToDatabase(
  parseResult: ParsedScanResult,
  lockfileTree?: DependencyTree
): Promise<ScanResult> {
  // 1. Create Scan + direct Dependency rows
  const scan = await prisma.scan.create({
    data: {
      totalDependencies: parseResult.totalDependencies,
      totalDevDependencies: parseResult.totalDevDependencies,
      dependencies: {
        create: parseResult.dependencies.map((dep) => ({
          name: dep.name,
          version: dep.version,
          type: dep.type,
        })),
      },
    },
    include: { dependencies: true },
  });

  // 2. Create synthetic root node
  const rootDep = await prisma.dependency.create({
    data: { name: `__root__:${scan.id}`, version: '0.0.0', type: 'root', scanId: scan.id },
  });

  // 3. Build name@version → DB id lookup
  const depMap = new Map<string, string>(); // "name@version" → id
  for (const dep of scan.dependencies) {
    depMap.set(`${dep.name}@${dep.version}`, dep.id);
    // Also index by name alone for fuzzy matching when version differs
    if (!depMap.has(dep.name)) depMap.set(dep.name, dep.id);
  }

  if (lockfileTree) {
    // 4a. Build transitive edges from lockfile tree
    await buildTransitiveEdges(rootDep.id, lockfileTree.root, depMap);
  } else {
    // 4b. Fallback: direct edges only
    await prisma.dependencyEdge.createMany({
      data: scan.dependencies.map((d) => ({ parentId: rootDep.id, childId: d.id, depth: 1 })),
      skipDuplicates: true,
    });
  }

  // 5. Risk scoring
  try {
    const { buildDependencyGraph } = await import('./graph.service');
    const { calculateScanRiskSummary } = await import('./risk.service');
    const adjacency = await buildDependencyGraph(scan.id);
    const riskReport = calculateScanRiskSummary(adjacency);

    await prisma.$transaction(
      riskReport.perDependency.map((p) =>
        prisma.dependency.update({
          where: { id: p.id },
          data: { riskScore: p.riskScore, riskLevel: p.riskLevel },
        })
      )
    );
    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        averageRisk: riskReport.summary.averageRisk,
        maxRisk: riskReport.summary.maxRisk,
        riskLevel: riskReport.summary.level,
      },
    });
  } catch (err) {
    console.error('Risk calculation failed:', err);
  }

  // 6. OSV vulnerability enrichment
  try {
    await enrichDependenciesWithVulnerabilities(
      scan.dependencies.map((d) => ({
        id: d.id,
        name: d.name,
        version: d.version,
        type: d.type,
        scanId: d.scanId,
      }))
    );
  } catch (err) {
    console.error('Vulnerability enrichment failed:', err);
  }

  return {
    id: scan.id,
    createdAt: scan.createdAt.toISOString(),
    totalDependencies: scan.totalDependencies,
    totalDevDependencies: scan.totalDevDependencies,
    dependencies: scan.dependencies.map((dep) => ({
      id: dep.id,
      name: dep.name,
      version: dep.version,
      type: dep.type,
      scanId: dep.scanId,
    })),
  };
}

/**
 * Recursively walk the lockfile DependencyTree and upsert DependencyEdge rows.
 *
 * Strategy: for each node in the tree, find its DB counterpart by name@version
 * (or name alone as fallback). Create an edge from the DB parent to the DB child.
 * The root of the tree maps to the synthetic __root__ dependency.
 */
async function buildTransitiveEdges(
  dbRootId: string,
  treeRoot: DependencyNode,
  depMap: Map<string, string>
): Promise<void> {
  // Collect all edges first, then batch-insert to avoid N+1
  const edges: Array<{ parentId: string; childId: string; depth: number }> = [];
  const seen = new Set<string>(); // "parentId:childId" to deduplicate

  function walk(node: DependencyNode, dbParentId: string) {
    for (const child of node.children) {
      const childDbId =
        depMap.get(`${child.name}@${child.version}`) ?? depMap.get(child.name);
      if (!childDbId) continue; // transitive dep not in package.json — skip

      const edgeKey = `${dbParentId}:${childDbId}`;
      if (seen.has(edgeKey)) continue;
      seen.add(edgeKey);

      edges.push({ parentId: dbParentId, childId: childDbId, depth: child.depth });
      walk(child, childDbId);
    }
  }

  walk(treeRoot, dbRootId);

  // Batch insert in chunks of 500
  const CHUNK = 500;
  for (let i = 0; i < edges.length; i += CHUNK) {
    await prisma.dependencyEdge.createMany({
      data: edges.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
  }
}
