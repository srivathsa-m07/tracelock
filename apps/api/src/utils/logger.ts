/**
 * Logger Utility
 *
 * Provides a simple logger wrapper around Fastify's built-in logger.
 * Can be extended for additional logging features as needed.
 */

import type { FastifyInstance } from 'fastify';

export class Logger {
  constructor(private log: FastifyInstance['log']) {}

  debug(message: string, data?: unknown) {
    this.log.debug({ data }, message);
  }

  info(message: string, data?: unknown) {
    this.log.info({ data }, message);
  }

  warn(message: string, data?: unknown) {
    this.log.warn({ data }, message);
  }

  error(message: string, error?: Error | unknown) {
    this.log.error({ error }, message);
  }
}
