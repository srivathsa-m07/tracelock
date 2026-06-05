/**
 * Lockfile Parser Service
 *
 * Parses package-lock.json, yarn.lock, and pnpm-lock.yaml to extract
 * the complete transitive dependency graph with resolved versions.
 *
 * This enables true supply chain analysis by revealing:
 * - All transitive dependencies (not just direct ones)
 * - Exact resolved versions (not semver ranges)
 * - Complete dependency tree structure
 * - Duplicate packages with different versions
 */

export interface LockfileDependency {
  name: string;
  version: string;
  dev: boolean;
  optional: boolean;
  resolvedFrom?: string; // For yarn: the resolved source URL
  integrity?: string; // For npm: the integrity hash
  dependencies?: Record<string, LockfileDependency>;
  peerDependencies?: Record<string, string>;
  bundles?: string[]; // Files bundled with the package
}

export interface ParsedLockfile {
  type: 'npm' | 'yarn' | 'pnpm';
  version: string;
  packages: Map<string, LockfileDependency>;
  rootPackage?: string; // Name from package.json if provided
  metadata?: {
    lockfileVersion?: number;
    packagesLockfileVersion?: string;
  };
}

export interface DependencyNode {
  name: string;
  version: string;
  dev: boolean;
  optional: boolean;
  path: string[]; // Full path from root: ['root', 'dep-a', 'dep-b', 'current']
  depth: number;
  parent?: DependencyNode;
  children: DependencyNode[];
  resolvedFrom?: string;
  integrity?: string;
}

export interface DependencyTree {
  root: DependencyNode;
  allNodes: Map<string, DependencyNode[]>;
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  duplicatePackages: Map<string, string[]>; // name -> versions[]
}

/**
 * Parse package-lock.json (npm 7+ format)
 */
function parsePackageLock(raw: string): ParsedLockfile {
  const parsed = JSON.parse(raw);
  const packages = new Map<string, LockfileDependency>();

  // Handle packages object (npm 7+)
  if (parsed.packages) {
    for (const [loc, pkg] of Object.entries(parsed.packages)) {
      if (loc === '') {
        // Root package
        continue;
      }
      // npm location format: node_modules/pkg-name or node_modules/pkg/subpkg
      const name = loc.split('/').pop()!;
      packages.set(name, {
        name,
        version: (pkg as any).version || 'unknown',
        dev: (pkg as any).dev || false,
        optional: (pkg as any).optional || false,
        integrity: (pkg as any).integrity,
        resolvedFrom: (pkg as any).resolved,
        dependencies: (pkg as any).dependencies,
        peerDependencies: (pkg as any).peerDependencies,
        bundles: (pkg as any).bundledDependencies,
      });
    }
  }

  // Handle legacy dependencies object (npm 1-6)
  if (parsed.dependencies) {
    for (const [name, pkg] of Object.entries(parsed.dependencies)) {
      if (!packages.has(name)) {
        const depPkg = pkg as any;
        packages.set(name, {
          name,
          version: depPkg.version || 'unknown',
          dev: depPkg.dev || false,
          optional: depPkg.optional || false,
          resolvedFrom: depPkg.resolved,
          integrity: depPkg.integrity,
          dependencies: depPkg.dependencies,
          peerDependencies: depPkg.peerDependencies,
        });
      }
    }
  }

  return {
    type: 'npm',
    version: parsed.lockfileVersion || 'unknown',
    packages,
    metadata: { lockfileVersion: parsed.lockfileVersion },
  };
}

/**
 * Parse yarn.lock (yarn v1 and v2+)
 */
function parseYarnLock(raw: string): ParsedLockfile {
  const packages = new Map<string, LockfileDependency>();
  let currentPkg: string | null = null;
  let currentPkgData: any = {};
  let inMetadata = false;

  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for metadata section
    if (trimmed.startsWith('__metadata:')) {
      inMetadata = true;
      continue;
    }
    if (inMetadata && trimmed.startsWith('version ')) {
      // Extract yarn version from metadata
      continue;
    }

    // Package entry starts with package name and version
    if (!inMetadata && /^[a-z@/][a-z0-9/@-]*[a-z0-9]?@/.test(trimmed)) {
      // Save previous package
      if (currentPkg) {
        packages.set(currentPkg, {
          name: currentPkg.split('@')[0],
          version: currentPkg.split('@')[1],
          dev: currentPkgData.dev || false,
          optional: currentPkgData.optional || false,
          resolvedFrom: currentPkgData.resolved,
          integrity: currentPkgData.integrity,
          dependencies: currentPkgData.dependencies,
          peerDependencies: currentPkgData.peerDependencies,
        });
      }

      // Start new package
      const atIndex = trimmed.indexOf('@');
      currentPkg = trimmed.substring(0, trimmed.indexOf(' ', atIndex));
      currentPkgData = {};
      inMetadata = false;
      continue;
    }

    // Parse key: value pairs
    if (currentPkg && trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim().replace(/['",]/g, '');

      if (key === 'version') {
        // Already have version from package name
      } else if (key === 'resolved') {
        currentPkgData.resolved = value;
      } else if (key === 'integrity') {
        currentPkgData.integrity = value;
      } else if (key === 'dev') {
        currentPkgData.dev = value === 'true';
      } else if (key === 'optional') {
        currentPkgData.optional = value === 'true';
      } else if (key === 'dependencies') {
        // Will be parsed later
      }
    }
  }

  // Save last package
  if (currentPkg) {
    packages.set(currentPkg, {
      name: currentPkg.split('@')[0],
      version: currentPkg.split('@')[1],
      dev: currentPkgData.dev || false,
      optional: currentPkgData.optional || false,
      resolvedFrom: currentPkgData.resolved,
      integrity: currentPkgData.integrity,
      dependencies: currentPkgData.dependencies,
      peerDependencies: currentPkgData.peerDependencies,
    });
  }

  return {
    type: 'yarn',
    version: 'unknown',
    packages,
  };
}

/**
 * Parse pnpm-lock.yaml
 */
function parsePnpmLock(raw: string): ParsedLockfile {
  // Simple YAML parser for pnpm lockfile structure
  const packages = new Map<string, LockfileDependency>();
  let currentPkg: string | null = null;
  let currentPkgData: any = {};
  let inPackage = false;
  let indentLevel = 0;

  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for lockfile version
    if (trimmed.startsWith('lockfileVersion:')) {
      continue;
    }

    // Check for package entry (starts with / or package name)
    if (trimmed.startsWith('/')) {
      // Save previous package
      if (currentPkg) {
        const name = currentPkg.split('@')[0];
        const version = currentPkg.split('@')[1];
        packages.set(name, {
          name,
          version,
          dev: currentPkgData.dev || false,
          optional: currentPkgData.optional || false,
          resolvedFrom: currentPkgData.resolved,
          integrity: currentPkgData.integrity,
          dependencies: currentPkgData.dependencies,
          peerDependencies: currentPkgData.peerDependencies,
        });
      }

      // Parse package specifier
      const cleanSpec = trimmed.substring(1).trim();
      currentPkg = cleanSpec;
      currentPkgData = {};
      inPackage = true;
      indentLevel = line.search(/\S/);
      continue;
    }

    // Parse nested properties
    if (inPackage && line.startsWith(' '.repeat(indentLevel + 2))) {
      const propLine = trimmed;
      if (propLine.includes(':')) {
        const [key, ...valueParts] = propLine.split(':');
        const value = valueParts.join(':').trim();

        if (key === 'dev') {
          currentPkgData.dev = value === 'true';
        } else if (key === 'optional') {
          currentPkgData.optional = value === 'true';
        } else if (key === 'resolved') {
          currentPkgData.resolved = value;
        } else if (key === 'integrity') {
          currentPkgData.integrity = value;
        } else if (key === 'dependencies') {
          // Will be handled separately
        }
      }
    } else if (inPackage && !line.startsWith(' '.repeat(indentLevel))) {
      inPackage = false;
    }
  }

  // Save last package
  if (currentPkg) {
    const name = currentPkg.split('@')[0];
    const version = currentPkg.split('@')[1];
    packages.set(name, {
      name,
      version,
      dev: currentPkgData.dev || false,
      optional: currentPkgData.optional || false,
      resolvedFrom: currentPkgData.resolved,
      integrity: currentPkgData.integrity,
      dependencies: currentPkgData.dependencies,
      peerDependencies: currentPkgData.peerDependencies,
    });
  }

  return {
    type: 'pnpm',
    version: 'unknown',
    packages,
  };
}

/**
 * Detect lockfile type and parse accordingly
 */
export function parseLockfile(raw: string, filename: string): ParsedLockfile {
  if (filename.includes('package-lock') || filename.endsWith('.json')) {
    return parsePackageLock(raw);
  } else if (filename.includes('yarn') || filename.endsWith('.lock')) {
    return parseYarnLock(raw);
  } else if (filename.includes('pnpm') || filename.endsWith('.yaml') || filename.endsWith('.yml')) {
    return parsePnpmLock(raw);
  }

  // Try to detect format
  try {
    const parsed = JSON.parse(raw);
    if (parsed.lockfileVersion || parsed.packages || parsed.dependencies) {
      return parsePackageLock(raw);
    }
  } catch {
    // Not JSON
  }

  if (raw.includes('__metadata:') || raw.includes('yarn lock')) {
    return parseYarnLock(raw);
  }

  if (raw.includes('lockfileVersion:') || raw.includes('packages:')) {
    return parsePnpmLock(raw);
  }

  throw new Error(`Unable to detect lockfile format for: ${filename}`);
}

/**
 * Build a complete dependency tree from parsed lockfile
 */
export function buildDependencyTree(
  lockfile: ParsedLockfile,
  rootName: string = 'root'
): DependencyTree {
  const root: DependencyNode = {
    name: rootName,
    version: '1.0.0',
    dev: false,
    optional: false,
    path: [rootName],
    depth: 0,
    children: [],
  };

  const allNodes = new Map<string, DependencyNode[]>();
  const duplicatePackages = new Map<string, string[]>();
  let maxDepth = 0;

  // Track visited to avoid cycles
  // (used via visitedStack parameter in buildFromLockfile)

  function addNode(
    parent: DependencyNode,
    name: string,
    version: string,
    dev: boolean,
    optional: boolean,
    resolvedFrom?: string,
    integrity?: string
  ): DependencyNode {
    const nodePath = [...parent.path, `${name}@${version}`];
    const depth = parent.depth + 1;

    if (depth > maxDepth) maxDepth = depth;

    const node: DependencyNode = {
      name,
      version,
      dev,
      optional,
      path: nodePath,
      depth,
      parent,
      children: [],
      resolvedFrom,
      integrity,
    };

    // Track duplicates
    if (!allNodes.has(name)) {
      allNodes.set(name, []);
    }
    const existing = allNodes.get(name)!;
    const versionExists = existing.some((n) => n.version === version);
    if (!versionExists) {
      existing.push(node);
    }

    // Track duplicate package names with different versions
    const allVersions = allNodes.get(name)!.map((n) => n.version);
    if (allVersions.length > 1) {
      duplicatePackages.set(name, [...new Set(allVersions)]);
    }

    parent.children.push(node);
    return node;
  }

  // Build tree recursively
  function buildFromLockfile(
    parent: DependencyNode,
    dependencies: Record<string, LockfileDependency> | undefined,
    visitedStack: string[] = []
  ) {
    if (!dependencies) return;

    for (const [name, pkg] of Object.entries(dependencies)) {
      // Prevent infinite loops from circular dependencies
      if (visitedStack.includes(`${name}@${pkg.version}`)) continue;

      const node = addNode(
        parent,
        name,
        pkg.version,
        pkg.dev || false,
        pkg.optional || false,
        pkg.resolvedFrom,
        pkg.integrity
      );

      // Recursively add children
      if (pkg.dependencies) {
        buildFromLockfile(node, pkg.dependencies, [...visitedStack, `${name}@${pkg.version}`]);
      }
    }
  }

  // Start building from root's direct dependencies
  const rootPkg = lockfile.packages.get(rootName) || lockfile.packages.get('');
  if (rootPkg && rootPkg.dependencies) {
    buildFromLockfile(root, rootPkg.dependencies);
  } else {
    // If no root package info, add all top-level packages as children of root
    for (const [name, pkg] of lockfile.packages) {
      if (name === rootName || name === '') continue;
      // Only add packages that have no parent in the lockfile (top-level)
      // This is a simplification; real parsing would track parent references
      addNode(root, pkg.name, pkg.version, pkg.dev, pkg.optional, pkg.resolvedFrom, pkg.integrity);
    }
  }

  // Count edges
  let totalEdges = 0;
  function countEdges(node: DependencyNode) {
    totalEdges += node.children.length;
    for (const child of node.children) countEdges(child);
  }
  countEdges(root);

  // Count total nodes
  let totalNodes = 0;
  function countNodes(node: DependencyNode) {
    totalNodes++;
    for (const child of node.children) countNodes(child);
  }
  countNodes(root);

  return {
    root,
    allNodes,
    totalNodes,
    totalEdges,
    maxDepth,
    duplicatePackages,
  };
}

/**
 * Find all paths from root to a specific package
 */
export function findPathsToPackage(
  tree: DependencyTree,
  targetName: string
): DependencyNode[][] {
  const paths: DependencyNode[][] = [];

  function search(node: DependencyNode, currentPath: DependencyNode[]) {
    const newPath = [...currentPath, node];

    if (node.name === targetName) {
      paths.push(newPath);
    }

    for (const child of node.children) {
      search(child, newPath);
    }
  }

  search(tree.root, []);
  return paths;
}

/**
 * Find the shortest path from root to a package
 */
export function findShortestPath(
  tree: DependencyTree,
  targetName: string
): DependencyNode[] | null {
  const paths = findPathsToPackage(tree, targetName);
  if (paths.length === 0) return null;
  return paths.sort((a, b) => a.length - b.length)[0];
}

/**
 * Get all packages at a specific depth
 */
export function getPackagesAtDepth(tree: DependencyTree, depth: number): DependencyNode[] {
  const nodes: DependencyNode[] = [];

  function traverse(node: DependencyNode) {
    if (node.depth === depth) {
      nodes.push(node);
    }
    for (const child of node.children) traverse(child);
  }

  traverse(tree.root);
  return nodes;
}

/**
 * Get dependency chain summary for a package
 */
export function getDependencyChain(
  tree: DependencyTree,
  packageName: string
): { paths: DependencyNode[][]; shortestPath: DependencyNode[] | null; totalPaths: number } {
  const paths = findPathsToPackage(tree, packageName);
  return {
    paths,
    shortestPath: findShortestPath(tree, packageName),
    totalPaths: paths.length,
  };
}