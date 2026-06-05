# TRACELOCK Backend API

Professional backend foundation for TRACELOCK - Software Supply Chain Trust & Dependency Risk Intelligence Platform.

## Project Structure

```
src/
├── config/              # Configuration management
│   ├── env.ts          # Environment variable validation
│   └── server.ts       # Fastify server configuration
├── modules/            # Business modules (future)
├── plugins/            # Fastify plugins (future)
├── routes/             # API route handlers
│   └── health.ts       # Health check endpoint
├── services/           # Business logic services (future)
├── utils/              # Utility functions
│   └── logger.ts       # Logger wrapper
├── app.ts              # Application setup
└── index.ts            # Entry point

dist/                   # Compiled JavaScript (generated)
.env                    # Environment variables (local)
.env.example            # Environment template
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Development

Run the server in development mode with hot-reload:

```bash
npm run dev
```

Server will start at `http://127.0.0.1:3000`

### Production Build

Build TypeScript to JavaScript:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

### Type Checking

Verify TypeScript types without compiling:

```bash
npm run typecheck
```

## API Endpoints

### Health Check
- **Endpoint:** `GET /health`
- **Description:** Server health and status check
- **Response:** `{ status: 'ok', timestamp: ISO8601, uptime: number }`
- **Status Code:** 200

Example:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-22T10:30:45.123Z",
  "uptime": 5234
}
```

## Configuration

All configuration is managed through environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment (development/production) |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `LOG_LEVEL` | `info` | Logging level (debug/info/warn/error) |

## Architecture Decisions

### Fastify
- High-performance web framework optimized for speed
- Built-in validation and serialization
- Excellent TypeScript support

### Strict TypeScript Configuration
- `noUnusedLocals`: Prevents dead code
- `noUnusedParameters`: Ensures function contracts are clean
- `noImplicitReturns`: Enforces explicit return statements
- `strict: true`: Full type safety

### Path Aliases
- `@/*` - All source files
- `@config/*` - Configuration modules
- `@routes/*` - Route handlers
- `@services/*` - Business logic
- `@utils/*` - Utility functions

### Logger
- Simple wrapper around Fastify's built-in logger
- Pino-pretty formatting in development
- Structured JSON logging in production
- Request tracking via `x-request-id` header

## Folder Purposes

- **config/**: Application configuration (environment, server settings)
- **modules/**: Business domain modules (supply chain, risk, dependencies, etc.)
- **plugins/**: Fastify plugins (CORS, rate limiting, etc.)
- **routes/**: HTTP request handlers organized by feature
- **services/**: Business logic and data access layer
- **utils/**: Shared utilities (logger, formatters, validators, etc.)

## Adding New Routes

Create a new route file in `src/routes/`:

```typescript
import type { FastifyInstance } from 'fastify';

export async function registerMyRoutes(server: FastifyInstance) {
  server.get('/api/feature', async (_request, reply) => {
    return reply.code(200).send({ data: 'value' });
  });
}
```

Register in `src/app.ts`:

```typescript
import { registerMyRoutes } from './routes/my-route';

export async function createServer() {
  const server = Fastify(getServerConfig());
  
  // ... existing code ...
  await registerMyRoutes(server);
  
  return server;
}
```

## Best Practices

1. **Type Safety**: Always use strict TypeScript types
2. **Error Handling**: Use try-catch in route handlers and services
3. **Logging**: Use the Logger utility for all log statements
4. **Environment**: Never hardcode configuration values
5. **Separation of Concerns**: Keep routes thin, move logic to services
6. **Validation**: Use Fastify's built-in JSON schema validation for routes

## Future Improvements

This foundation is ready for:
- Database integration (PostgreSQL recommended)
- Authentication middleware
- Request validation schemas
- Error handling middleware
- Rate limiting
- CORS configuration
- Testing framework
- Monitoring and observability

## License

MIT
