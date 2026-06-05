// Using native ISO timestamp to avoid extra dependency

import type { FastifyReply } from 'fastify';
import { getScanDetails, getScanDependencyTree } from './scan.query.service';

// Minimal CycloneDX and SPDX JSON generators from scan data
export async function generateCycloneDxJSON(scanId: string) {
  const scan = await getScanDetails(scanId);
  if (!scan) throw new Error('Scan not found');
  const tree = await getScanDependencyTree(scanId);

  const metadata = {
    timestamp: new Date().toISOString(),
    scanId: scan.scan.id,
    generatedBy: 'TRACELOCK',
  };

  const components: any[] = [];
  const dependencies: any[] = [];

  const addComponent = (dep: any) => {
    components.push({
      type: 'library',
      name: dep.name,
      version: dep.version,
      bomRef: `${dep.name}@${dep.version}`,
      properties: {
        riskScore: dep.riskScore ?? null,
        riskLevel: dep.riskLevel ?? null,
      },
    });
  };

  // flatten direct + transitive
  const all = [...((tree && tree.direct) || []), ...((tree && tree.transitive) || [])];
  all.forEach(addComponent);

  // dependency relationships
  ((tree && tree.edges) || []).forEach((e: any) => {
    dependencies.push({ ref: e.from, dependsOn: [e.to] });
  });

  const cyclonedx = {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    version: 1,
    metadata,
    components,
    dependencies,
  };

  return cyclonedx;
}

export async function generateSpdxJSON(scanId: string) {
  const scan = await getScanDetails(scanId);
  if (!scan) throw new Error('Scan not found');
  const tree = await getScanDependencyTree(scanId);

  const document = {
    spdxVersion: 'SPDX-2.2',
    dataLicense: 'CC0-1.0',
    SPDXID: `SPDXRef-DOCUMENT-${scanId}`,
    name: `tracelock-sbom-${scanId}`,
    documentNamespace: `https://tracelock.local/sbom/${scanId}`,
    creationInfo: {
        created: new Date().toISOString(),
      creators: ['Tool: TRACELOCK'],
    },
    packages: [],
    relationships: [],
  } as any;

  const all2 = [...((tree && tree.direct) || []), ...((tree && tree.transitive) || [])];
  all2.forEach((p: any) => {
    document.packages.push({
      SPDXID: `SPDXRef-${p.name}-${p.version}`,
      name: p.name,
      versionInfo: p.version,
      downloadLocation: 'NOASSERTION',
      checksum: [],
      licenseConcluded: 'NOASSERTION',
      description: '',
      externalRefs: [],
      vulnerabilityCount: p.vulnerabilityCount ?? 0,
    });
  });

  ((tree && tree.edges) || []).forEach((e: any) => {
    document.relationships.push({
      spdxElementId: `SPDXRef-${e.from}`,
      relationshipType: 'DEPENDS_ON',
      relatedSpdxElement: `SPDXRef-${e.to}`,
    });
  });

  return document;
}

export async function sendCycloneDxResponse(scanId: string, reply: FastifyReply) {
  const json = await generateCycloneDxJSON(scanId);
  reply.header('Content-Disposition', `attachment; filename="sbom-${scanId}-cyclonedx.json"`);
  return reply.code(200).send(json);
}

export async function sendSpdxResponse(scanId: string, reply: FastifyReply) {
  const json = await generateSpdxJSON(scanId);
  reply.header('Content-Disposition', `attachment; filename="sbom-${scanId}-spdx.json"`);
  return reply.code(200).send(json);
}
