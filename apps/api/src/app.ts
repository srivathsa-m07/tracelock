/**
 * Application Setup
 *
 * Initializes Fastify server with all routes and plugins.
 * Central place for configuring the server instance.
 */

import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { getServerConfig } from './config/server';
import { Logger } from './utils/logger';
import { registerHealthRoutes } from './routes/health';
import { registerScanRoutes } from './modules/scan/scan.routes';

export async function createServer() {
  const server = Fastify(getServerConfig());
  const logger = new Logger(server.log);

  try {
    // Register plugins
    await server.register(cors, {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
      ],
      methods: ['GET', 'POST', 'OPTIONS'],
    });
    await server.register(multipart);

    // Register routes
    await registerHealthRoutes(server);
    await registerScanRoutes(server);

    logger.info('Server initialized successfully');
    return server;
  } catch (error) {
    logger.error('Failed to initialize server', error);
    throw error;
  }
}
