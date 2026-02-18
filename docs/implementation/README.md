# Implementation Documentation

This folder contains detailed implementation guides for specific features, organized by technical area.

## 📁 Subfolders

### **[core/](./core/)** - Authentication & Core Services
JWT tokens, session management, user authentication, and authorization.

**Key Documents:**
- **TOKEN_SESSION_TRACKING.md** - JTI-based token revocation and session management
- **AUTH_IMPLEMENTATION_REVIEW.md** - Authentication architecture
- **AUTH_API_EXAMPLES.md** - API call examples and integration patterns
- **AUTH_MIDDLEWARE_STATUS.md** - Middleware implementation status
- **AUTH_TEST_COVERAGE.md** - Test cases and coverage metrics
- **AUTH_SEED_SCRIPT.md** - Database seeding for testing

**When to Use:**
- Building authentication flows
- Understanding token lifecycle
- Session management implementation
- Fixing auth issues

---

### **[data/](./data/)** - Data Storage & Protocols
Database models, industrial protocols, and storage strategies.

**Key Documents:**
- **MODBUS_GATEWAY_DESIGN.md** - Modbus TCP/RTU gateway architecture
- **MODBUS_USAGE_GUIDE.md** - How to configure and use Modbus gateway
- **MODBUS_IMPLEMENTATION_STATUS.md** - Implementation progress
- **MODBUS_COMPLETE_SUMMARY.md** - Complete feature summary
- **OPCUA_COMPLETE_SUMMARY.md** - OPC-UA protocol support
- **ULID_IMPLEMENTATION.md** - ULID identifier system
- **HYBRID_DASHBOARD_STORAGE.md** - localStorage + backend hybrid storage

**When to Use:**
- Configuring industrial protocols (Modbus, OPC-UA)
- Understanding device state storage
- Implementing hybrid dashboard storage
- Using ULID identifiers

---

### **[frontend/](./frontend/)** - React Frontend
Next.js application, state management, UI components.

**Key Documents:**
- **REDUX_IMPLEMENTATION.md** - Redux Toolkit setup and configuration
- **REDUX_MIGRATION_COMPLETE.md** - Migration from Context API to Redux
- **REDUX_QUICK_REFERENCE.md** - Redux patterns quick reference
- **HYBRID_DASHBOARD_IMPLEMENTATION_SUMMARY.md** - Dashboard UI implementation

**When to Use:**
- Building React components
- Managing application state
- Understanding Redux patterns
- Implementing UI features

---

### **[backend/](./backend/)** - Node.js Backend
API endpoints, database layer, server implementation.

**Key Documents:**
- **PRISMA_MIGRATION_SUMMARY.md** - Database migration (Prisma era)
- **WEBSOCKET_API.md** - WebSocket API reference

**When to Use:**
- Building API endpoints
- Database operations
- Real-time WebSocket communication
- Server-side business logic

---

## 🎯 Implementation Areas

### Authentication Flow
```
User Login
    ↓
Generate JWT + JTI
    ↓
Store TokenSession in DB
    ↓
Return tokens (access + refresh)
    ↓
API: Validate token + check JTI
    ↓
Grant/Deny access
```
**Files:** `core/TOKEN_SESSION_TRACKING.md`, `core/AUTH_API_EXAMPLES.md`

### Protocol Gateway (Modbus)
```
Modbus Device
    ↓ (TCP/RTU)
ModbusGateway (polling)
    ↓
Data Conversion (scale/offset)
    ↓
Device Auto-Registration
    ↓
Device State Storage
```
**Files:** `data/MODBUS_GATEWAY_DESIGN.md`, `data/MODBUS_USAGE_GUIDE.md`

### Dashboard Storage
```
Frontend (React)
    ↓
Redux State
    ↓
Save to localStorage (immediate)
    ↓
Sync to MongoDB (background)
    ↓
Cross-device sync with online/offline support
```
**Files:** `data/HYBRID_DASHBOARD_STORAGE.md`, `frontend/REDUX_IMPLEMENTATION.md`

## 🔄 Technology Stack

### Frontend
- **Framework:** Next.js 16 + React 19
- **State:** Redux Toolkit
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **Real-time:** Socket.io client
- **HTTP:** Axios with interceptors

### Backend
- **Runtime:** Node.js 24.11.0
- **Framework:** Fastify 4.25.2
- **Database:** MongoDB 8 + Mongoose ODM
- **Real-time:** Socket.io server
- **Validation:** Zod schemas
- **Logging:** Pino

### Database
- **Primary:** MongoDB Time Series Collections
- **Identifiers:** ULID (26-char, time-sortable)
- **TTL:** Automatic data expiration
- **Indexes:** Compound indexes on orgId+deviceId+timestamp

## 📊 Common Patterns

### API Client Pattern
```typescript
// Type-safe API calls
const response = await apiClient.get<DeviceState[]>(`/devices/${id}/states`);
setData(response.data);
```

### Redux Pattern
```typescript
// Type-safe async thunks
export const loadDevices = createAsyncThunk<Device[], string>(
  'devices/load',
  async (orgId) => {
    const response = await apiClient.get<Device[]>(`/organizations/${orgId}/devices`);
    return response.data;
  }
);
```

### Mongoose Pattern
```typescript
// Type-safe models
const deviceSchema = new Schema({
  deviceId: {type: String, unique: true, required: true},
  name: String,
  state: [deviceStateSchema]
});
const Device = model<IDevice>('Device', deviceSchema);
```

---

**Last Updated:** February 17, 2026
**Technology:** Node.js, React, MongoDB
**Coverage:** Full stack implementation

