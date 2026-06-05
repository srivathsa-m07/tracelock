/**
 * Scan Types
 *
 * Shared TypeScript interfaces for the scan module.
 */

export type DependencyType = 'dependency' | 'devDependency';

/**
 * ParsedDependency: Before database persistence
 * Contains only the data extracted from package.json
 */
export interface ParsedDependency {
  name: string;
  version: string;
  type: DependencyType;
}

/**
 * SavedDependency: After database persistence
 * Contains the database record with IDs and foreign key
 */
export interface SavedDependency {
  id: string;
  name: string;
  version: string;
  type: string;
  scanId: string;
  // Calculated risk score (0-100)
  riskScore?: number;
  // Derived risk level based on riskScore
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * ParsedScanResult: After parsing package.json, before database persistence
 * Used as return type of parsePackageJson()
 */
export interface ParsedScanResult {
  totalDependencies: number;
  totalDevDependencies: number;
  dependencies: ParsedDependency[];
}

/**
 * ScanResult: After database persistence
 * Contains database IDs, timestamps, and relationships
 */
export interface ScanResult {
  id: string;
  createdAt: string;
  totalDependencies: number;
  totalDevDependencies: number;
  dependencies: SavedDependency[];
  // Aggregate risk summary for the scan
  riskSummary?: {
    averageRisk: number;
    maxRisk: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}