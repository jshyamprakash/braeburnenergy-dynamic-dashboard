# POC Implementation Tasks
## 21-Day Task Breakdown - Enterprise IoT Platform POC

**Version:** 1.1
**Date:** 2026-02-06
**Duration:** 3 weeks (21 days)
**Goal:** Build production-ready POC with scalable architecture

---

## 📊 Implementation Status

**Last Updated:** 2026-02-06

### Week 1: Foundation & Backend - ✅ COMPLETE
- ✅ Sprint 1.1: Project Setup (Day 1)
- ✅ Sprint 1.2: Database Schema with Prisma (Day 2-3)
- ✅ Sprint 1.3: Services & Controllers (Day 4-5)
- ✅ Sprint 1.4: API Routes & Server (Day 6-7)
- ✅ Sprint 1.5: API Testing & Swagger Documentation (Day 6-7)

**Deliverables:**
- 19 REST API endpoints (fully tested)
- 7 WebSocket events (fully tested)
- Swagger/OpenAPI 3.0 documentation at http://localhost:3001/docs
- TimescaleDB integration with hypertables and retention
- 100% test coverage (26/26 endpoints/events)

### Week 2: Frontend & Dashboard - 🚧 NOT STARTED
- ⏳ Sprint 2.1: Frontend Setup (Day 8-9)
- ⏳ Sprint 2.2: Dashboard Components (Day 10-14)

### Week 3: Polish & Testing - 🚧 NOT STARTED
- ⏳ Sprint 3.1: Error Handling & Logging (Day 15-17)
- ⏳ Sprint 3.2: Testing Setup (Day 18-19)
- ⏳ Sprint 3.3: Docker Setup (Day 20-21)

---

## Table of Contents

1. [Document Overview](#document-overview)
2. [Week 1: Foundation & Backend](#week-1-foundation--backend)
3. [Week 2: Frontend & Dashboard](#week-2-frontend--dashboard)
4. [Week 3: Polish & Testing](#week-3-polish--testing)
5. [Appendix: Troubleshooting](#appendix-troubleshooting)
6. [Appendix: Quick Reference](#appendix-quick-reference)

---

## Document Overview

### Purpose
This document provides a tactical, step-by-step task breakdown for implementing the POC in 21 days. Each task includes:
- ✅ Copy-paste commands
- ✅ Full code snippets
- ✅ Clear deliverables
- ✅ Verification steps
- ✅ Backend/Frontend subtasks

### Prerequisites

**Required Software:**
- Node.js 20 LTS ([download](https://nodejs.org/))
- PostgreSQL 15+ ([download](https://www.postgresql.org/download/))
- pnpm ([install](https://pnpm.io/installation): `npm install -g pnpm`)
- Git
- Code editor (VS Code recommended)

**Platform-Specific PostgreSQL Installation:**

**macOS:**
```bash
brew install postgresql@15 timescaledb
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-15-timescaledb
sudo systemctl start postgresql
```

**Windows:**
- Use WSL2 and follow Linux instructions, or
- Download PostgreSQL installer with TimescaleDB extension

### Task Format

Each task follows this structure:

```markdown
**Task X.X.X: [Title] (Time Estimate)**

**Commands:**
```bash
# Copy-pasteable commands
```

**Code:** (if applicable)
```typescript
// Code snippet
```

**Deliverable:** What exists after completion

**Verification:**
```bash
# Commands to verify success
# Expected output
```

**Subtasks:** (if applicable)
- [ ] Backend: Specific backend work
- [ ] Frontend: Specific frontend work
```

### Dependency Order

**Critical Path:**
```
Day 1-3: Database Setup
    ↓
Day 4-5: Services & Controllers
    ↓
Day 6-7: API Routes & WebSocket
    ↓
Day 8-10: Frontend Setup
    ↓
Day 11-14: Dashboard Components
    ↓
Day 15-21: Polish & Testing
```

**Rule:** Never skip ahead. Each sprint depends on previous sprints.

---

## Week 1: Foundation & Backend

---

### Sprint 1.1: Project Setup (Day 1)

---

#### Task 1.1.1: Initialize Monorepo (2-3 hours)

**Commands:**
```bash
# Create project directory
mkdir iot-platform
cd iot-platform

# Initialize root package.json
pnpm init

# Create pnpm workspace configuration
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Install Turborepo
pnpm add -Dw turbo

# Create turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
EOF

# Create directory structure
mkdir -p apps/api apps/web packages/types packages/config

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.next/
.env
.env.local
*.log
.DS_Store
EOF

# Initialize git
git init
git add .
git commit -m "Initial monorepo setup"
```

**Deliverable:** Monorepo structure with Turborepo configured

**Verification:**
```bash
# Check Turborepo is installed
pnpm turbo --version
# Expected output: 1.x.x or 2.x.x

# Check directory structure
tree -L 2 -a
# Expected output:
# .
# ├── apps/
# │   ├── api/
# │   └── web/
# ├── packages/
# │   ├── types/
# │   └── config/
# ├── pnpm-workspace.yaml
# ├── turbo.json
# └── package.json
```

**Subtasks:**
- [x] Backend: Created apps/api directory
- [x] Frontend: Created apps/web directory
- [x] Shared: Created packages/ for shared code

---

#### Task 1.1.2: Set Up PostgreSQL + TimescaleDB (2-3 hours)

**macOS Installation:**
```bash
# Install PostgreSQL 15 and TimescaleDB
brew install postgresql@15 timescaledb

# Start PostgreSQL service
brew services start postgresql@15

# Configure TimescaleDB extension
timescaledb-tune --quiet --yes

# Restart PostgreSQL to apply changes
brew services restart postgresql@15

# Create database
createdb iot_platform

# Enable TimescaleDB extension
psql iot_platform -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

**Linux (Ubuntu/Debian) Installation:**
```bash
# Install PostgreSQL and TimescaleDB
sudo apt-get update
sudo apt-get install -y postgresql-15 postgresql-15-timescaledb

# Start PostgreSQL service
sudo systemctl start postgresql

# Create database (as postgres user)
sudo -u postgres createdb iot_platform

# Enable TimescaleDB extension
sudo -u postgres psql iot_platform -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Create superuser for development (optional)
sudo -u postgres createuser --superuser $USER
```

**Windows (WSL2):**
```bash
# Follow Linux instructions in WSL2 terminal
# Or use PostgreSQL Windows installer with TimescaleDB extension
```

**Deliverable:** PostgreSQL 15 running locally with TimescaleDB extension enabled

**Verification:**
```bash
# Check PostgreSQL is running
psql --version
# Expected output: psql (PostgreSQL) 15.x

# Check database exists
psql -l | grep iot_platform
# Expected output: iot_platform | ...

# Check TimescaleDB extension
psql iot_platform -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';"
# Expected output:
#   extname   | extversion
# ------------+------------
#  timescaledb | 2.x.x
```

**Subtasks:**
- [x] Backend: PostgreSQL database created
- [x] Backend: TimescaleDB extension enabled
- [x] Backend: Connection verified

---

#### Task 1.1.3: Initialize Backend Project (2 hours)

**Commands:**
```bash
# Navigate to backend directory
cd apps/api

# Initialize package.json
pnpm init

# Install production dependencies
pnpm add fastify @fastify/cors @prisma/client socket.io zod dotenv

# Install dev dependencies
pnpm add -D prisma typescript @types/node tsx nodemon eslint prettier

# Initialize TypeScript configuration
npx tsc --init
```

**Create tsconfig.json:**
```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

**Update package.json scripts:**
```bash
cat > package.json << 'EOF'
{
  "name": "api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon --exec tsx src/server.ts",
    "build": "prisma generate && tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:deploy": "prisma migrate deploy"
  },
  "dependencies": {
    "fastify": "^4.25.2",
    "@fastify/cors": "^8.5.0",
    "@prisma/client": "^5.8.0",
    "socket.io": "^4.6.0",
    "zod": "^3.22.4",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "prisma": "^5.8.0",
    "typescript": "^5.3.3",
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "nodemon": "^3.0.2",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  }
}
EOF
```

**Create directory structure:**
```bash
mkdir -p src/lib src/services src/controllers src/routes/v1 src/schemas src/middleware src/websocket
```

**Deliverable:** Backend project with TypeScript and dependencies installed

**Verification:**
```bash
# Check dependencies installed
pnpm list | grep fastify
# Expected output: fastify 4.x.x

# Check TypeScript is configured
tsc --version
# Expected output: Version 5.x.x

# Check Node.js version
node --version
# Expected output: v20.x.x or higher

# Check directory structure
tree -L 2 src/
# Expected output:
# src/
# ├── controllers/
# ├── lib/
# ├── middleware/
# ├── routes/
# │   └── v1/
# ├── schemas/
# ├── services/
# └── websocket/
```

**Subtasks:**
- [x] Backend: Dependencies installed
- [x] Backend: TypeScript configured
- [x] Backend: Directory structure created

---

### Sprint 1.2: Database Schema with Prisma (Day 2-3)

---

#### Task 1.2.1: Initialize Prisma (1 hour)

**Commands:**
```bash
cd apps/api

# Initialize Prisma with PostgreSQL
pnpm dlx prisma init --datasource-provider postgresql

# This creates:
# - prisma/schema.prisma
# - .env file
```

**Update .env file:**
```bash
cat > .env << 'EOF'
# Environment
NODE_ENV=development
PORT=3001

# Database (update username/password if needed)
DATABASE_URL="postgresql://postgres:@localhost:5432/iot_platform?schema=public"

# WebSocket
WS_PORT=3002
WS_CORS_ORIGIN=http://localhost:3000
EOF
```

**Deliverable:** Prisma initialized with DATABASE_URL configured

**Verification:**
```bash
# Check prisma directory exists
ls prisma/
# Expected output: schema.prisma

# Check .env file exists
cat .env | grep DATABASE_URL
# Expected output: DATABASE_URL="postgresql://..."

# Test database connection
pnpm dlx prisma db pull
# Expected output: "Introspecting based on your Prisma schema..." (may show empty schema)
```

**Subtasks:**
- [x] Backend: Prisma initialized
- [x] Backend: Database connection string configured

---

#### Task 1.2.2: Create Prisma Schema (2-3 hours)

**File:** `apps/api/prisma/schema.prisma`

```bash
cat > prisma/schema.prisma << 'EOF'
// Prisma schema file
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Device {
  id         String   @id @default(uuid())
  deviceId   String   @unique @map("device_id")
  name       String
  tags       String[]
  attributes Json?
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  states DeviceState[]

  @@map("devices")
}

model DeviceState {
  id        String   @id @default(uuid())
  deviceId  String   @map("device_id")
  data      Json
  timestamp DateTime @default(now())

  device Device @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([deviceId, timestamp])
  @@map("device_states")
}
EOF
```

**Deliverable:** Prisma schema with Device and DeviceState models

**Verification:**
```bash
# Format the schema (should have no errors)
pnpm prisma format
# Expected output: "Formatted /path/to/schema.prisma in XXms"

# Validate the schema
pnpm prisma validate
# Expected output: "The schema at prisma/schema.prisma is valid"

# Check schema file
cat prisma/schema.prisma | grep "model Device"
# Expected output: model Device {
```

**Subtasks:**
- [x] Backend: Device model defined
- [x] Backend: DeviceState model defined
- [x] Backend: Relationships configured

---

#### Task 1.2.3: Generate Prisma Client & Migration (1 hour)

**Commands:**
```bash
cd apps/api

# Generate Prisma Client (creates TypeScript types)
pnpm prisma generate

# Create and apply initial migration
pnpm prisma migrate dev --name init
```

**Expected Output:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "iot_platform"

Applying migration `20240101000000_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20240101000000_init/
    └─ migration.sql

✔ Generated Prisma Client (5.8.0) to ./node_modules/@prisma/client
```

**Deliverable:** Database tables created, Prisma Client generated with TypeScript types

**Verification:**
```bash
# Check tables were created
psql iot_platform -c "\dt"
# Expected output:
#  Schema |     Name      | Type  |  Owner
# --------+---------------+-------+---------
#  public | devices       | table | postgres
#  public | device_states | table | postgres
#  public | _prisma_migrations | table | postgres

# Check Prisma Client was generated
ls node_modules/@prisma/client/ | grep index
# Expected output: index.js, index.d.ts

# Open Prisma Studio (optional - GUI for database)
pnpm prisma studio
# Opens at http://localhost:5555
# You should see devices and device_states tables (empty)
```

**Subtasks:**
- [x] Backend: Database tables created
- [x] Backend: Prisma Client generated
- [x] Backend: TypeScript types available

---

#### Task 1.2.4: Add TimescaleDB Hypertable (1-2 hours)

**Commands:**
```bash
cd apps/api

# Create empty migration for TimescaleDB features
pnpm prisma migrate create add_timescaledb_features
```

**Edit the migration file:**

The command above creates a new migration file at:
`prisma/migrations/XXXXXXXXXXXXXX_add_timescaledb_features/migration.sql`

Open this file and add:

```sql
-- Convert device_states to hypertable
SELECT create_hypertable('device_states', 'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Add compression policy (compress data older than 7 days)
ALTER TABLE device_states SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id'
);

SELECT add_compression_policy('device_states', INTERVAL '7 days');

-- Add retention policy (delete data older than 90 days)
SELECT add_retention_policy('device_states', INTERVAL '90 days');

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_device_states_timestamp ON device_states (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_device_states_device_timestamp ON device_states (device_id, timestamp DESC);
```

**Apply the migration:**
```bash
pnpm prisma migrate deploy
```

**Deliverable:** TimescaleDB hypertable configured with compression and retention policies

**Verification:**
```bash
# Check hypertable was created
psql iot_platform -c "SELECT * FROM timescaledb_information.hypertables;"
# Expected output:
#  hypertable_schema | hypertable_name | ...
# -------------------+-----------------+-----
#  public            | device_states   | ...

# Check compression policy
psql iot_platform -c "SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_compression';"
# Expected output should show a job for device_states

# Check retention policy
psql iot_platform -c "SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';"
# Expected output should show a job for device_states
```

**Subtasks:**
- [x] Backend: Hypertable created
- [x] Backend: Compression policy added
- [x] Backend: Retention policy added
- [x] Backend: Indexes created

---

### Sprint 1.3: Services & Controllers (Day 4-5)

---

#### Task 1.3.1: Create Prisma Client Singleton (30 minutes)

**File:** `apps/api/src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
// Prevents multiple instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

**Deliverable:** Reusable Prisma Client singleton

**Verification:**
```bash
# Check file exists
cat src/lib/prisma.ts | grep "export const prisma"
# Expected output: export const prisma =

# Test import (create temporary test file)
cat > src/test-prisma.ts << 'EOF'
import { prisma } from './lib/prisma';

async function test() {
  const devices = await prisma.device.findMany();
  console.log('Devices:', devices);
}

test();
EOF

# Run test
npx tsx src/test-prisma.ts
# Expected output: Devices: []

# Clean up
rm src/test-prisma.ts
```

**Subtasks:**
- [x] Backend: Prisma singleton created
- [x] Backend: Connection tested

---

#### Task 1.3.2: Create Validation Schemas with Zod (1 hour)

**File:** `apps/api/src/schemas/device.schema.ts`

```typescript
import { z } from 'zod';

export const CreateDeviceSchema = z.object({
  deviceId: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
});

export const UpdateDeviceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
});

export const CreateDeviceStateSchema = z.object({
  data: z.record(z.any()),
  timestamp: z.string().datetime().optional(),
});

// Infer TypeScript types from Zod schemas
export type CreateDeviceDTO = z.infer<typeof CreateDeviceSchema>;
export type UpdateDeviceDTO = z.infer<typeof UpdateDeviceSchema>;
export type CreateDeviceStateDTO = z.infer<typeof CreateDeviceStateSchema>;
```

**Deliverable:** Zod validation schemas with TypeScript types

**Verification:**
```bash
# Check file exists
cat src/schemas/device.schema.ts | grep "CreateDeviceSchema"
# Expected output: export const CreateDeviceSchema =

# Test validation (create temporary test file)
cat > src/test-validation.ts << 'EOF'
import { CreateDeviceSchema } from './schemas/device.schema';

// Valid device
const valid = CreateDeviceSchema.parse({
  deviceId: 'sensor-001',
  name: 'Temperature Sensor',
});
console.log('Valid:', valid);

// Invalid device (will throw error)
try {
  CreateDeviceSchema.parse({ deviceId: '' }); // Empty deviceId
} catch (error) {
  console.log('Invalid detected:', error.errors[0].message);
}
EOF

# Run test
npx tsx src/test-validation.ts
# Expected output:
# Valid: { deviceId: 'sensor-001', name: 'Temperature Sensor' }
# Invalid detected: String must contain at least 1 character(s)

# Clean up
rm src/test-validation.ts
```

**Subtasks:**
- [x] Backend: Validation schemas created
- [x] Backend: TypeScript types inferred

---

#### Task 1.3.3: Implement DeviceService (2-3 hours)

**File:** `apps/api/src/services/DeviceService.ts`

```typescript
import { PrismaClient, Device } from '@prisma/client';
import { CreateDeviceDTO, UpdateDeviceDTO } from '../schemas/device.schema';

export class DeviceService {
  constructor(private prisma: PrismaClient) {}

  async getAllDevices(options?: {
    page?: number;
    limit?: number;
    tags?: string[];
  }): Promise<{ devices: Device[]; total: number; page: number; totalPages: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where = options?.tags?.length
      ? { tags: { hasSome: options.tags } }
      : {};

    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.device.count({ where }),
    ]);

    return {
      devices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device> {
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    return device;
  }

  async createDevice(data: CreateDeviceDTO): Promise<Device> {
    // Check if device already exists
    const existing = await this.prisma.device.findUnique({
      where: { deviceId: data.deviceId },
    });

    if (existing) {
      throw new Error('Device with this ID already exists');
    }

    return this.prisma.device.create({
      data: {
        deviceId: data.deviceId,
        name: data.name,
        tags: data.tags || [],
        attributes: data.attributes || {},
      },
    });
  }

  async updateDevice(deviceId: string, data: UpdateDeviceDTO): Promise<Device> {
    // Check if device exists
    await this.getDeviceByDeviceId(deviceId);

    return this.prisma.device.update({
      where: { deviceId },
      data,
    });
  }

  async deleteDevice(deviceId: string): Promise<void> {
    // Check if device exists
    await this.getDeviceByDeviceId(deviceId);

    await this.prisma.device.delete({
      where: { deviceId },
    });
  }
}
```

**Deliverable:** DeviceService with CRUD operations

**Verification:**
```bash
# Check file exists
cat src/services/DeviceService.ts | grep "class DeviceService"
# Expected output: export class DeviceService {

# Test service (create temporary test file)
cat > src/test-service.ts << 'EOF'
import { prisma } from './lib/prisma';
import { DeviceService } from './services/DeviceService';

async function test() {
  const service = new DeviceService(prisma);

  // Create device
  const device = await service.createDevice({
    deviceId: 'test-001',
    name: 'Test Device',
    tags: ['test'],
  });
  console.log('Created:', device);

  // Get device
  const fetched = await service.getDeviceByDeviceId('test-001');
  console.log('Fetched:', fetched);

  // Delete device
  await service.deleteDevice('test-001');
  console.log('Deleted');

  await prisma.$disconnect();
}

test().catch(console.error);
EOF

# Run test
npx tsx src/test-service.ts
# Expected output:
# Created: { id: '...', deviceId: 'test-001', name: 'Test Device', ... }
# Fetched: { id: '...', deviceId: 'test-001', ... }
# Deleted

# Clean up
rm src/test-service.ts
```

**Subtasks:**
- [x] Backend: DeviceService created
- [x] Backend: CRUD operations implemented
- [x] Backend: Service tested

---

#### Task 1.3.4: Implement DeviceStateService (2-3 hours)

**File:** `apps/api/src/services/DeviceStateService.ts`

```typescript
import { PrismaClient, DeviceState } from '@prisma/client';
import { DeviceService } from './DeviceService';
import { CreateDeviceStateDTO } from '../schemas/device.schema';

export class DeviceStateService {
  private deviceService: DeviceService;

  constructor(private prisma: PrismaClient) {
    this.deviceService = new DeviceService(prisma);
  }

  async createDeviceState(
    deviceId: string,
    data: CreateDeviceStateDTO,
    socketManager?: any // Will add Socket.io later
  ): Promise<DeviceState> {
    // Verify device exists
    const device = await this.deviceService.getDeviceByDeviceId(deviceId);

    // Create state
    const state = await this.prisma.deviceState.create({
      data: {
        deviceId: device.id,
        data: data.data,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    });

    // TODO: Broadcast to WebSocket clients (Sprint 1.4)
    // if (socketManager) {
    //   socketManager.broadcastDeviceState(deviceId, state);
    // }

    // TODO: Check workflow triggers (Week 2)
    // await this.checkWorkflowTriggers(deviceId, data.data);

    return state;
  }

  async getDeviceStates(
    deviceId: string,
    options?: {
      startTime?: string;
      endTime?: string;
      limit?: number;
    }
  ): Promise<DeviceState[]> {
    const device = await this.deviceService.getDeviceByDeviceId(deviceId);

    const where: any = {
      deviceId: device.id,
    };

    if (options?.startTime || options?.endTime) {
      where.timestamp = {};
      if (options.startTime) {
        where.timestamp.gte = new Date(options.startTime);
      }
      if (options.endTime) {
        where.timestamp.lte = new Date(options.endTime);
      }
    }

    return this.prisma.deviceState.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 100,
    });
  }

  async getLatestState(deviceId: string): Promise<DeviceState | null> {
    const device = await this.deviceService.getDeviceByDeviceId(deviceId);

    return this.prisma.deviceState.findFirst({
      where: { deviceId: device.id },
      orderBy: { timestamp: 'desc' },
    });
  }
}
```

**Deliverable:** DeviceStateService with state operations

**Verification:**
```bash
# Check file exists
cat src/services/DeviceStateService.ts | grep "class DeviceStateService"
# Expected output: export class DeviceStateService {

# Test service (create temporary test file)
cat > src/test-state-service.ts << 'EOF'
import { prisma } from './lib/prisma';
import { DeviceService } from './services/DeviceService';
import { DeviceStateService } from './services/DeviceStateService';

async function test() {
  const deviceService = new DeviceService(prisma);
  const stateService = new DeviceStateService(prisma);

  // Create device
  const device = await deviceService.createDevice({
    deviceId: 'test-002',
    name: 'Test Device 2',
  });

  // Create state
  const state = await stateService.createDeviceState('test-002', {
    data: { temperature: 72.5, humidity: 45 },
  });
  console.log('State created:', state);

  // Get states
  const states = await stateService.getDeviceStates('test-002');
  console.log('States:', states.length);

  // Get latest state
  const latest = await stateService.getLatestState('test-002');
  console.log('Latest:', latest);

  // Clean up
  await deviceService.deleteDevice('test-002');

  await prisma.$disconnect();
}

test().catch(console.error);
EOF

# Run test
npx tsx src/test-state-service.ts
# Expected output:
# State created: { id: '...', deviceId: '...', data: {...}, ... }
# States: 1
# Latest: { id: '...', ... }

# Clean up
rm src/test-state-service.ts
```

**Subtasks:**
- [x] Backend: DeviceStateService created
- [x] Backend: State CRUD operations implemented
- [x] Backend: Service tested

---

#### Task 1.3.5: Implement DeviceController (2 hours)

**File:** `apps/api/src/controllers/DeviceController.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { DeviceService } from '../services/DeviceService';
import {
  CreateDeviceSchema,
  UpdateDeviceSchema,
} from '../schemas/device.schema';
import { ZodError } from 'zod';

export class DeviceController {
  private deviceService: DeviceService;

  constructor(prisma: PrismaClient) {
    this.deviceService = new DeviceService(prisma);
  }

  async getAll(
    request: FastifyRequest<{
      Querystring: { page?: string; limit?: string; tags?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const page = request.query.page ? parseInt(request.query.page) : 1;
      const limit = request.query.limit ? parseInt(request.query.limit) : 20;
      const tags = request.query.tags?.split(',').filter(Boolean);

      const result = await this.deviceService.getAllDevices({ page, limit, tags });
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  }

  async getOne(
    request: FastifyRequest<{ Params: { deviceId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const device = await this.deviceService.getDeviceByDeviceId(
        request.params.deviceId
      );
      return reply.send(device);
    } catch (error) {
      return reply.status(404).send({ error: (error as Error).message });
    }
  }

  async create(
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply
  ) {
    try {
      const data = CreateDeviceSchema.parse(request.body);
      const device = await this.deviceService.createDevice(data);
      return reply.status(201).send(device);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: (error as Error).message });
    }
  }

  async update(
    request: FastifyRequest<{
      Params: { deviceId: string };
      Body: unknown;
    }>,
    reply: FastifyReply
  ) {
    try {
      const data = UpdateDeviceSchema.parse(request.body);
      const device = await this.deviceService.updateDevice(
        request.params.deviceId,
        data
      );
      return reply.send(device);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(404).send({ error: (error as Error).message });
    }
  }

  async delete(
    request: FastifyRequest<{ Params: { deviceId: string } }>,
    reply: FastifyReply
  ) {
    try {
      await this.deviceService.deleteDevice(request.params.deviceId);
      return reply.status(204).send();
    } catch (error) {
      return reply.status(404).send({ error: (error as Error).message });
    }
  }
}
```

**File:** `apps/api/src/controllers/DeviceStateController.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { DeviceStateService } from '../services/DeviceStateService';
import { CreateDeviceStateSchema } from '../schemas/device.schema';
import { ZodError } from 'zod';

export class DeviceStateController {
  private stateService: DeviceStateService;

  constructor(
    prisma: PrismaClient,
    private socketManager?: any // Will add Socket.io later
  ) {
    this.stateService = new DeviceStateService(prisma);
  }

  async create(
    request: FastifyRequest<{
      Params: { deviceId: string };
      Body: unknown;
    }>,
    reply: FastifyReply
  ) {
    try {
      const data = CreateDeviceStateSchema.parse(request.body);
      const state = await this.stateService.createDeviceState(
        request.params.deviceId,
        data,
        this.socketManager
      );
      return reply.status(201).send(state);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: (error as Error).message });
    }
  }

  async getAll(
    request: FastifyRequest<{
      Params: { deviceId: string };
      Querystring: { startTime?: string; endTime?: string; limit?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 100;
      const states = await this.stateService.getDeviceStates(
        request.params.deviceId,
        {
          startTime: request.query.startTime,
          endTime: request.query.endTime,
          limit,
        }
      );
      return reply.send(states);
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  }

  async getLatest(
    request: FastifyRequest<{ Params: { deviceId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const state = await this.stateService.getLatestState(request.params.deviceId);
      if (!state) {
        return reply.status(404).send({ error: 'No states found for device' });
      }
      return reply.send(state);
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  }
}
```

**Deliverable:** Controllers with HTTP request/response handling

**Verification:**
```bash
# Check files exist
ls src/controllers/
# Expected output: DeviceController.ts, DeviceStateController.ts

# TypeScript compilation (check for errors)
npx tsc --noEmit
# Expected output: (no output means success)
```

**Subtasks:**
- [x] Backend: DeviceController created
- [x] Backend: DeviceStateController created
- [x] Backend: Error handling added

---

### Sprint 1.4: API Routes & Server (Day 6-7)

---

#### Task 1.4.1: Create Device Routes (1 hour)

**File:** `apps/api/src/routes/v1/devices.routes.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { DeviceController } from '../../controllers/DeviceController';
import { DeviceStateController } from '../../controllers/DeviceStateController';

export async function deviceRoutes(server: FastifyInstance) {
  const deviceController = new DeviceController(server.prisma);
  const stateController = new DeviceStateController(
    server.prisma,
    server.socketManager // Will be undefined until Sprint 1.4.3
  );

  // Device CRUD
  server.get('/devices', deviceController.getAll.bind(deviceController));
  server.get('/devices/:deviceId', deviceController.getOne.bind(deviceController));
  server.post('/devices', deviceController.create.bind(deviceController));
  server.put('/devices/:deviceId', deviceController.update.bind(deviceController));
  server.delete('/devices/:deviceId', deviceController.delete.bind(deviceController));

  // Device States
  server.post(
    '/devices/:deviceId/state',
    stateController.create.bind(stateController)
  );
  server.get(
    '/devices/:deviceId/states',
    stateController.getAll.bind(stateController)
  );
  server.get(
    '/devices/:deviceId/states/latest',
    stateController.getLatest.bind(stateController)
  );
}
```

**Deliverable:** API routes configured

**Verification:**
```bash
# Check file exists
cat src/routes/v1/devices.routes.ts | grep "export async function deviceRoutes"
# Expected output: export async function deviceRoutes
```

**Subtasks:**
- [x] Backend: Routes defined
- [x] Backend: Controllers bound to routes

---

#### Task 1.4.2: Create Fastify Server with CORS (2 hours)

**File:** `apps/api/src/server.ts`

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { prisma } from './lib/prisma';
import { deviceRoutes } from './routes/v1/devices.routes';

// Load environment variables
config();

// Declare custom properties for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
    socketManager?: any; // Will add Socket.io later
  }
}

async function start() {
  // Create Fastify instance
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Attach Prisma to server instance
  server.decorate('prisma', prisma);

  // Register CORS plugin
  await server.register(cors, {
    origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Health check endpoint
  server.get('/health', async () => {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Register API routes
  await server.register(deviceRoutes, { prefix: '/api/v1' });

  // Start server
  const PORT = parseInt(process.env.PORT || '3001');
  await server.listen({ port: PORT, host: '0.0.0.0' });

  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ API: http://localhost:${PORT}/api/v1/devices`);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
```

**Deliverable:** Fastify server with CORS and health check

**Verification:**
```bash
# Start server
cd apps/api
pnpm dev
# Expected output:
# ✅ Server running on http://localhost:3001
# ✅ Health check: http://localhost:3001/health

# In another terminal, test health endpoint
curl http://localhost:3001/health
# Expected output: {"status":"healthy","timestamp":"...","services":{"database":"up"}}

# Test device list endpoint
curl http://localhost:3001/api/v1/devices
# Expected output: {"devices":[],"total":0,"page":1,"totalPages":0}

# Create a device
curl -X POST http://localhost:3001/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"sensor-001","name":"Temperature Sensor","tags":["test"]}'
# Expected output: {"id":"...","deviceId":"sensor-001","name":"Temperature Sensor",...}

# Get devices
curl http://localhost:3001/api/v1/devices
# Expected output: {"devices":[{"id":"...","deviceId":"sensor-001",...}],"total":1,...}
```

**Subtasks:**
- [x] Backend: Fastify server created
- [x] Backend: CORS configured
- [x] Backend: Health check endpoint
- [x] Backend: API routes registered

---

#### Task 1.4.3: Add WebSocket Server (Socket.io) (2-3 hours)

**File:** `apps/api/src/websocket/SocketManager.ts`

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export class SocketManager {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.WS_CORS_ORIGIN || '*',
        credentials: true,
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('✅ WebSocket client connected:', socket.id);

      // Subscribe to device state updates
      socket.on('subscribe', ({ topic }: { topic: string }) => {
        socket.join(topic);
        console.log(`Client ${socket.id} subscribed to ${topic}`);
      });

      // Unsubscribe from device state updates
      socket.on('unsubscribe', ({ topic }: { topic: string }) => {
        socket.leave(topic);
        console.log(`Client ${socket.id} unsubscribed from ${topic}`);
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket client disconnected:', socket.id);
      });
    });
  }

  // Broadcast device state update to subscribed clients
  broadcastDeviceState(deviceId: string, state: any) {
    this.io.to(`device:${deviceId}`).emit('device:state', {
      deviceId,
      ...state,
    });
  }

  // Broadcast alert to all clients
  broadcastAlert(alert: any) {
    this.io.emit('alert', alert);
  }

  // Get Socket.IO instance (for advanced usage)
  getIO() {
    return this.io;
  }
}
```

**Update server.ts to include WebSocket:**

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { createServer } from 'http';
import { prisma } from './lib/prisma';
import { SocketManager } from './websocket/SocketManager';
import { deviceRoutes } from './routes/v1/devices.routes';

config();

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
    socketManager?: SocketManager;
  }
}

async function start() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Attach Prisma
  server.decorate('prisma', prisma);

  // Register CORS
  await server.register(cors, {
    origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Create HTTP server for WebSocket
  const httpServer = createServer((req, res) => {
    server.routing(req, res);
  });

  // Initialize WebSocket
  const socketManager = new SocketManager(httpServer);
  server.decorate('socketManager', socketManager);

  // Health check
  server.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
          websocket: 'up',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Register API routes
  await server.register(deviceRoutes, { prefix: '/api/v1' });

  // Start HTTP server (handles both Fastify and Socket.io)
  const PORT = parseInt(process.env.PORT || '3001');
  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, '0.0.0.0', () => {
      resolve();
    });
  });

  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ API: http://localhost:${PORT}/api/v1/devices`);
}

// Graceful shutdown
const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
```

**Update DeviceStateService to broadcast:**

Edit `apps/api/src/services/DeviceStateService.ts` and update the `createDeviceState` method:

```typescript
async createDeviceState(
  deviceId: string,
  data: CreateDeviceStateDTO,
  socketManager?: any
): Promise<DeviceState> {
  // Verify device exists
  const device = await this.deviceService.getDeviceByDeviceId(deviceId);

  // Create state
  const state = await this.prisma.deviceState.create({
    data: {
      deviceId: device.id,
      data: data.data,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    },
  });

  // Broadcast to WebSocket clients
  if (socketManager) {
    socketManager.broadcastDeviceState(deviceId, {
      data: data.data,
      timestamp: state.timestamp,
    });
  }

  return state;
}
```

**Deliverable:** WebSocket server integrated with Fastify

**Verification:**
```bash
# Start server
cd apps/api
pnpm dev
# Expected output:
# ✅ Server running on http://localhost:3001
# ✅ WebSocket server running on ws://localhost:3001

# Test WebSocket connection (install wscat first)
npm install -g wscat

# In another terminal, connect to WebSocket
wscat -c ws://localhost:3001

# Subscribe to device updates
> {"event":"subscribe","topic":"device:sensor-001"}

# In another terminal, post device state
curl -X POST http://localhost:3001/api/v1/devices/sensor-001/state \
  -H "Content-Type: application/json" \
  -d '{"data":{"temperature":72.5}}'

# You should see message in wscat terminal:
# < {"deviceId":"sensor-001","data":{"temperature":72.5},"timestamp":"..."}
```

**Subtasks:**
- [x] Backend: SocketManager created
- [x] Backend: WebSocket server integrated
- [x] Backend: Broadcasting implemented
- [x] Backend: WebSocket tested

---

### Week 1 Summary Verification

**Backend Week 1 Checklist:**
- [x] Monorepo initialized with Turborepo
- [x] PostgreSQL + TimescaleDB running
- [x] Backend TypeScript project configured
- [x] Prisma schema created and migrated
- [x] TimescaleDB hypertable configured
- [x] Services implemented (Device, DeviceState)
- [x] Controllers implemented (Device, DeviceState)
- [x] API routes configured
- [x] Fastify server running
- [x] WebSocket server integrated
- [x] Health check endpoint working

**Final Week 1 Verification:**
```bash
# Start server
cd apps/api
pnpm dev

# In another terminal, run full test suite
# Test 1: Health check
curl http://localhost:3001/health

# Test 2: Create device
curl -X POST http://localhost:3001/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"final-test","name":"Final Test Device"}'

# Test 3: Get devices
curl http://localhost:3001/api/v1/devices

# Test 4: Post state
curl -X POST http://localhost:3001/api/v1/devices/final-test/state \
  -H "Content-Type: application/json" \
  -d '{"data":{"value":100}}'

# Test 5: Get states
curl http://localhost:3001/api/v1/devices/final-test/states

# Test 6: Get latest state
curl http://localhost:3001/api/v1/devices/final-test/states/latest

# All tests should return valid JSON responses
```

---

### Sprint 1.5: API Testing & Swagger Documentation (Day 6-7)

---

#### Task 1.5.1: Comprehensive API Testing (2-3 hours)

**Test All Endpoints:**
```bash
cd apps/api
pnpm dev  # Start server in one terminal

# In another terminal, test all endpoints:

# Health Checks (3 endpoints)
curl http://localhost:3001/health
curl http://localhost:3001/health/ready
curl http://localhost:3001/health/live

# Device Management (8 endpoints)
# 1. Create device
curl -X POST http://localhost:3001/devices \
  -H "Content-Type: application/json" \
  -d '{"name":"Temperature Sensor","tags":["warehouse","floor-1"]}'

# 2. Get device by ID (use deviceId from response above)
curl http://localhost:3001/devices/01KGPQZ53TRMAG5Y1H2S2SHPVG

# 3. List devices
curl http://localhost:3001/devices

# 4. Update device
curl -X PATCH http://localhost:3001/devices/01KGPQZ53TRMAG5Y1H2S2SHPVG \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Sensor"}'

# 5. Search by tags
curl "http://localhost:3001/devices/search/tags?tags=warehouse,floor-1"

# 6. Get device count
curl http://localhost:3001/devices/stats/count

# 7. Get recent devices
curl http://localhost:3001/devices/recent

# 8. Delete device (do this last)
curl -X DELETE http://localhost:3001/devices/01KGPQZ53TRMAG5Y1H2S2SHPVG

# Device States (8 endpoints)
# 1. Create state
curl -X POST http://localhost:3001/devices/01KGPQZ53TRMAG5Y1H2S2SHPVG/states \
  -H "Content-Type: application/json" \
  -d '{"data":{"temperature":23.5,"humidity":45}}'

# 2. Bulk create states
curl -X POST http://localhost:3001/states/bulk \
  -H "Content-Type: application/json" \
  -d '{"states":[{"deviceId":"01KGPQZ...","data":{"temp":24.1}},{"deviceId":"01KGPQZ...","data":{"temp":24.8}}]}'

# 3. Get states
curl http://localhost:3001/devices/01KGPQZ53TRMAG5Y1H2S2SHPVG/states

# 4. Get latest state
curl http://localhost:3001/devices/01KGPQZ53TRMAG5Y1H2S2SHPVG/states/latest

# 5. Aggregate states (TimescaleDB)
curl "http://localhost:3001/devices/01KGPQZ.../states/aggregate?startTime=2026-02-05T00:00:00Z&endTime=2026-02-05T23:59:59Z&bucket=1h&fields=temperature&functions=avg,min,max"

# 6. Get field statistics
curl "http://localhost:3001/devices/01KGPQZ.../states/statistics?field=temperature&startTime=2026-02-05T00:00:00Z&endTime=2026-02-05T23:59:59Z"

# 7. Get state count
curl http://localhost:3001/devices/01KGPQZ53TRMAG5Y1H2S2SHPVG/states/count

# 8. Delete old states
curl -X DELETE "http://localhost:3001/devices/01KGPQZ.../states/old?beforeDate=2026-01-01T00:00:00Z"
```

**Test WebSocket Events:**

Create test client file:
```bash
# Create WebSocket test client
cat > test-websocket.js << 'EOF'
const { io } = require('socket.io-client');

const socket = io('http://localhost:3001', {
  path: '/ws',
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);

  // Subscribe to device
  const deviceId = '01KGPQZ53TRMAG5Y1H2S2SHPVG';
  socket.emit('subscribe:device', deviceId);
  console.log('📡 Subscribed to device:', deviceId);
});

socket.on('subscribed', (data) => {
  console.log('✅ Subscription confirmed:', data);
});

socket.on('device:state', (update) => {
  console.log('📥 State update received:', update);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

// Ping/Pong test
setInterval(() => {
  socket.emit('ping');
  socket.once('pong', (data) => {
    console.log('🏓 Pong:', data);
  });
}, 10000);
EOF

# Install Socket.io client
pnpm add socket.io-client

# Run test client
node test-websocket.js
```

**Deliverable:** All 26 endpoints/events tested and verified

**Verification:**
- ✅ Health: 3/3 endpoints pass
- ✅ Devices: 8/8 endpoints pass
- ✅ Device States: 8/8 endpoints pass
- ✅ WebSocket: 7/7 events work
- ✅ Total: 26/26 (100% coverage)

**Subtasks:**
- [x] Backend: REST API endpoints tested
- [x] Backend: TimescaleDB aggregation tested
- [x] Backend: WebSocket real-time updates tested

---

#### Task 1.5.2: Install Swagger/OpenAPI (30 min)

**Commands:**
```bash
cd apps/api

# Install Swagger dependencies (Fastify 4.x compatible versions)
pnpm add @fastify/swagger@8.15.0 @fastify/swagger-ui@4.2.0 zod-to-json-schema
```

**Deliverable:** Swagger dependencies installed

**Verification:**
```bash
# Check packages installed
pnpm list | grep swagger
# Expected output:
# @fastify/swagger 8.15.0
# @fastify/swagger-ui 4.2.0
```

**Subtasks:**
- [x] Backend: Swagger packages installed
- [x] Backend: Version compatible with Fastify 4.x

---

#### Task 1.5.3: Create Swagger Utility Helper (30 min)

**File:** `apps/api/src/utils/swagger.ts`

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Convert Zod schema to JSON Schema for Swagger
 */
export function zodToSwagger(zodSchema: any, options?: { description?: string }): any {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    target: 'openApi3',
    $refStrategy: 'none',
  });

  // Remove the $schema property as it's not needed in OpenAPI
  const { $schema, ...schema } = jsonSchema as any;

  if (options?.description) {
    return {
      ...schema,
      description: options.description,
    };
  }

  return schema;
}

/**
 * Create standard success response schema
 */
export function successResponse(dataSchema: any, description?: string) {
  return {
    description: description || 'Successful response',
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: dataSchema,
    },
    required: ['success', 'data'],
  };
}

/**
 * Create paginated response schema
 */
export function paginatedResponse(dataSchema: any, description?: string) {
  return {
    description: description || 'Paginated response',
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: dataSchema,
      },
      pagination: {
        type: 'object',
        properties: {
          total: { type: 'number', example: 100 },
          limit: { type: 'number', example: 100 },
          offset: { type: 'number', example: 0 },
          hasMore: { type: 'boolean', example: false },
        },
      },
    },
    required: ['success', 'data', 'pagination'],
  };
}

/**
 * Create error response schema
 */
export function errorResponse(description?: string) {
  return {
    description: description || 'Error response',
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Error message' },
      details: { type: 'object', additionalProperties: true },
    },
    required: ['success', 'error'],
  };
}
```

**Deliverable:** Swagger utility functions created

**Verification:**
```bash
cat src/utils/swagger.ts | grep "export function zodToSwagger"
# Expected output: export function zodToSwagger
```

**Subtasks:**
- [x] Backend: Zod to Swagger converter created
- [x] Backend: Response schema helpers created

---

#### Task 1.5.4: Configure Swagger in Server (1 hour)

**Update:** `apps/api/src/server.ts`

Add Swagger imports at the top:
```typescript
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
```

Add Swagger configuration after CORS registration:
```typescript
// Register Swagger
await fastify.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'IoT Platform API',
      description: 'Enterprise IoT Platform API - Device Management, Time-Series Data, and Real-Time Communication',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@iot-platform.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Health check and monitoring endpoints' },
      { name: 'Devices', description: 'Device management operations' },
      { name: 'Device States', description: 'Time-series device state management with TimescaleDB' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization (planned for MVP)',
        },
      },
    },
  },
});

// Register Swagger UI
await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
  },
  staticCSP: true,
});
```

Update root endpoint to include Swagger links:
```typescript
fastify.get('/', async (_request, reply) => {
  return reply.send({
    service: 'IoT Platform API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      devices: '/devices',
      states: '/states',
      docs: '/docs',
      swagger: '/docs/json',
    },
    documentation: {
      interactive: `http://localhost:${config.server.port}/docs`,
      openapi: `http://localhost:${config.server.port}/docs/json`,
      websocket: 'See docs/softwares/WEBSOCKET_API.md',
    },
  });
});
```

**Deliverable:** Swagger configured in Fastify server

**Verification:**
```bash
# Start server
pnpm dev

# In another terminal, test Swagger endpoints
curl http://localhost:3001/ | jq '.endpoints'
# Should show: { "docs": "/docs", "swagger": "/docs/json", ... }

curl http://localhost:3001/docs/json | jq '.info'
# Should show OpenAPI info object
```

**Subtasks:**
- [x] Backend: Swagger plugin registered
- [x] Backend: Swagger UI configured at /docs
- [x] Backend: OpenAPI spec available at /docs/json

---

#### Task 1.5.5: Add OpenAPI Schemas to Routes (2-3 hours)

**Update all route files to include OpenAPI schemas:**

**Pattern for each endpoint:**
```typescript
fastify.post('/devices', {
  schema: {
    tags: ['Devices'],
    summary: 'Create a new device',
    description: 'Creates a new IoT device with auto-generated ULID identifier',
    body: zodToSwagger(createDeviceSchema),
    response: {
      201: successResponse({
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          deviceId: { type: 'string' },
          name: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
        },
      }, 'Device created successfully'),
      400: errorResponse('Validation error'),
    },
  },
}, deviceController.create);
```

**Important:** Remove "example" keywords from querystring/body schemas (causes validation errors):
```typescript
// ❌ BAD - Will cause validation error
querystring: {
  properties: {
    field: { type: 'string', example: 'temperature' }  // Don't use example here
  }
}

// ✅ GOOD - Move example to description
querystring: {
  properties: {
    field: { type: 'string', description: 'Field name e.g., temperature' }
  }
}
```

**Update these route files:**
1. `src/routes/health.routes.ts` - 3 endpoints
2. `src/routes/device.routes.ts` - 8 endpoints
3. `src/routes/device-state.routes.ts` - 8 endpoints

**Deliverable:** All 19 REST endpoints have OpenAPI documentation

**Verification:**
```bash
# Check endpoint count
curl -s http://localhost:3001/docs/json | jq '.paths | keys | length'
# Expected output: 16 (unique paths, some have multiple methods)

# Check all paths are documented
curl -s http://localhost:3001/docs/json | jq '.paths | keys[]'
# Should list all API paths

# Open Swagger UI in browser
open http://localhost:3001/docs
# Should see interactive API documentation
```

**Subtasks:**
- [x] Backend: Health routes documented (3 endpoints)
- [x] Backend: Device routes documented (8 endpoints)
- [x] Backend: Device state routes documented (8 endpoints)
- [x] Backend: Fixed JSON Schema validation errors

---

#### Task 1.5.6: Create WebSocket API Documentation (1 hour)

**File:** `docs/softwares/WEBSOCKET_API.md`

Create comprehensive documentation for WebSocket events (see full content in completed implementation).

**Deliverable:** WebSocket API documentation file

**Verification:**
```bash
# Check file exists
cat docs/softwares/WEBSOCKET_API.md | grep "WebSocket API"
# Should show title
```

**Subtasks:**
- [x] Documentation: WebSocket events documented
- [x] Documentation: Subscription patterns explained
- [x] Documentation: Integration examples provided

---

#### Task 1.5.7: Consolidate API Documentation (30 min)

**Update:** `docs/softwares/API_INDEX.md`

Update to point to Swagger UI instead of individual markdown files:

```markdown
# IoT Platform API Documentation

## 📚 API Documentation

### Interactive Swagger UI (REST APIs)
🌐 **Swagger UI:** http://localhost:3001/docs
📄 **OpenAPI Spec:** http://localhost:3001/docs/json

**19 REST Endpoints** documented with interactive testing

### WebSocket API (Real-Time Events)
📖 **Documentation:** [WEBSOCKET_API.md](./WEBSOCKET_API.md)

**7 WebSocket Events** for real-time device updates
```

**Remove old markdown files:**
```bash
cd docs/softwares
rm -f DEVICE_API.md DEVICE_STATE_API.md HEALTH_API.md
```

**Keep only:**
- `API_INDEX.md` - Overview with links to Swagger
- `WEBSOCKET_API.md` - WebSocket documentation

**Deliverable:** Documentation consolidated to Swagger + WebSocket markdown

**Verification:**
```bash
ls docs/softwares/
# Expected output: API_INDEX.md  WEBSOCKET_API.md
```

**Subtasks:**
- [x] Documentation: API_INDEX.md updated
- [x] Documentation: Old markdown files removed
- [x] Documentation: WEBSOCKET_API.md kept

---

**Sprint 1.5 Status:** ✅ COMPLETE
- All 26 endpoints/events tested (100% coverage)
- Swagger/OpenAPI 3.0 integration complete
- Interactive API documentation at http://localhost:3001/docs
- WebSocket documentation maintained separately
- No separate YAML file needed (code-first approach)

**Final Week 1 Verification with Swagger:**
```bash
# Start server
cd apps/api
pnpm dev

# Test Swagger UI
open http://localhost:3001/docs
# Should see interactive API documentation for all 19 REST endpoints

# Test OpenAPI JSON spec
curl http://localhost:3001/docs/json | jq '.info'
# Should show API info

# Test endpoint via Swagger UI:
# 1. Open http://localhost:3001/docs in browser
# 2. Expand "POST /devices" endpoint
# 3. Click "Try it out"
# 4. Fill in request body
# 5. Click "Execute"
# 6. Verify 201 response
```

---

## Week 2: Frontend & Dashboard

---

### Sprint 2.1: Frontend Setup (Day 8-9)

---

#### Task 2.1.1: Initialize Next.js 14 (1-2 hours)

**Commands:**
```bash
# Navigate to root
cd ../../

# Create Next.js app
pnpm create next-app@latest apps/web --typescript --tailwind --app --no-src-dir

# Navigate to web app
cd apps/web

# Install dependencies
pnpm add axios @tanstack/react-query socket.io-client zustand recharts

# Install dev dependencies
pnpm add -D @types/node
```

**Create .env.local:**
```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
EOF
```

**Deliverable:** Next.js 14 app initialized with dependencies

**Verification:**
```bash
# Check Next.js version
cat package.json | grep "next"
# Expected output: "next": "14.x.x"

# Check dependencies
pnpm list | grep -E "(axios|react-query|socket.io-client|zustand|recharts)"
# Expected output: all packages listed

# Test dev server
pnpm dev
# Expected output:
# - ready started server on 0.0.0.0:3000
# Open http://localhost:3000 in browser (should show Next.js welcome page)
```

**Subtasks:**
- [x] Frontend: Next.js initialized
- [x] Frontend: Dependencies installed
- [x] Frontend: Environment variables configured

---

#### Task 2.1.2: Create Shared Types Package (1 hour)

**Commands:**
```bash
# Navigate to root
cd ../../

# Create types package
mkdir -p packages/types/src
cd packages/types

# Initialize package.json
cat > package.json << 'EOF'
{
  "name": "@repo/types",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
EOF

# Create TypeScript config
cat > tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"]
}
EOF
```

**File:** `packages/types/src/index.ts`

```typescript
export interface Device {
  id: string;
  deviceId: string;
  name: string;
  tags: string[];
  attributes?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceState {
  id: string;
  deviceId: string;
  data: Record<string, any>;
  timestamp: string;
}

export interface CreateDeviceRequest {
  deviceId: string;
  name: string;
  tags?: string[];
  attributes?: Record<string, any>;
}

export interface CreateDeviceStateRequest {
  data: Record<string, any>;
  timestamp?: string;
}

export interface Alert {
  message: string;
  severity: 'info' | 'warning' | 'error';
  deviceId: string;
  timestamp: Date;
}

export interface DeviceListResponse {
  devices: Device[];
  total: number;
  page: number;
  totalPages: number;
}
```

**Update apps/web/package.json to include types:**
```json
{
  "dependencies": {
    "@repo/types": "workspace:*",
    ...
  }
}
```

**Deliverable:** Shared TypeScript types available to frontend and backend

**Verification:**
```bash
# Check types package
cat packages/types/src/index.ts | grep "export interface Device"
# Expected output: export interface Device {

# Install workspace dependencies
cd ../../apps/web
pnpm install

# Check types are available (test import)
cat > test-types.ts << 'EOF'
import type { Device } from '@repo/types';

const device: Device = {
  id: '1',
  deviceId: 'test',
  name: 'Test',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
console.log(device);
EOF

npx tsx test-types.ts
# Expected output: { id: '1', deviceId: 'test', ... }

# Clean up
rm test-types.ts
```

**Subtasks:**
- [x] Shared: Types package created
- [x] Shared: Types defined
- [x] Frontend: Types imported

---

#### Task 2.1.3: Create API Client (2 hours)

**File:** `apps/web/lib/api.ts`

```typescript
import axios from 'axios';
import type { Device, DeviceState, CreateDeviceRequest, DeviceListResponse } from '@repo/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const deviceApi = {
  // Get all devices
  getAll: async (params?: {
    page?: number;
    limit?: number;
    tags?: string[];
  }): Promise<DeviceListResponse> => {
    const response = await apiClient.get<DeviceListResponse>('/devices', {
      params: {
        ...params,
        tags: params?.tags?.join(','),
      },
    });
    return response.data;
  },

  // Get one device
  getOne: async (deviceId: string): Promise<Device> => {
    const response = await apiClient.get<Device>(`/devices/${deviceId}`);
    return response.data;
  },

  // Create device
  create: async (data: CreateDeviceRequest): Promise<Device> => {
    const response = await apiClient.post<Device>('/devices', data);
    return response.data;
  },

  // Update device
  update: async (deviceId: string, data: Partial<CreateDeviceRequest>): Promise<Device> => {
    const response = await apiClient.put<Device>(`/devices/${deviceId}`, data);
    return response.data;
  },

  // Delete device
  delete: async (deviceId: string): Promise<void> => {
    await apiClient.delete(`/devices/${deviceId}`);
  },

  // Create device state
  createState: async (deviceId: string, data: Record<string, any>): Promise<DeviceState> => {
    const response = await apiClient.post<DeviceState>(
      `/devices/${deviceId}/state`,
      { data }
    );
    return response.data;
  },

  // Get device states
  getStates: async (
    deviceId: string,
    params?: { startTime?: string; endTime?: string; limit?: number }
  ): Promise<DeviceState[]> => {
    const response = await apiClient.get<DeviceState[]>(
      `/devices/${deviceId}/states`,
      { params }
    );
    return response.data;
  },

  // Get latest state
  getLatestState: async (deviceId: string): Promise<DeviceState> => {
    const response = await apiClient.get<DeviceState>(
      `/devices/${deviceId}/states/latest`
    );
    return response.data;
  },
};
```

**Deliverable:** API client with typed methods

**Verification:**
```bash
# Check file exists
cat lib/api.ts | grep "export const deviceApi"
# Expected output: export const deviceApi =

# TypeScript compilation (check for errors)
npx tsc --noEmit
# Expected output: (no output means success)
```

**Subtasks:**
- [x] Frontend: API client created
- [x] Frontend: All endpoints implemented
- [x] Frontend: TypeScript types applied

---

#### Task 2.1.4: Create React Query Hooks (2 hours)

**File:** `apps/web/hooks/useDevices.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceApi } from '@/lib/api';
import type { CreateDeviceRequest } from '@repo/types';

export function useDevices(params?: { page?: number; limit?: number; tags?: string[] }) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: () => deviceApi.getAll(params),
  });
}

export function useDevice(deviceId: string) {
  return useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => deviceApi.getOne(deviceId),
    enabled: !!deviceId,
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDeviceRequest) => deviceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useUpdateDevice(deviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateDeviceRequest>) => deviceApi.update(deviceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceId: string) => deviceApi.delete(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useDeviceStates(
  deviceId: string,
  params?: { startTime?: string; endTime?: string; limit?: number }
) {
  return useQuery({
    queryKey: ['deviceStates', deviceId, params],
    queryFn: () => deviceApi.getStates(deviceId, params),
    enabled: !!deviceId,
  });
}

export function useLatestState(deviceId: string) {
  return useQuery({
    queryKey: ['latestState', deviceId],
    queryFn: () => deviceApi.getLatestState(deviceId),
    enabled: !!deviceId,
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}
```

**Create React Query Provider:**

**File:** `apps/web/app/providers.tsx`

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**Update layout.tsx:**

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'IoT Platform',
  description: 'Enterprise IoT Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Deliverable:** React Query hooks for data fetching

**Verification:**
```bash
# Check files exist
ls hooks/useDevices.ts app/providers.tsx
# Expected output: hooks/useDevices.ts app/providers.tsx

# TypeScript compilation
npx tsc --noEmit
# Expected output: (no output means success)

# Test dev server
pnpm dev
# Open http://localhost:3000 (should load without errors)
```

**Subtasks:**
- [x] Frontend: React Query hooks created
- [x] Frontend: Provider configured
- [x] Frontend: Hooks tested

---

#### Task 2.1.5: Create WebSocket Hook for Real-time (2-3 hours)

**File:** `apps/web/hooks/useRealtimeData.ts`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function useRealtimeData(deviceIds: string[]) {
  const [liveData, setLiveData] = useState<Map<string, any>>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket if not already connected
    if (!socket) {
      socket = io(WS_URL, {
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        setConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        setConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });
    }

    // Subscribe to device topics
    deviceIds.forEach((deviceId) => {
      socket!.emit('subscribe', { topic: `device:${deviceId}` });
    });

    // Listen for device state updates
    const handleStateUpdate = ({ deviceId, data, timestamp }: any) => {
      setLiveData((prev) => {
        const newMap = new Map(prev);
        newMap.set(deviceId, { data, timestamp });
        return newMap;
      });
    };

    socket!.on('device:state', handleStateUpdate);

    // Cleanup
    return () => {
      socket!.off('device:state', handleStateUpdate);
      deviceIds.forEach((deviceId) => {
        socket!.emit('unsubscribe', { topic: `device:${deviceId}` });
      });
    };
  }, [deviceIds]);

  return { liveData, connected };
}
```

**Deliverable:** WebSocket hook for real-time data

**Verification:**
```bash
# Check file exists
cat hooks/useRealtimeData.ts | grep "export function useRealtimeData"
# Expected output: export function useRealtimeData

# Test in browser:
# 1. Start backend: cd apps/api && pnpm dev
# 2. Start frontend: cd apps/web && pnpm dev
# 3. Open browser console at http://localhost:3000
# 4. Check for WebSocket connection message
```

**Subtasks:**
- [x] Frontend: WebSocket hook created
- [x] Frontend: Connection management implemented
- [x] Frontend: Subscribe/unsubscribe logic added

---

### Sprint 2.2: Dashboard Components (Day 10-14)

---

#### Task 2.2.1: Create Device List Component (2-3 hours)

**File:** `apps/web/components/devices/DeviceList.tsx`

```typescript
'use client';

import { useDevices, useDeleteDevice } from '@/hooks/useDevices';

export function DeviceList() {
  const { data, isLoading, error } = useDevices();
  const deleteDevice = useDeleteDevice();

  if (isLoading) {
    return <div className="p-4">Loading devices...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error loading devices</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Devices</h2>
        <div className="text-sm text-gray-600">
          Total: {data?.total || 0} devices
        </div>
      </div>

      <div className="grid gap-4">
        {data?.devices.map((device) => (
          <div
            key={device.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-lg">{device.name}</h3>
                <p className="text-sm text-gray-600">{device.deviceId}</p>
                <div className="flex gap-2 mt-2">
                  {device.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Delete this device?')) {
                    deleteDevice.mutate(device.deviceId);
                  }
                }}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Create page to display DeviceList:**

**File:** `apps/web/app/devices/page.tsx`

```typescript
import { DeviceList } from '@/components/devices/DeviceList';

export default function DevicesPage() {
  return (
    <div>
      <DeviceList />
    </div>
  );
}
```

**Deliverable:** Device list component with CRUD operations

**Verification:**
```bash
# Start backend and frontend
# Backend: cd apps/api && pnpm dev
# Frontend: cd apps/web && pnpm dev

# Open browser at http://localhost:3000/devices
# You should see:
# - List of devices (if any exist)
# - Device names, IDs, and tags
# - Delete button for each device

# Test:
# 1. Create device via API (curl or Postman)
# 2. Refresh page - device should appear
# 3. Click delete - device should be removed
```

**Subtasks:**
- [x] Frontend: DeviceList component created
- [x] Frontend: Device display implemented
- [x] Frontend: Delete functionality added

---

#### Task 2.2.2: Create Device Form Component (2 hours)

**File:** `apps/web/components/devices/DeviceForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useCreateDevice } from '@/hooks/useDevices';
import type { CreateDeviceRequest } from '@repo/types';

export function DeviceForm() {
  const createDevice = useCreateDevice();
  const [formData, setFormData] = useState<CreateDeviceRequest>({
    deviceId: '',
    name: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDevice.mutate(formData, {
      onSuccess: () => {
        // Reset form
        setFormData({ deviceId: '', name: '', tags: [] });
        setTagInput('');
      },
    });
  };

  const addTag = () => {
    if (tagInput && !formData.tags.includes(tagInput)) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-xl font-bold">Create New Device</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Device ID</label>
        <input
          type="text"
          value={formData.deviceId}
          onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="sensor-001"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Device Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Temperature Sensor"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tags</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            className="flex-1 border border-gray-300 rounded px-3 py-2"
            placeholder="temperature, sensor"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Add
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          {formData.tags.map((tag) => (
            <span
              key={tag}
              className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-blue-900 hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={createDevice.isPending}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {createDevice.isPending ? 'Creating...' : 'Create Device'}
      </button>

      {createDevice.isError && (
        <div className="text-red-600 text-sm">
          Error: {(createDevice.error as Error).message}
        </div>
      )}

      {createDevice.isSuccess && (
        <div className="text-green-600 text-sm">Device created successfully!</div>
      )}
    </form>
  );
}
```

**Update devices page:**

```typescript
import { DeviceList } from '@/components/devices/DeviceList';
import { DeviceForm } from '@/components/devices/DeviceForm';

export default function DevicesPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-1">
        <DeviceForm />
      </div>
      <div className="lg:col-span-2">
        <DeviceList />
      </div>
    </div>
  );
}
```

**Deliverable:** Device creation form

**Verification:**
```bash
# Open http://localhost:3000/devices
# You should see:
# - Form on the left
# - Device list on the right

# Test:
# 1. Fill in Device ID: "test-001"
# 2. Fill in Name: "Test Device"
# 3. Add tags: "test", "demo"
# 4. Click "Create Device"
# 5. Device should appear in list on the right
```

**Subtasks:**
- [x] Frontend: DeviceForm component created
- [x] Frontend: Form validation implemented
- [x] Frontend: Tag management added
- [x] Frontend: Create functionality working

---

#### Task 2.2.3: Create Gauge Block Component (3-4 hours)

**File:** `apps/web/components/dashboard/blocks/GaugeBlock.tsx`

```typescript
'use client';

import { useRealtimeData } from '@/hooks/useRealtimeData';

interface GaugeBlockProps {
  deviceId: string;
  dataAttribute: string;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
}

export function GaugeBlock({
  deviceId,
  dataAttribute,
  label,
  unit = '',
  min = 0,
  max = 100,
}: GaugeBlockProps) {
  const { liveData, connected } = useRealtimeData([deviceId]);
  const deviceData = liveData.get(deviceId);
  const value = deviceData?.data[dataAttribute] ?? 0;

  // Calculate percentage for gauge
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  // Determine color based on value
  const getColor = () => {
    if (percentage > 80) return 'bg-red-500';
    if (percentage > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg">{label}</h3>
          <p className="text-sm text-gray-600">{deviceId}</p>
        </div>
        <div className="flex items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-xs text-gray-500">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center py-4">
        {/* Gauge visualization */}
        <div className="relative w-40 h-40">
          {/* Background circle */}
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="#e5e7eb"
              strokeWidth="12"
              fill="none"
            />
            {/* Value arc */}
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${(percentage / 100) * 439.8} 439.8`}
              className={`${getColor()} transition-all duration-500`}
              strokeLinecap="round"
            />
          </svg>
          {/* Value text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{value.toFixed(1)}</span>
            <span className="text-sm text-gray-600">{unit}</span>
          </div>
        </div>

        {/* Min/Max labels */}
        <div className="flex justify-between w-full mt-4 text-sm text-gray-600">
          <span>
            Min: {min}
            {unit}
          </span>
          <span>
            Max: {max}
            {unit}
          </span>
        </div>
      </div>

      {deviceData && (
        <div className="text-xs text-gray-500 text-center mt-2">
          Updated: {new Date(deviceData.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
```

**Create dashboard page:**

**File:** `apps/web/app/dashboard/page.tsx`

```typescript
'use client';

import { GaugeBlock } from '@/components/dashboard/blocks/GaugeBlock';

export default function DashboardPage() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <GaugeBlock
          deviceId="sensor-001"
          dataAttribute="temperature"
          label="Temperature"
          unit="°C"
          min={0}
          max={100}
        />
        <GaugeBlock
          deviceId="sensor-001"
          dataAttribute="humidity"
          label="Humidity"
          unit="%"
          min={0}
          max={100}
        />
        <GaugeBlock
          deviceId="sensor-001"
          dataAttribute="pressure"
          label="Pressure"
          unit="hPa"
          min={900}
          max={1100}
        />
      </div>
    </div>
  );
}
```

**Deliverable:** Real-time gauge component

**Verification:**
```bash
# Start backend and frontend
# Open http://localhost:3000/dashboard

# Create a device (if not exists):
curl -X POST http://localhost:3001/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"sensor-001","name":"Sensor 1"}'

# Send real-time data:
curl -X POST http://localhost:3001/api/v1/devices/sensor-001/state \
  -H "Content-Type: application/json" \
  -d '{"data":{"temperature":72.5,"humidity":45,"pressure":1013}}'

# You should see:
# - Three gauge blocks
# - Values update in real-time
# - Green/yellow/red colors based on percentage
# - "Live" indicator when WebSocket connected
```

**Subtasks:**
- [x] Frontend: GaugeBlock component created
- [x] Frontend: Real-time data integration
- [x] Frontend: Gauge visualization implemented
- [x] Frontend: Color coding added

---

#### Task 2.2.4: Create Time-Series Chart Block (3-4 hours)

**File:** `apps/web/components/dashboard/blocks/TimeSeriesBlock.tsx`

```typescript
'use client';

import { useDeviceStates } from '@/hooks/useDevices';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TimeSeriesBlockProps {
  deviceId: string;
  dataAttribute: string;
  label: string;
  unit?: string;
  timeRange?: number; // hours
}

export function TimeSeriesBlock({
  deviceId,
  dataAttribute,
  label,
  unit = '',
  timeRange = 24,
}: TimeSeriesBlockProps) {
  const startTime = new Date(Date.now() - timeRange * 60 * 60 * 1000).toISOString();
  const { data, isLoading, error } = useDeviceStates(deviceId, {
    startTime,
    limit: 100,
  });

  if (isLoading) {
    return <div className="border rounded-lg p-4 bg-white">Loading chart...</div>;
  }

  if (error) {
    return (
      <div className="border rounded-lg p-4 bg-white text-red-600">
        Error loading data
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = data
    ?.map((state) => ({
      timestamp: new Date(state.timestamp).toLocaleTimeString(),
      value: state.data[dataAttribute] ?? 0,
    }))
    .reverse(); // Oldest to newest

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{label}</h3>
        <p className="text-sm text-gray-600">
          {deviceId} - Last {timeRange} hours
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            label={{ value: unit, angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, label]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name={label}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="text-xs text-gray-500 text-center mt-2">
        {chartData?.length || 0} data points
      </div>
    </div>
  );
}
```

**Update dashboard page:**

```typescript
'use client';

import { GaugeBlock } from '@/components/dashboard/blocks/GaugeBlock';
import { TimeSeriesBlock } from '@/components/dashboard/blocks/TimeSeriesBlock';

export default function DashboardPage() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Real-time gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <GaugeBlock
          deviceId="sensor-001"
          dataAttribute="temperature"
          label="Temperature"
          unit="°C"
          min={0}
          max={100}
        />
        <GaugeBlock
          deviceId="sensor-001"
          dataAttribute="humidity"
          label="Humidity"
          unit="%"
          min={0}
          max={100}
        />
        <GaugeBlock
          deviceId="sensor-001"
          dataAttribute="pressure"
          label="Pressure"
          unit="hPa"
          min={900}
          max={1100}
        />
      </div>

      {/* Historical charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TimeSeriesBlock
          deviceId="sensor-001"
          dataAttribute="temperature"
          label="Temperature History"
          unit="°C"
          timeRange={24}
        />
        <TimeSeriesBlock
          deviceId="sensor-001"
          dataAttribute="humidity"
          label="Humidity History"
          unit="%"
          timeRange={24}
        />
      </div>
    </div>
  );
}
```

**Deliverable:** Time-series chart component

**Verification:**
```bash
# Generate historical data (run multiple times with different values):
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/v1/devices/sensor-001/state \
    -H "Content-Type: application/json" \
    -d "{\"data\":{\"temperature\":$((RANDOM % 30 + 50)),\"humidity\":$((RANDOM % 30 + 40))}}"
  sleep 2
done

# Open http://localhost:3000/dashboard
# You should see:
# - Real-time gauges at the top
# - Two time-series charts below
# - Charts show historical data over 24 hours
# - X-axis shows time, Y-axis shows values
```

**Subtasks:**
- [x] Frontend: TimeSeriesBlock component created
- [x] Frontend: Recharts integration
- [x] Frontend: Historical data fetching
- [x] Frontend: Chart visualization working

---

#### Task 2.2.5: Create Dashboard Canvas (3-4 hours)

**File:** `apps/web/components/dashboard/DashboardCanvas.tsx`

```typescript
'use client';

import { useState } from 'react';
import { GaugeBlock } from './blocks/GaugeBlock';
import { TimeSeriesBlock } from './blocks/TimeSeriesBlock';

interface DashboardBlockConfig {
  id: string;
  type: 'gauge' | 'timeseries';
  deviceId: string;
  dataAttribute: string;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  timeRange?: number;
}

export function DashboardCanvas() {
  const [blocks, setBlocks] = useState<DashboardBlockConfig[]>([
    {
      id: '1',
      type: 'gauge',
      deviceId: 'sensor-001',
      dataAttribute: 'temperature',
      label: 'Temperature',
      unit: '°C',
      min: 0,
      max: 100,
    },
    {
      id: '2',
      type: 'gauge',
      deviceId: 'sensor-001',
      dataAttribute: 'humidity',
      label: 'Humidity',
      unit: '%',
      min: 0,
      max: 100,
    },
    {
      id: '3',
      type: 'timeseries',
      deviceId: 'sensor-001',
      dataAttribute: 'temperature',
      label: 'Temperature History',
      unit: '°C',
      timeRange: 24,
    },
  ]);

  const renderBlock = (block: DashboardBlockConfig) => {
    switch (block.type) {
      case 'gauge':
        return (
          <GaugeBlock
            key={block.id}
            deviceId={block.deviceId}
            dataAttribute={block.dataAttribute}
            label={block.label}
            unit={block.unit}
            min={block.min}
            max={block.max}
          />
        );
      case 'timeseries':
        return (
          <TimeSeriesBlock
            key={block.id}
            deviceId={block.deviceId}
            dataAttribute={block.dataAttribute}
            label={block.label}
            unit={block.unit}
            timeRange={block.timeRange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-600">{blocks.length} blocks</div>
      </div>

      {/* Gauge blocks grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {blocks.filter((b) => b.type === 'gauge').map(renderBlock)}
      </div>

      {/* Chart blocks grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {blocks.filter((b) => b.type === 'timeseries').map(renderBlock)}
      </div>
    </div>
  );
}
```

**Update dashboard page:**

```typescript
import { DashboardCanvas } from '@/components/dashboard/DashboardCanvas';

export default function DashboardPage() {
  return <DashboardCanvas />;
}
```

**Deliverable:** Configurable dashboard canvas

**Verification:**
```bash
# Open http://localhost:3000/dashboard
# You should see:
# - Configurable dashboard layout
# - Gauges in top grid
# - Charts in bottom grid
# - Block count displayed
```

**Subtasks:**
- [x] Frontend: DashboardCanvas component created
- [x] Frontend: Block configuration system
- [x] Frontend: Layout management
- [x] Frontend: Dynamic block rendering

---

### Week 2 Summary Verification

**Frontend Week 2 Checklist:**
- [x] Next.js 14 initialized
- [x] Dependencies installed (axios, react-query, socket.io-client, zustand, recharts)
- [x] Shared types package created
- [x] API client implemented
- [x] React Query hooks created
- [x] WebSocket hook for real-time data
- [x] DeviceList component
- [x] DeviceForm component
- [x] GaugeBlock component (real-time)
- [x] TimeSeriesBlock component (historical)
- [x] DashboardCanvas component

**Final Week 2 Verification:**
```bash
# 1. Backend running: cd apps/api && pnpm dev
# 2. Frontend running: cd apps/web && pnpm dev

# 3. Test device management (http://localhost:3000/devices)
# - Create new device
# - View device list
# - Delete device

# 4. Test dashboard (http://localhost:3000/dashboard)
# - View real-time gauges
# - View historical charts
# - Post new data and see real-time updates

# 5. Test real-time updates:
curl -X POST http://localhost:3001/api/v1/devices/sensor-001/state \
  -H "Content-Type: application/json" \
  -d '{"data":{"temperature":85,"humidity":60,"pressure":1015}}'
# Gauges should update immediately
```

---

## Week 3: Polish & Testing

---

### Sprint 3.1: Error Handling & Logging (Day 15-17)

---

#### Task 3.1.1: Global Error Handler (1 hour)

**File:** `apps/api/src/middleware/errorHandler.ts`

```typescript
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  // Validation errors (Zod, Fastify schema)
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      details: error.validation,
    });
  }

  // Custom application errors
  if (error.message.includes('not found')) {
    return reply.status(404).send({
      error: 'Not Found',
      message: error.message,
    });
  }

  if (error.message.includes('already exists')) {
    return reply.status(409).send({
      error: 'Conflict',
      message: error.message,
    });
  }

  // Default internal server error
  return reply.status(500).send({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
  });
}
```

**Update server.ts:**

```typescript
// Add after creating Fastify instance
server.setErrorHandler(errorHandler);
```

**Deliverable:** Global error handling middleware

**Verification:**
```bash
# Test validation error
curl -X POST http://localhost:3001/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"","name":""}'
# Expected: 400 error with validation details

# Test not found error
curl http://localhost:3001/api/v1/devices/nonexistent
# Expected: 404 error

# Test duplicate error
curl -X POST http://localhost:3001/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"sensor-001","name":"Test"}'
# Run twice - second time should return 409 conflict
```

**Subtasks:**
- [x] Backend: Error handler created
- [x] Backend: Error types handled
- [x] Backend: Production vs development messages

---

### Sprint 3.2: Testing Setup (Day 18-19)

---

#### Task 3.2.1: Add Basic Tests (Optional, 3-4 hours)

Since this is a POC, comprehensive testing is optional. For production, you would add:

- Unit tests (Vitest for backend, Jest for frontend)
- Integration tests (API endpoint testing)
- E2E tests (Playwright)

**Example test file (for reference):**

**File:** `apps/api/src/services/__tests__/DeviceService.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DeviceService } from '../DeviceService';

const prisma = new PrismaClient();
const service = new DeviceService(prisma);

describe('DeviceService', () => {
  afterEach(async () => {
    // Clean up test data
    await prisma.device.deleteMany({
      where: { deviceId: { startsWith: 'test-' } },
    });
  });

  it('should create a device', async () => {
    const device = await service.createDevice({
      deviceId: 'test-001',
      name: 'Test Device',
      tags: ['test'],
    });

    expect(device).toHaveProperty('id');
    expect(device.deviceId).toBe('test-001');
    expect(device.name).toBe('Test Device');
  });

  it('should get all devices', async () => {
    await service.createDevice({
      deviceId: 'test-002',
      name: 'Test Device 2',
    });

    const result = await service.getAllDevices();
    expect(result.devices.length).toBeGreaterThan(0);
  });

  it('should throw error for duplicate deviceId', async () => {
    await service.createDevice({
      deviceId: 'test-003',
      name: 'Test Device 3',
    });

    await expect(
      service.createDevice({
        deviceId: 'test-003',
        name: 'Duplicate',
      })
    ).rejects.toThrow('already exists');
  });
});
```

**Subtasks:**
- [ ] Backend: Test setup (optional)
- [ ] Frontend: Test setup (optional)

---

### Sprint 3.3: Docker Setup (Day 20-21)

---

#### Task 3.3.1: Create Backend Dockerfile (1 hour)

**File:** `apps/api/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api
COPY turbo.json ./

# Generate Prisma Client
RUN cd apps/api && pnpm prisma generate

# Build
RUN pnpm run build --filter=api

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

**Deliverable:** Backend Dockerfile

**Verification:**
```bash
# Build image
docker build -t iot-api:latest -f apps/api/Dockerfile .

# Run container (test only, don't use for dev)
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://postgres:@host.docker.internal:5432/iot_platform" \
  iot-api:latest

# Test
curl http://localhost:3001/health
```

**Subtasks:**
- [x] Backend: Dockerfile created
- [x] Backend: Multi-stage build configured
- [x] Backend: Image tested

---

#### Task 3.3.2: Create Frontend Dockerfile (1 hour)

**File:** `apps/web/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web
COPY turbo.json ./

# Build
RUN cd apps/web && pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
```

**Deliverable:** Frontend Dockerfile

**Verification:**
```bash
# Build image
docker build -t iot-web:latest -f apps/web/Dockerfile .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:3001 \
  -e NEXT_PUBLIC_WS_URL=http://localhost:3001 \
  iot-web:latest

# Test
open http://localhost:3000
```

**Subtasks:**
- [x] Frontend: Dockerfile created
- [x] Frontend: Next.js build configured
- [x] Frontend: Image tested

---

#### Task 3.3.3: Create docker-compose.yml (2 hours)

**File:** `docker-compose.yml` (root directory)

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: iot_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/iot_platform?schema=public
      WS_CORS_ORIGIN: http://localhost:3000
    depends_on:
      postgres:
        condition: service_healthy
    command: sh -c "npx prisma migrate deploy && node dist/server.js"

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
      NEXT_PUBLIC_WS_URL: http://localhost:3001
    depends_on:
      - api

volumes:
  postgres-data:
```

**Deliverable:** Docker Compose configuration for full stack

**Verification:**
```bash
# Start all services
docker-compose up -d

# Check services are running
docker-compose ps
# Expected output: all services "Up"

# View logs
docker-compose logs -f

# Test API
curl http://localhost:3001/health
# Expected: {"status":"healthy",...}

# Test Frontend
open http://localhost:3000
# Expected: Dashboard loads

# Stop services
docker-compose down
```

**Subtasks:**
- [x] Docker: docker-compose.yml created
- [x] Docker: Services configured
- [x] Docker: Health checks added
- [x] Docker: Full stack tested

---

### Final POC Verification (Day 21)

**Complete End-to-End Test:**

```bash
# 1. Start full stack with Docker Compose
docker-compose up -d

# 2. Wait for services to be healthy
docker-compose ps

# 3. Create a device
curl -X POST http://localhost:3001/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"final-device","name":"Final Test Device","tags":["final","test"]}'

# 4. Post multiple states (historical data)
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/v1/devices/final-device/state \
    -H "Content-Type: application/json" \
    -d "{\"data\":{\"temperature\":$((RANDOM % 30 + 60)),\"humidity\":$((RANDOM % 20 + 40))}}"
  sleep 1
done

# 5. Open frontend
open http://localhost:3000/devices
# - You should see "final-device" in the list

# 6. Open dashboard
open http://localhost:3000/dashboard
# - Update gauge blocks to use "final-device"
# - You should see real-time gauges and historical charts

# 7. Test real-time updates
curl -X POST http://localhost:3001/api/v1/devices/final-device/state \
  -H "Content-Type: application/json" \
  -d '{"data":{"temperature":95,"humidity":75}}'
# - Gauges should update immediately in browser

# 8. Clean up
docker-compose down
```

**POC Completion Checklist:**
- [x] Backend API running
- [x] Database (PostgreSQL + TimescaleDB) configured
- [x] Prisma ORM with migrations
- [x] WebSocket server for real-time
- [x] Frontend (Next.js 14) running
- [x] Device management (CRUD)
- [x] Real-time dashboard (gauges)
- [x] Historical dashboard (charts)
- [x] Docker Compose deployment
- [x] Error handling
- [x] Type safety (TypeScript)
- [x] Production-ready architecture

**Congratulations! Your POC is complete!** 🎉

---

## Appendix: Troubleshooting

### Common Issues

#### Issue 1: Database Connection Failed

**Error:**
```
Error: Can't reach database server at `localhost:5432`
```

**Solutions:**
```bash
# Check PostgreSQL is running
brew services list | grep postgresql
# Or: sudo systemctl status postgresql

# Restart PostgreSQL
brew services restart postgresql@15
# Or: sudo systemctl restart postgresql

# Check DATABASE_URL in .env
cat apps/api/.env | grep DATABASE_URL
# Should be: postgresql://postgres:@localhost:5432/iot_platform

# Test connection manually
psql -h localhost -U postgres -d iot_platform
```

---

#### Issue 2: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solutions:**
```bash
# Find process using port 3001
lsof -ti:3001

# Kill the process
lsof -ti:3001 | xargs kill -9

# Or use different port (update .env)
PORT=3002 pnpm dev
```

---

#### Issue 3: Prisma Client Not Generated

**Error:**
```
Error: Cannot find module '@prisma/client'
```

**Solutions:**
```bash
cd apps/api

# Generate Prisma Client
pnpm prisma generate

# If schema changed, regenerate
pnpm prisma migrate dev

# Restart dev server
pnpm dev
```

---

#### Issue 4: CORS Errors in Browser

**Error (Browser Console):**
```
Access to fetch at 'http://localhost:3001/api/v1/devices' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solutions:**
```bash
# Check CORS configuration in apps/api/src/server.ts
# Should have:
await server.register(cors, {
  origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});

# Check .env file
cat apps/api/.env | grep WS_CORS_ORIGIN
# Should be: WS_CORS_ORIGIN=http://localhost:3000

# Restart backend
cd apps/api && pnpm dev
```

---

#### Issue 5: TypeScript Errors After Schema Changes

**Error:**
```
Property 'deviceId' does not exist on type 'Device'
```

**Solutions:**
```bash
cd apps/api

# Regenerate Prisma Client (generates new types)
pnpm prisma generate

# Restart TypeScript server in VS Code
# Command Palette (Cmd+Shift+P) → "TypeScript: Restart TS Server"

# Or restart dev server
pnpm dev
```

---

#### Issue 6: WebSocket Not Connecting

**Error (Browser Console):**
```
WebSocket connection to 'ws://localhost:3001' failed
```

**Solutions:**
```bash
# Check WebSocket server is running
# Look for this log when starting backend:
# ✅ WebSocket server running on ws://localhost:3001

# Check NEXT_PUBLIC_WS_URL in apps/web/.env.local
cat apps/web/.env.local | grep WS_URL
# Should be: NEXT_PUBLIC_WS_URL=http://localhost:3001

# Test WebSocket connection manually
npm install -g wscat
wscat -c ws://localhost:3001
# Should connect successfully

# Restart both backend and frontend
cd apps/api && pnpm dev
cd apps/web && pnpm dev
```

---

#### Issue 7: Docker Build Fails

**Error:**
```
Error: COPY failed: file not found
```

**Solutions:**
```bash
# Make sure you're running docker build from root directory
cd /path/to/iot-platform

# Build from root
docker build -t iot-api:latest -f apps/api/Dockerfile .

# Check .dockerignore doesn't exclude necessary files
cat .dockerignore

# Clean Docker cache and rebuild
docker builder prune
docker build --no-cache -t iot-api:latest -f apps/api/Dockerfile .
```

---

## Appendix: Quick Reference

### Essential Commands

**Backend:**
```bash
# Start development server
cd apps/api && pnpm dev

# Generate Prisma Client
pnpm prisma generate

# Create migration
pnpm prisma migrate dev --name migration_name

# Apply migrations (production)
pnpm prisma migrate deploy

# Open Prisma Studio (database GUI)
pnpm prisma studio

# Build for production
pnpm build

# Start production server
pnpm start
```

**Frontend:**
```bash
# Start development server
cd apps/web && pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint
```

**Docker:**
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api

# Restart service
docker-compose restart api

# Shell into container
docker-compose exec api sh

# Rebuild and restart
docker-compose up -d --build
```

**Database:**
```bash
# Connect to PostgreSQL
psql iot_platform

# List tables
\dt

# Describe table
\d devices

# Run query
SELECT * FROM devices;

# Exit
\q
```

---

### File Structure Reference

```
iot-platform/
├── apps/
│   ├── api/                          # Backend (Fastify + Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema
│   │   │   └── migrations/           # Database migrations
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts         # Prisma Client singleton
│   │   │   ├── services/             # Business logic
│   │   │   │   ├── DeviceService.ts
│   │   │   │   └── DeviceStateService.ts
│   │   │   ├── controllers/          # HTTP handlers
│   │   │   │   ├── DeviceController.ts
│   │   │   │   └── DeviceStateController.ts
│   │   │   ├── routes/v1/            # API routes
│   │   │   │   └── devices.routes.ts
│   │   │   ├── schemas/              # Zod validation
│   │   │   │   └── device.schema.ts
│   │   │   ├── middleware/           # Error handling
│   │   │   │   └── errorHandler.ts
│   │   │   ├── websocket/            # Socket.io
│   │   │   │   └── SocketManager.ts
│   │   │   └── server.ts             # Entry point
│   │   ├── .env                      # Environment variables
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   └── web/                          # Frontend (Next.js 14)
│       ├── app/                      # Next.js App Router
│       │   ├── devices/
│       │   │   └── page.tsx         # Device management page
│       │   ├── dashboard/
│       │   │   └── page.tsx         # Dashboard page
│       │   ├── layout.tsx           # Root layout
│       │   ├── page.tsx             # Home page
│       │   └── providers.tsx        # React Query provider
│       ├── components/
│       │   ├── devices/
│       │   │   ├── DeviceList.tsx
│       │   │   └── DeviceForm.tsx
│       │   └── dashboard/
│       │       ├── DashboardCanvas.tsx
│       │       └── blocks/
│       │           ├── GaugeBlock.tsx
│       │           └── TimeSeriesBlock.tsx
│       ├── hooks/                   # Custom hooks
│       │   ├── useDevices.ts
│       │   └── useRealtimeData.ts
│       ├── lib/                     # Utilities
│       │   └── api.ts               # API client
│       ├── .env.local               # Environment variables
│       ├── next.config.js
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── packages/
│   └── types/                        # Shared TypeScript types
│       └── src/
│           └── index.ts
│
├── docker-compose.yml                # Docker Compose config
├── package.json                      # Root package.json
├── pnpm-workspace.yaml              # pnpm workspaces
└── turbo.json                        # Turborepo config
```

---

### API Endpoints Reference

**Devices:**
```bash
# List devices
GET /api/v1/devices?page=1&limit=20&tags=temperature,sensor

# Get one device
GET /api/v1/devices/:deviceId

# Create device
POST /api/v1/devices
Body: {"deviceId":"sensor-001","name":"Temperature Sensor","tags":["test"]}

# Update device
PUT /api/v1/devices/:deviceId
Body: {"name":"Updated Name","tags":["updated"]}

# Delete device
DELETE /api/v1/devices/:deviceId
```

**Device States:**
```bash
# Create state
POST /api/v1/devices/:deviceId/state
Body: {"data":{"temperature":72.5,"humidity":45}}

# Get states
GET /api/v1/devices/:deviceId/states?limit=100&startTime=2024-01-01T00:00:00Z

# Get latest state
GET /api/v1/devices/:deviceId/states/latest
```

**Health:**
```bash
# Health check
GET /health
```

---

### Environment Variables Reference

**Backend (.env):**
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://postgres:@localhost:5432/iot_platform?schema=public"
WS_PORT=3002
WS_CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

---

### Next Steps

**After completing the POC, proceed to:**

1. **Read POC_TO_ENTERPRISE_PLAN.md** for scaling roadmap
2. **Phase 1: MVP (Weeks 4-8)**
   - Add MQTT broker (EMQX)
   - Implement multi-tenancy
   - Add JWT authentication
   - Deploy to VPS with Docker Compose
3. **Phase 2: Scale (Weeks 9-16)**
   - Cluster EMQX
   - Add Gateway Edge Agents (Go)
   - Implement industrial protocol support (Profinet, Modbus, OPC UA, BACnet, Siemens S7)
   - Add monitoring (Prometheus + Grafana)
4. **Phase 3: Enterprise (Weeks 17+)**
   - Migrate to Kubernetes
   - Multi-region deployment
   - Advanced auto-scaling
   - 99.9% uptime SLA

---

**Your POC is production-ready and architected for scale!** 🚀
