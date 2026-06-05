/**
 * Graph Service
 *
 * Builds an adjacency-list representation of dependency relationships for a given scan.
 * This is a lightweight utility that reads the normalized `DependencyEdge` table and
 * prepares an in-memory adjacency list suitable for future transitive analysis.
 *
 * Graph shape (adjacency list):
 * {
 *   [dependencyId]: {
 *     dependency: { id, name, version, type, scanId },
 *     children: Array<{ id: string; depth: number }>
 *   }
 * }
 *
 * Why model dependencies as a graph?
 * - Real-world dependency structures are graphs (DAGs when no cycles are present).
 * - Modeling edges explicitly allows efficient queries, incremental updates, and
 *   scalable transitive analysis without denormalizing the primary Dependency table.
 *
 * Future scalability notes:
 * - We intentionally keep edges normalized in `DependencyEdge` to support indexing
 *   and bulk queries (e.g., `WHERE parentId IN (...)`).
 * - We can later add materialized transitive closures or precomputed shortest paths
 *   if performance requires it.
 */

import { prisma } from '../../utils/prisma';
import type { SavedDependency } from './scan.types';

export type AdjacencyNode = {
  dependency: SavedDependency;
  children: Array<{ id: string; depth: number }>;
};

export type AdjacencyList = Record<string, AdjacencyNode>;

/**
 * Build adjacency list for a given scanId.
 * - Fetches all dependencies for the scan and all edges where parent or child is within that scan
 * - Returns a map keyed by dependency id
 */
export async function buildDependencyGraph(scanId: string): Promise<AdjacencyList> {
  // Fetch dependencies for the scan
  const deps = await prisma.dependency.findMany({
    where: { scanId },
    select: { id: true, name: true, version: true, type: true, scanId: true },
  });

  const depMap: Record<string, SavedDependency> = {};
  deps.forEach((d) => {
    depMap[d.id] = d as SavedDependency;
  });

  // Fetch edges where either parent or child belongs to this scan. We only need edges
  // where parent is in the scan to build children lists, but also fetching edges by child
  // allows validation and future in-degree calculations.
  const edges = await prisma.dependencyEdge.findMany({
    where: {
      OR: [{ parent: { scanId } }, { child: { scanId } }],
    },
    select: { parentId: true, childId: true, depth: true },
  });

  const adjacency: AdjacencyList = {};

  // Initialize adjacency nodes for all dependencies
  deps.forEach((d) => {
    adjacency[d.id] = { dependency: d as SavedDependency, children: [] };
  });

  // Populate children lists
  edges.forEach((e) => {
    // Only consider edges where parent is part of this scan
    if (adjacency[e.parentId]) {
      adjacency[e.parentId].children.push({ id: e.childId, depth: e.depth });
    }
  });

  return adjacency;
}

/**
 * getDependencyNeighbors
 * - Returns parent and child neighbors for a given dependency id.
 * - Useful for graph traversal (BFS/DFS) and influence calculations.
 */
export async function getDependencyNeighbors(dependencyId: string) {
  const parents = await prisma.dependencyEdge.findMany({
    where: { childId: dependencyId },
    select: { parentId: true, depth: true },
  });

  const children = await prisma.dependencyEdge.findMany({
    where: { parentId: dependencyId },
    select: { childId: true, depth: true },
  });

  return {
    parents: parents.map((p) => ({ id: p.parentId, depth: p.depth })),
    children: children.map((c) => ({ id: c.childId, depth: c.depth })),
  };
}
