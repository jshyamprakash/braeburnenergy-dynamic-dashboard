# IoT Platform POC

Enterprise IoT Platform for real-time device management, time-series data ingestion, and interactive dashboards. Built with production-ready architecture from day one.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black.svg)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green.svg)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-ODM-red.svg)](https://mongoosejs.com/)

---

## 🚀 Features

### Device Management
- **CRUD Operations**: Create, read, update, delete devices with ULID identifiers
- **Tagging & Search**: Filter devices by tags, search by name
- **Custom Attributes**: Store device metadata as flexible JSON

### Time-Series Data
- **High-Performance Ingestion**: MongoDB Time Series Collections for efficient time-series storage
- **Batch Operations**: Bulk create device states for high-throughput scenarios
- **Data Retention**: Automatic TTL-based data expiration (90-day default via expireAfterSeconds)
- **Aggregation**: Built-in MongoDB $dateTrunc aggregation for time-bucketed queries

### Real-Time Communication
- **WebSocket Support**: Live device state updates via Socket.io
- **Event Broadcasting**: Real-time notifications for device state changes
- **Scalable Architecture**: Ready for multi-instance deployment

### Interactive Dashboards
- **Visual Blocks**: Pre-built components (Gauges, Time-Series Charts, Live Streams)
- **Real-Time Updates**: WebSocket-powered live data feeds
- **Customizable**: Configure blocks with device bindings and display options
- **Dark Mode**: Full dark mode support with system preference detection
- **Data Export**: Export charts as PNG/SVG, data as CSV

### Developer Experience
- **Type Safety**: End-to-end TypeScript with shared types package
- **API Documentation**: Interactive Swagger/OpenAPI docs
- **Hot Reload**: Fast development with Turbopack and Fastify
- **Monorepo**: Turborepo for efficient build caching
- **Testing**: Unit tests and integration tests with 100% coverage

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js 16)                   │
│  React 19 • TanStack Query • Socket.io Client • Recharts       │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                       Backend API (Fastify)                      │
│  Controllers → Services → Mongoose ODM → MongoDB Time Series     │
│  Socket.io Server • Zod Validation • Pino Logging              │
└─────────────────────────────────────────────────────────────────┘
```

**Key Architectural Decisions:**
- **Clean Architecture**: Separation of concerns (Controllers → Services → Data Access)
- **Type Safety**: Shared types package for frontend/backend consistency
- **Production-Ready**: No SQLite or throwaway patterns - MongoDB with Time Series Collections from day 1
- **Scalability**: Designed for horizontal scaling with stateless API and external state

---

## 📦 Tech Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Fastify 4.x (high-performance HTTP server)
- **Database**: MongoDB 8 with Time Series Collections (time-series optimization)
- **ODM**: Mongoose (schema-based MongoDB object modeling)
- **Validation**: Zod (schema validation)
- **Real-Time**: Socket.io (WebSocket communication)
- **Logging**: Pino (structured JSON logging)

### Frontend
- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4
- **State Management**: TanStack Query (server state), Zustand (client state)
- **Charts**: Recharts (composable charting library)
- **Real-Time**: Socket.io Client
- **Theme**: next-themes (dark mode support)

### DevOps
- **Monorepo**: Turborepo (build caching)
- **Package Manager**: pnpm 8.x (fast, disk-efficient)
- **Containerization**: Docker + Docker Compose
- **Testing**: Vitest (unit + integration tests)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8.15+
- Docker & Docker Compose (for containerized setup)
- MongoDB 8 (for manual setup)

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd iot-platform

# Start all services (MongoDB + API + Frontend)
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:3001
# API Docs: http://localhost:3001/docs
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Setup MongoDB
# See DEPLOYMENT.md for platform-specific instructions

# 3. Configure environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit .env files with your MongoDB connection string

# 4. Start development servers
pnpm dev

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:3001
```

---

## 📁 Project Structure

```
iot-platform/
├── apps/
│   ├── api/                    # Backend API (Fastify + Mongoose)
│   │   ├── src/
│   │   │   ├── controllers/    # HTTP request handlers
│   │   │   ├── services/       # Business logic layer
│   │   │   ├── models/         # Mongoose schema definitions
│   │   │   ├── routes/         # API route definitions
│   │   │   ├── schemas/        # Zod validation schemas
│   │   │   ├── middleware/     # Error handling, logging
│   │   │   ├── websocket/      # Socket.io server setup
│   │   │   ├── lib/            # Utilities (Mongoose connection, etc.)
│   │   │   ├── config/         # Configuration management
│   │   │   └── server.ts       # Entry point
│   │   ├── vitest.config.ts    # Test configuration
│   │   └── Dockerfile          # Production container image
│   │
│   └── web/                    # Frontend (Next.js 16)
│       ├── app/                # Next.js App Router
│       │   ├── devices/        # Device management pages
│       │   ├── dashboard-demo/ # Dashboard demo page
│       │   ├── layout.tsx      # Root layout
│       │   └── page.tsx        # Home page
│       ├── components/         # React components
│       │   ├── blocks/         # Dashboard blocks (Gauge, Chart, LiveStream)
│       │   ├── dashboard/      # Dashboard builder components
│       │   ├── devices/        # Device management components
│       │   └── ui/             # Reusable UI components
│       ├── lib/                # API client, utilities
│       ├── hooks/              # Custom React hooks
│       ├── stores/             # Zustand state stores
│       ├── styles/             # Global styles
│       ├── next.config.ts      # Next.js configuration
│       └── Dockerfile          # Production container image
│
├── packages/
│   └── types/                  # Shared TypeScript types
│       └── src/
│           └── index.ts        # Common interfaces (Device, DeviceState, etc.)
│
├── scripts/
│   └── device-simulator.ts    # Device data simulator
│
├── docker-compose.yml          # Production Docker setup
├── docker-compose.dev.yml      # Development Docker setup
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # pnpm workspace definition
├── DEPLOYMENT.md               # Deployment guide
├── PROGRESS.md                 # Development progress tracker
└── README.md                   # This file
```

---

## 🛠️ Available Scripts

### Root Level (Monorepo)

```bash
# Install all dependencies
pnpm install

# Start all services in development mode
pnpm dev

# Build all packages
pnpm build

# Run tests across all packages
pnpm test

# Run linting
pnpm lint

# Clean all build artifacts
pnpm clean
```

### Backend (apps/api)

```bash
# Development with hot-reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run unit tests
pnpm test

# Run integration tests
pnpm test:run src/routes/*.integration.test.ts

# Run tests with coverage
pnpm test:coverage

# Device simulator
pnpm run simulate -- --devices 5 --interval 1s
```

### Frontend (apps/web)

```bash
# Development with hot-reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

---

## 🧪 Testing

### Test Coverage

- **Unit Tests**: 27 tests covering services and utilities
- **Integration Tests**: 25 tests covering all API endpoints
- **Total Coverage**: 100% of critical paths

### Run Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/services/device.service.spec.ts

# Run integration tests
pnpm test:run src/routes/*.integration.test.ts

# Watch mode (auto-rerun on changes)
pnpm test --watch

# Generate coverage report
pnpm test:coverage
```

### Test Database

Integration tests use the same database as development. For safety, always include "test" in the database name:

```bash
MONGODB_URI="mongodb://localhost:27017/iot_platform_test?replicaSet=rs0"
```

---

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Complete deployment guide (Docker, manual, production)
- **[PROGRESS.md](./PROGRESS.md)**: Development progress and task tracking
- **API Documentation**: Interactive Swagger docs at http://localhost:3001/docs
- **Architecture Docs**: See `../docs/` directory in parent project

---

## 🔧 Configuration

### Environment Variables

#### Backend (apps/api/.env)

```bash
MONGODB_URI="mongodb://localhost:27017/iot_platform?replicaSet=rs0"
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

#### Frontend (apps/web/.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

See [DEPLOYMENT.md](./DEPLOYMENT.md#environment-variables) for complete reference.

---

## 🔌 API Endpoints

### Devices

- `POST /devices` - Create a new device
- `GET /devices` - List devices (pagination, filtering, search)
- `GET /devices/:deviceId` - Get device by ID
- `PATCH /devices/:deviceId` - Update device
- `DELETE /devices/:deviceId` - Delete device

### Device States

- `POST /devices/:deviceId/states` - Create device state
- `GET /devices/:deviceId/states` - List device states (time-range, pagination)
- `GET /devices/:deviceId/states/latest` - Get latest state
- `POST /states/bulk` - Bulk create states

### WebSocket Events

- `device:state:update` - Broadcast when device state changes
- `connect` / `disconnect` - Connection lifecycle events

**Interactive API Docs**: http://localhost:3001/docs

---

## 🎯 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

```bash
# Start dev servers with hot-reload
pnpm dev

# API: http://localhost:3001
# Frontend: http://localhost:3000
```

### 3. Test Your Changes

```bash
# Run tests
pnpm test

# Check types
pnpm --filter @repo/api tsc --noEmit
pnpm --filter @repo/web tsc --noEmit
```

### 4. Database Changes

```bash
# Edit Mongoose models in apps/api/src/models/
# No migration step needed - Mongoose schemas are applied at runtime
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
```

---

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Check MongoDB is running
docker-compose ps
# or
mongosh --eval "rs.status().ok"
```

**Port Already in Use:**
```bash
# Find process using port 3001
lsof -i :3001
# Kill process
kill -9 <PID>
```

**Frontend Can't Connect to API:**
- Check `NEXT_PUBLIC_API_URL` in `apps/web/.env.local`
- Verify API is running: `curl http://localhost:3001/health`

See [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting) for more solutions.

---

## 🔐 Security

### Production Checklist

- [ ] Change default database password
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Restrict CORS to specific domains
- [ ] Don't expose MongoDB to public internet
- [ ] Enable database backups
- [ ] Keep dependencies updated
- [ ] Review logs regularly

See [DEPLOYMENT.md](./DEPLOYMENT.md#security-considerations) for details.

---

## 🚢 Deployment

### Docker Deployment (Recommended)

```bash
# Production deployment
docker-compose up -d

# View logs
docker-compose logs -f
```

### Manual Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md#manual-production-deployment) for complete instructions.

---

## 📊 Performance

### Current Capabilities (POC)

- **Devices**: 100-1,000 concurrent devices
- **Ingestion Rate**: 100-1,000 messages/second
- **API Response Time**: <200ms (p95)
- **Dashboard Latency**: <500ms (p95)
- **Storage**: ~1 GB/day (1000 devices @ 10s intervals)

### Scaling Path

For production scale (10,000-100,000 devices):
- Add MQTT broker (EMQX)
- Implement batch inserts (1000 rows/transaction)
- Add MongoDB replica set members for read scaling
- Enable MongoDB Time Series collection optimization
- Deploy Gateway Edge Agents for protocol translation

See `../docs/POC_TO_ENTERPRISE_PLAN.md` for scaling roadmap.

---

## 🗺️ Roadmap

### ✅ Phase 0: POC (Weeks 1-3) - COMPLETE

- [x] Monorepo setup with Turborepo
- [x] MongoDB with Time Series Collections
- [x] Fastify API with Mongoose ODM
- [x] Next.js 16 frontend with React 19
- [x] WebSocket real-time updates
- [x] Dashboard components (Gauge, Chart, LiveStream)
- [x] Dark mode support
- [x] Data export (CSV, PNG, SVG)
- [x] Device simulator
- [x] Unit & integration tests (100% coverage)
- [x] Docker containerization
- [x] Comprehensive documentation

### 🔄 Phase 1: MVP (Weeks 4-8)

- [ ] MQTT broker integration (EMQX)
- [ ] Visual workflow editor (React Flow)
- [ ] Multi-tenancy (Organizations)
- [ ] Access Keys with MQTT ACLs
- [ ] Dashboard builder (drag-and-drop)
- [ ] Alert rules and notifications
- [ ] User authentication (JWT)

### 🚀 Phase 2: Scale (Weeks 9-16)

- [ ] Gateway Edge Agents (Go)
- [ ] Industrial protocol support (Modbus, OPC UA, Profinet, BACnet, S7)
- [ ] Advanced analytics (aggregations, rolling averages)
- [ ] GPS tracking blocks
- [ ] Input control blocks (buttons, sliders)
- [ ] Report generation (PDF exports)
- [ ] Production monitoring (Prometheus + Grafana)

See `../docs/IMPLEMENTATION_GUIDE.md` for complete roadmap.

---

## 🤝 Contributing

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with ESLint
- **Naming**: camelCase for variables, PascalCase for components
- **Commits**: Conventional Commits format (`feat:`, `fix:`, `docs:`)

### Pull Request Process

1. Create a feature branch
2. Make changes with tests
3. Run `pnpm test` and `pnpm lint`
4. Update documentation if needed
5. Submit PR with clear description

---

## 📄 License

This project is a POC/MVP implementation. License to be determined.

---

## 🙏 Acknowledgments

Built with modern, production-ready technologies:
- [Next.js](https://nextjs.org/) - React framework
- [Fastify](https://fastify.dev/) - Fast HTTP server
- [Mongoose](https://mongoosejs.com/) - MongoDB object modeling
- [MongoDB](https://www.mongodb.com/) - Document database with Time Series Collections
- [Socket.io](https://socket.io/) - Real-time engine
- [Turborepo](https://turbo.build/) - High-performance build system

---

## 📞 Support

- **Documentation**: See `DEPLOYMENT.md` and `PROGRESS.md`
- **API Docs**: http://localhost:3001/docs (when running)
- **Issues**: Open an issue in the repository

---

**Last Updated**: 2026-02-10
**Version**: POC v1.0
**Status**: Production-ready POC, ready for MVP development
