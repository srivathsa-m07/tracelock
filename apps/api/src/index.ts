/**
 * Application Entry Point
 *
 * Starts the Fastify server and handles graceful shutdown.
 */

import 'dotenv/config';

import { createServer } from './app';
import { env } from './config/env';

async function main() {
  try {
    const server = await createServer();

    await server.listen({ port: env.port, host: env.host });

    server.log.info(`Server running at http://${env.host}:${env.port}`);
    server.log.info(`Environment: ${env.nodeEnv}`);

    // Graceful shutdown
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        server.log.info(`Received ${signal}, closing gracefully...`);

        await server.close();

        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);

    process.exit(1);
  }
}

main();