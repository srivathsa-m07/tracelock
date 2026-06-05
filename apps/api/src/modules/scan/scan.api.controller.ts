/**
 * Scan API Controllers
 *
 * Thin HTTP layer that delegates to services for data fetching and formatting.
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  listScans,
  getScanDetails,
  getScanRiskSummary,
  getScanVulnerabilities,
  getDependencyVulnerabilities,
  getScanAttackPaths,
  getDependencyBlastRadius,
  getDependencyPropagationAnalysis,
  getScanDependencyTree,
} from './scan.query.service';
import { prioritizeScanRisks } from './prioritization.service';
import { getTrends, getSecurityPosture, getVulnerabilityHistory } from './historical-analytics.service';
import { sendCycloneDxResponse, sendSpdxResponse } from './sbom.service';

export async function getScansController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { page = '1', limit = '20' } = request.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const result = await listScans({ page: pageNum, limit: lim });
    return reply.code(200).send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list scans.';
    return reply.code(500).send({ error: message });
  }
}

export async function getScanController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { scanId } = request.params as { scanId: string };
    if (!scanId) return reply.code(400).send({ error: 'scanId is required' });

    const result = await getScanDetails(scanId);
    if (!result) return reply.code(404).send({ error: 'Scan not found' });
    return reply.code(200).send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch scan.';
    return reply.code(500).send({ error: message });
  }
}

export async function getScanRiskSummaryController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { scanId } = request.params as { scanId: string };
    if (!scanId) return reply.code(400).send({ error: 'scanId is required' });

    const result = await getScanRiskSummary(scanId);
    if (!result) return reply.code(404).send({ error: 'Scan not found' });
    return reply.code(200).send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch risk summary.';
    return reply.code(500).send({ error: message });
  }
}

export async function getScanVulnerabilitiesController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { scanId } = request.params as { scanId: string };
    if (!scanId) return reply.code(400).send({ error: 'scanId is required' });

    const result = await getScanVulnerabilities(scanId);
    if (!result) return reply.code(404).send({ error: 'Scan not found' });
    return reply.code(200).send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch vulnerabilities.';
    return reply.code(500).send({ error: message });
  }
}

export async function getDependencyVulnerabilitiesController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { dependencyId } = request.params as { dependencyId: string };
    if (!dependencyId) return reply.code(400).send({ error: 'dependencyId is required' });

    const result = await getDependencyVulnerabilities(dependencyId);
    if (!result) return reply.code(404).send({ error: 'Dependency not found' });
    return reply.code(200).send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch vulnerabilities.';
    return reply.code(500).send({ error: message });
  }
}

export async function getScanAttackPathsController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { scanId } = request.params as { scanId: string };
    if (!scanId) return reply.code(400).send({ error: 'scanId is required' });

    const result = await getScanAttackPaths(scanId);
    if (!result) return reply.code(404).send({ error: 'Scan not found' });
    return reply.code(200).send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to compute attack paths.';
    return reply.code(500).send({ error: message });
  }
}

export async function getDependencyBlastRadiusController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { dependencyId } = request.params as { dependencyId: string };
    if (!dependencyId) return reply.code(400).send({ error: 'dependencyId is required' });

    const result = await getDependencyBlastRadius(dependencyId);
    if (!result) return reply.code(404).send({ error: 'Dependency not found' });
    return reply.code(200).send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to compute blast radius.';
    return reply.code(500).send({ error: message });
  }
}

export async function getDependencyPropagationController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { dependencyId } = request.params as { dependencyId: string };
    if (!dependencyId) return reply.code(400).send({ error: 'dependencyId is required' });

    const result = await getDependencyPropagationAnalysis(dependencyId);
    if (!result) return reply.code(404).send({ error: 'Dependency not found' });
    return reply.code(200).send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to compute propagation analysis.';
    return reply.code(500).send({ error: message });
  }
}

export async function getScanDependencyTreeController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { scanId } = request.params as { scanId: string };
    if (!scanId) return reply.code(400).send({ error: 'scanId is required' });

    const result = await getScanDependencyTree(scanId);
    if (!result) return reply.code(404).send({ error: 'Scan not found' });
    return reply.code(200).send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch dependency tree.';
    return reply.code(500).send({ error: message });
  }
}

export async function getPrioritizedRisksController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { scanId } = request.params as { scanId: string };
    if (!scanId) return reply.code(400).send({ error: 'scanId is required' });

    const findings = await prioritizeScanRisks(scanId);
    return reply.code(200).send({ items: findings, count: findings.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to compute prioritized risks.';
    return reply.code(500).send({ error: message });
  }
}

export async function getScanSbomCycloneController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { scanId } = request.params as { scanId: string };
    if (!scanId) return reply.code(400).send({ error: 'scanId is required' });
    return await sendCycloneDxResponse(scanId, reply);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate CycloneDX SBOM.';
    return reply.code(500).send({ error: message });
  }
}

export async function getScanSbomSpdxController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { scanId } = request.params as { scanId: string };
    if (!scanId) return reply.code(400).send({ error: 'scanId is required' });
    return await sendSpdxResponse(scanId, reply);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate SPDX SBOM.';
    return reply.code(500).send({ error: message });
  }
}

export async function getTrendsController(_: FastifyRequest, reply: FastifyReply) {
  try {
    const res = await getTrends();
    return reply.code(200).send(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to compute trends.';
    return reply.code(500).send({ error: msg });
  }
}

export async function getSecurityPostureController(_: FastifyRequest, reply: FastifyReply) {
  try {
    const res = await getSecurityPosture();
    return reply.code(200).send(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch security posture.';
    return reply.code(500).send({ error: msg });
  }
}

export async function getVulnerabilityHistoryController(_: FastifyRequest, reply: FastifyReply) {
  try {
    const res = await getVulnerabilityHistory();
    return reply.code(200).send(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch vulnerability history.';
    return reply.code(500).send({ error: msg });
  }
}
