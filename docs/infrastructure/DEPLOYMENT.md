# Deployment Guide

Complete guide for deploying the IoT Platform POC in development and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Manual Deployment (Without Docker)](#manual-deployment-without-docker)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)
- [Monitoring & Logs](#monitoring--logs)

---

## Prerequisites

### Required Software

- **Node.js**: v20.x or higher
- **pnpm**: v8.15.0 or higher
- **Docker**: v24.x or higher (for containerized deployment)
- **Docker Compose**: v2.x or higher
- **MongoDB**: v8.x (for manual deployment)

### System Requirements

**Development:**
- 4 GB RAM minimum
- 10 GB disk space

**Production:**
- 8 GB RAM minimum
- 50 GB disk space (adjust based on data retention)

---

## Quick Start

### Development (Local)

```bash
# 1. Clone and install
git clone <repository-url>
cd iot-platform
pnpm install

# 2. Setup environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Start MongoDB
docker-compose -f docker-compose.dev.yml up -d mongodb

# 4. Start services
pnpm dev
```

**Access:**
- Frontend: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/docs

### Production (Docker)

```bash
# 1. Clone repository
git clone <repository-url>
cd iot-platform

# 2. Configure environment
cp .env.example .env
# Edit .env with production values

# 3. Start all services
docker-compose up -d

# 4. Check status
docker-compose ps
```

---

## Development Deployment

### Using Docker Compose (Recommended)

The `docker-compose.dev.yml` file provides hot-reload for local development.

**Start services:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

**What's included:**
- MongoDB 8 with Replica Set (port 27017)
- Hot-reload for API and frontend
- Volume mounts for code changes
- Development logging

**Watch logs:**
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f api
```

**Stop services:**
```bash
docker-compose -f docker-compose.dev.yml down
```

**Clean restart (wipes data):**
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Manual Development (Without Docker)

**1. Install MongoDB:**

Ubuntu/Debian:
```bash
# Import MongoDB GPG key and add repository (see MongoDB docs for latest instructions)
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

macOS:
```bash
brew tap mongodb/brew
brew install mongodb-community@8.0
brew services start mongodb-community@8.0
```

**2. Initialize Replica Set (required for Time Series Collections):**
```bash
# Add to /etc/mongod.conf:
# replication:
#   replSetName: rs0

# Restart MongoDB and initialize
sudo systemctl restart mongod
mongosh --eval "rs.initiate()"
```

**3. Configure environment:**
```bash
# apps/api/.env
MONGODB_URI="mongodb://localhost:27017/iot_platform?replicaSet=rs0"
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
```

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**4. Install dependencies:**
```bash
pnpm install
```

**5. Start services:**
```bash
# Terminal 1 - API
cd apps/api
pnpm dev

# Terminal 2 - Frontend
cd apps/web
pnpm dev
```

---

## Production Deployment

### Docker Compose (Single Server)

**1. Prepare environment file:**

Create `.env` in project root:
```bash
# Database
MONGODB_URI=mongodb://mongodb:27017/iot_platform?replicaSet=rs0

# API
NODE_ENV=production
API_PORT=3001
API_HOST=0.0.0.0
CORS_ORIGIN=https://yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

**2. Build and start:**
```bash
docker-compose up -d --build
```

**3. Verify deployment:**
```bash
# Check all services are running
docker-compose ps

# Check API health
curl http://localhost:3001/health

# Check frontend
curl http://localhost:3000
```

**5. Setup reverse proxy (NGINX example):**

```nginx
# /etc/nginx/sites-available/iot-platform

# API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart NGINX:
```bash
sudo ln -s /etc/nginx/sites-available/iot-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**6. Setup SSL with Let's Encrypt:**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

### Manual Production Deployment

**1. Prepare server:**
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@8.15.0

# Install MongoDB
sudo apt-get install -y mongodb-org
```

**2. Clone and build:**
```bash
git clone <repository-url> /opt/iot-platform
cd /opt/iot-platform

pnpm install --frozen-lockfile
cd apps/api
pnpm build
cd ../web
pnpm build
cd ../..
```

**3. Setup systemd services:**

Create `/etc/systemd/system/iot-api.service`:
```ini
[Unit]
Description=IoT Platform API
After=network.target mongod.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/iot-platform/apps/api
Environment="NODE_ENV=production"
Environment="MONGODB_URI=mongodb://localhost:27017/iot_platform?replicaSet=rs0"
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/iot-web.service`:
```ini
[Unit]
Description=IoT Platform Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/iot-platform/apps/web
Environment="NODE_ENV=production"
Environment="NEXT_PUBLIC_API_URL=http://localhost:3001"
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**4. Start services:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable iot-api iot-web
sudo systemctl start iot-api iot-web
sudo systemctl status iot-api iot-web
```

---

## Environment Variables

### Backend (apps/api/.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `NODE_ENV` | No | `development` | Environment: `development`, `production` |
| `PORT` | No | `3001` | API server port |
| `HOST` | No | `0.0.0.0` | API server host |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `LOG_LEVEL` | No | `info` | Log level: `trace`, `debug`, `info`, `warn`, `error` |

**Example:**
```bash
MONGODB_URI="mongodb://localhost:27017/iot_platform?replicaSet=rs0"
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
LOG_LEVEL=info
```

### Frontend (apps/web/.env.local)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | - | Backend API URL (must be publicly accessible) |
| `NEXT_TELEMETRY_DISABLED` | No | `1` | Disable Next.js telemetry |

**Example:**
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_TELEMETRY_DISABLED=1
```

### Docker Compose (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | - | Full MongoDB connection string |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origins |

---

## Database Setup

### Initial Setup

**1. Start MongoDB with Replica Set:**
```bash
# MongoDB must run as a replica set for Time Series Collections
mongosh --eval "rs.initiate()"
```

**2. Verify Time Series Collection:**
```bash
mongosh iot_platform --eval "db.getCollectionInfos({name: 'devicestates'})"
```

Expected output should show `type: "timeseries"` with `timeField: "timestamp"` and `metaField: "deviceId"`.

**3. Verify TTL index (90-day retention):**
```bash
mongosh iot_platform --eval "db.devicestates.getIndexes()"
```

Look for an index with `expireAfterSeconds: 7776000`.

### Schema Changes

Mongoose schemas are defined in code (`apps/api/src/models/`) and applied at runtime. No migration step is needed -- simply update the Mongoose model and restart the application.

### Backup & Restore

**Backup database:**
```bash
# Full backup
docker-compose exec mongodb mongodump --db iot_platform --archive=/tmp/backup_$(date +%Y%m%d_%H%M%S).archive
docker cp $(docker-compose ps -q mongodb):/tmp/backup_*.archive .

# Export specific collection as JSON
docker-compose exec mongodb mongoexport --db iot_platform --collection devices --out /tmp/devices.json
```

**Restore database:**
```bash
# Stop API first
docker-compose stop api web

# Restore
docker cp backup.archive $(docker-compose ps -q mongodb):/tmp/backup.archive
docker-compose exec mongodb mongorestore --archive=/tmp/backup.archive --db iot_platform

# Restart services
docker-compose start api web
```

### Data Retention

MongoDB TTL index is configured to delete data older than 90 days (expireAfterSeconds: 7776000):

```bash
# View TTL indexes
mongosh iot_platform --eval "db.devicestates.getIndexes().filter(i => i.expireAfterSeconds)"

# Modify retention (keep data for 180 days = 15552000 seconds)
mongosh iot_platform --eval "db.runCommand({collMod: 'devicestates', index: {keyPattern: {timestamp: 1}, expireAfterSeconds: 15552000}})"
```

---

## Health Checks

### API Health Endpoint

```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-10T12:00:00.000Z",
  "database": "connected",
  "uptime": 3600
}
```

### Database Health

```bash
# Docker
docker-compose exec mongodb mongosh --eval "rs.status().ok"

# Manual
mongosh --eval "rs.status().ok"
```

### Service Status

```bash
# Docker
docker-compose ps

# Systemd
sudo systemctl status iot-api iot-web
```

### WebSocket Connection

Test WebSocket connectivity:
```bash
# Using wscat
npm install -g wscat
wscat -c ws://localhost:3001/socket.io/?EIO=4&transport=websocket
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**
- Check MongoDB is running: `docker-compose ps` or `sudo systemctl status mongod`
- Verify `MONGODB_URI` in `.env`
- Check firewall rules: `sudo ufw status`
- Test connection: `mongosh --eval "db.runCommand({ping: 1})"`

#### 2. Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solutions:**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3002
```

#### 3. CORS Errors

**Error:**
```
Access to fetch at 'http://localhost:3001' from origin 'http://localhost:3000' has been blocked by CORS
```

**Solution:**
Check `CORS_ORIGIN` in `apps/api/.env`:
```bash
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

#### 4. Docker Build Fails

**Error:**
```
ERROR [api builder 3/5] RUN pnpm install --frozen-lockfile
```

**Solutions:**
```bash
# Clear Docker cache
docker-compose build --no-cache

# Check disk space
df -h

# Clean Docker system
docker system prune -a
```

#### 5. WebSocket Connection Drops

**Symptoms:**
- Real-time updates stop working
- `socket.io` reconnection errors in browser console

**Solutions:**
- Check API logs: `docker-compose logs -f api`
- Verify WebSocket support in reverse proxy (see NGINX config above)
- Increase connection timeout in NGINX:
  ```nginx
  proxy_read_timeout 3600s;
  proxy_send_timeout 3600s;
  ```

### Debug Mode

Enable debug logging:

**Backend:**
```bash
# apps/api/.env
LOG_LEVEL=debug
```

**Frontend:**
```bash
# Browser console
localStorage.setItem('debug', '*')
```

### View Logs

**Docker:**
```bash
# All logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100 api

# Follow specific service
docker-compose logs -f mongodb
```

**Systemd:**
```bash
sudo journalctl -u iot-api -f
sudo journalctl -u iot-web -f
```

**Log files (manual deployment):**
```bash
# API logs
tail -f /opt/iot-platform/apps/api/logs/app.log

# Frontend logs
tail -f /opt/iot-platform/apps/web/.next/trace
```

---

## Monitoring & Logs

### Log Locations

**Docker:**
- API: `docker-compose logs api`
- Frontend: `docker-compose logs web`
- MongoDB: `docker-compose logs mongodb`

**Manual Deployment:**
- API: `journalctl -u iot-api`
- Frontend: `journalctl -u iot-web`
- MongoDB: `/var/log/mongodb/mongod.log`

### Structured Logging

API logs use Pino structured JSON format:

```json
{
  "level": 30,
  "time": 1707566400000,
  "pid": 1234,
  "hostname": "api",
  "reqId": "req-1",
  "req": {
    "method": "POST",
    "url": "/devices",
    "hostname": "localhost"
  },
  "msg": "incoming request"
}
```

**Query logs:**
```bash
# Filter by level (30=info, 40=warn, 50=error)
docker-compose logs api | jq 'select(.level >= 40)'

# Filter by request ID
docker-compose logs api | jq 'select(.reqId == "req-1")'
```

### Performance Monitoring

**Database query performance:**
```bash
# Slow queries (enable profiling first)
mongosh iot_platform --eval "db.setProfilingLevel(1, {slowms: 100})"
mongosh iot_platform --eval "db.system.profile.find().sort({ts: -1}).limit(10).pretty()"

# Collection sizes
mongosh iot_platform --eval "db.getCollectionNames().forEach(c => { const s = db[c].stats(); printjson({collection: c, size: s.size, count: s.count, storageSize: s.storageSize}) })"

# Index usage
mongosh iot_platform --eval "db.devicestates.aggregate([{\$indexStats: {}}]).pretty()"
```

### Resource Usage

**Docker stats:**
```bash
docker stats
```

**System resources:**
```bash
# CPU & Memory
htop

# Disk usage
df -h
du -sh /var/lib/docker/volumes/*

# Network
netstat -tulpn | grep :3001
```

### Alerts Setup (Optional)

For production monitoring, consider:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Log aggregation**: ELK Stack, Grafana Loki
- **Metrics**: Prometheus + Grafana
- **Error tracking**: Sentry

---

## Security Considerations

### Production Checklist

- [ ] Strong database credentials (if MongoDB authentication is enabled)
- [ ] HTTPS enabled with valid SSL certificates
- [ ] CORS restricted to specific domains (not `*`)
- [ ] MongoDB not exposed to public internet
- [ ] Regular backups configured
- [ ] OS security updates enabled
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] SSH key-based authentication (disable password auth)
- [ ] Environment variables not committed to git
- [ ] Enable MongoDB authentication with dedicated application user

### Firewall Setup

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Additional Resources

- **Project README**: See `README.md` for project overview
- **API Documentation**: http://localhost:3001/docs (when running)
- **Architecture**: See `docs/ARCHITECTURE.md`
- **Technology Stack**: See `docs/TECHNOLOGY_STACK_RATIONALE.md`

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review logs with `docker-compose logs -f`
3. Open an issue in the project repository

**Last Updated:** 2026-02-10
