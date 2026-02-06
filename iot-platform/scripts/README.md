# IoT Platform - Helper Scripts

Convenient scripts to manage the development environment.

## Available Scripts

### 🚀 `start.sh`
Start the entire application (backend + frontend)

```bash
./scripts/start.sh
```

**What it does:**
- Stops any running instances
- Starts both backend and frontend with Turborepo
- Shows service URLs

### 🛑 `stop.sh`
Stop all running services

```bash
./scripts/stop.sh
```

**What it does:**
- Gracefully stops the backend API
- Gracefully stops the frontend dev server

### 🔍 `status.sh`
Check service health and status

```bash
./scripts/status.sh
```

**What it shows:**
- Backend API status (port 3001)
- Frontend status (port 3000)
- Database connectivity
- Process IDs
- Health check results

## Quick Reference

```bash
# Start everything
./scripts/start.sh

# Check status
./scripts/status.sh

# Stop everything
./scripts/stop.sh
```

## Manual Commands

If you prefer to run services manually:

### Start with Turbo (Recommended)
```bash
pnpm dev
```

### Start Backend Only
```bash
cd apps/api
pnpm dev
```

### Start Frontend Only
```bash
cd apps/web
pnpm dev
```

## Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 3001 | http://localhost:3001 |
| API Docs | 3001 | http://localhost:3001/docs |
| Database | 5432 | postgresql://localhost:5432/iot_platform |
