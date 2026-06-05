/**
 * Environment Configuration
 *
 * Loads and validates environment variables using strict typing.
 * Ensures all required config is present at startup.
 */

interface EnvConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  host: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  databaseUrl: string;
}

function getEnv(): EnvConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as EnvConfig['nodeEnv'];
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';
  const logLevel = (process.env.LOG_LEVEL || 'info') as EnvConfig['logLevel'];
  const databaseUrl = process.env.DATABASE_URL;

  // Validate port is valid
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}. Must be between 1 and 65535.`);
  }

  // Validate database URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  return {
    nodeEnv,
    port,
    host,
    logLevel,
    databaseUrl,
  };
}

export const env = getEnv();
