/**
 * Server Configuration
 *
 * Configures Fastify instance with sensible defaults and security headers.
 * Enables proper logging and request handling.
 */

import type { FastifyServerOptions } from 'fastify';
import { env } from './env';

export function getServerConfig(): FastifyServerOptions {
  return {
    logger: {
      level: env.logLevel,
      transport:
        env.nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
              },
            }
          : undefined,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'req_id',
    disableRequestLogging: false,
  };
}
