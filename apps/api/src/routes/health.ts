/**
 * Health Route
 *
 * Simple health check endpoint for load balancers and monitoring.
 * Returns server status and basic version information.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
}

export async function registerHealthRoutes(server: FastifyInstance) {
  const startTime = Date.now();

  server.get<{ Reply: HealthResponse }>('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const uptime = Date.now() - startTime;

    return reply.code(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime,
    });
  });
}
