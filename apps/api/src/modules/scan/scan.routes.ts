/**
 * Scan Routes
 *
 * Registers all scan-related endpoints on the Fastify instance.
 * Wires URLs to their controllers — no business logic lives here.
 */

import type { FastifyInstance } from 'fastify';
import { scanPackageJsonController } from './scan.controller';
import {
  getScansController,
  getScanController,
  getScanRiskSummaryController,
  getScanVulnerabilitiesController,
  getDependencyVulnerabilitiesController,
  getScanAttackPathsController,
  getDependencyBlastRadiusController,
  getDependencyPropagationController,
  getScanDependencyTreeController,
  getScanSbomCycloneController,
  getScanSbomSpdxController,
  getPrioritizedRisksController,
  getTrendsController,
  getSecurityPostureController,
  getVulnerabilityHistoryController,
} from './scan.api.controller';
import {
  listRepositoriesController,
  getRepositoryController,
  createRepositoryController,
  getRepositoryAnalyticsController,
} from '../repo/repository.controller';

export async function registerScanRoutes(server: FastifyInstance): Promise<void> {
  server.post('/scan/package-json', scanPackageJsonController);
  server.get('/scans', getScansController);
  server.get('/scans/:scanId', getScanController);
  server.get('/scans/:scanId/risk-summary', getScanRiskSummaryController);
  server.get('/scans/:scanId/vulnerabilities', getScanVulnerabilitiesController);
  server.get('/scans/:scanId/attack-paths', getScanAttackPathsController);
  server.get('/scans/:scanId/dependency-tree', getScanDependencyTreeController);
  server.get('/scans/:scanId/sbom/cyclonedx', getScanSbomCycloneController);
  server.get('/scans/:scanId/sbom/spdx', getScanSbomSpdxController);
  server.get('/scans/:scanId/prioritized-risks', getPrioritizedRisksController);
  server.get('/analytics/trends', getTrendsController);
  server.get('/analytics/security-posture', getSecurityPostureController);
  server.get('/analytics/vulnerability-history', getVulnerabilityHistoryController);
  server.get('/repositories', listRepositoriesController);
  server.post('/repositories', createRepositoryController);
  server.get('/repositories/:id', getRepositoryController);
  server.get('/repositories/:id/analytics', getRepositoryAnalyticsController);
  server.get('/dependencies/:dependencyId/vulnerabilities', getDependencyVulnerabilitiesController);
  server.get('/dependencies/:dependencyId/blast-radius', getDependencyBlastRadiusController);
  server.get('/dependencies/:dependencyId/propagation-analysis', getDependencyPropagationController);
}
