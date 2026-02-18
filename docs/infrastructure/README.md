# Infrastructure & DevOps Documentation

This folder contains deployment guides, database configuration, containerization, and infrastructure setup documentation.

## 📄 Documents

### **MONGODB_REPLICA_SET.md** (12KB - CRITICAL)
**MongoDB Replica Set Configuration & High Availability**

- Why replica sets are critical (Time Series Collections requirement)
- Automatic failover and data redundancy
- TTL index implementation for EPA compliance (90-day retention)
- MongoDB consistency models
- Production best practices
- Local development setup
- Failover scenarios and recovery

**Key Points:**
- Time-series collections REQUIRE replica sets (not standalone)
- Default setup: localhost:27018 with rs0 replica set
- TTL indexes for automatic data expiration
- Connection string format: `mongodb://localhost:27018/iot_platform?replicaSet=rs0`

### **DEPLOYMENT.md**
**Production Deployment Procedures**

- Pre-deployment checklist
- Environment configuration
- Database setup and migration
- Server startup sequence
- Health check procedures
- Monitoring setup
- Rollback procedures
- Common issues and fixes

### **DOCKER.md**
**Containerization & Docker**

- Multi-stage Docker builds
- Container optimization
- Docker Compose for orchestration
- Container networking
- Volume management
- Environment variable configuration
- Build and deployment scripts

## 🚀 Quick Start

### Local Development Setup
```bash
# 1. Start MongoDB with replica set
./scripts/setup-mongodb.sh

# 2. Verify connection
mongosh --port 27018 --eval "rs.status().ok"

# 3. Run migrations
pnpm run migrate

# 4. Start services
pnpm run dev
```

### Production Deployment
1. Review DEPLOYMENT.md checklist
2. Configure environment variables
3. Set up MongoDB replica set
4. Run database migrations
5. Deploy containers
6. Verify health checks

## 🏗️ Infrastructure Components

### Database: MongoDB 8
- **Port:** 27018 (local dev), standard port in production
- **Replica Set:** rs0 (required for Time Series Collections)
- **Data Path:** ~/.mongodb-iot-platform/data (local dev)
- **Connection:** Mongoose ODM
- **Features:** Time Series Collections, TTL indexes, transactions

### Container: Docker
- **Backend:** Node.js image with Fastify server
- **Frontend:** Node.js build → served by nginx
- **Database:** MongoDB official image
- **Compose:** Multi-container orchestration

### Deployment: Docker Compose
- **Services:** API, Web, Database
- **Networking:** Internal Docker network
- **Volumes:** Database persistence, application code
- **Environment:** .env configuration

## 📊 Architecture

```
┌─────────────────────────────────┐
│      nginx/reverse proxy        │ (Production)
└──────────────────┬──────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼───┐      ┌───▼───┐      ┌──▼────┐
│ API   │      │ Web   │      │ WebSocket
│ :3001 │      │ :3000 │      │ :3001
└───┬───┘      └───┬───┘      └──┬─────┘
    │              │             │
    └──────────────┼─────────────┘
                   │
            ┌──────▼──────┐
            │  MongoDB    │
            │  :27018     │
            └─────────────┘
```

## 🔧 Configuration

### Environment Variables
Key variables for deployment:
- `MONGODB_URI` - Connection string with replica set
- `NODE_ENV` - production/development
- `API_PORT` - Backend port (3001)
- `WEB_PORT` - Frontend port (3000)
- `JWT_SECRET` - Token signing key
- `LOG_LEVEL` - Logging verbosity

## 📝 Maintenance

### Regular Tasks
- Monitor MongoDB disk usage
- Check replica set status
- Review logs for errors
- Backup important data
- Update dependencies

### Troubleshooting
- See DEPLOYMENT.md for common issues
- Check MongoDB logs
- Verify network connectivity
- Review environment configuration

---

**Last Updated:** February 17, 2026
**Primary Tech:** MongoDB 8, Docker, Node.js
**Target:** Production deployment

