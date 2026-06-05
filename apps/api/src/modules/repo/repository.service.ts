import { prisma } from '../../utils/prisma';

export async function listRepositories() {
  return prisma.repository.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getRepository(id: string) {
  return prisma.repository.findUnique({ where: { id } });
}

export async function createRepository(name: string, description?: string) {
  return prisma.repository.create({ data: { name, description } });
}

export async function getRepositoryAnalytics(id: string) {
  const scans = await prisma.scan.findMany({
    where: { repositoryId: id },
    orderBy: { createdAt: 'asc' },
  });
  const scanIds = scans.map((s) => s.id);
  const totalVulns = await prisma.dependencyVulnerability
    .count({ where: { dependency: { scanId: { in: scanIds } } } })
    .catch(() => 0);
  const critical = await prisma.dependencyVulnerability
    .count({ where: { dependency: { scanId: { in: scanIds } }, vulnerability: { severity: 'CRITICAL' } } })
    .catch(() => 0);
  return { totalScans: scans.length, totalVulns, critical, scans };
}
