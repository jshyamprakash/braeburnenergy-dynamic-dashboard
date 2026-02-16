# Phase-by-Phase Implementation Roadmap
## Dynamic Dashboard - Enterprise IoT Platform

**Timeline:** 6 Months (24 weeks)
**Team Size:** 5-7 developers (2 frontend, 2 backend, 1 DevOps, 1 QA, 1 full-stack)

---

## ⚠️ DATABASE TECHNOLOGY NOTICE (2026-02-12)

**This document was written assuming PostgreSQL + Prisma + TimescaleDB.**

**CURRENT POC IMPLEMENTATION USES:**
- MongoDB 8 + Mongoose + Time Series Collections

When following this guide, substitute database technologies accordingly.

---

## Table of Contents

1. [Phase Overview](#phase-overview)
2. [Phase 1: MVP Foundation (Weeks 1-6)](#phase-1-mvp-foundation-weeks-1-6)
3. [Phase 2: Real-time Features (Weeks 7-12)](#phase-2-real-time-features-weeks-7-12)
4. [Phase 3: Workflow Engine (Weeks 13-18)](#phase-3-workflow-engine-weeks-13-18)
5. [Phase 4: Production Readiness (Weeks 19-24)](#phase-4-production-readiness-weeks-19-24)
6. [Sprint Planning Guidelines](#sprint-planning-guidelines)
7. [Testing Strategy](#testing-strategy)
8. [Risk Mitigation](#risk-mitigation)

---

## Phase Overview

| Phase | Duration | Key Deliverables | Team Focus |
|-------|----------|------------------|------------|
| **Phase 1** | Weeks 1-6 | Core infrastructure, basic device management, simple dashboards | Setup + Basic CRUD |
| **Phase 2** | Weeks 7-12 | Real-time dashboards, MQTT integration, WebSocket feeds | Real-time data flow |
| **Phase 3** | Weeks 13-18 | Visual workflow engine, edge agents, UNS support | Flow-based programming |
| **Phase 4** | Weeks 19-24 | Multi-tenancy, scaling, security hardening, production deploy | Enterprise features |

### Success Criteria

**Phase 1:**
- 100 devices connected, basic dashboard with 5 blocks, manual data entry

**Phase 2:**
- 1000 devices with live MQTT telemetry, real-time dashboard updates <500ms

**Phase 3:**
- 10 visual workflows deployed, edge agent running on 5 gateways

**Phase 4:**
- 10k devices, 99% uptime, 5 organizations isolated, deployed on Kubernetes

---

## Phase 1: MVP Foundation (Weeks 1-6)

### Objective
Build the foundational infrastructure and prove core concepts with a minimal viable product.

### Sprint 1-2: Project Setup & Core Infrastructure (Weeks 1-2)

#### Week 1: Repository & Development Environment

**Tasks:**
1. Initialize monorepo with Turborepo
2. Set up Next.js 14 frontend project
3. Set up Fastify backend service
4. Configure TypeScript, ESLint, Prettier
5. Set up local Docker Compose for development

**Code Examples:**

```bash
# Initialize monorepo
npx create-turbo@latest
cd dynamic-dashboard

# Project structure
apps/
├── web/                    # Next.js frontend
├── api/                    # Fastify backend
└── docs/                   # Documentation
packages/
├── types/                  # Shared TypeScript types
├── ui/                     # Shared React components
└── config/                 # Shared configs (ESLint, TS)
```

**docker-compose.dev.yml:**

```yaml
version: '3.8'
services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: iot_platform
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - timescale-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  nats:
    image: nats:2.10-alpine
    ports:
      - "4222:4222"
      - "8222:8222"  # HTTP monitoring

volumes:
  timescale-data:
  redis-data:
```

**Deliverables:**
- [ ] Monorepo initialized with Turborepo
- [ ] Local development environment running (Docker Compose)
- [ ] CI/CD pipeline skeleton (GitHub Actions)

#### Week 2: Database Schemas & API Foundation

**Tasks:**
1. Set up Prisma with PostgreSQL + TimescaleDB
2. Create Prisma schema (devices, users, organizations, device_states)
3. Run Prisma migrations to initialize database
4. Build basic Fastify server with health check
5. Set up shared TypeScript types

**TimescaleDB Schema:**

```sql
-- apps/api/src/database/migrations/001_initial_schema.sql

-- Organizations (multi-tenancy)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- Devices
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,  -- User-friendly ID
  name VARCHAR(255) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, device_id)
);

-- Device states (time-series)
CREATE TABLE device_states (
  time TIMESTAMPTZ NOT NULL,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  PRIMARY KEY (time, device_id)
);

-- Convert to hypertable
SELECT create_hypertable('device_states', 'time');

-- Indexes
CREATE INDEX idx_device_states_device_id ON device_states (device_id, time DESC);
CREATE INDEX idx_device_states_org_id ON device_states (org_id, time DESC);
CREATE INDEX idx_devices_org_id ON devices (org_id);

-- Enable Row-Level Security
ALTER TABLE device_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_states ON device_states
  USING (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY org_isolation_devices ON devices
  USING (org_id = current_setting('app.current_org_id', true)::UUID);
```

**Shared Types (packages/types/src/index.ts):**

```typescript
export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
  settings: Record<string, any>;
}

export interface Device {
  id: string;
  orgId: string;
  deviceId: string;
  name: string;
  tags: string[];
  attributes?: Record<string, AttributeDefinition>;
  createdAt: Date;
}

export interface AttributeDefinition {
  type: 'number' | 'string' | 'boolean' | 'object';
  unit?: string;
  description?: string;
}

export interface DeviceState {
  time: Date;
  deviceId: string;
  orgId: string;
  data: Record<string, any>;
}

export interface CreateDeviceStateRequest {
  deviceId: string;
  data: Record<string, any>;
  time?: string; // ISO 8601
}
```

**API Server Setup (apps/api/src/server.ts):**

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Database connections
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

const redis = new Redis(process.env.REDIS_URL);

// Attach to server instance
server.decorate('prisma', prisma);
server.decorate('redis', redis);

// Plugins
await server.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Health check
server.get('/health', async () => {
  try {
    // Check Prisma connection
    await prisma.$queryRaw`SELECT 1`;
    const redisHealth = await redis.ping();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        postgres: 'up',
        redis: redisHealth === 'PONG' ? 'up' : 'down',
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

// Graceful shutdown
const shutdown = async () => {
  await server.close();
  await prisma.$disconnect();
  redis.disconnect();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Server listening on port 3001');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
```

**Deliverables:**
- [ ] TimescaleDB schema created with RLS policies
- [ ] Prisma schema defined and migrated
- [ ] Fastify server with health check endpoint
- [ ] Database connection modules

### Sprint 3-4: Device Management API (Weeks 3-4)

#### Week 3: Device CRUD Operations

**Tasks:**
1. Implement Device API routes (Create, Read, Update, Delete)
2. Add validation schemas with Fastify
3. Implement pagination and filtering
4. Write unit tests (Jest)

**Device Routes (apps/api/src/routes/devices.ts):**

```typescript
import { FastifyInstance } from 'fastify';
import { Device, CreateDeviceRequest } from '@iot/types';

export async function deviceRoutes(server: FastifyInstance) {
  // Create device
  server.post<{ Body: CreateDeviceRequest }>('/devices', {
    schema: {
      body: {
        type: 'object',
        required: ['deviceId', 'name'],
        properties: {
          deviceId: { type: 'string', minLength: 1, maxLength: 255 },
          name: { type: 'string', minLength: 1, maxLength: 255 },
          tags: { type: 'array', items: { type: 'string' } },
          attributes: { type: 'object' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            deviceId: { type: 'string' },
            name: { type: 'string' },
            tags: { type: 'array' },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { deviceId, name, tags, attributes } = request.body;
    const orgId = request.user.orgId; // From auth middleware

    // Set RLS context
    await server.pg.query(`SET app.current_org_id = '${orgId}'`);

    const result = await server.pg.query(
      `INSERT INTO devices (org_id, device_id, name, tags)
       VALUES ($1, $2, $3, $4)
       RETURNING id, device_id, name, tags, created_at`,
      [orgId, deviceId, name, tags || []]
    );

    reply.status(201).send(result.rows[0]);
  });

  // List devices
  server.get<{
    Querystring: { page?: number; limit?: number; tags?: string };
  }>('/devices', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          tags: { type: 'string' }, // Comma-separated
        },
      },
    },
  }, async (request, reply) => {
    const { page = 1, limit = 20, tags } = request.query;
    const orgId = request.user.orgId;
    const offset = (page - 1) * limit;

    await server.pg.query(`SET app.current_org_id = '${orgId}'`);

    let query = 'SELECT * FROM devices WHERE org_id = $1';
    const params: any[] = [orgId];

    if (tags) {
      const tagArray = tags.split(',');
      query += ' AND tags && $2';
      params.push(tagArray);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) +
             ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await server.pg.query(query, params);

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total: result.rowCount || 0,
      },
    };
  });

  // Get device by ID
  server.get<{ Params: { deviceId: string } }>(
    '/devices/:deviceId',
    async (request, reply) => {
      const { deviceId } = request.params;
      const orgId = request.user.orgId;

      await server.pg.query(`SET app.current_org_id = '${orgId}'`);

      const result = await server.pg.query(
        'SELECT * FROM devices WHERE device_id = $1 AND org_id = $2',
        [deviceId, orgId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Device not found' });
      }

      return result.rows[0];
    }
  );

  // Delete device
  server.delete<{ Params: { deviceId: string } }>(
    '/devices/:deviceId',
    async (request, reply) => {
      const { deviceId } = request.params;
      const orgId = request.user.orgId;

      await server.pg.query(`SET app.current_org_id = '${orgId}'`);

      const result = await server.pg.query(
        'DELETE FROM devices WHERE device_id = $1 AND org_id = $2 RETURNING id',
        [deviceId, orgId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Device not found' });
      }

      return reply.status(204).send();
    }
  );
}
```

**Unit Tests (apps/api/src/routes/devices.test.ts):**

```typescript
import { build } from '../app';
import { FastifyInstance } from 'fastify';

describe('Device Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a device', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: {
        authorization: 'Bearer test-token',
      },
      payload: {
        deviceId: 'sensor-001',
        name: 'Temperature Sensor',
        tags: ['zone-a', 'temperature'],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      deviceId: 'sensor-001',
      name: 'Temperature Sensor',
    });
  });

  it('should list devices with pagination', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/devices?page=1&limit=10',
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('data');
    expect(response.json()).toHaveProperty('pagination');
  });
});
```

**Deliverables:**
- [ ] Device CRUD API with validation
- [ ] Pagination and filtering implemented
- [ ] Unit tests with 80% coverage

#### Week 4: Device State Ingestion

**Tasks:**
1. Implement device state POST endpoint
2. Add TimescaleDB insertion logic
3. Implement query endpoint for historical states
4. Add aggregation queries (hourly/daily rollups)

**Device State Routes (apps/api/src/routes/device-states.ts):**

```typescript
import { FastifyInstance } from 'fastify';
import { CreateDeviceStateRequest } from '@iot/types';

export async function deviceStateRoutes(server: FastifyInstance) {
  // Post device state
  server.post<{
    Params: { deviceId: string };
    Body: CreateDeviceStateRequest;
  }>('/devices/:deviceId/state', {
    schema: {
      params: {
        type: 'object',
        properties: {
          deviceId: { type: 'string' },
        },
        required: ['deviceId'],
      },
      body: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { type: 'object' },
          time: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (request, reply) => {
    const { deviceId } = request.params;
    const { data, time } = request.body;
    const orgId = request.user.orgId;

    // Get device internal ID
    const deviceResult = await server.pg.query(
      'SELECT id FROM devices WHERE device_id = $1 AND org_id = $2',
      [deviceId, orgId]
    );

    if (deviceResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Device not found' });
    }

    const internalDeviceId = deviceResult.rows[0].id;
    const timestamp = time ? new Date(time) : new Date();

    // Insert state
    await server.pg.query(
      `INSERT INTO device_states (time, device_id, org_id, data)
       VALUES ($1, $2, $3, $4)`,
      [timestamp, internalDeviceId, orgId, JSON.stringify(data)]
    );

    return { success: true };
  });

  // Query device states (historical)
  server.get<{
    Params: { deviceId: string };
    Querystring: {
      start?: string;
      end?: string;
      limit?: number;
      aggregate?: 'raw' | '1h' | '1d';
    };
  }>('/devices/:deviceId/state', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' },
          limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
          aggregate: { type: 'string', enum: ['raw', '1h', '1d'], default: 'raw' },
        },
      },
    },
  }, async (request, reply) => {
    const { deviceId } = request.params;
    const { start, end, limit = 100, aggregate = 'raw' } = request.query;
    const orgId = request.user.orgId;

    // Get device internal ID
    const deviceResult = await server.pg.query(
      'SELECT id FROM devices WHERE device_id = $1 AND org_id = $2',
      [deviceId, orgId]
    );

    if (deviceResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Device not found' });
    }

    const internalDeviceId = deviceResult.rows[0].id;

    let query: string;
    const params: any[] = [internalDeviceId];

    if (aggregate === 'raw') {
      query = `
        SELECT time, data
        FROM device_states
        WHERE device_id = $1
      `;

      if (start) {
        params.push(start);
        query += ` AND time >= $${params.length}`;
      }
      if (end) {
        params.push(end);
        query += ` AND time <= $${params.length}`;
      }

      query += ` ORDER BY time DESC LIMIT $${params.length + 1}`;
      params.push(limit);
    } else {
      // Aggregated query
      const interval = aggregate === '1h' ? '1 hour' : '1 day';
      query = `
        SELECT
          time_bucket($2, time) AS bucket,
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
        WHERE device_id = $1
      `;
      params.push(interval);

      if (start) {
        params.push(start);
        query += ` AND time >= $${params.length}`;
      }
      if (end) {
        params.push(end);
        query += ` AND time <= $${params.length}`;
      }

      query += ` GROUP BY bucket ORDER BY bucket DESC LIMIT $${params.length + 1}`;
      params.push(limit);
    }

    const result = await server.pg.query(query, params);
    return { data: result.rows };
  });
}
```

**Deliverables:**
- [ ] Device state POST endpoint
- [ ] Historical state query with aggregations
- [ ] Performance test (1000 inserts/sec)

### Sprint 5-6: Basic Dashboard UI (Weeks 5-6)

#### Week 5: Frontend Setup & Device List

**Tasks:**
1. Set up Next.js 14 with App Router
2. Create authentication flow (mock for now)
3. Build device list page with pagination
4. Implement device creation form

**Next.js App Structure:**

```
apps/web/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Authenticated layout
│   │   ├── devices/
│   │   │   ├── page.tsx         # Device list
│   │   │   └── [deviceId]/
│   │   │       └── page.tsx     # Device detail
│   │   └── dashboards/
│   │       └── [id]/
│   │           └── page.tsx
│   └── layout.tsx
├── components/
│   ├── devices/
│   │   ├── DeviceList.tsx
│   │   └── DeviceForm.tsx
│   └── ui/                      # Shadcn UI components
└── lib/
    ├── api-client.ts
    └── hooks/
        └── use-devices.ts
```

**Device List Component (apps/web/components/devices/DeviceList.tsx):**

```typescript
'use client';

import { useState } from 'react';
import { useDevices } from '@/lib/hooks/use-devices';
import { Button } from '@/components/ui/button';
import { DeviceForm } from './DeviceForm';

export function DeviceList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useDevices({ page, limit: 20 });
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Devices</h2>
        <Button onClick={() => setShowCreateForm(true)}>
          Add Device
        </Button>
      </div>

      {showCreateForm && (
        <DeviceForm onClose={() => setShowCreateForm(false)} />
      )}

      <div className="grid gap-4">
        {data?.data.map((device) => (
          <div key={device.id} className="border p-4 rounded-lg">
            <h3 className="font-semibold">{device.name}</h3>
            <p className="text-sm text-gray-600">{device.deviceId}</p>
            <div className="flex gap-2 mt-2">
              {device.tags?.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <span>Page {page}</span>
        <Button onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
```

**API Client Hook (apps/web/lib/hooks/use-devices.ts):**

```typescript
import useSWR from 'swr';
import { apiClient } from '../api-client';
import { Device } from '@iot/types';

interface UseDevicesOptions {
  page: number;
  limit: number;
  tags?: string[];
}

interface DevicesResponse {
  data: Device[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export function useDevices({ page, limit, tags }: UseDevicesOptions) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (tags?.length) {
    params.append('tags', tags.join(','));
  }

  return useSWR<DevicesResponse>(
    `/devices?${params}`,
    (url) => apiClient.get(url).then((res) => res.json())
  );
}

export function useDevice(deviceId: string) {
  return useSWR<Device>(
    `/devices/${deviceId}`,
    (url) => apiClient.get(url).then((res) => res.json())
  );
}
```

**Deliverables:**
- [ ] Device list page with pagination
- [ ] Device creation form
- [ ] Mock authentication flow

#### Week 6: Basic Dashboard with Static Blocks

**Tasks:**
1. Create dashboard layout component
2. Build static dashboard blocks (Gauge, Number)
3. Implement manual data refresh
4. Add dashboard configuration UI

**Dashboard Canvas (apps/web/components/dashboard/DashboardCanvas.tsx):**

```typescript
'use client';

import { useState } from 'react';
import { DashboardBlock as BlockType } from '@iot/types';
import { DashboardBlock } from './DashboardBlock';
import { GridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

interface DashboardCanvasProps {
  blocks: BlockType[];
  isEditMode?: boolean;
  onUpdateBlocks?: (blocks: BlockType[]) => void;
}

export function DashboardCanvas({
  blocks,
  isEditMode = false,
  onUpdateBlocks,
}: DashboardCanvasProps) {
  const [currentBlocks, setCurrentBlocks] = useState(blocks);

  const handleLayoutChange = (layout: any[]) => {
    if (!isEditMode) return;

    const updatedBlocks = currentBlocks.map((block) => {
      const layoutItem = layout.find((l) => l.i === block.id);
      if (!layoutItem) return block;

      return {
        ...block,
        layout: {
          x: layoutItem.x,
          y: layoutItem.y,
          width: layoutItem.w,
          height: layoutItem.h,
        },
      };
    });

    setCurrentBlocks(updatedBlocks);
    onUpdateBlocks?.(updatedBlocks);
  };

  return (
    <GridLayout
      className="layout"
      cols={12}
      rowHeight={60}
      width={1200}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      onLayoutChange={handleLayoutChange}
    >
      {currentBlocks.map((block) => (
        <div
          key={block.id}
          data-grid={{
            x: block.layout.x,
            y: block.layout.y,
            w: block.layout.width,
            h: block.layout.height,
          }}
        >
          <DashboardBlock block={block} />
        </div>
      ))}
    </GridLayout>
  );
}
```

**Gauge Block (apps/web/components/dashboard/blocks/GaugeBlock.tsx):**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { DashboardBlock } from '@iot/types';
import { apiClient } from '@/lib/api-client';

interface GaugeBlockProps {
  config: DashboardBlock['config'];
}

export function GaugeBlock({ config }: GaugeBlockProps) {
  const [value, setValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestState = async () => {
      try {
        const response = await apiClient.get(
          `/devices/${config.deviceId}/state?limit=1`
        );
        const data = await response.json();

        if (data.data.length > 0) {
          const latestState = data.data[0];
          const attributeValue = latestState.data[config.dataAttribute];
          setValue(Number(attributeValue) || 0);
        }
      } catch (error) {
        console.error('Failed to fetch device state:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestState();
    const interval = setInterval(fetchLatestState, config.refreshInterval || 5000);

    return () => clearInterval(interval);
  }, [config.deviceId, config.dataAttribute, config.refreshInterval]);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const percentage = ((value - (config.min || 0)) / ((config.max || 100) - (config.min || 0))) * 100;

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-white rounded-lg shadow">
      <div className="text-4xl font-bold text-blue-600">
        {value.toFixed(1)}
      </div>
      <div className="text-sm text-gray-600 mt-2">
        {config.dataAttribute}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}
```

**Deliverables:**
- [ ] Dashboard canvas with grid layout
- [ ] Gauge and Number blocks
- [ ] Manual refresh (5-second polling)
- [ ] Dashboard save/load functionality

---

### Phase 1 Checklist

**Infrastructure:**
- [ ] Monorepo setup with Turborepo
- [ ] Docker Compose for local development
- [ ] PostgreSQL + TimescaleDB, Redis running
- [ ] CI/CD pipeline (GitHub Actions)

**Backend:**
- [ ] Fastify API server
- [ ] Device CRUD endpoints
- [ ] Device state ingestion endpoint
- [ ] Historical state query with aggregations
- [ ] Unit tests (80% coverage)

**Frontend:**
- [ ] Next.js 14 app with App Router
- [ ] Device list and creation
- [ ] Basic dashboard with static blocks
- [ ] Mock authentication

**Testing:**
- [ ] 100 devices created
- [ ] 10,000 state records inserted
- [ ] Dashboard displays latest values (5s polling)

---

## Phase 2: Real-time Features (Weeks 7-12)

### Objective
Implement real-time data flow from MQTT devices to dashboards via WebSocket.

### Sprint 7-8: MQTT Broker Integration (Weeks 7-8)

#### Week 7: EMQX Setup & MQTT-to-NATS Bridge

**Tasks:**
1. Deploy EMQX in Docker Compose
2. Configure MQTT-to-NATS bridge plugin
3. Implement MQTT authentication webhook
4. Test device connections

**Docker Compose Update:**

```yaml
# docker-compose.dev.yml (add EMQX)
  emqx:
    image: emqx/emqx:5.3.2
    ports:
      - "1883:1883"   # MQTT
      - "8883:8883"   # MQTT/SSL
      - "18083:18083" # Dashboard
    environment:
      EMQX_NAME: emqx
      EMQX_HOST: 127.0.0.1
      EMQX_AUTH__HTTP__ENABLE: true
      EMQX_AUTH__HTTP__URL: http://api:3001/mqtt/auth
      EMQX_ACL__HTTP__ENABLE: true
      EMQX_ACL__HTTP__URL: http://api:3001/mqtt/acl
    volumes:
      - emqx-data:/opt/emqx/data

volumes:
  emqx-data:
```

**MQTT Authentication Endpoint (apps/api/src/routes/mqtt.ts):**

```typescript
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

export async function mqttRoutes(server: FastifyInstance) {
  // MQTT authentication
  server.post('/mqtt/auth', async (request, reply) => {
    const { username, password } = request.body as {
      username: string;
      password: string;
    };

    // username = access key ID
    const result = await server.pg.query(
      `SELECT device_id, key_secret, org_id
       FROM device_access_keys
       WHERE key_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [username]
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({ result: 'deny' });
    }

    const key = result.rows[0];
    const valid = await bcrypt.compare(password, key.key_secret);

    if (!valid) {
      return reply.status(401).send({ result: 'deny' });
    }

    return { result: 'allow', is_superuser: false };
  });

  // MQTT ACL (topic permissions)
  server.post('/mqtt/acl', async (request, reply) => {
    const { username, topic, action } = request.body as {
      username: string;
      topic: string;
      action: 'publish' | 'subscribe';
    };

    const result = await server.pg.query(
      `SELECT device_id, can_publish, can_subscribe
       FROM device_access_keys
       WHERE key_id = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return reply.status(403).send({ result: 'deny' });
    }

    const key = result.rows[0];
    const deviceId = key.device_id;

    // Check if topic matches device
    const allowedTopics = {
      publish: [`losant/${deviceId}/state`],
      subscribe: [`losant/${deviceId}/command`],
    };

    const allowed = allowedTopics[action].some((pattern) =>
      matchTopic(topic, pattern)
    );

    return { result: allowed ? 'allow' : 'deny' };
  });
}

function matchTopic(topic: string, pattern: string): boolean {
  const regex = new RegExp(
    '^' + pattern.replace(/\+/g, '[^/]+').replace(/#/, '.*') + '$'
  );
  return regex.test(topic);
}
```

**MQTT-to-NATS Bridge (apps/mqtt-bridge/src/index.ts):**

```typescript
import mqtt from 'mqtt';
import { connect as natsConnect } from 'nats';

async function main() {
  // Connect to EMQX
  const mqttClient = mqtt.connect('mqtt://emqx:1883', {
    clientId: 'mqtt-nats-bridge',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });

  // Connect to NATS
  const natsClient = await natsConnect({
    servers: 'nats://nats:4222',
  });

  mqttClient.on('connect', () => {
    console.log('Connected to EMQX');
    mqttClient.subscribe('losant/+/state', (err) => {
      if (err) console.error('Subscribe error:', err);
    });
  });

  mqttClient.on('message', async (topic, payload) => {
    // Parse device ID from topic: losant/{deviceId}/state
    const match = topic.match(/^losant\/([^/]+)\/state$/);
    if (!match) return;

    const deviceId = match[1];

    try {
      const data = JSON.parse(payload.toString());

      // Publish to NATS
      natsClient.publish(
        `device.state.${deviceId}`,
        JSON.stringify({
          deviceId,
          data: data.data || data,
          time: data.time || new Date().toISOString(),
        })
      );

      console.log(`Bridged: ${topic} -> device.state.${deviceId}`);
    } catch (error) {
      console.error('Failed to bridge message:', error);
    }
  });
}

main();
```

**Deliverables:**
- [ ] EMQX running with authentication
- [ ] MQTT-to-NATS bridge operational
- [ ] 100 simulated devices publishing to MQTT

#### Week 8: NATS Consumer & State Persistence

**Tasks:**
1. Create NATS consumer service
2. Persist device states to TimescaleDB
3. Add workflow trigger hooks (placeholder)
4. Performance test (10k msg/sec)

**NATS Consumer (apps/state-consumer/src/index.ts):**

```typescript
import { connect, JetStreamManager, consumerOpts } from 'nats';
import { Pool } from 'pg';

async function main() {
  const nats = await connect({ servers: 'nats://nats:4222' });
  const jsm = await nats.jetstreamManager();
  const js = nats.jetstream();

  // Create stream if not exists
  try {
    await jsm.streams.add({
      name: 'DEVICE_STATES',
      subjects: ['device.state.*'],
      retention: 'limits',
      max_age: 86400_000_000_000, // 24 hours in nanoseconds
    });
  } catch (err: any) {
    if (!err.message.includes('already exists')) throw err;
  }

  // Create consumer
  const opts = consumerOpts()
    .durable('state-persister')
    .deliverAll()
    .ackExplicit()
    .maxAckPending(1000);

  const sub = await js.subscribe('device.state.*', opts);

  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('State consumer started');

  for await (const msg of sub) {
    try {
      const payload = JSON.parse(msg.data.toString());
      const { deviceId, data, time } = payload;

      // Get device internal ID
      const deviceResult = await pgPool.query(
        'SELECT id, org_id FROM devices WHERE device_id = $1',
        [deviceId]
      );

      if (deviceResult.rows.length === 0) {
        console.warn(`Device not found: ${deviceId}`);
        msg.ack();
        continue;
      }

      const { id: internalDeviceId, org_id: orgId } = deviceResult.rows[0];

      // Insert state
      await pgPool.query(
        `INSERT INTO device_states (time, device_id, org_id, data)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [new Date(time), internalDeviceId, orgId, JSON.stringify(data)]
      );

      msg.ack();
    } catch (error) {
      console.error('Failed to process message:', error);
      msg.nak();
    }
  }
}

main();
```

**Deliverables:**
- [ ] NATS consumer persisting states
- [ ] Performance test: 10k msg/sec sustained
- [ ] Monitoring dashboard for lag

### Sprint 9-10: WebSocket Real-time Updates (Weeks 9-10)

#### Week 9: WebSocket Server with Socket.io

**Tasks:**
1. Create WebSocket server (Socket.io)
2. Implement subscription model (device state topics)
3. Add authentication middleware
4. Publish state updates from NATS to WebSocket clients

**WebSocket Server (apps/websocket-server/src/index.ts):**

```typescript
import { Server } from 'socket.io';
import { createServer } from 'http';
import { connect as natsConnect } from 'nats';
import jwt from 'jsonwebtoken';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    socket.data.user = payload;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

async function main() {
  const nats = await natsConnect({ servers: 'nats://nats:4222' });
  const js = nats.jetstream();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    const { orgId } = socket.data.user;

    // Subscribe to device state updates
    socket.on('subscribe', async ({ topic }: { topic: string }) => {
      // topic format: "device/{deviceId}/state"
      const match = topic.match(/^device\/([^/]+)\/state$/);
      if (!match) return;

      const deviceId = match[1];

      // Join room for this device
      socket.join(`device:${deviceId}`);
      console.log(`Socket ${socket.id} subscribed to ${topic}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // NATS subscriber to push to WebSocket clients
  const sub = await js.subscribe('device.state.*');

  for await (const msg of sub) {
    try {
      const payload = JSON.parse(msg.data.toString());
      const { deviceId, data, time } = payload;

      // Broadcast to all clients subscribed to this device
      io.to(`device:${deviceId}`).emit('device:state', {
        deviceId,
        state: data,
        time,
      });

      msg.ack();
    } catch (error) {
      console.error('Failed to broadcast message:', error);
      msg.nak();
    }
  }

  httpServer.listen(3002, () => {
    console.log('WebSocket server listening on port 3002');
  });
}

main();
```

**Deliverables:**
- [ ] WebSocket server with authentication
- [ ] Subscription model implemented
- [ ] Broadcasting device states to clients

#### Week 10: Frontend Real-time Dashboard

**Tasks:**
1. Integrate Socket.io client in Next.js
2. Update dashboard blocks to use WebSocket
3. Add connection status indicator
4. Performance test (1000 concurrent clients)

**WebSocket Client Hook (apps/web/lib/hooks/use-realtime-data.ts):**

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { DeviceState } from '@iot/types';

let socket: Socket | null = null;

export function useRealtimeData(deviceIds: string[]) {
  const [liveData, setLiveData] = useState<Map<string, DeviceState>>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
        auth: {
          token: localStorage.getItem('authToken'),
        },
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
        setConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      });
    }

    // Subscribe to device states
    deviceIds.forEach((deviceId) => {
      socket!.emit('subscribe', { topic: `device/${deviceId}/state` });
    });

    // Listen for state updates
    const handleStateUpdate = ({ deviceId, state, time }: any) => {
      setLiveData((prev) => {
        const newMap = new Map(prev);
        newMap.set(deviceId, { deviceId, data: state, time: new Date(time) });
        return newMap;
      });
    };

    socket!.on('device:state', handleStateUpdate);

    return () => {
      socket!.off('device:state', handleStateUpdate);
    };
  }, [deviceIds]);

  return { liveData, connected };
}
```

**Updated Gauge Block with Real-time (apps/web/components/dashboard/blocks/GaugeBlock.tsx):**

```typescript
'use client';

import { useRealtimeData } from '@/lib/hooks/use-realtime-data';
import { DashboardBlock } from '@iot/types';

interface GaugeBlockProps {
  config: DashboardBlock['config'];
}

export function GaugeBlock({ config }: GaugeBlockProps) {
  const { liveData, connected } = useRealtimeData([config.deviceId!]);
  const latestState = liveData.get(config.deviceId!);
  const value = latestState?.data[config.dataAttribute] || 0;

  const percentage = ((value - (config.min || 0)) / ((config.max || 100) - (config.min || 0))) * 100;

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-white rounded-lg shadow relative">
      {/* Connection indicator */}
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />

      <div className="text-4xl font-bold text-blue-600">
        {value.toFixed(1)}
      </div>
      <div className="text-sm text-gray-600 mt-2">
        {config.dataAttribute}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      {latestState && (
        <div className="text-xs text-gray-400 mt-2">
          Updated: {new Date(latestState.time).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
```

**Deliverables:**
- [ ] Real-time dashboard blocks
- [ ] Connection status indicator
- [ ] Performance test: 1000 concurrent WebSocket clients
- [ ] Latency <100ms (MQTT publish to UI update)

### Sprint 11-12: Time-Series Blocks & Optimization (Weeks 11-12)

#### Week 11: Time-Series Chart Block

**Tasks:**
1. Build time-series chart block (Chart.js)
2. Implement historical data fetching
3. Add live stream mode (append new points)
4. Add zoom/pan controls

**Time-Series Block (apps/web/components/dashboard/blocks/TimeSeriesBlock.tsx):**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useRealtimeData } from '@/lib/hooks/use-realtime-data';
import { apiClient } from '@/lib/api-client';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface TimeSeriesBlockProps {
  config: {
    deviceId: string;
    dataAttribute: string;
    timeRange: '1h' | '6h' | '24h' | '7d';
    liveMode: boolean;
  };
}

export function TimeSeriesBlock({ config }: TimeSeriesBlockProps) {
  const [chartData, setChartData] = useState<any>({ labels: [], datasets: [] });
  const { liveData } = useRealtimeData(config.liveMode ? [config.deviceId] : []);

  // Fetch historical data
  useEffect(() => {
    const fetchHistorical = async () => {
      const hours = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 168,
      }[config.timeRange];

      const start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const response = await apiClient.get(
        `/devices/${config.deviceId}/state?start=${start}&limit=1000`
      );
      const data = await response.json();

      const labels = data.data.map((d: any) => new Date(d.time));
      const values = data.data.map((d: any) => d.data[config.dataAttribute]);

      setChartData({
        labels,
        datasets: [
          {
            label: config.dataAttribute,
            data: values,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
          },
        ],
      });
    };

    fetchHistorical();
  }, [config.deviceId, config.dataAttribute, config.timeRange]);

  // Append live data
  useEffect(() => {
    if (!config.liveMode) return;

    const latestState = liveData.get(config.deviceId);
    if (!latestState) return;

    const newValue = latestState.data[config.dataAttribute];
    if (newValue === undefined) return;

    setChartData((prev: any) => {
      const newLabels = [...prev.labels, new Date(latestState.time)];
      const newValues = [...prev.datasets[0].data, newValue];

      // Keep last 100 points
      if (newLabels.length > 100) {
        newLabels.shift();
        newValues.shift();
      }

      return {
        labels: newLabels,
        datasets: [
          {
            ...prev.datasets[0],
            data: newValues,
          },
        ],
      };
    });
  }, [liveData, config.deviceId, config.dataAttribute, config.liveMode]);

  return (
    <div className="h-full p-4 bg-white rounded-lg shadow">
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              time: {
                unit: config.timeRange === '1h' ? 'minute' : 'hour',
              },
            },
          },
          plugins: {
            legend: {
              display: true,
            },
          },
        }}
      />
    </div>
  );
}
```

**Deliverables:**
- [ ] Time-series chart block with live mode
- [ ] Historical data loading
- [ ] Zoom/pan controls
- [ ] Performance: 1000 points rendered smoothly

#### Week 12: Performance Optimization & Caching

**Tasks:**
1. Implement Redis caching for historical queries
2. Add TimescaleDB continuous aggregates
3. Optimize WebSocket broadcasting (rooms)
4. Load testing and bottleneck analysis

**Redis Caching Middleware:**

```typescript
// apps/api/src/middleware/cache.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export async function cacheMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const cacheKey = `cache:${request.url}`;
  const cached = await request.server.redis.get(cacheKey);

  if (cached) {
    reply.header('X-Cache', 'HIT');
    return reply.send(JSON.parse(cached));
  }

  // Store original send
  const originalSend = reply.send.bind(reply);

  reply.send = function (payload: any) {
    // Cache for 1 minute
    request.server.redis.setex(cacheKey, 60, JSON.stringify(payload));
    reply.header('X-Cache', 'MISS');
    return originalSend(payload);
  };
}
```

**Continuous Aggregates (1-hour rollups):**

```sql
CREATE MATERIALIZED VIEW device_states_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  device_id,
  org_id,
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
GROUP BY bucket, device_id, org_id;

SELECT add_continuous_aggregate_policy('device_states_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

**Deliverables:**
- [ ] Redis caching for API responses (1-min TTL)
- [ ] Continuous aggregates for historical queries
- [ ] Load test: 10k devices, 1000 dashboard clients
- [ ] Latency p99 <200ms

---

### Phase 2 Checklist

**Backend:**
- [ ] EMQX MQTT broker with authentication
- [ ] MQTT-to-NATS bridge
- [ ] NATS consumer persisting states
- [ ] WebSocket server with subscription model

**Frontend:**
- [ ] Real-time dashboard blocks (Gauge, Time-Series)
- [ ] WebSocket integration
- [ ] Connection status indicators
- [ ] Performance optimizations

**Testing:**
- [ ] 1000 devices publishing via MQTT
- [ ] 1000 concurrent WebSocket clients
- [ ] Latency p99 <100ms (end-to-end)
- [ ] Load test: 10k msg/sec sustained

---

## Phase 3: Workflow Engine (Weeks 13-18)

### Objective
Build a visual workflow engine with Flow-Based Programming (FBP) paradigm.

### Sprint 13-14: Workflow Designer UI (Weeks 13-14)

#### Week 13: React Flow Integration

**Tasks:**
1. Integrate React Flow library
2. Build workflow canvas component
3. Create node palette (Device, Function, MQTT, Conditional)
4. Implement drag-and-drop node creation

**Workflow Canvas (apps/web/components/workflow/WorkflowCanvas.tsx):**

```typescript
'use client';

import { useCallback } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { DeviceNode } from './nodes/DeviceNode';
import { FunctionNode } from './nodes/FunctionNode';
import { ConditionalNode } from './nodes/ConditionalNode';

const nodeTypes = {
  device: DeviceNode,
  function: FunctionNode,
  conditional: ConditionalNode,
};

export function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const position = {
        x: event.clientX,
        y: event.clientY,
      };

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

**Function Node Component:**

```typescript
'use client';

import { Handle, Position } from 'reactflow';
import { useState } from 'react';

export function FunctionNode({ data }: any) {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div className="bg-white border-2 border-blue-500 rounded p-4 min-w-[200px]">
      <Handle type="target" position={Position.Top} />

      <div className="font-bold mb-2">Function</div>

      {showConfig ? (
        <textarea
          className="w-full h-32 border p-2 text-xs font-mono"
          placeholder="// JavaScript code"
          defaultValue={data.code || ''}
          onChange={(e) => (data.code = e.target.value)}
        />
      ) : (
        <button
          className="text-blue-600 text-sm"
          onClick={() => setShowConfig(true)}
        >
          Configure
        </button>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

**Deliverables:**
- [ ] Workflow canvas with drag-and-drop
- [ ] Basic node types (Device, Function, Conditional)
- [ ] Save workflow to backend

#### Week 14: Workflow Storage & API

**Tasks:**
1. Create workflow CRUD API
2. Store workflows in PostgreSQL (Prisma)
3. Implement workflow validation
4. Add workflow enable/disable toggle

**Workflow API (apps/api/src/routes/workflows.ts):**

```typescript
import { FastifyInstance } from 'fastify';

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

interface CreateWorkflowRequest {
  name: string;
  trigger: {
    type: 'deviceState' | 'schedule' | 'webhook';
    deviceIds?: string[];
    deviceTags?: string[];
    schedule?: string;
  };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export async function workflowRoutes(server: FastifyInstance) {
  // Create workflow
  server.post<{ Body: CreateWorkflowRequest }>('/workflows', async (request, reply) => {
    const { name, trigger, nodes, edges } = request.body;
    const orgId = request.user.orgId;

    const workflow = await server.prisma.workflow.create({
      data: {
        orgId,
        name,
        enabled: false,
        trigger,
        nodes,
        edges,
      },
    });

    return reply.status(201).send({
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
    });
  });

  // List workflows
  server.get('/workflows', async (request) => {
    const orgId = request.user.orgId;

    const workflows = await server.prisma.workflow.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    return { data: workflows };
  });

  // Enable/disable workflow
  server.patch<{ Params: { id: string }; Body: { enabled: boolean } }>(
    '/workflows/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { enabled } = request.body;
      const orgId = request.user.orgId;

      await server.prisma.workflow.update({
        where: {
          id,
          orgId,
        },
        data: {
          enabled,
        },
      });

      return { success: true };
    }
  );
}
```

**Deliverables:**
- [ ] Workflow CRUD API
- [ ] Workflow storage in PostgreSQL (Prisma)
- [ ] Enable/disable workflows

### Sprint 15-16: Workflow Runtime Engine (Weeks 15-16)

#### Week 15: Flow Execution Engine

**Tasks:**
1. Build workflow runtime with topological sort
2. Implement Function Node execution (VM2 sandbox)
3. Add payload propagation between nodes
4. Implement 60-second timeout

**Workflow Runtime (apps/workflow-engine/src/runtime.ts):**

```typescript
import { NodeVM } from 'vm2';

interface WorkflowPayload {
  data: Record<string, any>;
  time: string;
  deviceId?: string;
  metadata: Record<string, any>;
}

interface WorkflowNode {
  id: string;
  type: 'device' | 'function' | 'conditional' | 'mqtt' | 'debug';
  config: Record<string, any>;
}

interface WorkflowEdge {
  source: string;
  target: string;
}

class WorkflowRuntime {
  async executeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    trigger: WorkflowPayload,
    timeout = 60000
  ): Promise<void> {
    const startTime = Date.now();
    let currentPayload = trigger;

    // Build adjacency map
    const adjacency = new Map<string, string[]>();
    nodes.forEach((node) => adjacency.set(node.id, []));
    edges.forEach((edge) => {
      adjacency.get(edge.source)?.push(edge.target);
    });

    // Topological sort (find execution order)
    const executionOrder = this.topologicalSort(nodes, edges);

    for (const node of executionOrder) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new Error('Workflow execution timeout (60s)');
      }

      // Check payload size
      const payloadSize = JSON.stringify(currentPayload).length;
      if (payloadSize > 5 * 1024 * 1024) {
        throw new Error('Payload exceeds 5MB limit');
      }

      console.log(`Executing node: ${node.id} (${node.type})`);
      currentPayload = await this.executeNode(node, currentPayload);
    }
  }

  private topologicalSort(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): WorkflowNode[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    nodes.forEach((node) => {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    });

    edges.forEach((edge) => {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    const queue: WorkflowNode[] = [];
    nodes.forEach((node) => {
      if (inDegree.get(node.id) === 0) queue.push(node);
    });

    const result: WorkflowNode[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      const neighbors = adjacency.get(node.id) || [];
      neighbors.forEach((neighborId) => {
        const newInDegree = (inDegree.get(neighborId) || 0) - 1;
        inDegree.set(neighborId, newInDegree);

        if (newInDegree === 0) {
          const neighborNode = nodes.find((n) => n.id === neighborId)!;
          queue.push(neighborNode);
        }
      });
    }

    return result;
  }

  private async executeNode(
    node: WorkflowNode,
    payload: WorkflowPayload
  ): Promise<WorkflowPayload> {
    switch (node.type) {
      case 'function':
        return this.executeFunctionNode(node, payload);
      case 'conditional':
        return this.executeConditionalNode(node, payload);
      case 'debug':
        console.log('Debug:', payload);
        return payload;
      default:
        return payload;
    }
  }

  private async executeFunctionNode(
    node: WorkflowNode,
    payload: WorkflowPayload
  ): Promise<WorkflowPayload> {
    const code = node.config.code as string;

    const vm = new NodeVM({
      timeout: 5000, // 5s per function
      sandbox: { payload: JSON.parse(JSON.stringify(payload)) },
      require: {
        external: ['lodash'],
        builtin: ['crypto'],
      },
    });

    const result = vm.run(
      `
      module.exports = function(payload) {
        ${code}
        return payload;
      }
    `,
      'function-node.js'
    );

    return result(payload);
  }

  private async executeConditionalNode(
    node: WorkflowNode,
    payload: WorkflowPayload
  ): Promise<WorkflowPayload> {
    const condition = node.config.condition as string;

    // Simple condition evaluation
    const vm = new NodeVM({
      timeout: 1000,
      sandbox: { payload },
    });

    const result = vm.run(
      `module.exports = function(payload) { return ${condition}; }`,
      'condition.js'
    );

    if (result(payload)) {
      return payload;
    } else {
      // Stop execution (or route to different path)
      throw new Error('Condition not met');
    }
  }
}

export const workflowRuntime = new WorkflowRuntime();
```

**Deliverables:**
- [ ] Workflow runtime engine
- [ ] Function Node execution with VM2
- [ ] Timeout enforcement (60s)
- [ ] Payload size validation (5MB)

#### Week 16: Workflow Triggers & Integration

**Tasks:**
1. Implement device state trigger
2. Connect NATS consumer to workflow engine
3. Add workflow execution logging
4. Test end-to-end flow (MQTT → Workflow → MQTT command)

**Workflow Trigger Service (apps/workflow-engine/src/triggers.ts):**

```typescript
import { connect } from 'nats';
import { PrismaClient } from '@prisma/client';
import { workflowRuntime } from './runtime';

async function main() {
  const nats = await connect({ servers: 'nats://nats:4222' });
  const js = nats.jetstream();

  const prisma = new PrismaClient();

  // Subscribe to device states
  const sub = await js.subscribe('device.state.*');

  console.log('Workflow trigger service started');

  for await (const msg of sub) {
    try {
      const payload = JSON.parse(msg.data.toString());
      const { deviceId, data, time } = payload;

      // Find workflows triggered by this device
      const workflows = await prisma.workflow.findMany({
        where: {
          enabled: true,
          OR: [
            {
              trigger: {
                path: ['deviceIds'],
                array_contains: deviceId,
              },
            },
            {
              trigger: {
                path: ['type'],
                equals: 'deviceState',
              },
            },
          ],
        },
      });

      // Execute each workflow
      for (const workflow of workflows) {
        console.log(`Triggering workflow: ${workflow.name}`);

        try {
          await workflowRuntime.executeWorkflow(
            workflow.nodes,
            workflow.edges,
            { data, time, deviceId, metadata: {} }
          );

          console.log(`Workflow ${workflow.name} completed`);
        } catch (error) {
          console.error(`Workflow ${workflow.name} failed:`, error);
        }
      }

      msg.ack();
    } catch (error) {
      console.error('Failed to process trigger:', error);
      msg.nak();
    }
  }
}

main();
```

**Deliverables:**
- [ ] Device state trigger working
- [ ] End-to-end test: MQTT publish → Workflow → Action
- [ ] Workflow execution logs

### Sprint 17-18: Edge Agent & UNS (Weeks 17-18)

#### Week 17: Gateway Edge Agent (Go)

**Tasks:**
1. Build Go-based edge agent framework
2. Implement protocol adapters (Profinet, Modbus, OPC UA, BACnet, Siemens S7)
3. Add local buffering during offline mode
4. Deploy agent as Docker container

**Edge Agent Structure (apps/edge-agent/):**

```go
// apps/edge-agent/main.go
package main

import (
    "encoding/json"
    "log"
    "time"

    mqtt "github.com/eclipse/paho.mqtt.golang"
    "github.com/goburrow/modbus"
)

type Config struct {
    BrokerURL   string
    DeviceID    string
    ModbusAddr  string
    PollInterval time.Duration
}

type EdgeAgent struct {
    config     Config
    mqttClient mqtt.Client
    modbusHandler *modbus.TCPClientHandler
}

func NewEdgeAgent(config Config) *EdgeAgent {
    return &EdgeAgent{
        config: config,
    }
}

func (a *EdgeAgent) Start() error {
    // Connect to MQTT broker
    opts := mqtt.NewClientOptions()
    opts.AddBroker(a.config.BrokerURL)
    opts.SetClientID(a.config.DeviceID)
    opts.SetAutoReconnect(true)

    a.mqttClient = mqtt.NewClient(opts)
    if token := a.mqttClient.Connect(); token.Wait() && token.Error() != nil {
        return token.Error()
    }

    log.Println("Connected to MQTT broker")

    // Connect to Modbus device
    a.modbusHandler = modbus.NewTCPClientHandler(a.config.ModbusAddr)
    a.modbusHandler.Timeout = 10 * time.Second
    if err := a.modbusHandler.Connect(); err != nil {
        return err
    }

    log.Println("Connected to Modbus device")

    // Start polling
    go a.pollModbus()

    return nil
}

func (a *EdgeAgent) pollModbus() {
    client := modbus.NewClient(a.modbusHandler)
    ticker := time.NewTicker(a.config.PollInterval)

    for range ticker.C {
        // Read holding registers (address 0, count 10)
        results, err := client.ReadHoldingRegisters(0, 10)
        if err != nil {
            log.Printf("Modbus read error: %v", err)
            continue
        }

        // Convert to JSON
        data := map[string]interface{}{
            "temperature": float64(results[0]) / 10.0,
            "humidity":    float64(results[1]) / 10.0,
        }

        payload := map[string]interface{}{
            "data": data,
            "time": time.Now().UTC().Format(time.RFC3339),
        }

        jsonPayload, _ := json.Marshal(payload)

        // Publish to MQTT
        topic := "losant/" + a.config.DeviceID + "/state"
        token := a.mqttClient.Publish(topic, 0, false, jsonPayload)
        token.Wait()

        log.Printf("Published state: %s", jsonPayload)
    }
}

func main() {
    config := Config{
        BrokerURL:   "tcp://emqx:1883",
        DeviceID:    "edge-gateway-001",
        ModbusAddr:  "192.168.1.100:502",
        PollInterval: 5 * time.Second,
    }

    agent := NewEdgeAgent(config)
    if err := agent.Start(); err != nil {
        log.Fatal(err)
    }

    // Block forever
    select {}
}
```

**Dockerfile for Edge Agent:**

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o edge-agent .

FROM alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/edge-agent /usr/local/bin/edge-agent

ENTRYPOINT ["edge-agent"]
```

**Deliverables:**
- [ ] Edge agent binary (Go)
- [ ] Protocol adapters (Profinet, Modbus, OPC UA, BACnet, Siemens S7)
- [ ] Local buffering during offline
- [ ] Dockerized edge agent

#### Week 18: Unified Namespace (UNS) Support

**Tasks:**
1. Implement UNS topic structure (ISA-95)
2. Add wildcard subscriptions in workflows
3. Update dashboard blocks for UNS topics
4. Documentation for UNS patterns

**UNS Topic Structure:**

```
Enterprise/Site/Area/Line/Cell/Attribute

Examples:
- ACME/Factory1/Assembly/Line2/Robot3/temperature
- ACME/Factory1/Assembly/Line2/Robot3/status
- ACME/Factory1/Packaging/+/+/alarm  (wildcard: all alarms in Packaging area)
```

**Workflow UNS Support:**

```typescript
// Update workflow trigger to support UNS topics
interface WorkflowTrigger {
  type: 'deviceState' | 'uns';
  unsTopic?: string; // e.g., "ACME/Factory1/+/+/alarm"
}

// In trigger service, subscribe to UNS topics
const workflows = await db.collection('workflows').find({
  enabled: true,
  'trigger.type': 'uns',
}).toArray();

workflows.forEach((workflow) => {
  const topic = workflow.trigger.unsTopic;
  nats.subscribe(topic, (msg) => {
    // Execute workflow
  });
});
```

**Deliverables:**
- [ ] UNS topic structure implemented
- [ ] Wildcard subscriptions in workflows
- [ ] Documentation and examples

---

### Phase 3 Checklist

**Workflow Engine:**
- [ ] Visual workflow designer (React Flow)
- [ ] Workflow runtime with FBP
- [ ] Function Node execution (VM2 sandbox)
- [ ] Device state triggers
- [ ] Workflow CRUD API

**Edge Computing:**
- [ ] Gateway Edge Agent (Go) with industrial protocol support (Profinet, Modbus, OPC UA, etc.)
- [ ] Local buffering during offline
- [ ] Docker container for edge deployment

**UNS:**
- [ ] UNS topic structure (ISA-95)
- [ ] Wildcard subscriptions
- [ ] Workflow and dashboard UNS support

**Testing:**
- [ ] 10 workflows deployed
- [ ] 5 edge agents running
- [ ] End-to-end: Industrial Protocol (Profinet/Modbus/OPC UA) → MQTT → Workflow → Dashboard

---

## Phase 4: Production Readiness (Weeks 19-24)

### Objective
Prepare the platform for production deployment with multi-tenancy, scaling, and hardening.

### Sprint 19-20: Multi-Tenancy & Security (Weeks 19-20)

#### Week 19: Organization Management

**Tasks:**
1. Build organization CRUD API
2. Implement user roles (admin, user, viewer)
3. Add invitation system
4. Enforce RLS across all endpoints

**Organization API (apps/api/src/routes/organizations.ts):**

```typescript
import { FastifyInstance } from 'fastify';

export async function organizationRoutes(server: FastifyInstance) {
  // Create organization
  server.post('/organizations', async (request, reply) => {
    const { name } = request.body as { name: string };

    const result = await server.pg.query(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING *',
      [name]
    );

    return reply.status(201).send(result.rows[0]);
  });

  // Invite user
  server.post<{ Params: { orgId: string }; Body: { email: string; role: string } }>(
    '/organizations/:orgId/invite',
    async (request, reply) => {
      const { orgId } = request.params;
      const { email, role } = request.body;

      // Send invite email (placeholder)
      console.log(`Invite sent to ${email} for org ${orgId} as ${role}`);

      return { success: true };
    }
  );
}
```

**Deliverables:**
- [ ] Organization CRUD API
- [ ] User roles (admin, user, viewer)
- [ ] Invitation system
- [ ] RLS verified on all endpoints

#### Week 20: Security Hardening

**Tasks:**
1. Implement rate limiting (Kong or Fastify plugin)
2. Add helmet.js for security headers
3. Set up secrets management (Kubernetes Secrets)
4. Penetration testing and vulnerability scan

**Rate Limiting:**

```typescript
import rateLimit from '@fastify/rate-limit';

await server.register(rateLimit, {
  max: 1000,
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    return request.user?.orgId || request.ip;
  },
});
```

**Deliverables:**
- [ ] Rate limiting (1000 req/min per org)
- [ ] Security headers (Helmet.js)
- [ ] Secrets management (Docker secrets or env files)
- [ ] Vulnerability scan report

### Sprint 21-22: Production Deployment with Docker Compose (Weeks 21-22)

> **Note:** This guide uses Docker Compose for initial production deployment. Kubernetes migration is covered as an optional upgrade path when you reach 10k+ devices or need advanced orchestration features.

#### Week 21: Docker Compose Production Setup

**Tasks:**
1. Create production-ready docker-compose.yml
2. Configure reverse proxy (Traefik/Caddy) for SSL
3. Set up automated backups
4. Deploy to production server (VPS/dedicated server)

**Production Docker Compose (docker-compose.prod.yml):**

```yaml
version: '3.8'

services:
  # Reverse Proxy with SSL
  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    restart: unless-stopped

  # Frontend
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.prod
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`dashboard.example.com`)"
      - "traefik.http.routers.web.entrypoints=websecure"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"
      - "traefik.http.services.web.loadbalancer.server.port=3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.example.com
      - NEXT_PUBLIC_WS_URL=https://ws.example.com
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G

  # API Server
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.prod
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://prod_user:${DB_PASSWORD}@postgres:5432/iot_platform
      - DATABASE_URL=postgresql://prod_user:${POSTGRES_PASSWORD}@postgres:5432/iot_platform
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - NATS_URL=nats://nats:4222
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
      - nats
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G

  # WebSocket Server
  websocket-server:
    build:
      context: ./apps/websocket-server
      dockerfile: Dockerfile.prod
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ws.rule=Host(`ws.example.com`)"
      - "traefik.http.routers.ws.entrypoints=websecure"
      - "traefik.http.routers.ws.tls.certresolver=letsencrypt"
    environment:
      - NODE_ENV=production
      - NATS_URL=nats://nats:4222
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - nats
    restart: unless-stopped
    deploy:
      replicas: 2

  # Workflow Engine
  workflow-engine:
    build:
      context: ./apps/workflow-engine
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://prod_user:${POSTGRES_PASSWORD}@postgres:5432/iot_platform
      - NATS_URL=nats://nats:4222
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      - postgres
      - nats
      - redis
    restart: unless-stopped
    deploy:
      replicas: 3

  # State Consumer
  state-consumer:
    build:
      context: ./apps/state-consumer
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://prod_user:${DB_PASSWORD}@postgres:5432/iot_platform
      - NATS_URL=nats://nats:4222
    depends_on:
      - postgres
      - nats
    restart: unless-stopped
    deploy:
      replicas: 2

  # MQTT Bridge
  mqtt-bridge:
    build:
      context: ./apps/mqtt-bridge
      dockerfile: Dockerfile.prod
    environment:
      - MQTT_URL=tcp://emqx:1883
      - NATS_URL=nats://nats:4222
    depends_on:
      - emqx
      - nats
    restart: unless-stopped

  # Databases
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: iot_platform
      POSTGRES_USER: prod_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backups/postgres:/backups
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    restart: unless-stopped

  nats:
    image: nats:2.10-alpine
    command: ["-js", "-m", "8222"]
    volumes:
      - nats-data:/data
    restart: unless-stopped

  emqx:
    image: emqx/emqx:5.3.2
    ports:
      - "1883:1883"
      - "8883:8883"
    environment:
      EMQX_NAME: emqx
      EMQX_AUTH__HTTP__ENABLE: true
      EMQX_AUTH__HTTP__URL: http://api:3001/mqtt/auth
      EMQX_ACL__HTTP__ENABLE: true
      EMQX_ACL__HTTP__URL: http://api:3001/mqtt/acl
    volumes:
      - emqx-data:/opt/emqx/data
    restart: unless-stopped

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`monitoring.example.com`)"
      - "traefik.http.routers.grafana.entrypoints=websecure"
      - "traefik.http.routers.grafana.tls.certresolver=letsencrypt"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
  nats-data:
  emqx-data:
  prometheus-data:
  grafana-data:
  traefik-certs:
```

**Production Dockerfile Example (apps/api/Dockerfile.prod):**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api
COPY tsconfig.json turbo.json ./

# Build
RUN pnpm run build --filter=api

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

**Environment Variables (.env.prod):**

```bash
# DO NOT COMMIT THIS FILE - Use secrets management
DB_PASSWORD=<strong-random-password>
POSTGRES_PASSWORD=<strong-random-password>
REDIS_PASSWORD=<strong-random-password>
JWT_SECRET=<32-character-random-string>
GRAFANA_PASSWORD=<strong-random-password>
```

**Automated Backup Script (scripts/backup.sh):**

```bash
#!/bin/bash

# PostgreSQL + TimescaleDB backup
docker exec dynamic-dashboard-postgres-1 pg_dump -U prod_user iot_platform | gzip > backups/postgres/backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Keep only last 7 days of backups
find backups/postgres -type f -mtime +7 -delete

# Upload to S3 (optional)
# aws s3 sync backups/ s3://your-bucket/backups/
```

**Deployment Steps:**

```bash
# 1. Set up production server (Ubuntu 22.04 recommended)
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y

# 2. Clone repository
git clone https://github.com/your-org/dynamic-dashboard.git
cd dynamic-dashboard

# 3. Create .env.prod with secrets
cp .env.prod.example .env.prod
nano .env.prod  # Edit with your secrets

# 4. Build images
docker-compose -f docker-compose.prod.yml build

# 5. Start services
docker-compose -f docker-compose.prod.yml up -d

# 6. Run migrations
docker-compose -f docker-compose.prod.yml exec api pnpm run migrate

# 7. Set up automated backups
crontab -e
# Add: 0 2 * * * /path/to/scripts/backup.sh
```

**Scaling with Docker Compose:**

```bash
# Scale API servers
docker-compose -f docker-compose.prod.yml up -d --scale api=5

# Scale workflow engines
docker-compose -f docker-compose.prod.yml up -d --scale workflow-engine=5

# View resource usage
docker stats
```

**Deliverables:**
- [ ] Production docker-compose.yml configured
- [ ] Traefik reverse proxy with SSL (Let's Encrypt)
- [ ] Automated backups (PostgreSQL + TimescaleDB)
- [ ] Deployed to production server
- [ ] Monitoring stack (Prometheus + Grafana) running

#### Week 22: Monitoring, Alerts & Performance Optimization

**Tasks:**
1. Configure Prometheus scraping and Grafana dashboards
2. Set up alerting (Slack/Email/PagerDuty)
3. Performance optimization based on metrics
4. Document runbooks for common issues

**Prometheus Configuration (monitoring/prometheus.yml):**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  # API Servers
  - job_name: 'api'
    static_configs:
      - targets: ['api:3001']
    metrics_path: /metrics

  # WebSocket Server
  - job_name: 'websocket'
    static_configs:
      - targets: ['websocket-server:3002']
    metrics_path: /metrics

  # Workflow Engine
  - job_name: 'workflow-engine'
    static_configs:
      - targets: ['workflow-engine:3003']
    metrics_path: /metrics

  # PostgreSQL Exporter
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # EMQX Metrics
  - job_name: 'emqx'
    static_configs:
      - targets: ['emqx:18083']
    metrics_path: /api/v5/prometheus/stats

  # Node Exporter (host metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

**Application Metrics (apps/api/src/metrics.ts):**

```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client';

// HTTP Metrics
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Current database connection pool size',
  labelNames: ['pool'],
});

// Business Metrics
export const activeDevices = new Gauge({
  name: 'active_devices_total',
  help: 'Number of active devices',
  labelNames: ['org_id'],
});

export const workflowExecutions = new Counter({
  name: 'workflow_executions_total',
  help: 'Total workflow executions',
  labelNames: ['workflow_id', 'status'],
});

// Attach to Fastify hooks
export function registerMetrics(server: FastifyInstance) {
  server.addHook('onRequest', (request, reply, done) => {
    request.startTime = Date.now();
    done();
  });

  server.addHook('onResponse', (request, reply, done) => {
    const duration = (Date.now() - request.startTime!) / 1000;

    httpRequestCounter.inc({
      method: request.method,
      route: request.routerPath || 'unknown',
      status: reply.statusCode,
    });

    httpRequestDuration.observe(
      {
        method: request.method,
        route: request.routerPath || 'unknown',
      },
      duration
    );

    done();
  });

  // Metrics endpoint
  server.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return register.metrics();
  });
}
```

**Alert Rules (monitoring/alerts.yml):**

```yaml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      # High latency
      - alert: HighAPILatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"
          description: "95th percentile latency is {{ $value }}s"

      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      # Database connection pool exhausted
      - alert: DatabasePoolExhausted
        expr: db_connection_pool_size / db_connection_pool_max > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool nearly exhausted"

  - name: infrastructure_alerts
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total[5m]) > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"

      # High memory usage
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage detected"

      # Disk space low
      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space running low"
```

**Grafana Dashboard JSON (monitoring/dashboards/api-overview.json):**

Create dashboards for:
1. **API Overview**: Request rate, latency, error rate
2. **Database Performance**: Query duration, connection pool, slow queries
3. **Device Metrics**: Active devices, message rate, device states
4. **Workflow Execution**: Execution count, success rate, duration
5. **Infrastructure**: CPU, memory, disk, network

**Performance Optimization Checklist:**

```bash
# 1. Enable gzip compression in Traefik
# Add to traefik service in docker-compose.prod.yml
- "--entrypoints.websecure.http.middlewares=compress@docker"
- "--providers.docker.defaultRule=HostRegexp(`{catchall:.*}`)"

# 2. Optimize PostgreSQL (postgresql.conf)
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB

# 3. Redis optimization
maxmemory 2gb
maxmemory-policy allkeys-lru

# 4. Node.js memory limits
NODE_OPTIONS="--max-old-space-size=1024"

# 5. Enable HTTP/2 in Traefik
- "--entrypoints.websecure.http2.enable=true"
```

**Runbook Example (docs/runbooks/high-latency.md):**

```markdown
# Runbook: High API Latency

## Symptoms
- 95th percentile latency > 500ms
- Users reporting slow dashboard loads
- Alert: HighAPILatency triggered

## Investigation Steps
1. Check Grafana dashboard: http://monitoring.example.com
2. Identify slow endpoints: Sort by p95 latency
3. Check database slow queries:
   ```sql
   SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
   ```
4. Check connection pool usage:
   ```bash
   docker exec api node -e "console.log(process.memoryUsage())"
   ```

## Common Causes & Fixes
- **Database slow queries**: Add indexes, optimize query
- **High traffic**: Scale API containers (`docker-compose up -d --scale api=5`)
- **Memory leak**: Restart service, investigate with heap dump
- **External API timeout**: Increase timeout, add retry logic

## Escalation
If latency doesn't improve after 15 minutes, escalate to @engineering-lead
```

**Deliverables:**
- [ ] Prometheus scraping all services
- [ ] Grafana dashboards created (API, DB, Workflows, Infrastructure)
- [ ] Alert rules configured (latency, errors, resource usage)
- [ ] Slack/Email alerting set up
- [ ] Runbooks documented for common issues
- [ ] Performance optimization applied

### Sprint 23-24: Load Testing & Launch (Weeks 23-24)

#### Week 23: Load Testing

**Tasks:**
1. Write load test scripts (k6)
2. Run load tests (10k devices, 1000 clients)
3. Identify bottlenecks and optimize
4. Document performance benchmarks

**Load Test (k6):**

```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 1000 },  // Ramp up to 1000 VUs
    { duration: '5m', target: 1000 },  // Stay at 1000 VUs
    { duration: '2m', target: 0 },     // Ramp down
  ],
};

export default function () {
  const res = http.get('http://api.iot-platform.com/devices');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'latency < 200ms': (r) => r.timings.duration < 200,
  });
}
```

**Deliverables:**
- [ ] Load test scripts
- [ ] Performance benchmarks documented
- [ ] Bottlenecks identified and resolved

#### Week 24: Production Launch

**Tasks:**
1. Final security review
2. Backup and disaster recovery plan
3. Deploy to production
4. Post-launch monitoring

**Deliverables:**
- [ ] Production deployment complete
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Post-launch monitoring (24/7)

---

### Phase 4 Checklist

**Multi-Tenancy:**
- [ ] Organization management
- [ ] User roles and permissions
- [ ] RLS enforced

**Security:**
- [ ] Rate limiting
- [ ] Security headers
- [ ] Secrets management (environment variables or Docker secrets)
- [ ] Penetration test passed

**Deployment:**
- [ ] Production Docker Compose configured
- [ ] All services deployed with replicas
- [ ] Traefik reverse proxy with SSL (Let's Encrypt)
- [ ] Automated backups (PostgreSQL + TimescaleDB)

**Monitoring:**
- [ ] Prometheus/Grafana dashboards
- [ ] Alerting configured (Slack/Email)
- [ ] Runbooks documented
- [ ] Performance optimization applied

**Testing:**
- [ ] Load test: 10k devices, 1000 clients
- [ ] Performance benchmarks met
- [ ] Production launch successful

---

## Appendix: Migrating to Kubernetes (Optional)

### When to Consider Kubernetes

Migrate from Docker Compose to Kubernetes when you experience:

1. **Scale Requirements:**
   - More than 10,000 concurrent devices
   - Need auto-scaling based on metrics
   - Multi-region deployment needed

2. **Operational Needs:**
   - Zero-downtime deployments
   - Advanced health checks and self-healing
   - Complex service mesh requirements
   - Need for pod affinity/anti-affinity rules

3. **Team Maturity:**
   - DevOps team experienced with Kubernetes
   - Resources for K8s cluster management
   - Budget for managed Kubernetes (EKS/GKE/AKS)

**Estimated Timeline:** 4-6 weeks for full migration

### Docker Compose vs Kubernetes Comparison

| Feature | Docker Compose | Kubernetes |
|---------|---------------|------------|
| **Setup Complexity** | Low (1 day) | High (1-2 weeks) |
| **Operational Overhead** | Low | High |
| **Scaling** | Manual | Automatic (HPA) |
| **High Availability** | Limited (single host) | Native (multi-node) |
| **Cost** | $50-200/month (VPS) | $300-1000/month (managed K8s) |
| **Ideal For** | 0-10k devices | 10k+ devices |
| **Deployment** | `docker-compose up` | `kubectl apply` |
| **Monitoring** | Basic | Advanced (Istio, linkerd) |

### Migration Strategy

**Phase 1: Preparation (Week 1-2)**

1. **Containerize all services** (already done)
2. **Set up Kubernetes cluster:**
   ```bash
   # AWS EKS
   eksctl create cluster --name iot-platform --region us-east-1 --nodes 3

   # GCP GKE
   gcloud container clusters create iot-platform --num-nodes=3

   # Azure AKS
   az aks create --resource-group iot --name iot-platform --node-count 3
   ```

3. **Convert Docker Compose to Kubernetes manifests:**
   ```bash
   # Use kompose to convert
   kompose convert -f docker-compose.prod.yml -o k8s/
   ```

**Phase 2: Deploy Core Services (Week 3-4)**

1. **Deploy databases with StatefulSets:**

```yaml
# k8s/postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: timescale/timescaledb:latest-pg15
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

2. **Deploy application services:**

```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: your-registry/iot-api:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

3. **Set up HorizontalPodAutoscaler:**

```yaml
# k8s/api-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**Phase 3: Traffic Migration (Week 5)**

1. **Blue-Green Deployment:**
   - Keep Docker Compose running (blue)
   - Deploy Kubernetes cluster (green)
   - Route 10% traffic to K8s
   - Gradually increase to 100%

2. **DNS Cutover:**
   ```bash
   # Update DNS records to point to K8s Ingress
   api.example.com -> <K8s-Ingress-IP>
   ```

**Phase 4: Decommission Docker (Week 6)**

1. Monitor Kubernetes for 1 week
2. Shut down Docker Compose services
3. Migrate backups to Kubernetes CronJobs

### Kubernetes Best Practices

1. **Use Namespaces for Environments:**
   ```bash
   kubectl create namespace production
   kubectl create namespace staging
   ```

2. **Implement Pod Security Policies**
3. **Use ConfigMaps and Secrets**
4. **Set Resource Requests/Limits**
5. **Enable Network Policies**
6. **Use Helm for Package Management**

### Cost Comparison

**Docker Compose (Single VPS):**
- 16 CPU, 32GB RAM: $100-200/month
- Suitable for: 0-10k devices

**Kubernetes (Managed Cluster):**
- 3-node cluster (8 CPU, 16GB each): $500-800/month
- Suitable for: 10k-100k devices

### Recommendation

**Start with Docker Compose if:**
- MVP or early-stage product
- Small team (<5 engineers)
- Budget-conscious
- Serving <10k devices

**Migrate to Kubernetes when:**
- Proven product-market fit
- Scaling beyond 10k devices
- Need advanced orchestration
- Team has K8s expertise

---

## Sprint Planning Guidelines

### Sprint Structure (2-week sprints)

**Week 1:**
- Monday: Sprint planning (define tasks, estimate)
- Tuesday-Thursday: Development
- Friday: Code review, testing

**Week 2:**
- Monday-Wednesday: Development
- Thursday: Integration testing
- Friday: Sprint review, retrospective

### Definition of Done

- [ ] Code written and reviewed
- [ ] Unit tests written (80% coverage)
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Acceptance criteria met

---

## Testing Strategy

### Unit Testing

- Jest for Node.js/TypeScript
- Testing Library for React components
- Mock external dependencies

### Integration Testing

- Testcontainers for database testing
- Supertest for API testing
- End-to-end flows (device → dashboard)

### Performance Testing

- k6 for load testing
- Artillery for API stress testing
- JMeter for MQTT load testing

### Security Testing

- OWASP ZAP for vulnerability scanning
- Snyk for dependency scanning
- Manual penetration testing

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Scope creep** | High | Strict sprint planning, MVP focus |
| **Performance bottlenecks** | High | Early load testing, continuous profiling |
| **Third-party dependencies** | Medium | Evaluate alternatives, have fallbacks |
| **Security vulnerabilities** | High | Regular scans, code reviews, pen testing |
| **Team availability** | Medium | Cross-training, documentation |
| **Kubernetes complexity** | Medium | Start with Docker Compose, gradual migration |

---

**Document Version:** 1.0
**Last Updated:** 2026-02-04
**Maintained By:** Engineering Team
