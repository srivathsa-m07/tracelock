import type { FastifyRequest, FastifyReply } from 'fastify';
import { listRepositories, getRepository, createRepository, getRepositoryAnalytics } from './repository.service';

export async function listRepositoriesController(_: FastifyRequest, reply: FastifyReply) {
  try {
    const res = await listRepositories();
    return reply.code(200).send(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list repositories.';
    return reply.code(500).send({ error: msg });
  }
}

export async function getRepositoryController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    if (!id) return reply.code(400).send({ error: 'id required' });
    const res = await getRepository(id);
    if (!res) return reply.code(404).send({ error: 'Repository not found' });
    return reply.code(200).send(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch repository.';
    return reply.code(500).send({ error: msg });
  }
}

export async function createRepositoryController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { name, description } = request.body as any;
    if (!name) return reply.code(400).send({ error: 'name required' });
    const res = await createRepository(name, description);
    return reply.code(201).send(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create repository.';
    return reply.code(500).send({ error: msg });
  }
}

export async function getRepositoryAnalyticsController(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    if (!id) return reply.code(400).send({ error: 'id required' });
    const res = await getRepositoryAnalytics(id);
    return reply.code(200).send(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch repository analytics.';
    return reply.code(500).send({ error: msg });
  }
}
