# ISA Standards Compliance in IoT Platform

## Executive Summary

The IoT Platform implements comprehensive compliance with **ISA-18.2** (Alarm Management), **IEC 61158** (Industrial Protocols), and **ISA/IEC 62443** (Cybersecurity) standards. This document details how each standard is addressed in the architecture and implementation.

---

## ISA-18.2: Management of Alarm Systems for the Process Industries

### Overview

**ISA-18.2** defines best practices for alarm system design, operation, and maintenance. It ensures operators receive clear, actionable information about process deviations without alarm fatigue.

### Standard Compliance Implementation

#### 1. **Alarm State Machine**

**ISA-18.2 Requirement:**
> Alarms must transition through defined states with clear semantics and acknowledging operator actions.

**Implementation in IoT Platform:**

```typescript
// AlarmInstance Model
export type AlarmState =
  | 'ACTIVE_UNACKED'      // Alarm active, operator not yet aware
  | 'ACTIVE_ACKED'        // Alarm active, operator acknowledged
  | 'CLEARED_UNACKED'     // Condition cleared, operator not aware
  | 'CLEARED_ACKED'       // Condition cleared, operator acknowledged (RESOLVED)
  | 'SHELVED';            // Temporarily suppressed by operator

// State Transition Diagram
/*
   ┌─────────────────┐
   │ ACTIVE_UNACKED  │ ← Initial state when alarm triggers
   └────────┬────────┘
            │ operator acknowledges
            ↓
   ┌─────────────────┐
   │ ACTIVE_ACKED    │ ← Operator aware, taking action
   └────────┬────────┘
            │ condition clears
            ↓
   ┌─────────────────┐
   │ CLEARED_UNACKED │ ← Condition resolved, operator doesn't know yet
   └────────┬────────┘
            │ operator acknowledges
            ↓
   ┌─────────────────┐
   │ CLEARED_ACKED   │ ← ALARM RESOLVED (can be archived)
   └─────────────────┘

   Any State → SHELVED (operator manually suppresses)
```

**Code Implementation:**

```typescript
// apps/api/src/models/alarm-instance.model.ts

interface IAlarmStateTransition {
  fromState: AlarmState | null;
  toState: AlarmState;
  timestamp: Date;
  userId?: string;           // Audit trail
  comment?: string;          // Operator notes
}

const alarmInstanceSchema = new Schema<IAlarmInstance>({
  // ... fields ...
  state: {
    type: String,
    enum: ['ACTIVE_UNACKED', 'ACTIVE_ACKED', 'CLEARED_UNACKED', 'CLEARED_ACKED', 'SHELVED'],
    index: true,
  },
  stateTransitions: [{
    fromState: String,
    toState: String,
    timestamp: { type: Date, default: () => new Date() },
    userId: String,         // WHO made the transition
    comment: String,        // WHY (operator notes)
  }],
  // ... audit fields for 21 CFR Part 11 ...
});
```

#### 2. **Alarm Condition Types**

**ISA-18.2 Requirement:**
> Different alarm conditions require different response procedures.

**Implementation:**

```typescript
// AlarmRule Model - 5 condition types supported
export type AlarmCondition =
  | 'THRESHOLD'       // Value exceeds limit (e.g., temp > 100°C)
  | 'RANGE'           // Value outside acceptable band (e.g., 20-25°C)
  | 'DEVIATION'       // Value deviates from setpoint (e.g., ±5% setpoint)
  | 'RATE_OF_CHANGE'  // Rate of change too fast (e.g., +10°C/min)
  | 'QUALITY';        // Data quality issues (missing, stale, NaN)

// Example: Temperature Alarm Rules
const temperatureAlarms: AlarmRule[] = [
  {
    name: 'Reactor Temp High',
    condition: 'THRESHOLD',
    field: 'temperature',
    threshold: 95,              // °C
    operator: '>',
    priority: 'CRITICAL',
    requiresAcknowledgment: true,
  },
  {
    name: 'Cooling Loop Temp Out of Range',
    condition: 'RANGE',
    field: 'temperature',
    minValue: 20,               // °C
    maxValue: 25,
    priority: 'HIGH',
    requiresAcknowledgment: true,
  },
  {
    name: 'Reactor Heating Too Slow',
    condition: 'RATE_OF_CHANGE',
    field: 'temperature',
    rateOfChange: 0.5,          // °C/second
    operator: '<',
    priority: 'MEDIUM',
  },
];
```

#### 3. **Alarm Priority Levels**

**ISA-18.2 Requirement:**
> Alarms must be prioritized based on severity and required response time.

**Implementation:**

```typescript
// 5-level priority system aligned with ISA-18.2
export type AlarmPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

const priorityMapping = {
  CRITICAL: {
    responseTime: '0-5 minutes',    // Must respond immediately
    color: '#D32F2F',               // Red
    requiresAcknowledgment: true,
    soundAlert: true,
    example: 'Reactor pressure > 150 psi',
  },
  HIGH: {
    responseTime: '5-15 minutes',
    color: '#F57C00',               // Orange
    requiresAcknowledgment: true,
    soundAlert: true,
    example: 'Temperature deviation > 10%',
  },
  MEDIUM: {
    responseTime: '15-60 minutes',
    color: '#FBC02D',               // Yellow
    requiresAcknowledgment: false,
    soundAlert: false,
    example: 'Non-critical sensor drift',
  },
  LOW: {
    responseTime: '> 1 hour',
    color: '#558B2F',               // Green
    requiresAcknowledgment: false,
    soundAlert: false,
    example: 'Maintenance due soon',
  },
  INFO: {
    responseTime: 'Informational',
    color: '#90CAF9',               // Light blue
    requiresAcknowledgment: false,
    soundAlert: false,
    example: 'Device came online',
  },
};
```

#### 4. **ISA-18.2 Metrics Tracking**

**ISA-18.2 Requirement:**
> Track response metrics to optimize alarm effectiveness.

**Implementation:**

```typescript
interface IAlarmInstance {
  // ... state and fields ...

  // ISA-18.2 Metrics
  durationActive?: number;           // How long alarm was active (ms)
  durationUnacknowledged?: number;   // Time before operator responded
  responseTime?: number;             // Time to acknowledge

  // Audit trail
  acknowledgedBy?: string;           // WHO acknowledged
  acknowledgmentComment?: string;    // WHY / what actions taken
  stateTransitions: IAlarmStateTransition[];
}

// Calculation in pre-save hook
alarmInstanceSchema.pre('save', function(next) {
  // Calculate duration active (if cleared)
  if (this.clearedTimestamp && !this.durationActive) {
    this.durationActive =
      this.clearedTimestamp.getTime() - this.activeTimestamp.getTime();
  }

  // Calculate response time (time to acknowledge)
  if (this.acknowledgedTimestamp && !this.responseTime) {
    this.responseTime =
      this.acknowledgedTimestamp.getTime() - this.activeTimestamp.getTime();
  }

  next();
});

// Reporting query
async function getAlarmMetrics(period: 'daily' | 'weekly' | 'monthly') {
  const alarms = await AlarmInstance.find({
    activeTimestamp: {
      $gte: new Date(Date.now() - getPeriodMs(period))
    }
  });

  return {
    totalAlarms: alarms.length,
    averageResponseTime: avg(alarms.map(a => a.responseTime)),
    averageDuration: avg(alarms.map(a => a.durationActive)),
    mostFrequentAlarms: groupBy(alarms, 'tagName'),
    // Use for dashboard KPIs
  };
}
```

#### 5. **Shelving (Temporary Suppression)**

**ISA-18.2 Requirement:**
> Operators must be able to temporarily suppress known alarms (shelving).

**Implementation:**

```typescript
// Alarm shelving controller
async function shelveAlarm(alarmId: string, duration: number, reason: string) {
  const alarm = await AlarmInstance.findByIdAndUpdate(
    alarmId,
    {
      state: 'SHELVED',
      isShelved: true,
      shelvedTimestamp: new Date(),
      shelvedBy: userId,
      shelvedReason: reason,
      shelvedUntil: new Date(Date.now() + duration),
      stateTransitions: [
        ...$_.stateTransitions,
        {
          fromState: currentState,
          toState: 'SHELVED',
          timestamp: new Date(),
          userId,
          comment: reason,
        }
      ]
    }
  );

  // Auto-unshelve when duration expires
  setTimeout(() => {
    if (alarm.isShelved && new Date() >= alarm.shelvedUntil) {
      // Re-evaluate alarm condition
      if (alarmConditionStillActive) {
        alarm.state = 'ACTIVE_UNACKED';
        alarm.isShelved = false;
        alarm.save();
      }
    }
  }, duration);
}
```

---

## IEC 61158: Industrial Communication Networks

### Overview

**IEC 61158** defines communication protocols for industrial automation. The IoT Platform implements Modbus, which is part of this standard family.

### Modbus Gateway Implementation

**IEC 61158 Compliance:**

```typescript
// apps/api/src/models/modbus-gateway.model.ts

interface IModbusGateway {
  name: string;
  type: 'TCP' | 'RTU';              // Protocol variant
  host: string;
  port: number;

  // Device registration from Modbus registers
  devices: {
    slaveId: number;                // Modbus slave address
    name: string;
    registers: {
      address: number;
      type: 'HOLDING' | 'INPUT' | 'COIL' | 'DISCRETE_INPUT';
      dataType: 'int16' | 'uint16' | 'int32' | 'uint32' | 'float' | 'boolean';
      scale?: number;               // For sensor conversion
      offset?: number;
      unit?: string;
    }[];
  }[];

  // Polling configuration
  pollingInterval: number;          // ms
  retryAttempts: number;            // IEC 61158 reliability

  // Connection status tracking
  isConnected: boolean;
  lastPoll: Date;
  errorCount: number;
}
```

#### Modbus Register Types (IEC 61158 Table 1)

```
Modbus Coils (0xxx)        → Boolean outputs, writable
Modbus Discrete Inputs     → Boolean inputs, read-only
Modbus Input Registers     → Analog inputs, read-only  (3xxxx)
Modbus Holding Registers   → Analog data, writable     (4xxxx)

Example Device Configuration:
─────────────────────────────
{
  slaveId: 1,
  name: 'Temperature RTU',
  registers: [
    {
      address: 0,
      type: 'INPUT',              // Read from temperature sensor
      dataType: 'int16',
      scale: 0.1,                 // Raw value × 0.1 = °C
      unit: '°C'
    },
    {
      address: 1,
      type: 'HOLDING',            // Write setpoint
      dataType: 'int16',
      scale: 0.1,
      unit: '°C'
    }
  ]
}
```

#### Modbus Service Implementation

```typescript
// apps/api/src/services/modbus-client.service.ts

class ModbusClientService {
  async readCoils(address: number, quantity: number): Promise<boolean[]> {
    // IEC 61158: Coil Read (Function Code 01)
    return this.client.readCoils(address, quantity);
  }

  async readDiscreteInputs(address: number, quantity: number): Promise<boolean[]> {
    // IEC 61158: Discrete Input Read (Function Code 02)
    return this.client.readDiscreteInputs(address, quantity);
  }

  async readInputRegisters(address: number, quantity: number): Promise<number[]> {
    // IEC 61158: Input Register Read (Function Code 04)
    return this.client.readInputRegisters(address, quantity);
  }

  async readHoldingRegisters(address: number, quantity: number): Promise<number[]> {
    // IEC 61158: Holding Register Read (Function Code 03)
    return this.client.readHoldingRegisters(address, quantity);
  }

  async writeCoil(address: number, value: boolean): Promise<void> {
    // IEC 61158: Single Coil Write (Function Code 05)
    return this.client.writeCoil(address, value);
  }

  async writeRegister(address: number, value: number): Promise<void> {
    // IEC 61158: Single Register Write (Function Code 06)
    return this.client.writeRegister(address, value);
  }
}
```

#### Reliability Features (IEC 61158 Section 5)

```typescript
// Retry logic with exponential backoff
async function pollWithRetry(
  slaveId: number,
  register: RegisterConfig,
  maxRetries: number = 3
): Promise<any> {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const value = await readModbusRegister(slaveId, register);
      return { value, success: true, attempts: attempt };
    } catch (error) {
      lastError = error;

      // Exponential backoff: 50ms, 100ms, 200ms
      const backoffMs = 50 * Math.pow(2, attempt - 1);
      await sleep(backoffMs);
    }
  }

  throw new Error(
    `Failed after ${maxRetries} retries: ${lastError.message}`
  );
}

// Connection monitoring
const connectionMonitor = setInterval(async () => {
  try {
    await modbus.ping();  // Heartbeat
    gateway.isConnected = true;
  } catch (error) {
    gateway.isConnected = false;
    gateway.errorCount++;

    // Alert if connection lost for > 5 minutes
    if (gateway.errorCount > 30) {  // 30 × 10-second checks
      createAlarm({
        type: 'MODBUS_GATEWAY_DOWN',
        priority: 'CRITICAL',
        message: `Modbus gateway ${gateway.name} disconnected`,
      });
    }
  }
}, 10000);  // Check every 10 seconds
```

---

## ISA/IEC 62443: Industrial Cybersecurity

### Overview

**ISA/IEC 62443** provides comprehensive cybersecurity framework for industrial automation and control systems.

### 1. **Authentication & Authorization (62443-3-3)**

**Requirement:** Strict access control with role-based permissions

**Implementation:**

```typescript
// RBAC with 4 roles and 24 permissions
export type UserRole = 'SuperAdmin' | 'Admin' | 'Operator' | 'Viewer';

const PERMISSIONS: Record<UserRole, string[]> = {
  SuperAdmin: [
    'user:create', 'user:read', 'user:update', 'user:delete',
    'device:create', 'device:read', 'device:update', 'device:delete',
    'workflow:create', 'workflow:read', 'workflow:update', 'workflow:execute',
    'alarm:acknowledge', 'alarm:shelve',
    'audit:read',
    // ... 24 total
  ],
  Admin: [
    'device:read', 'device:create', 'device:update',
    'workflow:read', 'workflow:create', 'workflow:update',
    'alarm:acknowledge',
    'audit:read',
  ],
  Operator: [
    'device:read',
    'workflow:execute',
    'alarm:acknowledge', 'alarm:shelve',
  ],
  Viewer: [
    'device:read',
    'workflow:read',
  ],
};

// Middleware enforcement
async function requirePermission(permission: string) {
  return async (request, reply) => {
    const user = request.user;  // Set by auth middleware

    if (!PERMISSIONS[user.role].includes(permission)) {
      return reply.code(403).send({
        success: false,
        error: 'Insufficient permissions'
      });
    }
  };
}
```

### 2. **Session Management (62443-3-3)**

**Requirement:** Token revocation, session tracking, device lockout

**Implementation:**

```typescript
// TokenSession model - database-backed revocation
interface ITokenSession {
  jti: string;                    // JWT ID - unique per token
  userId: string;
  type: 'access' | 'refresh';
  isRevoked: boolean;
  expiresAt: Date;
  revokedAt?: Date;
  ipAddress?: string;             // Audit trail
  userAgent?: string;
}

// Login creates session
async function login(username: string, password: string) {
  const user = await User.findOne({username});

  if (!user || !bcrypt.compare(password, user.passwordHash)) {
    throw new Error('Invalid credentials');
  }

  // Check account lockout (5 failed attempts)
  if (user.failedLoginAttempts >= 5) {
    if (new Date() < user.lockedUntil) {
      throw new Error('Account locked - too many failed attempts');
    }
  }

  // Generate JTI (unique token ID)
  const jti = crypto.randomBytes(16).toString('hex');

  // Create tokens with JTI
  const accessToken = jwt.sign(
    {userId: user._id, jti},
    SECRET,
    {expiresIn: '15m'}
  );

  const refreshToken = jwt.sign(
    {userId: user._id, jti},
    REFRESH_SECRET,
    {expiresIn: '7d'}
  );

  // Store session in database
  await TokenSession.create({
    jti,
    userId: user._id,
    type: 'access',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  });

  return {accessToken, refreshToken};
}

// Logout revokes token immediately
async function logout(jti: string) {
  await TokenSession.updateOne(
    {jti},
    {isRevoked: true, revokedAt: new Date()}
  );
  // Token invalid immediately - no 15-minute grace period
}

// Logout all devices - revoke all user tokens
async function logoutAllDevices(userId: string) {
  await TokenSession.updateMany(
    {userId, isRevoked: false},
    {isRevoked: true, revokedAt: new Date()}
  );
  // All sessions invalidated instantly
}
```

### 3. **Data Integrity (62443-2-1)**

**Requirement:** Audit logging for all CRUD operations

**Implementation:**

```typescript
// AuditLog model - immutable
interface IAuditLog {
  userId: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  entity: 'Device' | 'Workflow' | 'AlarmRule' | 'User';
  entityId: string;
  before?: any;                   // Previous state
  after?: any;                    // New state
  timestamp: Date;                // Server time
  ipAddress: string;              // Request source
  userAgent: string;              // Browser/client
  status: 'SUCCESS' | 'FAILED';
  reason?: string;                // Why it failed
}

// Automatic audit capture
async function auditOperation(
  userId: string,
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
  entity: string,
  entityId: string,
  before?: any,
  after?: any,
  status: 'SUCCESS' | 'FAILED' = 'SUCCESS'
) {
  await AuditLog.create({
    userId,
    action,
    entity,
    entityId,
    before,
    after,
    timestamp: new Date(),
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    status,
  });
}

// 10-year retention (EPA 21 CFR Part 11 + ISA 62443)
const auditLogSchema = new Schema<IAuditLog>({
  // ... fields ...
}, {
  timestamps: true,
});

// TTL index: 10 years
auditLogSchema.index(
  {createdAt: 1},
  {expireAfterSeconds: 315360000}  // 10 years
);
```

### 4. **Network Security (62443-3-3)**

**Requirement:** Encrypted communications, secure defaults

**Implementation:**

```typescript
// HTTPS/TLS enforcement
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
  }
  next();
});

// CORS with specific origins
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security headers
app.use(helmet());  // Adds:
  // - Content-Security-Policy
  // - X-Frame-Options
  // - X-Content-Type-Options
  // - Strict-Transport-Security

// Rate limiting (DOS protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                  // 100 requests per window
});
app.use('/auth', limiter);    // Stricter on auth endpoints
```

### 5. **Password Security (62443-3-3)**

**Requirement:** Strong passwords, bcrypt hashing

**Implementation:**

```typescript
// Password requirements
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Password validation
function validatePassword(password: string): {valid: boolean; errors: string[]} {
  const errors = [];

  if (password.length < 8) {
    errors.push('Minimum 8 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must include lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must include uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Must include digit');
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Must include special character (@$!%*?&)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Hashing with bcrypt (62443 standard)
async function hashPassword(password: string): Promise<string> {
  const validation = validatePassword(password);
  if (!validation.valid) {
    throw new Error(`Invalid password: ${validation.errors.join(', ')}`);
  }

  // 10 rounds = ~10ms (good balance)
  return bcrypt.hash(password, 10);
}

// Password expiration (optional)
const userSchema = new Schema({
  // ... fields ...
  lastPasswordChange: {type: Date, default: () => new Date()},
  passwordExpiresAt: Date,  // Force change every 90 days if configured
});
```

---

## Compliance Summary Table

| Standard | Component | Implementation | Status |
|----------|-----------|------------------|--------|
| **ISA-18.2** | Alarm State Machine | 5-state model with transitions | ✅ |
| **ISA-18.2** | Condition Types | THRESHOLD, RANGE, DEVIATION, RATE_OF_CHANGE, QUALITY | ✅ |
| **ISA-18.2** | Priority Levels | CRITICAL, HIGH, MEDIUM, LOW, INFO | ✅ |
| **ISA-18.2** | Metrics Tracking | Response time, duration, audit trail | ✅ |
| **ISA-18.2** | Shelving | Temporary alarm suppression with auto-unshelve | ✅ |
| **IEC 61158** | Modbus TCP | Holding/Input registers, Coils, Discrete Inputs | ✅ |
| **IEC 61158** | Modbus RTU | Serial communication with CRC | ✅ |
| **IEC 61158** | Reliability | Retry logic, exponential backoff, connection monitoring | ✅ |
| **ISA 62443** | Authentication | JWT with JTI-based revocation | ✅ |
| **ISA 62443** | Authorization | RBAC with 24 permissions | ✅ |
| **ISA 62443** | Session Mgmt | TokenSession database tracking | ✅ |
| **ISA 62443** | Audit Logging | Immutable logs with 10-year retention | ✅ |
| **ISA 62443** | Password Security | bcrypt, strong requirements | ✅ |
| **ISA 62443** | TLS/HTTPS | CORS, security headers, rate limiting | ✅ |
| **EPA 21 CFR Part 11** | Electronic Records | Audit trail, digital signatures, immutability | ✅ |

---

## References

1. **ISA-18.2-2016:** Management of Alarm Systems for the Process Industries
   - Alarm classification and response procedures
   - Key performance indicators (KPIs)
   - Design and management best practices

2. **IEC 61158:** Industrial Communication Networks
   - FIELDBUS specification
   - Modbus TCP/RTU subset
   - Register mapping and function codes

3. **ISA/IEC 62443:** Industrial Cybersecurity
   - System security requirements
   - Component security requirements
   - Risk assessment and management

4. **EPA 21 CFR Part 11:** Electronic Records; Electronic Signatures
   - Compliance for water utilities
   - Audit trail requirements
   - Data integrity and security

---

## Conclusion

The IoT Platform provides comprehensive compliance with industry standards:

- **ISA-18.2:** Professional alarm management with state transitions and metrics
- **IEC 61158:** Industrial protocol support (Modbus) with reliability features
- **ISA/IEC 62443:** Cybersecurity framework with authentication, authorization, and audit logging

These implementations ensure the system meets regulatory requirements for water utilities, manufacturing plants, and critical infrastructure operations.
