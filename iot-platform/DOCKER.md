# Docker Deployment Guide

## Quick Start

### Production Deployment

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Update database password in .env
# Edit .env and set DB_PASSWORD to a secure password

# 3. Start all services
docker-compose up -d

# 4. Check logs
docker-compose logs -f

# 5. Access the application
# - Web UI: http://localhost:3000
# - API: http://localhost:3001
# - Swagger Docs: http://localhost:3001/docs
```

### Development Mode (with hot-reload)

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# The application will automatically reload on code changes
```

## Architecture

The Docker setup includes 3 services:

1. **postgres** - TimescaleDB (PostgreSQL 16 with time-series extension)
2. **api** - Backend API (Fastify + Prisma)
3. **web** - Frontend (Next.js 16)

## Service Details

### PostgreSQL Service
- **Image**: `timescale/timescaledb:latest-pg16`
- **Port**: 5432
- **Data Volume**: `postgres_data` (persists across restarts)
- **Credentials**: Set via `DB_PASSWORD` environment variable

### API Service
- **Build**: Multi-stage Dockerfile
- **Port**: 3001
- **Depends on**: PostgreSQL (waits for health check)
- **Auto-migration**: Runs `prisma migrate deploy` on startup

### Web Service
- **Build**: Next.js standalone build
- **Port**: 3000
- **Depends on**: API service

## Commands

### Starting Services

```bash
# Start in background
docker-compose up -d

# Start with logs
docker-compose up

# Start specific service
docker-compose up postgres
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (DELETES DATA!)
docker-compose down -v
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres
```

### Rebuilding

```bash
# Rebuild and start
docker-compose up --build

# Rebuild specific service
docker-compose build api
docker-compose up -d api
```

### Running Commands Inside Containers

```bash
# Run Prisma migrations manually
docker-compose exec api pnpm prisma migrate dev

# Access database
docker-compose exec postgres psql -U iot_platform -d iot_platform

# Shell into container
docker-compose exec api sh
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required
DB_PASSWORD=your_secure_password

# Optional (defaults shown)
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
```

## Health Checks

Both API and Web services have health checks configured:

```bash
# Check service health
docker-compose ps

# Should show "healthy" status for all services
```

## Data Persistence

Database data is stored in a Docker volume:

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect iot-platform_postgres_data

# Backup database
docker-compose exec postgres pg_dump -U iot_platform iot_platform > backup.sql

# Restore database
docker-compose exec -T postgres psql -U iot_platform iot_platform < backup.sql
```

## Troubleshooting

### Port Already in Use

```bash
# Change ports in docker-compose.yml
ports:
  - "5433:5432"  # Change 5432 to 5433
  - "3002:3001"  # Change 3001 to 3002
  - "3001:3000"  # Change 3000 to 3001
```

### Database Connection Failed

```bash
# Check if PostgreSQL is healthy
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### API Won't Start

```bash
# Check API logs
docker-compose logs api

# Common issues:
# 1. Database not ready -> Wait for postgres health check
# 2. Migration failed -> Check DATABASE_URL in .env
# 3. Port conflict -> Change PORT in .env
```

### Clean Restart

```bash
# Stop everything
docker-compose down

# Remove volumes (DELETES DATA!)
docker-compose down -v

# Rebuild and start fresh
docker-compose up --build
```

## Production Deployment

### Cloud Deployment (DigitalOcean, AWS, etc.)

1. **Set strong passwords** in `.env`
2. **Configure firewall** to restrict port access
3. **Use environment variables** instead of .env file
4. **Enable SSL/TLS** with reverse proxy (nginx, Caddy)
5. **Set up backups** for database volume
6. **Monitor with health checks**

### Recommended Production Setup

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  api:
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
        max_attempts: 3
```

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Hot Reload | ✅ Yes | ❌ No |
| Volumes | Source code mounted | None |
| Build | Skipped (uses node_modules) | Multi-stage, optimized |
| Database | Separate dev volume | Production volume |
| Logs | Verbose | Minimal |

## Next Steps

After Docker setup:
1. Access Swagger docs at http://localhost:3001/docs
2. Run device simulator: `docker-compose exec api pnpm run simulate`
3. Build dashboards at http://localhost:3000/dashboard-builder
4. Check logs for any errors

For detailed deployment guides, see `docs/DEPLOYMENT.md`.
