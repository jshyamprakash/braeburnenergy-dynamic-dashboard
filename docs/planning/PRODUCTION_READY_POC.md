# Production-Ready POC Guide
## Build Fast, Architect Right - Losant-Inspired IoT Platform

**Philosophy:** Start with a POC that uses production-grade architecture, so you can scale smoothly without major rewrites.

---

## ⚠️ DATABASE MIGRATION NOTICE (2026-02-12)

**This document references PostgreSQL + Prisma + TimescaleDB.**

**CURRENT IMPLEMENTATION:**
- ✅ MongoDB 8 + Mongoose + Time Series Collections
- ✅ `MONGODB_URI` (not `DATABASE_URL`)
- ✅ ObjectId IDs (not UUID)
- ✅ Mongoose schemas (not Prisma migrations)

Read "PostgreSQL" as "MongoDB", "Prisma" as "Mongoose", "TimescaleDB" as "MongoDB Time Series Collections".

---

## Table of Contents

1. [Architecture Principles](#architecture-principles)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Week 1: Foundation](#week-1-foundation)
5. [Week 2: Core Features](#week-2-core-features)
6. [Week 3: Polish & Patterns](#week-3-polish--patterns)
7. [Migration to Full MVP](#migration-to-full-mvp)

---

## Architecture Principles

### What We Keep Simple (For Speed)
- ❌ Skip Docker initially (add in Week 4)
- ❌ Skip MQTT (use HTTP, add MQTT in Week 4-5)
- ❌ Skip authentication (add in Week 4)
- ❌ Skip edge agents and industrial protocols like Profinet (add post-MVP in Phase 3-4)
- ❌ Single monorepo (split to microservices later if needed)

### What We Do Right (For Scale)
- ✅ Clean Architecture (Controllers → Services → Repositories)
- ✅ TypeScript (type safety from day 1)
- ✅ PostgreSQL + TimescaleDB (production database)
- ✅ Proper error handling & validation
- ✅ Environment configuration
- ✅ Layered architecture
- ✅ SOLID principles
- ✅ Database migrations
- ✅ API versioning (/api/v1)

**Result:** Production-ready codebase that can scale to enterprise without major refactoring.

---

## Technology Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript 5.x
- **Framework**: Fastify 4.x (2x faster than Express, built-in validation)
- **Database**: PostgreSQL 15 + TimescaleDB extension
- **ORM**: Prisma 5.x (best TypeScript integration, auto-generated types)
- **Validation**: Zod (type-safe runtime validation)
- **Real-time**: Socket.io

### Frontend
- **Framework**: Next.js 14 (includes React 18)
- **Language**: TypeScript
- **State**: Zustand (simple, scalable)
- **API Client**: TanStack Query (React Query)
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts

### Development Tools
- **Package Manager**: pnpm (faster, disk-efficient)
- **Monorepo**: Turborepo (shared code, incremental builds)
- **Linting**: ESLint + Prettier
- **Testing**: Vitest (unit) + Playwright (e2e)

---

## Project Structure

```
iot-platform/
├── apps/
│   ├── api/                          # Backend API
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Prisma schema (database models)
│   │   │   └── migrations/           # Prisma migrations
│   │   ├── src/
│   │   │   ├── lib/                  # Utilities
│   │   │   │   └── prisma.ts         # Prisma Client singleton
│   │   │   ├── services/             # Business logic
│   │   │   │   ├── DeviceService.ts
│   │   │   │   ├── DeviceStateService.ts
│   │   │   │   └── WorkflowService.ts
│   │   │   ├── controllers/          # HTTP handlers
│   │   │   │   ├── DeviceController.ts
│   │   │   │   └── DeviceStateController.ts
│   │   │   ├── routes/               # Route definitions
│   │   │   │   └── v1/
│   │   │   │       ├── devices.routes.ts
│   │   │   │       └── states.routes.ts
│   │   │   ├── schemas/              # Validation schemas
│   │   │   │   └── device.schema.ts
│   │   │   ├── middleware/           # Error handling, logging
│   │   │   │   └── errorHandler.ts
│   │   │   ├── websocket/            # WebSocket server
│   │   │   │   └── SocketManager.ts
│   │   │   └── server.ts             # Entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # Frontend (Next.js 14)
│       ├── app/                      # Next.js App Router
│       │   ├── devices/
│       │   │   ├── page.tsx         # Device list page
│       │   │   └── [deviceId]/
│       │   │       └── page.tsx     # Device details
│       │   ├── dashboards/
│       │   │   └── [dashboardId]/
│       │   │       └── page.tsx     # Dashboard renderer
│       │   ├── layout.tsx           # Root layout
│       │   └── page.tsx             # Home page
│       ├── components/
│       │   ├── devices/
│       │   │   ├── DeviceList.tsx
│       │   │   └── DeviceForm.tsx
│       │   └── dashboard/
│       │       ├── blocks/
│       │       │   ├── GaugeBlock.tsx
│       │       │   └── TimeSeriesBlock.tsx
│       │       └── DashboardCanvas.tsx
│       ├── lib/                     # Utilities
│       │   └── api.ts               # API client
│       ├── hooks/                   # Custom hooks
│       │   ├── useDevices.ts
│       │   └── useRealtimeData.ts
│       ├── stores/                  # Zustand stores
│       │   └── dashboardStore.ts
│       ├── next.config.js
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── types/                        # Shared TypeScript types
│   │   └── src/
│   │       └── index.ts
│   └── config/                       # Shared configs
│       ├── eslint-config/
│       └── typescript-config/
│
├── package.json                      # Root package.json
├── pnpm-workspace.yaml              # pnpm workspaces
├── turbo.json                        # Turborepo config
└── README.md
```

**Key Principles:**
- **Separation of Concerns**: Controllers → Services → Prisma Client (data layer)
- **Dependency Injection**: Services receive Prisma Client (easy to mock)
- **Type Safety**: End-to-end TypeScript (Prisma generates types automatically)
- **Testability**: Each layer is unit-testable (mock Prisma easily)
- **Scalability**: Can split into microservices later (each with own Prisma Client)

---

## Week 1: Foundation

### Day 1: Project Setup & Database

**Initialize Monorepo:**

```bash
# Create project
mkdir iot-platform
cd iot-platform

# Initialize pnpm workspace
cat > pnpm-workspace.yaml << EOF
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Initialize root package.json
pnpm init

# Install Turborepo
pnpm add -Dw turbo
```

**Create Root turbo.json:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
```

**Set up PostgreSQL with TimescaleDB:**

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Install TimescaleDB extension
brew install timescaledb

# Configure TimescaleDB
timescaledb-tune --quiet --yes

# Restart PostgreSQL
brew services restart postgresql@15

# Create database
createdb iot_platform

# Enable TimescaleDB extension
psql iot_platform -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

**Initialize Backend App:**

```bash
mkdir -p apps/api
cd apps/api

# Initialize package.json
pnpm init

# Install dependencies
pnpm add fastify @fastify/cors @fastify/env
pnpm add @prisma/client
pnpm add socket.io
pnpm add zod
pnpm add dotenv

# Install dev dependencies
pnpm add -D prisma
pnpm add -D typescript @types/node tsx nodemon
pnpm add -D eslint prettier
```

**TypeScript Configuration (apps/api/tsconfig.json):**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
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
```

**Initialize Prisma:**

```bash
# Initialize Prisma
pnpm dlx prisma init

# This creates:
# - prisma/schema.prisma
# - .env file with DATABASE_URL
```

**Environment Configuration (apps/api/.env):**

```bash
NODE_ENV=development
PORT=3001

# Database (Prisma format)
DATABASE_URL="postgresql://postgres:@localhost:5432/iot_platform?schema=public"

# WebSocket
WS_PORT=3002
WS_CORS_ORIGIN=http://localhost:5173
```

**Prisma Schema (apps/api/prisma/schema.prisma):**

```prisma
// This is your Prisma schema file
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
```

**Prisma Client Singleton (apps/api/src/lib/prisma.ts):**

```typescript
import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Package.json Scripts (apps/api/package.json):**

```json
{
  "name": "api",
  "scripts": {
    "dev": "nodemon --exec tsx src/server.ts",
    "build": "prisma generate && tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:deploy": "prisma migrate deploy"
  }
}
```

**Create Initial Migration:**

```bash
# Generate Prisma Client (creates types)
pnpm prisma generate

# Create and apply migration
pnpm prisma migrate dev --name init

# This creates:
# - prisma/migrations/xxx_init/migration.sql
# - Applies migration to database
# - Regenerates Prisma Client with types
```

**Deliverables Day 1:**
- [ ] Monorepo initialized with pnpm + Turborepo
- [ ] PostgreSQL + TimescaleDB running locally
- [ ] Backend TypeScript project configured
- [ ] Database connection working

---

### Day 2-3: Prisma Schema & TimescaleDB Setup

The Prisma schema was already created on Day 1, but let's enhance it and set up TimescaleDB features.

**Enhanced Prisma Schema (apps/api/prisma/schema.prisma):**

```prisma
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
```

**Create Initial Migration:**

```bash
cd apps/api

# Create and apply migration
pnpm prisma migrate dev --name init

# This generates:
# - prisma/migrations/xxx_init/migration.sql
# - Applies to database
# - Generates Prisma Client with TypeScript types
```

**Add TimescaleDB Hypertable (Manual Migration):**

Since Prisma doesn't natively support TimescaleDB extensions, we'll add a custom migration:

```bash
# Create empty migration
pnpm prisma migrate create add_timescaledb_features
```

**Edit the migration file (prisma/migrations/xxx_add_timescaledb_features/migration.sql):**

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

-- Add retention policy (drop data older than 90 days)
SELECT add_retention_policy('device_states', INTERVAL '90 days');

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_device_states_timestamp ON device_states (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_device_states_device_timestamp ON device_states (device_id, timestamp DESC);
```

**Apply the migration:**

```bash
pnpm prisma migrate deploy
```

**Prisma Client Usage Examples:**

No repository layer needed! Prisma Client IS your data access layer.

```typescript
import { prisma } from './lib/prisma';

// Find all devices with pagination
const devices = await prisma.device.findMany({
  skip: 0,
  take: 20,
  where: {
    tags: {
      hasSome: ['temperature', 'sensor'] // Array contains filter
    }
  },
  orderBy: {
    createdAt: 'desc'
  },
  include: {
    states: {
      take: 1,
      orderBy: { timestamp: 'desc' } // Include latest state
    }
  }
});

// Find device by deviceId
const device = await prisma.device.findUnique({
  where: { deviceId: 'sensor-001' }
});

// Create device
const newDevice = await prisma.device.create({
  data: {
    deviceId: 'sensor-002',
    name: 'Temperature Sensor',
    tags: ['temperature', 'outdoor'],
    attributes: { unit: 'celsius' }
  }
});

// Update device
const updated = await prisma.device.update({
  where: { deviceId: 'sensor-001' },
  data: { name: 'Updated Name' }
});

// Delete device (cascade deletes states)
await prisma.device.delete({
  where: { deviceId: 'sensor-001' }
});

// Create device state
const state = await prisma.deviceState.create({
  data: {
    deviceId: device.id,
    data: { temperature: 72.5, humidity: 45 },
    timestamp: new Date()
  }
});

// Query device states with time range
const states = await prisma.deviceState.findMany({
  where: {
    deviceId: device.id,
    timestamp: {
      gte: new Date('2024-01-01'),
      lte: new Date('2024-01-31')
    }
  },
  orderBy: { timestamp: 'desc' },
  take: 100
});

// Get latest state
const latestState = await prisma.deviceState.findFirst({
  where: { deviceId: device.id },
  orderBy: { timestamp: 'desc' }
});

// Count devices
const count = await prisma.device.count();

// Aggregations
const stats = await prisma.deviceState.aggregate({
  where: { deviceId: device.id },
  _count: true,
  _avg: {
    // Note: Can't directly aggregate JSON fields
    // Use raw SQL for complex aggregations
  }
});
```

**For Complex Queries (Use Raw SQL):**

```typescript
// Aggregated time-series query with time_bucket
const aggregatedStates = await prisma.$queryRaw`
  SELECT
    time_bucket('1 hour', timestamp) AS bucket,
    jsonb_object_agg(
      key,
      jsonb_build_object(
        'avg', AVG((value->>0)::numeric),
        'min', MIN((value->>0)::numeric),
        'max', MAX((value->>0)::numeric),
        'count', COUNT(*)
      )
    ) AS aggregated_data
  FROM device_states,
       jsonb_each(data)
  WHERE device_id = ${deviceId}
    AND timestamp BETWEEN ${startTime} AND ${endTime}
  GROUP BY bucket
  ORDER BY bucket DESC
  LIMIT 100
`;
```

**Generate Types After Schema Changes:**

```bash
# After changing schema.prisma, regenerate types
pnpm prisma generate

# This updates node_modules/@prisma/client with new types
```

**Prisma Studio (Database GUI):**

```bash
# Open visual database browser
pnpm prisma studio

# Opens at http://localhost:5555
# Browse/edit data visually
```

**Deliverables Day 2-3:**
- [ ] Prisma schema created with Device and DeviceState models
- [ ] Initial migration applied
- [ ] TimescaleDB hypertable configured
- [ ] Compression and retention policies added
- [ ] Prisma Client generated with TypeScript types
- [ ] Understand Prisma query API (no repository layer needed!)

---

### Day 4-5: Services & Controllers

**Validation Schemas (apps/api/src/schemas/device.schema.ts):**

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

export type CreateDeviceDTO = z.infer<typeof CreateDeviceSchema>;
export type UpdateDeviceDTO = z.infer<typeof UpdateDeviceSchema>;
export type CreateDeviceStateDTO = z.infer<typeof CreateDeviceStateSchema>;
```

**Device Service (apps/api/src/services/DeviceService.ts):**

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

**DeviceState Service (apps/api/src/services/DeviceStateService.ts):**

```typescript
import { DeviceStateRepository } from '../repositories/DeviceStateRepository';
import { DeviceService } from './DeviceService';
import { DeviceState } from '../entities/DeviceState.entity';
import { CreateDeviceStateDTO } from '../schemas/device.schema';
import { SocketManager } from '../websocket/SocketManager';

export class DeviceStateService {
  private deviceStateRepository: DeviceStateRepository;
  private deviceService: DeviceService;
  private socketManager: SocketManager;

  constructor(socketManager: SocketManager) {
    this.deviceStateRepository = new DeviceStateRepository();
    this.deviceService = new DeviceService();
    this.socketManager = socketManager;
  }

  async createDeviceState(
    deviceId: string,
    data: CreateDeviceStateDTO
  ): Promise<DeviceState> {
    // Verify device exists
    const device = await this.deviceService.getDeviceByDeviceId(deviceId);

    const state = await this.deviceStateRepository.create({
      deviceId: device.id,
      data: data.data,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    });

    // Broadcast to WebSocket clients
    this.socketManager.broadcastDeviceState(deviceId, {
      data: data.data,
      timestamp: state.timestamp,
    });

    // Simple workflow: Check thresholds
    await this.checkWorkflowTriggers(deviceId, data.data);

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

    return this.deviceStateRepository.findByDevice(device.id, {
      startTime: options?.startTime ? new Date(options.startTime) : undefined,
      endTime: options?.endTime ? new Date(options.endTime) : undefined,
      limit: options?.limit || 100,
    });
  }

  async getLatestState(deviceId: string): Promise<DeviceState | null> {
    const device = await this.deviceService.getDeviceByDeviceId(deviceId);
    return this.deviceStateRepository.getLatestState(device.id);
  }

  private async checkWorkflowTriggers(
    deviceId: string,
    data: Record<string, any>
  ): Promise<void> {
    // Simple hardcoded workflow for POC
    if (data.temperature !== undefined && data.temperature > 80) {
      this.socketManager.broadcastAlert({
        message: `High temperature alert: ${data.temperature}°C on ${deviceId}`,
        severity: 'warning',
        deviceId,
        timestamp: new Date(),
      });
    }
  }
}
```

**Device Controller (apps/api/src/controllers/DeviceController.ts):**

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { DeviceService } from '../services/DeviceService';
import {
  CreateDeviceSchema,
  UpdateDeviceSchema,
} from '../schemas/device.schema';

export class DeviceController {
  private deviceService: DeviceService;

  constructor() {
    this.deviceService = new DeviceService();
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
      if (error instanceof z.ZodError) {
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
      if (error instanceof z.ZodError) {
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

**Deliverables Day 4-5:**
- [ ] Service layer with business logic
- [ ] Controller layer with HTTP handlers
- [ ] Request validation with Zod
- [ ] Error handling
- [ ] Type-safe end-to-end

---

### Day 6-7: API Routes & WebSocket

**Routes (apps/api/src/routes/v1/devices.routes.ts):**

```typescript
import { FastifyInstance } from 'fastify';
import { DeviceController } from '../../controllers/DeviceController';
import { DeviceStateController } from '../../controllers/DeviceStateController';

export async function deviceRoutes(server: FastifyInstance) {
  const deviceController = new DeviceController();
  const stateController = new DeviceStateController(server.socketManager);

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

**WebSocket Manager (apps/api/src/websocket/SocketManager.ts):**

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
      console.log('Client connected:', socket.id);

      socket.on('subscribe', ({ topic }: { topic: string }) => {
        socket.join(topic);
        console.log(`Client ${socket.id} subscribed to ${topic}`);
      });

      socket.on('unsubscribe', ({ topic }: { topic: string }) => {
        socket.leave(topic);
        console.log(`Client ${socket.id} unsubscribed from ${topic}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  broadcastDeviceState(deviceId: string, state: any) {
    this.io.to(`device:${deviceId}`).emit('device:state', {
      deviceId,
      ...state,
    });
  }

  broadcastAlert(alert: any) {
    this.io.emit('alert', alert);
  }

  getIO() {
    return this.io;
  }
}
```

**Main Server (apps/api/src/server.ts):**

```typescript
import 'reflect-metadata';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createServer } from 'http';
import * as dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import { SocketManager } from './websocket/SocketManager';
import { deviceRoutes } from './routes/v1/devices.routes';

dotenv.config();

async function start() {
  // Initialize database
  await AppDataSource.initialize();
  console.log('✅ Database connected');

  // Create Fastify instance
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // CORS
  await app.register(cors, {
    origin: process.env.WS_CORS_ORIGIN || '*',
  });

  // Create HTTP server for WebSocket
  const httpServer = createServer(app.server);

  // Initialize WebSocket
  const socketManager = new SocketManager(httpServer);
  app.decorate('socketManager', socketManager);

  // Health check
  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // API Routes
  app.register(deviceRoutes, { prefix: '/api/v1' });

  // Start server
  const PORT = parseInt(process.env.PORT || '3001');
  await app.listen({ port: PORT, host: '0.0.0.0' });

  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket server running`);
}

start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await AppDataSource.destroy();
  process.exit(0);
});
```

**Deliverables Day 6-7:**
- [ ] API routes configured with versioning (/api/v1)
- [ ] WebSocket server integrated
- [ ] Server running with hot reload
- [ ] Health check endpoint

---

## Week 2: Core Features

### Day 8-10: Frontend Setup

**Initialize Frontend:**

```bash
cd ../../
pnpm create next-app@latest apps/web --typescript --tailwind --app --no-src-dir
cd apps/web
pnpm install

# Install dependencies
pnpm add @tanstack/react-query axios socket.io-client
pnpm add zustand
pnpm add recharts
pnpm add -D @types/node
```

**Shared Types Package (packages/types/src/index.ts):**

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

export interface Alert {
  message: string;
  severity: 'info' | 'warning' | 'error';
  deviceId: string;
  timestamp: Date;
}
```

**API Service (apps/web/src/services/api.service.ts):**

```typescript
import axios from 'axios';
import type { Device, DeviceState, CreateDeviceRequest } from '@iot/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const deviceApi = {
  getAll: async (params?: { page?: number; limit?: number; tags?: string[] }) => {
    const response = await apiClient.get<{
      devices: Device[];
      total: number;
      page: number;
      totalPages: number;
    }>('/devices', { params });
    return response.data;
  },

  getOne: async (deviceId: string) => {
    const response = await apiClient.get<Device>(`/devices/${deviceId}`);
    return response.data;
  },

  create: async (data: CreateDeviceRequest) => {
    const response = await apiClient.post<Device>('/devices', data);
    return response.data;
  },

  createState: async (deviceId: string, data: Record<string, any>) => {
    const response = await apiClient.post(`/devices/${deviceId}/state`, { data });
    return response.data;
  },

  getStates: async (deviceId: string, params?: { limit?: number }) => {
    const response = await apiClient.get<DeviceState[]>(
      `/devices/${deviceId}/states`,
      { params }
    );
    return response.data;
  },
};
```

**React Query Hook (apps/web/src/hooks/useDevices.ts):**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceApi } from '../services/api.service';
import type { CreateDeviceRequest } from '@iot/types';

export function useDevices(params?: { page?: number; limit?: number }) {
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

export function useDeviceStates(deviceId: string, limit = 100) {
  return useQuery({
    queryKey: ['deviceStates', deviceId, limit],
    queryFn: () => deviceApi.getStates(deviceId, { limit }),
    enabled: !!deviceId,
  });
}
```

**WebSocket Hook (apps/web/src/hooks/useRealtimeData.ts):**

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function useRealtimeData(deviceIds: string[]) {
  const [liveData, setLiveData] = useState<Map<string, any>>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io(WS_URL);

      socket.on('connect', () => {
        console.log('WebSocket connected');
        setConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      });
    }

    // Subscribe to device topics
    deviceIds.forEach((deviceId) => {
      socket!.emit('subscribe', { topic: `device:${deviceId}` });
    });

    // Listen for state updates
    const handleStateUpdate = ({ deviceId, data, timestamp }: any) => {
      setLiveData((prev) => {
        const newMap = new Map(prev);
        newMap.set(deviceId, { data, timestamp });
        return newMap;
      });
    };

    socket!.on('device:state', handleStateUpdate);

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

**Deliverables Day 8-10:**
- [ ] Frontend initialized with Next.js 14 + TypeScript
- [ ] Shared types package
- [ ] API client with React Query
- [ ] WebSocket hook for real-time data
- [ ] Tailwind CSS configured

---

### Day 11-14: Dashboard Components

(Components similar to previous guide, but using the type-safe APIs and hooks created above)

**Gauge Block, Time-Series Block, Device List** - implementation similar to POC_ROADMAP.md but using:
- `useRealtimeData` hook
- `useDevices` / `useDevice` hooks
- TypeScript types from shared package
- Tailwind CSS styling

---

## Week 3: Polish & Production Patterns

### Day 15-17: Error Handling & Logging

**Global Error Handler (apps/api/src/middleware/errorHandler.ts):**

```typescript
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  // Validation errors
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
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message,
  });
}
```

### Day 18-19: Testing Setup

**Vitest Configuration:**

```typescript
// apps/api/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

**Sample Test (apps/api/src/services/__tests__/DeviceService.test.ts):**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceService } from '../DeviceService';

describe('DeviceService', () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  it('should create a device', async () => {
    const device = await service.createDevice({
      deviceId: 'test-001',
      name: 'Test Device',
    });

    expect(device).toHaveProperty('id');
    expect(device.deviceId).toBe('test-001');
  });

  // More tests...
});
```

### Day 20-21: Docker Setup

**Dockerfile (apps/api/Dockerfile):**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api
COPY turbo.json ./

# Build
RUN pnpm run build --filter=api

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

**docker-compose.yml:**

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

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: postgres
      DB_PASSWORD: postgres
      DB_DATABASE: iot_platform
    depends_on:
      - postgres

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:80"
    environment:
      VITE_API_URL: http://localhost:3001
      VITE_WS_URL: http://localhost:3001

volumes:
  postgres-data:
```

---

## Migration to Full MVP

After 3 weeks, you have a **production-ready POC** with:
- ✅ Clean architecture (scales to microservices)
- ✅ TypeScript end-to-end
- ✅ PostgreSQL + TimescaleDB
- ✅ Type-safe APIs
- ✅ Real-time dashboard
- ✅ Docker ready
- ✅ Testing framework
- ✅ Migration system

**Next Steps (Week 4+):**
1. Add MQTT broker (EMQX) → [IMPLEMENTATION_GUIDE.md Phase 2]
2. Add authentication & multi-tenancy → [IMPLEMENTATION_GUIDE.md Phase 1]
3. Build visual workflow editor → [IMPLEMENTATION_GUIDE.md Phase 3]
4. Deploy to production → [IMPLEMENTATION_GUIDE.md Phase 4]

**Your codebase is ready to scale!** 🚀

---

## Quick Start Commands

```bash
# Initialize project
pnpm create turbo@latest

# Start PostgreSQL
brew services start postgresql@15
createdb iot_platform
psql iot_platform -c "CREATE EXTENSION timescaledb;"

# Backend
cd apps/api
pnpm install
pnpm typeorm migration:run -d src/config/database.ts
pnpm dev

# Frontend
cd apps/web
pnpm install
pnpm dev

# Open browser
# Frontend: http://localhost:5173
# API: http://localhost:3001
```

**Now you can scale to enterprise without rewriting!** 🎯
