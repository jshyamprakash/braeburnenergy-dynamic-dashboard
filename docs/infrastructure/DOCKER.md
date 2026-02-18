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

1. **mongodb** - MongoDB 8 with Replica Set (Time Series Collections)
2. **api** - Backend API (Fastify + Mongoose)
3. **web** - Frontend (Next.js 16)

## Service Details

### MongoDB Service
- **Image**: `mongo:8`
- **Port**: 27017
- **Data Volume**: `mongodb_data` (persists across restarts)
- **Replica Set**: `rs0` (required for Time Series Collections)

### API Service
- **Build**: Multi-stage Dockerfile
- **Port**: 3001
- **Depends on**: MongoDB (waits for health check)

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
docker-compose up mongodb
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
docker-compose logs -f mongodb
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
# Access database
docker-compose exec mongodb mongosh iot_platform

# Shell into container
docker-compose exec api sh
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required
MONGODB_URI=mongodb://mongodb:27017/iot_platform?replicaSet=rs0

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
docker volume inspect iot-platform_mongodb_data

# Backup database
docker-compose exec mongodb mongodump --db iot_platform --archive=/tmp/backup.archive
docker cp $(docker-compose ps -q mongodb):/tmp/backup.archive ./backup.archive

# Restore database
docker cp backup.archive $(docker-compose ps -q mongodb):/tmp/backup.archive
docker-compose exec mongodb mongorestore --archive=/tmp/backup.archive --db iot_platform
```

## Troubleshooting

### Port Already in Use

```bash
# Change ports in docker-compose.yml
ports:
  - "27018:27017"  # Change 27017 to 27018
  - "3002:3001"  # Change 3001 to 3002
  - "3001:3000"  # Change 3000 to 3001
```

### Database Connection Failed

```bash
# Check if MongoDB is healthy
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### API Won't Start

```bash
# Check API logs
docker-compose logs api

# Common issues:
# 1. Database not ready -> Wait for MongoDB health check
# 2. Connection failed -> Check MONGODB_URI in .env
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
      MONGODB_URI: ${MONGODB_URI}
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
