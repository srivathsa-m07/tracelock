# Backend Foundation - File Reference

## Core Application Files

### `src/index.ts` - Entry Point
**Purpose**: Application startup and graceful shutdown
- Initializes the Fastify server
- Binds to specified host and port
- Handles SIGINT/SIGTERM signals for clean shutdown
- Error handling and logging during startup

### `src/app.ts` - Server Factory
**Purpose**: Creates and configures the Fastify server instance
- Loads server configuration
- Registers all routes
- Sets up error handling
- Returns initialized server ready to listen

## Configuration Layer

### `src/config/env.ts` - Environment Variables
**Purpose**: Centralized environment variable management with validation
- Loads variables from `.env` or process.env
- Validates port range (1-65535)
- Provides typed configuration object
- Fails fast if critical config is missing

### `src/config/server.ts` - Fastify Configuration
**Purpose**: Fastify instance configuration
- Sets up logging (pretty format in dev, JSON in prod)
- Configures request ID tracking for distributed tracing
- Returns standardized Fastify options
- Extensible for future middleware

## Routes

### `src/routes/health.ts` - Health Check Endpoint
**Purpose**: Server health monitoring endpoint
- Implements `GET /health` endpoint
- Returns uptime counter for load balancer compatibility
- Returns ISO8601 timestamp for time-series monitoring
- Zero dependencies on database or external services

## Utilities

### `src/utils/logger.ts` - Logger Wrapper
**Purpose**: Abstraction over Fastify's Pino logger
- Provides debug/info/warn/error methods
- Structured logging with data fields
- Can be extended for additional logging features
- Consistent interface across application

## Configuration Files

### `tsconfig.json` - TypeScript Configuration
**Purpose**: Strict TypeScript compiler settings
- ES2020 target for modern Node.js
- Path aliases for cleaner imports
- Strict type checking enabled
- Source maps for debugging
- Declaration files for potential library usage

### `package.json` - Project Metadata & Scripts
**Purpose**: Dependency management and command definitions
- **dev**: Run server with hot-reload via ts-node
- **build**: Compile TypeScript to JavaScript
- **start**: Run compiled production build
- **typecheck**: Verify types without compilation

### `.env` - Local Development Environment
**Purpose**: Development configuration values
- Local development settings
- Safe defaults (localhost)
- Not committed to version control

### `.env.example` - Environment Template
**Purpose**: Documentation of required environment variables
- Committed to version control
- Shows all configurable options
- Helps new developers get started
- Clear descriptions of each variable

### `.gitignore` - Git Exclusions
**Purpose**: Prevents committing sensitive/build files
- Excludes node_modules
- Excludes compiled dist/ directory
- Excludes .env files
- Excludes editor temp files

### `README.md` - Project Documentation
**Purpose**: Complete project reference and getting started guide
- Architecture overview
- Installation instructions
- API endpoint documentation
- Configuration reference
- Best practices
- Future roadmap

## Folder Structure for Future Development

### `src/modules/`
Reserved for business domain modules:
- `supply-chain/` - Supply chain tracking
- `dependencies/` - Dependency analysis
- `risk/` - Risk assessment
- `trust/` - Trust scoring

Each module would contain:
- `types.ts` - Domain types
- `service.ts` - Business logic
- `routes.ts` - Route handlers

### `src/plugins/`
Reserved for Fastify plugins:
- `cors.ts` - CORS configuration
- `rate-limit.ts` - Rate limiting
- `request-validation.ts` - Request schema validation

### `src/services/`
Reserved for cross-cutting business services:
- `database.ts` - Database access
- `cache.ts` - Caching layer
- `external-api.ts` - External API clients

## Key Design Decisions

1. **No Over-Engineering**: Minimal dependencies, clear code
2. **Enterprise Ready**: Strict types, proper error handling, logging
3. **Scalable Structure**: Easy to add modules and services
4. **TypeScript First**: Full type safety throughout
5. **Single Responsibility**: Each file has one clear purpose
6. **Beginner Friendly**: Well-commented, self-documenting code

## What's NOT Included (By Design)

- ❌ Database integration (add when needed)
- ❌ Authentication (add when needed)
- ❌ Docker/Kubernetes (add when needed)
- ❌ Testing framework (add when needed)
- ❌ Request validation schemas (add per feature)
- ❌ Monitoring tools (add when needed)

This keeps the foundation clean and focused on the core web framework.
