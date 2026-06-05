# Prisma + PostgreSQL Integration Documentation

## Overview

This backend now uses **Prisma ORM** with **PostgreSQL** to persist scan data and dependency information.

---

## Database Schema

### Scan Model
Represents a single package.json scan performed by the user.

```prisma
model Scan {
  id                     String         @id @default(cuid())
  createdAt              DateTime       @default(now())
  totalDependencies      Int
  totalDevDependencies   Int
  dependencies           Dependency[]

  @@map("scans")
}
```

**Fields:**
- `id` - Unique identifier (CUID format)
- `createdAt` - Timestamp when the scan was created
- `totalDependencies` - Count of production dependencies
- `totalDevDependencies` - Count of dev dependencies
- `dependencies` - Relation to all Dependency records for this scan

---

### Dependency Model
Represents individual dependencies extracted from a package.json file.

```prisma
model Dependency {
  id     String @id @default(cuid())
  name   String
  version String
  type   String
  
  scanId String
  scan   Scan   @relation(fields: [scanId], references: [id], onDelete: Cascade)

  @@map("dependencies")
}
```

**Fields:**
- `id` - Unique identifier (CUID format)
- `name` - Package name (e.g., "fastify")
- `version` - Semantic version (e.g., "^5.8.5")
- `type` - Either "dependency" or "devDependency"
- `scanId` - Foreign key linking to the parent Scan
- `scan` - Relation to the parent Scan record

---

## Relationships

### One-to-Many: Scan → Dependencies

**Scan** has a **one-to-many** relationship with **Dependency**:

- One Scan can have many Dependencies
- Each Dependency belongs to exactly one Scan
- **Cascade Delete**: When a Scan is deleted, all its Dependencies are automatically deleted

**Example Query** (using Prisma):
```typescript
const scan = await prisma.scan.findUnique({
  where: { id: "scan-123" },
  include: { dependencies: true }  // Returns all dependencies for this scan
});
```

---

## Environment Configuration

### .env File

The `.env` file in the `apps/api` directory configures the PostgreSQL connection:

```env
# PostgreSQL Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/tracelock"

# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
```

**For Production**, replace:
- `postgres` with your PostgreSQL username
- `password` with your PostgreSQL password
- `localhost:5432` with your database host and port

---

## Migration Commands

Prisma uses **migrations** to manage database schema changes.

### Initialize Database

After setting up PostgreSQL and configuring `DATABASE_URL`, run:

```bash
npm run prisma:migrate
```

This will:
1. Create the initial migration file
2. Apply the migration to your PostgreSQL database
3. Generate Prisma Client types

### Create a New Migration

When you modify `schema.prisma`, create a new migration:

```bash
npm run prisma:migrate
```

Prisma will prompt you to name the migration (e.g., "add_status_to_scan").

### Apply Migrations

To apply migrations without modifying the schema:

```bash
npx prisma migrate deploy
```

### Generate Prisma Client

If you modify the schema, regenerate the TypeScript types:

```bash
npm run prisma:generate
```

---

## Prisma Studio

**Prisma Studio** is a visual database browser and editor.

### Launch Prisma Studio

```bash
npm run prisma:studio
```

This will:
- Start a local web server (usually on http://localhost:5555)
- Display all database tables and records
- Allow you to create, read, update, and delete records
- Show relationships between tables visually

---

## Code Architecture

### Prisma Client Isolation

The Prisma Client is **isolated** in a singleton file to prevent multiple instances:

**File**: `src/utils/prisma.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
  });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();
```

### Database Logic in Services

**File**: `src/modules/scan/scan.service.ts`

- `parsePackageJson()` - Parses the uploaded JSON file (no DB logic)
- `saveScanToDatabase()` - **Only here** is Prisma used to save data

The controller calls the service function, which handles all database persistence.

### API Flow

```
Request (package.json upload)
  ↓
Controller: scanPackageJsonController()
  ↓
Service: parsePackageJson() → returns parsed structure
  ↓
Service: saveScanToDatabase() → creates Scan + Dependencies in PostgreSQL
  ↓
Response: Returns saved Scan with all relationships
```

---

## Example API Response

After uploading a `package.json`, the API returns:

```json
{
  "id": "clh7x3b2k0001qz8c9x8c9x8c",
  "createdAt": "2024-05-27T10:30:00.000Z",
  "totalDependencies": 5,
  "totalDevDependencies": 3,
  "dependencies": [
    {
      "id": "clh7x3b2k0002qz8c9x8c9x8c",
      "name": "fastify",
      "version": "^5.8.5",
      "type": "dependency",
      "scanId": "clh7x3b2k0001qz8c9x8c9x8c"
    },
    {
      "id": "clh7x3b2k0003qz8c9x8c9x8c",
      "name": "typescript",
      "version": "^6.0.3",
      "type": "devDependency",
      "scanId": "clh7x3b2k0001qz8c9x8c9x8c"
    }
    // ... more dependencies
  ]
}
```

---

## Setup Summary

1. **Install Prisma**: `npm install prisma @prisma/client`
2. **Configure Database**: Update `DATABASE_URL` in `.env`
3. **Run Migration**: `npm run prisma:migrate`
4. **Start Server**: `npm run dev`
5. **Test API**: Upload a `package.json` file to `/scan` endpoint
6. **View Data**: Run `npm run prisma:studio` to browse database

---

## Common Operations

### Query a Scan with Dependencies
```typescript
const scan = await prisma.scan.findUnique({
  where: { id: "scan-id" },
  include: { dependencies: true }
});
```

### Get All Scans
```typescript
const allScans = await prisma.scan.findMany({
  include: { dependencies: true }
});
```

### Delete a Scan (Cascades to Dependencies)
```typescript
await prisma.scan.delete({
  where: { id: "scan-id" }
});
```

---

## What's NOT Included (As Requested)

✗ Authentication / Authorization  
✗ Docker configuration  
✗ Frontend integration  
✗ Advanced abstraction layers (Repository pattern, etc.)  
✗ Complex caching strategies  

This is a **clean, simple, production-ready** database integration focused on core functionality.
