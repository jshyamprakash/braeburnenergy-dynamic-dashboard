# Architecture Gaps Analysis: Losant vs Current Implementation

**Date:** February 17, 2026
**Version:** 2.0 (Comprehensive Deep Dive)
**Purpose:** Identify capability gaps between Losant Enterprise IoT Platform and current IoT Platform implementation
**Scope:** Feature parity analysis across 5 architectural pillars + production stack layers

---

## Executive Summary

**Losant Five-Pillar Architecture:**
```
    Devices & Data Sources
            ↓
        Edge Compute
            ↓
    Visual Workflow Engine
            ↓
    Data Visualization
            ↓
    End-User Experiences
```

**Current Implementation Maturity:**

| Pillar | Coverage | Status | Gap Level | Priority |
|--------|----------|--------|-----------|----------|
| **1. Devices & Data Sources** | 70% | Partially Implemented | Medium | High |
| **2. Edge Compute** | 40% | Partial (Modbus only) | High | High |
| **3. Visual Workflow Engine** | 75% | Well Implemented | Low | Low |
| **4. Data Visualization** | 65% | Partially Implemented | Medium | Medium |
| **5. End-User Experiences** | 20% | Minimal | High | Critical |
| **CPF & Production Template** | 10% | Missing | High | Critical |

**Overall Coverage: 42%** of Losant feature set (revised further after briefing document analysis)

**Production Stack Layers:**
```
Current:           Expected (Losant):
─────────────────  ─────────────────
Experiences (20%)  Experiences & CPF (95%)
  ↓                   ↓
Logic (75%)        Logic & Data (90%)
  ↓                   ↓
Connectivity (70%) Connectivity & Edge (85%)
```

---

## ANALYSIS: Losant Briefing Document vs Current Architecture

**Source:** docs/Briefing_Document.md (Sections 1-6, 149 lines)
**Analysis Date:** February 17, 2026
**Methodology:** Feature-by-feature comparison with implementation effort assessment

### Key Insights from Briefing

The briefing document reveals that **Losant's competitive advantage is a complete ecosystem**, not individual features:

1. **CPF (Connected Product Foundation)** - Production-ready multi-tenant template
   - 3-level hierarchy: Customer → Site → Device (not just Organization → Device)
   - No-code white-labeling: Logos, colors, navigation customization in UI
   - Pre-built user management with invitations and password reset workflows
   - Built-in RBAC with hierarchy-aware role scoping

2. **Execution Flexibility** - Four execution scopes (not just cloud)
   - Application (cloud) - What we have
   - Experience (cloud + web UI) - Custom web app backend
   - Edge (gateway - Linux/Docker) - Local protocol support
   - Embedded (microcontroller) - OTA with constraints (no parallel, 16-level max depth, no Handlebars)

3. **Advanced Visualization** - 25+ blocks including SCADA
   - Custom HTML with AI code generation (Chart.js, Google Charts, D3.js, Plotly)
   - Image Overlay for SCADA displays (indicators, bars, labels, arrows)
   - Geospatial mapping
   - 50+ pre-built visualization blocks

4. **Enterprise Data** - Beyond device state
   - Data Tables: 50 columns, SQL-like queries, 3 types (String, Number, Boolean)
   - Resource Jobs: Parallel batch processing (up to 10 concurrent) with Job Acknowledge Node
   - Jupyter Integration: Query Time concept for relative historical analysis
   - Application Files: Firmware storage for OTA updates

5. **Production-Ready** - Compliance and security
   - Audit logging with 10-year retention
   - Token session tracking with JTI validation
   - Device recipes for bulk provisioning
   - Floating peripherals for multi-gateway flexibility

### Major Gaps Identified

| Capability | Losant | Current | Gap | Severity |
|-----------|--------|---------|-----|----------|
| **CPF Pre-built Template** | ✅ Production-ready | ❌ Build from scratch | Missing foundation | CRITICAL |
| **Customer → Site → Device Hierarchy** | ✅ 3-level model | 🔄 Organization only | Incomplete hierarchy | CRITICAL |
| **White-Labeling (No-Code)** | ✅ Admin UI for logos/colors/nav | ❌ Manual CSS editing | Missing UI | HIGH |
| **Viewer/Editor/Admin Roles** | ✅ 3 distinct roles | 🔄 4 roles (SuperAdmin/Admin/Op/Viewer) | Slightly different | Low |
| **User Management (Invites/Resets)** | ✅ Built-in workflows | ❌ Manual implementation | Missing workflows | HIGH |
| **Floating Peripherals** | ✅ Report via any gateway | ❌ Fixed gateway relationship | Missing flexibility | MEDIUM |
| **Custom MQTT Topics** | ✅ Configurable routing | ✅ Configurable routing | Matched | — |
| **Workflow Execution Scopes** | ✅ 4 types (App/Exp/Edge/Embedded) | 🔄 Cloud only | 3 missing | HIGH |
| **Embedded Workflow Constraints** | ✅ Documented (no parallel, 16-level max) | ❌ Not applicable | N/A | N/A |
| **Resource Jobs (Batch)** | ✅ Serial/Parallel with acknowledgment | ❌ No batch framework | Missing | HIGH |
| **Data Tables (50 columns)** | ✅ SQL-like queryable | ❌ No tables | Missing | HIGH |
| **Custom HTML Block** | ✅ Sandboxed + AI code generation | ❌ Not implemented | Missing 50%+ of viz | HIGH |
| **Jupyter Notebooks** | ✅ Full integration with query time | ❌ No integration | Missing | MEDIUM |
| **Image Overlay (SCADA)** | ✅ Dynamic indicators/bars/labels | ❌ Not implemented | Missing | MEDIUM |
| **Streaming Endpoints (SSE)** | ✅ Real-time push via HTTP | ✅ WebSocket (better) | Alternative tech, OK | — |

**Analysis:**
- **Matched/OK:** 3 capabilities
- **Partial:** 4 capabilities (can be enhanced)
- **Missing:** 9 capabilities (must be built)
- **True Gaps:** 9 out of 16 = **56% feature gap**

---

## 0. Production Stack Architecture (CRITICAL GAP)

### Losant Model: Three-Layer Production Stack

```
┌─────────────────────────────────────┐
│   Experience & CPF Layer             │ ← Branding, User Management, White-Label
│   (Start Fast, White-Label Ready)    │
├─────────────────────────────────────┤
│   Logic & Data Layer                 │ ← Workflows, Notebooks, Jobs, Data Tables
│   (Workflows, Notebooks, Jobs)       │
├─────────────────────────────────────┤
│   Connectivity & Edge Layer          │ ← Gateways, Agents, MQTT, Protocols
│   (Gateways, Agents, MQTT)           │
└─────────────────────────────────────┘
```

**Losant Philosophy:** "Losant provides the blocks; you provide the architecture."

### Current Implementation: Fragmented

```
┌─────────────────────────────────────┐
│   Web Frontend (Next.js)             │ ← Separate from backend
│   (Dashboard Builder, UI)            │
├─────────────────────────────────────┤
│   Backend Services (Fastify)         │ ← Workflows, API, Auth
│   (Workflows, Devices, Auth)         │
├─────────────────────────────────────┤
│   Data Layer (MongoDB)               │ ← Storage only
│   (Time Series, Records)             │
└─────────────────────────────────────┘
```

**Current Philosophy:** "Separate frontend and backend; manage integration yourself."

### Gap Analysis: Production Stack

| Aspect | Losant | Current | Gap | Impact |
|--------|--------|---------|-----|--------|
| **Unified Template (CPF)** | ✅ Production-ready | ❌ Manual assembly | Missing | 3-4 weeks to production |
| **Multi-Tenancy** | ✅ Native (Customers→Sites→Devices) | 🔄 Basic (Orgs only) | Partial | Cannot scale to customers |
| **White-Labeling** | ✅ No-code UI customization | ❌ Code-based CSS | Missing | Manual for each customer |
| **User Management** | ✅ Invitations, Password Reset, RBAC | ✅ JWT + RBAC | Matched | — |
| **Device Recipes** | ✅ Template-based provisioning | ❌ Manual creation | Missing | Manual device setup at scale |
| **Role Hierarchy** | ✅ 3 roles (Viewer/Editor/Admin) | 🔄 4 roles (SuperAdmin/Admin/Operator/Viewer) | Different structure | Minor divergence |

**User Role Comparison:**

| Feature | Losant | Current | Notes |
|---------|--------|---------|-------|
| **Roles Count** | 3 | 4 | We have extra SuperAdmin |
| **Read-Only** | Viewer | Viewer | ✅ Equivalent |
| **Edit Config** | Editor | Operator | ✅ Equivalent (different naming) |
| **Full Management** | Admin | Admin | ✅ Equivalent |
| **Platform Management** | N/A | SuperAdmin | ❌ Extra role not in Losant |
| **Hierarchy-Aware** | ✅ Per Customer/Site | 🔄 Global | Different scoping |

**Analysis:** Our 4-role model is a superset of Losant's 3-role model. We have an extra SuperAdmin role for platform-level operations (Losant only has System Admin as special). The naming differs (Operator vs Editor) but permissions are equivalent. No action required - models are compatible.

### Critical Gap: Connected Product Foundation (CPF)

**What is CPF?**

Losant's CPF is a **production-ready application template** that includes:

1. **Three-Level Tenant Hierarchy**: Customer → Site → Device
   - **System Admins** create Customers (e.g., "City of Austin Water Department")
   - **Customer Admins** create Sites (e.g., "Downtown Treatment Plant", "North Station")
   - **Site Managers** create Devices (e.g., "Pump 1", "Tank A")
   - Delegated management: Each level manages only their sub-resources

2. **White-Label Branding Engine** (No Code Required):
   - **Logo Customization:**
     - Large logo: Login page branding (typically 200x80px)
     - Small logo: Navigation bar (typically 32x32px, favicon)
     - Favicon: Browser tab icon
   - **Color Customization:**
     - Primary color: Brand accent color (buttons, links)
     - Secondary color: Secondary UI elements
     - Success color: Positive states (green alternative)
     - Danger color: Error/warning states (red alternative)
     - Text color: Foreground text
     - Background color: Page background
   - **Navigation Control:**
     - System Admin: Show/hide menu items per tenant level
     - Per role: Different nav based on user role (Viewer/Editor/Admin)
     - Per feature: Show/hide features based on subscription tier

3. **User Management System:**
   - Invitation workflow (invite users via email)
   - Password reset (self-service or admin-triggered)
   - RBAC: Viewer (read), Editor (modify), Admin (full management)
   - Session tracking with IP/user agent

4. **Device Recipe System:**
   - Create templates once (attributes, tags, initial state)
   - Bulk creation (spawn 100 devices from recipe)
   - Versioning (multiple recipe versions)

5. **Pre-built Workflows:**
   - User registration workflow
   - Device onboarding workflow
   - Alert escalation workflow
   - Report generation workflow

**CPF Data Model:**

```typescript
// Tier 1: System (only System Admin)
System {
  customers: Customer[]
}

// Tier 2: Customer (created by System Admin)
Customer {
  id: string,
  name: 'City of Austin Water Department',
  branding: {
    logoLarge: 'url',
    logoSmall: 'url',
    favicon: 'url',
    primaryColor: '#FF6B6B',
    secondaryColor: '#4ECDC4',
    successColor: '#95E1D3',
    dangerColor: '#F38181',
  },
  sites: Site[]
}

// Tier 3: Site (created by Customer Admin)
Site {
  id: string,
  name: 'Downtown Treatment Plant',
  location: {lat, lng},  // Geospatial
  devices: Device[]
}

// Tier 4: Device (created by Site Manager)
Device {
  id: string,
  name: 'Pump 1',
  type: 'pump_motor',
  state: DeviceState[]
}

// Per-tier User Access
User {
  email: 'john@city.gov',
  role: 'Admin',
  scope: 'site',     // Admin of which level?
  scope_id: Site.id  // Admin of specific Site
}
```

**Role Hierarchy (Different from Generic RBAC):**

- **System Admin**: Create customers, manage platform
- **Customer Admin**: Create sites, manage users within customer
- **Site Editor**: Modify device config, manage operators
- **Site Viewer**: View-only access to devices
- **Device Operator**: Interact with specific device (send commands, view status)

**Current State:**
- ❌ No CPF equivalent
- ❌ No white-labeling engine
- ❌ Only single Organization level (not 3-tier)
- ❌ Manual tenant isolation
- ❌ No registration workflows
- ❌ No invitation/password reset workflows

**Business Impact:**
- **Time to Market:** +3-4 weeks per new customer (manual setup)
- **Customization Cost:** Each customer needs UI/branding customization ($2-5K)
- **Scalability:** Cannot efficiently manage multi-tenant deployments
- **Enterprise Sales:** CPF is pre-requirement for enterprise deals
- **Friction:** Customers see "generic" platform, not white-labeled solution

**Effort to Implement:**
- White-Label Engine (logo, color, nav): 2 weeks
- Multi-Tenant Hierarchy (Cust→Site→Device): 3 weeks
- User Management & Workflows: 2 weeks
- Delegation & RBAC: 1 week
- **Total: 8-10 weeks** (critical path for enterprise)

**Recommendation:**
- **Phase 1 (Week 1-2):** White-labeling UI (logos, colors, navigation)
- **Phase 2 (Week 3-5):** Implement 3-level hierarchy (Customer→Site→Device)
- **Phase 3 (Week 6-7):** User management workflows
- **Phase 4 (Week 8):** Polish and testing
- **Deliverable:** Enterprise-ready CPF template

---

## 1. Device Management and Connectivity

### Losant Capability Matrix

| Feature | Losant | Current | Gap | Priority |
|---------|--------|---------|-----|----------|
| **Device Classes** | 6 types (Standalone, Gateway, Peripheral, Edge, Embedded, System) | 2 types (Direct, Gateway) | Missing 4 types | High |
| **Device State** | Time-series snapshots via MQTT/REST | Time-series via MQTT/REST | ✅ Matched | — |
| **Device Recipes** | Template-based rapid creation | Manual creation | Missing | Medium |
| **Device Attributes** | Dynamic key-value pairs | Basic attributes | Partial | Medium |
| **Device Tags** | Multi-tag categorization | Tag support | ✅ Matched | — |
| **Connectivity Methods** | MQTT, REST, HTTP | MQTT, REST, HTTP | ✅ Matched | — |
| **Device Provisioning** | Automated provisioning API | Manual via API | Partial | High |
| **Firmware Updates (OTA)** | File storage + update workflow | Not implemented | Missing | Medium |
| **Device Health Monitoring** | Connection status, heartbeat | Connection tracking | Partial | Medium |

### Gap Details

#### 1.1 Missing Device Classes

**Losant Model:**
```
Standalone         → Direct cloud connection (what we have)
Gateway            → Proxy for other devices (what we have)
Peripheral         → Indirect via gateway (NOT IMPLEMENTED)
Edge Compute       → Runs local logic (NOT IMPLEMENTED)
Embedded           → Logic for microcontrollers (NOT IMPLEMENTED)
System             → Logical digital twins (NOT IMPLEMENTED)
```

**Current Implementation:**
```typescript
// Only 2 types supported
interface IDevice {
  name: string;
  type: string;  // Generic, not constrained
  deviceId: string;  // ULID
  // ... basic fields
}
```

**Impact:**
- Cannot represent complex hierarchical device topologies
- Missing support for edge computing (Modbus Gateway is separate)
- No embedded device provisioning

**Effort to Close:** ~2 weeks
- Create Device Type enum with 6 variants
- Add device hierarchy validation
- Implement peripheral relationship tracking
- Add edge compute context to workflows

---

#### 1.2 Missing Device Recipes (Templates)

**Losant Feature:**
```typescript
// Create device recipe once
POST /recipes {
  name: 'Water Tank Sensor',
  attributes: [
    {name: 'temperature', type: 'number'},
    {name: 'pressure', type: 'number'},
    {name: 'level', type: 'number'}
  ],
  tags: ['water-system', 'critical'],
  initialState: {...}
}

// Spawn 100 devices from recipe
POST /devices/from-recipe {
  recipeId: 'recipe-xyz',
  count: 100,
  namePrefix: 'Tank-'
}
// Result: Tank-001 through Tank-100 automatically created
```

**Current Limitation:**
```typescript
// Must create each device individually
for (let i = 1; i <= 100; i++) {
  await Device.create({
    name: `Tank-${i}`,
    attributes: {temperature: 0, pressure: 0, level: 0},
    tags: ['water-system', 'critical']
  });
}
```

**Impact:**
- Manual device provisioning for large deployments
- Inconsistent device configuration
- No bulk creation from templates
- Error-prone for enterprise scale

**Effort to Close:** ~1 week
- Create DeviceRecipe model
- Implement recipe CRUD endpoints
- Add bulk device creation from recipe
- Add recipe versioning

---

#### 1.3 Floating Peripherals (Not Implemented)

**Losant Approach:**

In Losant, there are three levels of device connectivity:

1. **Standalone Devices**: Direct cloud connection via MQTT/REST
2. **Peripheral Devices**: Connected indirectly through a Gateway (fixed relationship)
3. **Floating Peripherals**: Can report state through ANY gateway in the application (flexible)

```typescript
// Floating peripheral can send data through any gateway
// Losant automatically routes to correct gateway
Peripheral {
  id: 'sensor-123',
  type: 'floating_peripheral',
  // No fixed gateway - can connect through any available gateway
  allowedGateways: '*'  // Any gateway
}

// Device sends state through whatever gateway is available
// Gateway-1 receives it → routes to cloud
// Gateway-2 receives it → same device, same state
// Losant handles routing transparently
```

**Current Implementation:**
```typescript
// Current model requires fixed gateway relationship
Device {
  id: 'sensor-123',
  gatewayId: 'gateway-1',  // FIXED to one gateway
  // If gateway-1 goes down and gateway-2 is available, no alternate path
}
```

**Impact:**
- Cannot support flexible multi-gateway deployments
- Gateway failure means complete data loss for peripherals
- No redundancy for critical sensor networks
- Limits real-world fault tolerance

**Effort to Close:** ~1 week
- Add device type 'floating_peripheral'
- Modify ingestion logic to accept any gateway
- Add gateway routing layer
- Implement conflict resolution (same state from different gateways)

---

#### 1.4 Firmware OTA Updates (Not Implemented)

**Losant Approach:**
```typescript
// 1. Upload firmware file to Application Files
POST /application-files {
  name: 'firmware-v2.1.bin',
  file: binaryData
}

// 2. Create workflow that triggers update
// Workflow: "Firmware Update" triggered on schedule
// - Query devices with version < 2.1
// - Send firmware.update_requested event
// - Track update progress

// 3. Devices receive update
// - Download firmware from secure URL
// - Verify checksum
// - Reboot with new firmware
// - Report new version
```

**Current Gap:**
- No file storage for firmware binaries
- No OTA workflow templates
- Device firmware version not tracked
- No rollback mechanism

**Impact:**
- Cannot push updates to field devices
- Security patches cannot be deployed automatically
- Critical for IoT scale operations

**Effort to Close:** ~2 weeks
- Add ApplicationFile model (file storage)
- Create firmware manifest versioning
- Implement device firmware update workflow
- Add device version tracking

---

### Device Management Recommendation

**Phase 1 (Quick Wins - 1 week):**
- ✅ Add Device Recipes for bulk creation
- ✅ Improve device health monitoring dashboard

**Phase 2 (Medium Priority - 2 weeks):**
- Add Peripheral device class
- Implement OTA firmware updates

**Phase 3 (Enterprise Features - 3 weeks):**
- Full 6-class device model
- Device provisioning API
- Advanced health monitoring

---

## 1.5 Edge Compute Architecture (CRITICAL GAP)

### Losant Model: Two Types of Edge Agents

**Gateway Edge Agent (GEA)**
```
Tech Stack: Docker / Linux
Key Features:
  - Local MQTT broker
  - Built-in drivers (Modbus, BACnet, OPC-UA)
  - Workflow execution at gateway
  - Heavy industrial aggregation

Use Case: Factory with 50+ legacy devices (Modbus sensors)
  - Gateway collects via Modbus
  - Filters/aggregates locally
  - Sends summary to cloud (reduces traffic)
```

**Embedded Edge Agent (EEA)**
```
Tech Stack: WASM (WebAssembly) / C++
Key Features:
  - No OS required (runs on microcontroller)
  - Low power consumption
  - MQTT client only (manual)
  - Mass-deployed sensors

Use Case: 10,000 battery-powered Bluetooth beacons
  - Pre-loaded with edge logic
  - Send data to gateway
  - Logic updates OTA (over-the-air)
```

### Current Implementation: Partial (Modbus Gateway Only)

**What We Have:**
```typescript
ModbusGateway {
  - Modbus TCP/RTU support
  - Register mapping
  - Data conversion (scale/offset)
  - Device auto-registration
  - Retry logic
}
```

**What We're Missing:**
```
❌ Gateway Edge Agent (full Docker + MQTT broker)
❌ Embedded Edge Agent (WASM/C++ microcontroller)
❌ OTA firmware updates
❌ Edge workflow execution
❌ BACnet support
❌ OPC-UA support
```

### Execution Scope Architecture

**Losant Model: Four Execution Scopes**

Losant supports 4 workflow execution contexts based on where logic should run:

```typescript
Workflow {
  type: 'Application' | 'Experience' | 'Edge' | 'Embedded'

  // Application Scope (Cloud)
  // - Runs in Losant cloud
  // - Full platform access (all nodes, features, database)
  // - Triggers: Device State, Schedule, Webhook, Payload Flow
  // - Performance: Full computational resources

  // Experience Scope (Cloud + Web UI)
  // - Runs in Losant cloud, triggers from user interactions
  // - Specific to Experience (custom web app) workflows
  // - Triggers: Button clicks, form submissions
  // - Use: Backend logic for custom web interfaces

  // Edge Scope (Gateway Device - Linux/Docker)
  // - Runs on Gateway Edge Agent (GEA) in Docker on Raspberry Pi, etc.
  // - Can execute local logic, access local protocols (Modbus, BACnet, etc.)
  // - Limited node types (basic data, logic, local protocols)
  // - Triggers: Local device state, schedule
  // - Offline capability: Works without cloud connectivity

  // Embedded Scope (Microcontroller - Low Power)
  // - Runs on device firmware via Embedded Edge Agent (EEA)
  // - WASM/C++ compiled, updatable over-the-air (OTA)
  // - CRITICAL CONSTRAINTS:
  //   ✗ No parallel execution paths (single-threaded)
  //   ✗ Maximum payload depth: 16 levels (no nested objects)
  //   ✗ No Handlebars templating support
  //   ✓ Very low memory footprint
  //   ✓ Can run on resource-constrained microcontrollers
  // - Triggers: Local device state only
  // - Use: Edge decisions on battery-powered sensors
}
```

**Execution Scope Comparison:**

| Feature | Application | Experience | Edge | Embedded |
|---------|-------------|------------|------|----------|
| **Location** | Cloud | Cloud | Gateway | Device |
| **Platform** | Losant | Losant | Linux/Docker | Microcontroller |
| **Parallel Execution** | ✅ Yes | ✅ Yes | 🔄 Limited | ❌ No |
| **Payload Depth** | Unlimited | Unlimited | Unlimited | 16 levels max |
| **Handlebars** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **OTA Updates** | N/A | N/A | Manual | ✅ Automatic |
| **Node Types** | 50+ | 30+ | 20+ | 10+ |
| **Offline** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |

**Current Implementation: Application Scope Only**

```typescript
Workflow {
  // ✅ Cloud execution only
  // ✅ Triggers: Device State, Schedule, Webhook
  // ❌ No Experience workflows (custom web UI workflows)
  // ❌ No Edge workflows (local protocol execution)
  // ❌ No Embedded workflows (microcontroller OTA)
  // ❌ No offline capability
}
```

### Gap Matrix: Edge Compute

| Component | Losant | Current | Gap | Effort |
|-----------|--------|---------|-----|--------|
| **Modbus Gateway** | ✅ | ✅ | — | — |
| **BACnet Protocol** | ✅ | ❌ | Missing | 2 weeks |
| **OPC-UA Protocol** | ✅ | ❌ | Missing | 2 weeks |
| **Edge Workflows** | ✅ | ❌ | Missing | 3 weeks |
| **Embedded Workflows** | ✅ | ❌ | Missing | 4 weeks |
| **OTA Firmware Updates** | ✅ | ❌ | Missing | 2 weeks |
| **Workflow Execution Scopes** | ✅ (3 types) | ❌ | Missing | 2 weeks |

**Total Edge Compute Gap: 4-5 weeks** (critical for industrial deployments)

### Why This Matters

**Industrial Use Cases Require Edge:**
1. **Factory (Modbus/BACnet):** 1000s of sensors, local aggregation needed
2. **Fleet Management (GPS):** Edge filtering before cloud sync
3. **IoT at Scale (Embedded):** 100,000s of devices with constrained power

**Without Edge Compute:**
- All data goes to cloud (no filtering)
- Latency for local decisions
- Bandwidth waste
- Cannot operate offline

**Recommendation:**
- **Phase 1:** BACnet + OPC-UA drivers (2 weeks)
- **Phase 2:** Edge workflow execution (3 weeks)
- **Phase 3:** Embedded edge agent + OTA (4 weeks)

---

## 2. Visual Workflow Engine

### Losant Capability Matrix

| Feature | Losant | Current | Gap | Priority |
|---------|--------|---------|-----|----------|
| **Application Workflows** | ✅ Cloud-based | ✅ Implemented | Matched | — |
| **Experience Workflows** | Backend for web UI | Not implemented | Missing | High |
| **Edge Workflows** | Local execution on gateway | Planned (Week 4) | Partial | Medium |
| **Embedded Workflows** | Microcontroller logic | Not applicable | N/A | Low |
| **Drag-and-Drop Editor** | 50+ node types | 19 node types | Missing 31 types | Medium |
| **Function Node** | JavaScript + AI codegen | JavaScript only | Partial | Low |
| **Conditional Logic** | Native nodes | Native nodes | ✅ Matched | — |
| **Data Nodes** | Table/Device/API queries | Device state queries | Partial | Medium |
| **Output Nodes** | SMS/Email/Webhook/Dashboard | SMS/Email/Webhook/Event | Partial | Medium |
| **Triggers** | Device state, schedule, webhook | Device state, schedule, webhook | ✅ Matched | — |
| **Workflow Versioning** | Multi-version support | Single version | Missing | Low |
| **A/B Testing** | Built-in workflow variants | Not supported | Missing | Low |

### Gap Details

#### 2.1 Experience Workflows (Missing)

**Losant Model:**
```typescript
// Workflows can be "Experience" type
// - Executes when user hits web endpoint
// - Powers custom web interfaces
// - No need for separate API server

Example: Blog Post Listing
POST /experiences/endpoints/blog-list {
  // Request: user filters
  // Workflow processes:
  // 1. Query data table (blog_posts)
  // 2. Apply filters/sorting
  // 3. Format for frontend
  // Response: JSON or rendered HTML
}
```

**Current Gap:**
- Workflows are execution-only (cloud logic)
- Cannot be directly exposed as HTTP endpoints
- Web UI logic handled by separate Next.js frontend

**Impact:**
- Requires separate frontend code
- Cannot build simple web apps within platform
- Increases deployment complexity

**Effort to Close:** ~3 weeks
- Create ExperienceWorkflow model
- Add HTTP endpoint creation/routing
- Implement endpoint parameter parsing
- Add response formatting nodes

---

#### 2.2 Missing Node Types (31 out of 50)

**Losant Node Types:** (Examples)
```
Triggers:
  - Device Connect/Disconnect
  - Resource Job Events
  - Recurring Schedule
  - Webhook
  - Manual Trigger

Logic:
  - Conditional (if/else)         ✅ We have
  - Switch/Case
  - Loop (for each)               ✅ We have
  - Try/Catch                     ✅ We have
  - Delay/Sleep
  - Throttle/Rate Limit

Data:
  - Device State Query            ✅ We have
  - Data Table Query
  - API Query
  - Object Manipulation
  - Array Manipulation
  - JSON Parser

Output:
  - SendEmail                     ✅ We have
  - SendSMS                       ✅ We have
  - WebhookPost                   ✅ We have
  - Device Command                ✅ We have
  - Dashboard Event               ~ Partial
  - Resource Job Trigger
  - Slack Message
  - Twilio
  - Salesforce Update
  - AWS Lambda
  - Google Cloud Function
```

**Current Implementation:** 19 nodes only
- Triggers: 5
- Conditions: 5
- Actions: 6
- Transforms: 4

**Priority Nodes Missing:**
1. **DataTable Query** (High) - Essential for lookup tables
2. **API Query** (High) - Call external services
3. **Array/Object Manipulation** (High) - Data transformation
4. **Rate Limiting** (Medium) - Prevent API abuse
5. **Slack/Teams** (Medium) - Operator notifications
6. **AWS Lambda** (Medium) - Serverless integration
7. **Resource Job Trigger** (Low) - Batch operations

**Effort to Close:**
- DataTable Query: 3 days
- API Query: 3 days
- Array Manipulation: 2 days
- Rate Limiter: 2 days
- Slack Integration: 2 days
- AWS Lambda: 3 days
- **Total: 2-3 weeks**

#### 2.3 Workflow Versioning (Missing)

**Losant Feature:**
```
Workflow versions allow:
- A/B testing different logic
- Gradual rollout to devices
- Instant rollback
- Development/staging/production versions
```

**Current State:**
- Single active version only
- No rollback history
- No version branching

**Effort:** ~1 week

---

### Workflow Engine Recommendation

**Current Status:** 75% feature complete ✅

**Quick Wins (1 week):**
- ✅ Add DataTable Query node
- ✅ Add API Query node

**Phase 1 (2 weeks):**
- Array/Object manipulation nodes
- Workflow versioning
- Rate limiter node

**Phase 2 (3 weeks):**
- Experience Workflows with HTTP endpoints
- External service integrations (Slack, AWS Lambda)

---

## 3. Data Visualization (Dashboards)

### Losant Capability Matrix

| Feature | Losant | Current | Gap | Priority |
|---------|--------|---------|-----|----------|
| **Visualization Blocks** | 25+ types | 3 types (Gauge, Chart, Stream) | Missing 22+ | Medium |
| **Custom HTML Block** | Full HTML/CSS/JS | Not implemented | Missing | Medium |
| **Real-time Updates** | WebSocket | WebSocket ✅ | Matched | — |
| **Historical Data** | Time-range queries | Time-range queries ✅ | Matched | — |
| **Reporting (PDF)** | Email reports | Not implemented | Missing | Low |
| **Dashboard Sharing** | Public/private links | Basic sharing | Partial | Low |
| **Embedded Dashboards** | Embed in other apps | Not supported | Missing | Low |
| **Data Export** | CSV/JSON | CSV ✅ | Partial | Low |
| **Geolocation Maps** | GPS history, heatmaps | Not implemented | Missing | Medium |

### Gap Details

#### 3.1 Missing Visualization Blocks

**Current Blocks (3):**
1. Gauge Block (circular gauge)
2. Time Series Chart (line/area/bar)
3. Live Stream Block (scrolling data)

**Losant Available Blocks (25+):**
```
Data Display:
  ✅ Gauge Block
  ✅ Time Series Graph
  ✅ Live Stream Block
  ❌ Table Block (sortable, paginated)
  ❌ Number Block (large display)
  ❌ State Block (current value)
  ❌ Bar Chart (comparison)
  ❌ Pie/Donut Chart (composition)
  ❌ Heatmap (pattern analysis)

Geospatial:
  ❌ Map Block (device locations)
  ❌ GPS History (track movement)
  ❌ Geofence Visualization

Control:
  ❌ Button Block (trigger workflows)
  ❌ Toggle Block (boolean control)
  ❌ Text Input (send commands)
  ❌ Dropdown Select (parameter selection)

Special:
  ❌ Image Display (SCADA overlays)
  ❌ Custom HTML (D3.js, Plotly, Chart.js with AI code generation)
  ❌ Histogram
  ❌ Waterfall Chart
  ❌ Scatter Plot
```

**Custom HTML Block Deep Dive:**

The Custom HTML block is Losant's most powerful visualization feature:

```typescript
// AI-Powered Code Generation
{
  type: 'custom_html',
  aiPrompt: 'Create an animated heatmap showing temperature distribution across 10 zones',
  // Losant AI generates HTML/CSS/JS using Chart.js or Google Charts
}

// Manual custom code (full control)
{
  type: 'custom_html',
  html: `<canvas id="chart"></canvas>`,
  js: `
    // Access data from dashboard context
    const deviceData = payload.deviceId;
    // Any JavaScript library supported
    new Chart(document.getElementById('chart'), {
      type: 'line',
      data: deviceData,
      options: {...}
    });
  `,
  css: `/* Custom styling */`
}

// Block Communication (Custom Events)
{
  type: 'custom_html',
  scripts: [
    // Emit custom event to other blocks
    'const event = new CustomEvent("deviceSelected", {detail: {id: deviceId}});',
    'window.dispatchEvent(event);'
  ],
  // Subscribe to events from other blocks
  eventHandlers: {
    'deviceSelected': (data) => { /* update visualization */ }
  }
}

// Supported Libraries:
// - Chart.js (most common)
// - Google Charts
// - D3.js (full control)
// - Plotly.js
// - Highcharts
// - And any JavaScript library
```

**Sandboxing & Security:**
- Custom HTML runs in sandboxed iframe
- No access to parent dashboard state (security)
- Data passed explicitly via postMessage API
- No DOM access outside sandbox

**Current Gap:**
- No custom HTML visualization support
- No AI-powered code generation
- Stuck with pre-built blocks
- Cannot build domain-specific visualizations

**Impact:**
- Missing 50%+ of visualization capability
- Cannot build SCADA/custom displays
- Limits customization for specific industries
- Constrains data presentation options

**Impact:**
- Limited dashboard visualization options
- Cannot build SCADA-style displays (image overlays)
- No geospatial analytics (critical for logistics)
- Cannot embed interactive controls

**Effort Estimates:**
- Table Block: 2 days
- Number/State Blocks: 1 day each
- Bar/Pie/Scatter Charts: 2 days each
- Map Block: 3 days (requires mapping library)
- Custom HTML: 2 days
- **Total: 2-3 weeks** for priority blocks

---

#### 3.2 PDF Email Reporting (Missing)

**Losant Feature:**
```typescript
// Dashboard can be scheduled/sent as PDF report
Dashboard.createReport({
  dashboardId: 'dashboard-123',
  schedule: 'daily',          // or 'weekly', 'monthly'
  recipients: ['ops@company.com'],
  timeRange: 'last-24h'
})
// Result: PDF with rendered dashboard sent daily
```

**Current Gap:**
- No reporting engine
- Dashboards must be viewed in browser
- No automated report distribution

**Use Cases:**
- Daily compliance reports (EPA requirements)
- Weekly performance summaries
- Monthly KPI reviews
- Audit trail documentation (21 CFR Part 11)

**Effort:** ~1 week

---

#### 3.3 Dashboard Context Variables & Templates

**Losant Feature:**
```
Context Variables enable ONE dashboard to serve MANY devices.

Pattern:
  Dashboard: "Pump Dashboard {{ ctx.deviceId }}"

  User clicks "Pump A" → Context set to "pump-001"
  Dashboard loads data for pump-001

  User clicks "Pump B" → Context set to "pump-002"
  Same dashboard, different data

Benefits:
  - 1000 pumps → 1 dashboard template
  - Device Recipes auto-link devices to dashboards
  - No-code dashboard templating
```

**Current Status:**
- ❌ No context variables
- ❌ Each device needs separate dashboard
- ❌ No dashboard templating

**Impact:**
- At scale: 10,000 devices = 10,000 dashboards (unmanageable)
- Maintenance: Update 1 dashboard vs. update 10,000
- UX: Operators need single "view for any device" interface

**Effort:** 1-2 weeks

---

#### 3.4 SCADA Visualization: Image Overlays (Critical for Industrial IoT)

**Losant Feature: Image Overlay Block**

The Image Overlay block allows placing **dynamic indicators, bars, and labels** over a background image to create SCADA-style displays.

Supported overlay elements:
1. **Indicators** - Colored circles/rectangles showing device state (ON/OFF, ALERT, OK)
2. **Bars** - Vertical/horizontal bars showing numeric ranges (tank fill %, production rate)
3. **Labels** - Real-time text values (temperature: 45.2°C, pressure: 3.5 bar)
4. **Gauges** - Mini gauge displays overlaid on physical layout
5. **Arrows** - Flow direction or state transitions with rotation

```typescript
// SCADA Display Example: Water Treatment Plant
{
  type: 'image_overlay',
  backgroundImage: 'treatment_plant_diagram.png',
  overlays: [
    // Pump status indicator
    {
      type: 'indicator',
      x: 100, y: 150,  // Position on image
      device: 'pump-1',
      attribute: 'status',
      colors: {ON: '#00FF00', OFF: '#FF0000', STANDBY: '#FFFF00'}
    },
    // Tank fill level bar
    {
      type: 'bar',
      x: 200, y: 200,
      width: 50, height: 150,
      device: 'tank-1',
      attribute: 'level',
      min: 0, max: 100,
      color: '#3498DB'
    },
    // Temperature label
    {
      type: 'label',
      x: 250, y: 300,
      device: 'sensor-temp',
      attribute: 'temperature',
      format: '{{value}}°C',
      fontSize: 24
    },
    // Valve position arrow (rotates 0-360°)
    {
      type: 'arrow',
      fromX: 150, fromY: 200,
      toX: 250, toY: 200,
      device: 'valve-1',
      attribute: 'position',
      rotationRange: [0, 360]
    }
  ]
}

// Use Cases:
// - Water treatment: Tank levels, pump status, valve positions on plant diagram
// - Manufacturing: Machine status, production rate, alert zones on floor plan
// - Smart buildings: Occupancy, temperature by zone, HVAC status on floor plan
// - Oil/Gas: Pipeline pressures, tank fill levels, valve states
// - Healthcare: Bed status, equipment availability, patient flow on facility map
```

**Advanced Features:**
- Real-time updates as device data arrives
- Conditional styling: colors change when thresholds exceeded
- Multiple backgrounds: switch between floor plans or zones
- Responsive scaling: overlays adjust with image resize

**Current Gap:**
- ❌ No image overlay support
- ❌ No physical space mapping
- ❌ No dynamic indicators/bars/labels
- ❌ Cannot visualize spatial device relationships

**Impact:**
- SCADA systems require visual plant layout for operator efficiency
- Critical for water treatment plants (pump status, tank levels, valve states)
- Essential for manufacturing floor visualization and real-time monitoring
- Missing limits adoption in industrial IoT scenarios

**Effort:** 2-3 weeks
- Image canvas with layer support
- Dynamic element rendering (indicators, bars, labels, arrows, gauges)
- Device data binding to overlay elements
- Rotation/scaling/positioning transforms
- Asset management for background images

---

#### 3.5 Geospatial Visualization (Missing)

**Losant Feature:**
```typescript
// Track device locations in real-time
DashboardBlock {
  type: 'map',
  dataSource: 'gps-devices',

  // Show device trails
  showHistory: true,
  trailDuration: '24h',

  // Geofence alerts
  geofences: [
    {name: 'Facility', lat: 40.7128, lng: -74.0060, radius: 500}
  ]
}
```

**Current Gap:**
- No map visualization
- No geofencing logic
- No GPS trail tracking

**Impact:**
- Cannot track delivery trucks/service technicians
- No geofence-based alarms
- Missing critical for fleet management

**Effort:** ~2 weeks (requires mapping library integration)

---

### Data Visualization Recommendation

**Phase 1 (High Priority - 1 week):**
- ✅ Table Block (sortable, paginated)
- ✅ Number Block
- ✅ Basic Bar Chart

**Phase 2 (Medium Priority - 2 weeks):**
- Custom HTML Block
- PDF Email Reporting
- Map Block (geospatial)

**Phase 3 (Nice-to-Have - 2 weeks):**
- Advanced charts (Waterfall, Scatter)
- Embedded dashboards

---

## 4. End-User Experiences

### Losant Capability Matrix

| Feature | Losant | Current | Gap | Priority |
|---------|--------|---------|-----|----------|
| **Experience Endpoints** | Custom HTTP routes | ProtectedRoute wrapper only | Partial | High |
| **Experience Views** | Handlebars templates | React components | Different | Medium |
| **Dashboard Pages** | Branded dashboards | Dashboard builder | ✅ Similar | — |
| **Experience Users** | Federated auth | Native JWT | Partial | Medium |
| **Experience Groups** | Role-based access | RBAC implemented | ✅ Similar | — |
| **SSE Streaming** | Server-Sent Events | WebSocket | Different | Low |
| **White-Labeling** | Custom domains/branding | Not implemented | Missing | Medium |
| **API Generation** | Auto-generated from logic | Manual API layer | Partial | High |

### Gap Details

#### 4.1 Experience Endpoints (Minimal)

**Losant Model:**
```typescript
// Define custom HTTP endpoints within platform
Endpoint {
  path: '/api/water-quality/{deviceId}',
  method: 'GET',
  workflow: 'fetch-water-data',

  // Workflow handles:
  // 1. Validate input
  // 2. Query device states
  // 3. Format response
}

// Exposes HTTP endpoint automatically
// GET /api/water-quality/tank-001
// → Triggers workflow → Returns JSON
```

**Current Limitation:**
- Endpoints must be coded in Next.js + Fastify
- No platform-native endpoint definition
- Workflow cannot directly expose endpoints

**Impact:**
- Requires backend developer involvement
- Cannot build simple APIs without coding
- Missing no-code/low-code capability

**Effort:** ~2 weeks

---

#### 4.2 Experience Users & Authentication (Partial)

**Losant Model:**
```typescript
// Separate user model for web app users
ExperienceUser {
  email: string,
  password: string,  // hashed
  firstName: string,
  lastName: string,
  groups: ['operators', 'supervisors'],  // Role-based
  customData: {
    department: 'Operations',
    location: 'Plant A'
  }
}

// Features:
// - SSO/OAuth (Google, Azure AD)
// - Email verification
// - Password reset workflow
// - Multi-factor authentication
```

**Current Implementation:**
- Platform users only (admin/operator/viewer roles)
- No web app user management
- No SSO support
- No custom user data fields

**Impact:**
- Cannot build multi-tenant web applications
- Missing customer-facing functionality
- No federated authentication

**Effort:** ~3 weeks

---

#### 4.3 Server-Sent Events (Optional Gap)

**Losant:**
```typescript
// SSE endpoint for real-time updates
Endpoint.stream({
  path: '/stream/device-updates',
  // Server sends data like:
  // data: {temperature: 25.5, timestamp: 1708179200}
  // data: {temperature: 25.6, timestamp: 1708179210}
})
```

**Current:**
- Uses WebSocket instead (more capable, bi-directional)

**Analysis:**
- WebSocket > SSE (we made the right choice)
- Not a real gap

---

### End-User Experiences Recommendation

**Current Status:** 25% feature complete ⚠️

**Phase 1 (Critical - 3 weeks):**
- Experience Endpoints (HTTP routing)
- Experience Users (multi-tenant users)

**Phase 2 (Important - 2 weeks):**
- SSO/OAuth integration
- White-labeling support

---

## 5. Advanced Features & Specialized Capabilities

### 5.1 Resource Jobs (Batch Processing)

**Losant Feature:**
```
Resource Jobs enable batch operations on large datasets.

Types of Jobs:
- Query-based (find all devices matching criteria)
- Iteration-based (loop through results)
- Parallel execution (for speed)
- Serial execution (for consistency)

Execution Modes:
- Serial Mode: Block 1 → Block 2 → Block 3 (in order, accumulates state)
- Parallel Mode: Block A, Block B in parallel (for independent operations)
- Fast Execution: No state accumulation (maximum speed)

Example Job:
  Find: All pressure sensors with pressure > 100 PSI
  Action: Send alert SMS to operator
  Process: 5000 sensors, ~5 minutes, parallel execution
```

**Current Gap:**
- ❌ No batch job framework
- ❌ Must process one-by-one via API
- ❌ Cannot bulk update devices
- ❌ No job scheduling

**Impact:**
- Operational: Cannot push calibration updates to 1000s of devices
- Compliance: Manual recalibration is error-prone
- Scale: Batch operations are essential for enterprise

**Effort:** 2-3 weeks

---

### 5.2 Custom MQTT Topics (Advanced Data Routing)

**Losant Feature: Trigger Workflows on Any MQTT Topic**

Devices can publish to custom MQTT topics to trigger workflows for data pre-processing or transformation before state is officially recorded.

```typescript
// Standard device state path
losant/{deviceId}/state → Automatic Device State recording
  "deviceId": "device-1",
  "temperature": 45.2,
  "pressure": 3.5

// Custom MQTT topic paths (configured in dashboard)
Workflow Trigger {
  topic: 'custom/raw_sensor_stream/{deviceId}',
  // Payload: Raw binary or custom format
  // Action: Trigger workflow for preprocessing
}

// Example: Water quality meter publishes compressed data
Topic:    'water/sensor-123/raw'
Payload:  0x4F 0x1A 0x2B ... (binary compressed)

Workflow: "Parse Water Quality Data"
  1. Decompress binary → JSON
  2. Validate against calibration table
  3. Calculate derived metrics (hardness, pH levels)
  4. Convert to standard device state format
  5. Record in device state collection
```

**Benefits:**
- **Data Pre-Processing**: Custom logic before state recording
- **Non-Standard Formats**: Support proprietary data formats
- **Transformation**: Convert compressed/binary to standard JSON
- **Validation**: Enforce data quality before acceptance
- **Multi-Device Aggregation**: Combine multiple sensor readings into single state

**Use Cases:**
- Compressed IoT payload decompression (reduce bandwidth by 80%)
- Custom protocol parsing (proprietary sensor format)
- Data quality validation (reject invalid readings before storage)
- Multi-device aggregation (combine 10 sensors into single state)
- Edge pre-processing (filter/downsample before cloud sync)

**Current Status:**
- ✅ MQTT topics configurable
- ✅ Basic topic routing
- 🔄 Limited to standard format (can extend to custom)
- ❌ No workflow trigger on arbitrary topics

**Effort to Enhance:** 1 week
- Add custom MQTT topic configuration UI
- Implement topic-to-workflow mapping
- Add payload transformation nodes

---

### 5.3 Server-Sent Events (SSE) Streaming

**Losant Feature:**
```
Workflow endpoints can return SSE streams for real-time push to browser.

Pattern:
  Workflow Endpoint Response ("SSE Stream")
         ↓ (continuous HTTP stream)
  Browser Client
         ↓ (EventSource API)
  Real-time data arrives without polling
```

**Current Status:**
- ✅ WebSocket used instead (better than SSE)
- ⚠️ Different approach, same outcome

**Analysis:**
- WebSocket > SSE (bi-directional, lower latency)
- We chose the more advanced option (no gap)

---

### 5.4 Jupyter Notebook Integration

**Losant Feature: Query Time Concept for Batch Analytics**

Losant integrates with Jupyter for historical batch analysis. The key concept is "Query Time" - an anchor point for building relative time ranges.

```typescript
// Jupyter Notebook Configuration
{
  type: 'jupyter_notebook',
  inputs: [
    // Input 1: Device Data (time-series)
    {
      type: 'device_data',
      device: 'sensor-123',
      attribute: 'temperature',
      // Query Time Concept: 2026-02-17 10:00 AM
      // Relative to Query Time, fetch:
      timeRange: {
        start: 'queryTime - 30 days',  // 30 days before query time
        end: 'queryTime',               // Up to query time (now)
        // Alternatively: 'queryTime - 1 hour' to 'queryTime'
      }
    },
    // Input 2: Metadata
    {
      type: 'metadata',
      query: 'equipment_specs WHERE type = "pump"'
    },
    // Input 3: Connection History
    {
      type: 'connection_history',
      device: 'sensor-123'
    },
    // Input 4: Data Tables (lookup data)
    {
      type: 'data_table',
      table: 'calibration_values'
    },
    // Input 5: Event Data
    {
      type: 'event_data',
      event: 'alarm_triggered',
      timeRange: {start: 'queryTime - 7 days', end: 'queryTime'}
    }
  ],

  // Notebook analysis using Python
  analysis: `
    import pandas as pd
    import numpy as np
    from sklearn.ensemble import IsolationForest

    # Load data provided by Losant
    temps = input_data['device_data']  # Time series
    specs = input_data['metadata']      # Equipment specs
    alarms = input_data['event_data']   # Event history

    # Train anomaly detection model
    model = IsolationForest()
    anomalies = model.fit_predict(temps)

    # Generate insights
    output_results = {
      'anomaly_count': sum(anomalies),
      'trend': np.polyfit(temps.index, temps.values, 1)[0],
      'prediction': forecast_next_30_days(temps)
    }
  `,

  // Outputs: Save back to platform
  outputs: [
    {
      type: 'application_file',
      name: 'anomaly_report_2026-02-17.png'  // Matplotlib visualization
    },
    {
      type: 'data_table',
      table: 'ml_predictions',
      data: 'model predictions as new rows'
    }
  ]
}

// Query Time Examples:
// - queryTime = 2026-02-17 10:00:00 AM
// - start: 'queryTime - 30 days'  → 2026-01-18 10:00:00 AM
// - start: 'queryTime - 1 hour'   → 2026-02-17 09:00:00 AM
// - start: 'queryTime - 24 hours' → 2026-02-16 10:00:00 AM
```

**Query Time Benefits:**
- **Relative Time Ranges**: Define analysis period relative to execution time (not hardcoded dates)
- **Recurring Analysis**: Same notebook can run daily, weekly, monthly with automatic date adjustments
- **Flexible Lookback**: Analyze last 30 days, 7 days, or any period without code changes
- **Scheduled Execution**: Notebooks can be triggered on schedule with queryTime automatically set

**Supported Input Types:**
1. Device State Data (time-series)
2. Metadata (equipment specs)
3. Connection History (up/down events)
4. Data Tables (lookup/reference data)
5. Event Data (alarms, warnings)

**Output Options:**
1. Application Files (save reports, charts as PNG/PDF)
2. Data Tables (write analysis results as new rows)
3. Device State (publish predictions back as device data)

**Current Gap:**
- ❌ No Jupyter integration
- ❌ No batch export pipeline
- ❌ No Query Time concept for relative ranges
- ❌ No notebook execution engine
- ❌ No scheduled notebook runs

**Impact:**
- Analytics: Customers cannot run their own analysis
- ML: Cannot train models on historical data
- Reporting: No programmatic report generation
- Predictive Maintenance: Cannot build forecasting models

**Use Cases:**
- Predict equipment failure (ML model trained on 30 days of history)
- Generate monthly anomaly reports
- Detect trending issues before they become critical
- Train forecasting models for demand prediction
- Calculate KPIs (compliance reporting)
- Anomaly detection (statistical analysis)

**Effort:** 2-3 weeks (integration, not core logic)

---

## 5. Advanced Analytics & Data Storage

### Losant Capability Matrix

| Feature | Losant | Current | Gap | Priority |
|---------|--------|---------|-----|----------|
| **Jupyter Notebooks** | Batch analytics | Not implemented | Missing | Low |
| **Resource Jobs** | Bulk operations | Not implemented | Missing | Medium |
| **Data Tables** | Relational storage | Not implemented | Missing | High |
| **Application Files** | Binary file storage | Not implemented | Missing | Medium |
| **Data Export** | CSV/JSON bulk export | CSV export ✅ | Partial | Low |
| **ETL Workflows** | Data transformation | Workflow nodes | Partial | Medium |

### Gap Details

#### 5.1 Data Tables (Missing - High Priority)

**Losant Specification:**

Data Tables are relational storage for semi-static metadata with the following constraints:
- **Maximum columns:** 50 columns per table
- **Data types:** String, Number, Boolean (only 3 supported types)
- **SQL-like queries:** Full query language for filtering/sorting/pagination
- **Use cases:** Fault codes, device configurations, operator settings, equipment specs, lookup tables

```typescript
// Create relational data tables for lookup data
DataTable {
  name: 'fault_codes',
  columns: [
    {name: 'code', type: 'string', primaryKey: true},      // Type: String
    {name: 'description', type: 'string'},                  // Type: String
    {name: 'severity', type: 'number', options: [1,2,3,4]}, // Type: Number
    {name: 'isActive', type: 'boolean'},                    // Type: Boolean
    // ... up to 50 columns total
  ],
  rows: [
    {code: 'E001', description: 'Pump failure', severity: 4, isActive: true},
    {code: 'E002', description: 'Sensor drift', severity: 2, isActive: true}
  ]
}

// Use in workflows - SQL-like query syntax
WorkflowNode {
  type: 'dataTableQuery',
  query: {
    table: 'fault_codes',
    where: {severity: {$gte: 3}},  // SQL-like filtering
    sort: {code: 1},
    limit: 10
  }
  // Returns: [{code: 'E001', ...}]
}

// Use cases:
// - Fault code lookups with severity levels
// - Device configuration tables (50 columns for complex device types)
// - Operator preference settings
// - Material properties database
// - Equipment specifications and thresholds
```

**Current Gap:**
- No multi-table data storage
- No lookup mechanisms
- All config stored in JSON documents (less efficient for queries)
- Cannot enforce data schemas or types

**Impact:**
- Cannot maintain structured lookup data efficiently
- Workflows cannot query SQL-like tables
- Missing critical enterprise feature for water utilities
- Leads to workflow logic becoming complex for data lookups

**Effort:** ~2 weeks
- Create DataTable model with column constraints (max 50)
- Enforce 3-type system (String, Number, Boolean)
- Implement table CRUD endpoints
- Create DataTable query workflow node with SQL-like syntax
- Add permission controls

---

#### 5.2 Resource Jobs - Batch Processing (Missing - Medium Priority)

**Losant Specification:**

Resource Jobs enable bulk processing across application resources with two execution modes:

1. **Serial Mode**: Process one resource at a time (slow but lower computational overhead)
2. **Parallel Mode**: Process up to 10 resources concurrently (fast but higher resource usage)

**Critical Requirement:** Each workflow iteration MUST explicitly call a "Job: Acknowledge Node" to mark completion (success or failure). Without acknowledgment, the job never completes.

```typescript
// Resource Job example: Update all devices in a site
Job {
  type: 'resource_job',
  resource: 'devices',  // Can be Devices, DataTableRows, or Users
  filter: {site: 'water-treatment-1'},
  execution: 'parallel',  // or 'serial'
  parallelCount: 10,  // Max 10 concurrent
  workflowId: 'workflow-device-update'
}

// Workflow triggered for each device (up to 10 in parallel)
Workflow {
  name: 'Update Device Calibration',
  trigger: 'resourceJob',
  steps: [
    // Step 1: Process device
    {type: 'device', action: 'updateAttributes', data: {...}},

    // Step 2: CRITICAL - Acknowledge job completion
    {
      type: 'job.acknowledge',
      outcome: 'success',  // or 'failure'
      // Workflow won't complete without this node
    }
  ]
}

// If device update fails:
Workflow {
  steps: [
    {type: 'device', action: 'updateAttributes'},
    {
      type: 'conditional',
      condition: 'error occurred',
      yes: {type: 'job.acknowledge', outcome: 'failure', reason: 'Device unreachable'},
      no: {type: 'job.acknowledge', outcome: 'success'}
    }
  ]
}
```

**Use Cases:**
- Bulk device calibration
- Mass firmware updates
- Configuration rollouts
- Data cleanup operations
- User batch operations

**Current Gap:**
- No batch job framework
- No parallel execution for bulk operations
- No job acknowledgment mechanism
- Manual loop logic in workflows for bulk tasks

**Impact:**
- Cannot efficiently process bulk operations
- Manual loops are error-prone and slow
- 1000 devices require 1000 API calls (no parallel)
- Critical for enterprise operations

**Effort:** ~2-3 weeks
- Create ResourceJob model
- Implement parallel execution engine with concurrency control
- Create Job: Acknowledge workflow node
- Implement job tracking and status reporting
- Add job monitoring dashboard
- Handle partial failures and retries

---**Losant Feature:**
```typescript
// Bulk operations on thousands of records
ResourceJob {
  name: 'update-all-pressure-sensors',
  resource: 'devices',

  // Find all pressure sensors
  filter: {tags: 'pressure-sensor'},

  // Update them
  operation: 'update',
  updates: {
    calibrationFactor: 1.02,
    maintenanceDue: tomorrow
  }
}

// Results:
// - 5000 devices updated
// - Logged as single operation
// - No API rate limiting
// - Can schedule to run at night
```

**Current Gap:**
- No bulk operation support
- Must update devices one-by-one
- No job scheduling

**Impact:**
- Cannot perform mass updates efficiently
- Calibration updates require manual work
- Missing operational efficiency feature

**Effort:** ~1 week

---

#### 5.3 Application Files (Missing - Medium Priority)

**Losant Feature:**
```
File storage for:
- Firmware binaries (OTA updates)
- Images (dashboard overlays)
- CSS/JavaScript libraries
- Configuration files
- Data backups
```

**Current Gap:**
- No built-in file storage
- No OTA firmware system
- No asset management

**Effort:** ~1 week
- S3/file storage integration
- File API endpoints
- Firmware versioning

---

#### 5.4 Jupyter Notebooks (Missing - Low Priority)

**Losant Feature:**
- Interactive notebook environment
- Python-based data analysis
- Historical data querying
- Machine learning workflows

**Current Gap:**
- No notebook support
- No batch processing interface

**Status:**
- Low priority for POC
- Can be added in Phase 2
- Alternative: External Jupyter instance

**Effort:** ~2 weeks (integration, not core)

---

### Advanced Analytics Recommendation

**Phase 1 (Essential - 2 weeks):**
- Data Tables (lookup storage)
- Application Files (firmware storage)

**Phase 2 (Operational - 1 week):**
- Resource Jobs (bulk operations)

**Phase 3 (Advanced - 2 weeks):**
- Jupyter integration
- ML model deployment

---

## 6. Administrative & Security Features

### Losant Capability Matrix

| Feature | Losant | Current | Gap | Priority |
|---------|--------|---------|-----|----------|
| **Connected Product Foundation** | Template | Not implemented | Missing | Low |
| **Service Credentials Vault** | Encrypted secrets | Environment variables | Partial | Medium |
| **API Tokens** | Scoped, granular | Basic JWT | Partial | Low |
| **Application Globals** | 100 key/value pairs | Environment-based | Partial | Low |
| **Application Archiving** | Auto Git backup | Manual deployment | Partial | Low |
| **RBAC** | 4 roles + permissions | 4 roles + 24 permissions ✅ | Matched | — |
| **Audit Logging** | Comprehensive | 21 CFR Part 11 compliant ✅ | Matched | — |
| **Session Management** | Multi-device tracking | Database-backed ✅ | Matched | — |
| **API Security** | Rate limiting, IP allowlist | Rate limiting ✅ | Matched | — |

### Gap Analysis

#### 6.1 Service Credentials Vault (Partial)

**Losant Model:**
```typescript
// Encrypted credential storage
ServiceCredential {
  name: 'aws-iot-key',
  type: 'aws',
  encrypted: true,  // At-rest encryption
  credentials: {
    accessKeyId: '***',
    secretAccessKey: '***',
    region: 'us-east-1'
  }
}

// Usage in workflows
WorkflowNode {
  type: 'awsLambdaInvoke',
  credentialId: 'aws-iot-key',  // Injected at runtime
  function: 'process-data'
}
```

**Current State:**
- Uses environment variables
- Not encrypted at rest
- No UI for credential management

**Effort:** ~1 week
- Create EncryptedCredential model
- Implement encryption/decryption
- Add credential UI
- Update workflow nodes to use credentials

---

#### 6.2 Application Globals (Partial)

**Losant Feature:**
```
Store configuration values:
- API endpoints
- Feature flags
- Threshold values
- Database connection strings

All workflows can access as global context
```

**Current:**
- Uses .env files
- Must restart to change
- No UI to view/edit

**Effort:** ~3 days

---

### Admin & Security Status

**Current:** 85% feature complete ✅

**Quick Wins (3 days):**
- Application Globals UI
- Basic credential management

---

## Summary by Priority

### Critical Gaps (Blocking Enterprise Use)

| Gap | Impact | Effort | Timeline |
|-----|--------|--------|----------|
| Experience Endpoints | Cannot build custom APIs without coding | High | 2 weeks |
| Data Tables | Lookup data inefficient | High | 2 weeks |
| Experience Users | No multi-tenant web apps | High | 3 weeks |
| Device Recipes | Manual provisioning at scale | Medium | 1 week |
| Geospatial Mapping | Cannot track assets/locations | High | 2 weeks |

**Total Effort: 10 weeks** (can be parallelized)

### Medium-Priority Gaps (Nice-to-Have)

| Gap | Impact | Effort | Timeline |
|-----|--------|--------|----------|
| API Query Node | Call external services | Medium | 3 days |
| Workflow Versioning | A/B testing, rollback | Medium | 1 week |
| PDF Reporting | Compliance documentation | Low | 1 week |
| White-Labeling | Custom branding | Medium | 1 week |
| Resource Jobs | Bulk operations | Low | 1 week |

**Total Effort: 4 weeks** (can be parallelized)

### Low-Priority Gaps (Future Enhancements)

| Gap | Impact | Effort | Timeline |
|-----|--------|--------|----------|
| Jupyter Notebooks | Advanced analytics | Low | 2 weeks |
| Embedded Workflows | Microcontroller logic | Low | 3 weeks |
| Slack/Teams Integration | Notifications | Low | 1 week |
| Advanced Charts | Visualization options | Low | 2 weeks |

**Total Effort: 8 weeks**

---

## Implementation Roadmap

### Phase 1: Enterprise Foundation (Weeks 1-4)
**Focus:** Address critical gaps for production deployment

1. **Week 1:** Device Recipes + Application Globals
2. **Week 2:** Data Tables + Data Table Query Node
3. **Week 3:** Experience Endpoints (HTTP routing)
4. **Week 4:** Experience Users + SSO

**Outcome:** 65% feature parity with Losant

---

### Phase 2: Advanced Features (Weeks 5-8)
**Focus:** Production-grade capabilities

1. **Week 5:** Geospatial Mapping + GPS Tracking
2. **Week 6:** Workflow Versioning + A/B Testing
3. **Week 7:** PDF Email Reporting
4. **Week 8:** API Query Node + External Service Integration

**Outcome:** 75% feature parity with Losant

---

### Phase 3: Analytics & Intelligence (Weeks 9-12)
**Focus:** Advanced analytics and automation

1. **Week 9:** Resource Jobs (bulk operations)
2. **Week 10:** Advanced Visualization Blocks
3. **Week 11:** Jupyter Notebook Integration
4. **Week 12:** White-Labeling Framework

**Outcome:** 85% feature parity with Losant

---

## Feature Parity Timeline

```
Current (Feb 2026):     53% parity ████░░░░░░░░░░░░░░░░
Phase 1 (Apr 2026):     65% parity ██████░░░░░░░░░░░░░░
Phase 2 (May 2026):     75% parity ███████░░░░░░░░░░░░░
Phase 3 (Jun 2026):     85% parity ████████░░░░░░░░░░░░
Target (Sep 2026):      95% parity ██████████░░░░░░░░░░

Remaining 5% = niche features not needed for water utilities
```

---

## Risk Assessment

### High Risk (Could Impact Timeline)

1. **Experience User Auth (3 weeks)**
   - Requires SSO/OAuth integration
   - May need external identity provider
   - **Mitigation:** Start early, use Auth0 or similar

2. **Geospatial Mapping (2 weeks)**
   - Requires map library (Google Maps, Mapbox)
   - Licensing costs
   - **Mitigation:** Use open-source alternative (Leaflet)

3. **Workflow Versioning (1 week)**
   - Complex state management
   - Backward compatibility concerns
   - **Mitigation:** Design schema carefully, write tests

### Medium Risk

- Data Table query performance (can be optimized)
- PDF generation complexity (use established libraries)
- Multi-tenant data isolation (requires careful design)

### Low Risk

- Most missing nodes are straightforward additions
- Architecture supports extensibility
- Team has experience with similar integrations

---

## Recommendations

### Immediate Actions (Next Sprint)

1. **Prioritize Experience Endpoints** (Week 1)
   - Unblocks custom API development
   - High business value

2. **Start Data Tables Design** (Week 1)
   - Interview users for table schema requirements
   - Design data model

3. **Evaluate Map Library** (Week 1)
   - Mapbox vs Leaflet vs Google Maps
   - Cost analysis
   - Performance testing

### Strategic Decisions

1. **Experience Users:**
   - Use Auth0 or similar for faster implementation
   - Avoid building custom auth system

2. **Geospatial:**
   - Start with open-source Leaflet
   - Can upgrade to premium later

3. **Analytics:**
   - Defer Jupyter integration to Phase 3
   - Focus on core business logic first

---

## Conclusion

**Current Status:** Solid 53% Losant feature parity with strong foundation

**Path to 85%:** 12-week roadmap with parallel workstreams

**Key Insight:** Most missing features are additions, not architectural changes. Current architecture supports them well.

**Next Steps:**
1. Prioritize Phase 1 features for client review
2. Estimate team capacity and resource allocation
3. Begin Experience Endpoints design
4. Evaluate external vendors (Auth0, Mapbox)

---

## Appendix: Feature Comparison Matrix

| Feature | Losant | Current | Status |
|---------|--------|---------|--------|
| **DEVICE MANAGEMENT** |
| Device Classes (6 types) | ✅ | 2/6 | 33% |
| Device Recipes | ✅ | ❌ | 0% |
| Device State Tracking | ✅ | ✅ | 100% |
| Firmware OTA | ✅ | ❌ | 0% |
| Health Monitoring | ✅ | ✅ | 100% |
| **WORKFLOWS** |
| Cloud Workflows | ✅ | ✅ | 100% |
| Experience Workflows | ✅ | ❌ | 0% |
| Edge Workflows | ✅ | 🔄 | 50% |
| Drag-and-Drop | ✅ | ✅ | 100% |
| Node Library (50 types) | ✅ | 19/50 | 38% |
| Function Node | ✅ | ✅ | 100% |
| Workflow Versioning | ✅ | ❌ | 0% |
| **DATA VISUALIZATION** |
| Dashboard Blocks (25+) | ✅ | 3/25 | 12% |
| Custom HTML | ✅ | ❌ | 0% |
| Real-time Updates | ✅ | ✅ | 100% |
| PDF Reporting | ✅ | ❌ | 0% |
| Geospatial Maps | ✅ | ❌ | 0% |
| Data Export | ✅ | ✅ | 100% |
| **EXPERIENCES** |
| Custom Endpoints | ✅ | ❌ | 0% |
| Experience Users | ✅ | ❌ | 0% |
| SSO/OAuth | ✅ | ❌ | 0% |
| White-Labeling | ✅ | ❌ | 0% |
| Dashboard Pages | ✅ | ✅ | 100% |
| **ADVANCED FEATURES** |
| Data Tables | ✅ | ❌ | 0% |
| Resource Jobs | ✅ | ❌ | 0% |
| Application Files | ✅ | ❌ | 0% |
| Jupyter Notebooks | ✅ | ❌ | 0% |
| **ADMIN & SECURITY** |
| RBAC (4 roles) | ✅ | ✅ | 100% |
| Audit Logging | ✅ | ✅ | 100% |
| Session Management | ✅ | ✅ | 100% |
| API Security | ✅ | ✅ | 100% |
| Credential Vault | ✅ | 🔄 | 50% |
| **TOTAL** | | | **53%** |

---

## REVISED PRIORITY MATRIX (Based on Deep Dive Analysis)

### Critical Path to Production (MVP+)

**Must-Have for Enterprise (Blocking Sales)**
1. **White-Labeling** (1-2 weeks) - No customer can use platform without branding
2. **Multi-Tenant Hierarchy** (2-3 weeks) - System Admin → Customer → Site → Device
3. **Device Recipes** (1-2 weeks) - Template-based provisioning at scale
4. **Experience Endpoints & Users** (3 weeks) - Custom web interfaces
5. **Data Tables** (2 weeks) - Lookup data storage
6. **Dashboard Context Variables** (1-2 weeks) - One dashboard, many devices

**Subtotal: 10-14 weeks** for enterprise readiness

### High-Value Features (3-6 months)

**Phase 2A: Edge Compute (Weeks 1-4)**
- BACnet + OPC-UA protocols (2 weeks)
- Edge workflow execution (2 weeks)

**Phase 2B: Advanced Visualization (Weeks 5-7)**
- SCADA image overlays (2 weeks)
- Geospatial mapping (2 weeks)
- Dashboard templates (1 week)

**Phase 2C: Resource Jobs & Batch (Weeks 8-10)**
- Batch processing framework (2 weeks)
- Resource job execution (1 week)

### Strategic Improvements (Month 4-6)

**Phase 3A: Embedded Edge Agent (3-4 weeks)**
- WASM/C++ microcontroller support
- OTA firmware updates

**Phase 3B: Jupyter Integration (2-3 weeks)**
- Batch export pipeline
- Notebook execution framework

**Phase 3C: Advanced Workflow Nodes (3-4 weeks)**
- 20+ missing node types
- API Query, DataTable Query, Array manipulation

---

## REVISED ROADMAP: From 47% to 95%

```
Current (Feb 2026):     47% parity  ███████░░░░░░░░░░░░░░░░░░░░░░
Phase 1 (Apr 2026):     65% parity  ██████████░░░░░░░░░░░░░░░░░░░░  (+18%)
Phase 2 (Jun 2026):     80% parity  ███████████████░░░░░░░░░░░░░░░░  (+15%)
Phase 3 (Aug 2026):     92% parity  ██████████████████░░░░░░░░░░░░░  (+12%)
Target (Oct 2026):      95% parity  ████████████████████░░░░░░░░░░  (+3%)
```

**Phase 1 (Critical, 10-14 weeks):**
- White-Labeling Foundation
- Multi-Tenant Hierarchy
- Device Recipes
- Experience Endpoints & Users
- Data Tables
- Dashboard Context Variables

**Phase 2 (Important, 8-10 weeks):**
- BACnet + OPC-UA Protocols
- Edge Workflow Execution
- SCADA Image Overlays
- Geospatial Mapping
- Resource Jobs & Batch Processing

**Phase 3 (Advanced, 6-8 weeks):**
- Embedded Edge Agent
- Jupyter Integration
- Advanced Workflow Nodes
- Custom MQTT Topics

**Remaining 5% (Low Priority):**
- Embedded workflows on microcontroller
- Advanced node types (50+)
- Specialized integrations

---

## ARCHITECTURAL DECISIONS NEEDED

### 1. Multi-Tenant Hierarchy (CRITICAL)

**Question:** How to model 4-level hierarchy?
```
System Admin (platform owner)
  ↓
Customer (paying customer)
  ↓
Site (physical location)
  ↓
Device (asset)
```

**Current:** Organization → Device only

**Decision Required:**
- Option A: Add Site model between Organization and Device
- Option B: Add nested Organizations (recursive)
- Option C: Device has site_id direct reference

**Recommendation:** Option A (Site model) - matches Losant exactly

---

### 2. White-Labeling Strategy (CRITICAL)

**Question:** How much customization needed?

**Levels:**
- Level 1 (CSS Only): Logo, colors, fonts
- Level 2 (Templates): Custom login page, dashboard branding
- Level 3 (Full): Separate domains, custom workflows

**Decision Required:** Which level for MVP?

**Recommendation:** Level 1 + 2 (CSS + templates) for Phase 1

---

### 3. Edge Compute Scope (IMPORTANT)

**Question:** Support all three execution scopes?

```
Cloud Application  ✅ (have it)
Edge Gateway       ❌ (have partial Modbus)
Embedded Device    ❌ (don't have it)
```

**Decision Required:** Phase 1 or Phase 2?

**Recommendation:** Defer Embedded to Phase 3, do Edge in Phase 2

---

### 4. Dashboard Templating (IMPORTANT)

**Question:** How to implement context variables?

**Options:**
- Handlebars templates ({{ ctx.deviceId }})
- React component props
- GraphQL variables
- Direct URL parameters

**Decision Required:** Choose templating engine

**Recommendation:** Handlebars (matches Losant approach)

---

## COMPARISON: Feature Parity Summary

| Feature | Losant | Current | Status |
|---------|--------|---------|--------|
| **CPF (Production Template)** | ✅ | ❌ | 0% |
| **White-Labeling** | ✅ | ❌ | 0% |
| **Multi-Tenant Hierarchy** | ✅ | 🔄 | 25% |
| **Device Recipes** | ✅ | ❌ | 0% |
| **Gateway Edge Agent** | ✅ | 🔄 | 20% |
| **Embedded Edge Agent** | ✅ | ❌ | 0% |
| **Edge Workflows** | ✅ | ❌ | 0% |
| **BACnet Protocol** | ✅ | ❌ | 0% |
| **OPC-UA Protocol** | ✅ | ❌ | 0% |
| **Experience Endpoints** | ✅ | ❌ | 0% |
| **Experience Users** | ✅ | ❌ | 0% |
| **Data Tables** | ✅ | ❌ | 0% |
| **Dashboard Context Variables** | ✅ | ❌ | 0% |
| **SCADA Image Overlays** | ✅ | ❌ | 0% |
| **Geospatial Mapping** | ✅ | ❌ | 0% |
| **Resource Jobs** | ✅ | ❌ | 0% |
| **Jupyter Integration** | ✅ | ❌ | 0% |
| **Custom MQTT Topics** | ✅ | 🔄 | 50% |
| **PDF Email Reporting** | ✅ | ❌ | 0% |
| **Workflow Versioning** | ✅ | ❌ | 0% |
| **Visual Workflow Editor** | ✅ | ✅ | 100% |
| **MQTT/REST Connectivity** | ✅ | ✅ | 100% |
| **Real-time Dashboards** | ✅ | ✅ | 100% |
| **RBAC (4 roles)** | ✅ | ✅ | 100% |
| **Audit Logging** | ✅ | ✅ | 100% |
| **Time-Series Storage** | ✅ | ✅ | 100% |

**Gap Summary:**
- 0% Features (Complete Gap): 13 features
- 1-50% Features (Partial): 4 features
- 100% Features (Complete): 7 features

**Weighted Gap: 53%** of Losant feature set

---

## FINAL RECOMMENDATIONS

### For Immediate Action (Next Sprint)

**Decision Points (Blocking Enterprise Roadmap):**

1. **Approve CPF approach** - Choose between:
   - Option A: Build full CPF (3-level hierarchy, white-labeling, roles) - 8-10 weeks
   - Option B: Implement white-labeling only - 2 weeks (Phase 1 MVP)
   - Recommendation: **Phase B first (2 weeks), then Phase A (8 weeks)**

2. **Decide on hierarchy model** - Choose implementation:
   - Option A: Flat (Organization only) - Current, inadequate for enterprise
   - Option B: 3-level (Customer → Site → Device) - Losant standard, required
   - Recommendation: **Implement Option B** (critical blocker for sales)

3. **Choose white-labeling scope** - Phased or all-at-once:
   - Phase 1 (2 weeks): Logo, favicon, colors (no-code UI)
   - Phase 2 (1 week): Navigation customization
   - Recommendation: **Phase 1 only for MVP**

4. **Plan Phase 1 team allocation** - 3-4 developers for 2-3 weeks

### Critical Path to Enterprise Readiness

**Phase 0 (Weeks 1-2): White-Labeling MVP**
- Logo upload (large for login, small for nav)
- Color customization (primary, secondary, success, danger)
- Favicon upload
- Admin UI for branding configuration
- **Impact:** 1 test customer can use white-labeled platform

**Phase 1 (Weeks 3-5): Multi-Tenant Hierarchy**
- Implement Customer → Site → Device 3-level model
- Update database schema for nested relationships
- Implement role scoping (Admin of which level?)
- Update API endpoints for hierarchical queries
- **Impact:** Enterprise tenant isolation and delegation

**Phase 2 (Weeks 6-7): Enterprise Features**
- Data Tables (50 columns, SQL-like queries)
- Device Recipes (bulk device creation)
- Resource Jobs (parallel batch operations)
- **Impact:** Enterprise operational efficiency

**Phase 3 (Weeks 8-10): Advanced Capabilities**
- Image Overlay (SCADA visualization)
- Custom HTML with AI code generation
- Jupyter integration with Query Time
- **Impact:** Advanced analytics and visualization

### For Product Strategy

1. **Enterprise vs. SMB:**
   - **Enterprise Path:** CPF required, 8-10 week build (target: Water Utilities, Manufacturing)
   - **SMB Path:** Current platform, simpler deployment, faster to market
   - **Recommendation:** Pursue enterprise (higher LTV) with phased CPF rollout

2. **Edge vs. Cloud:**
   - **Edge compute (Modbus/BACnet/OPC-UA):** Optional, nice-to-have
   - **Cloud-only:** Viable for MVP, add edge later if customer demand
   - **Recommendation:** Defer edge to Phase 4 (post-MVP)

3. **Visualization:**
   - **Custom HTML + AI:** High ROI, enables SCADA displays, differentiator
   - **Image Overlay:** Essential for manufacturing/utilities
   - **Recommendation:** Prioritize Image Overlay in Phase 3

4. **Analytics (Jupyter):**
   - **Query Time concept:** Powerful for recurring analysis
   - **Resource intensive:** Defer to Phase 4 unless customer requests
   - **Recommendation:** Phase 4 or post-MVP

### Implementation Roadmap (Revised from Briefing Analysis)

**Total Effort: 10-12 weeks to reach 80% Losant parity**

```
Week 1-2   | Phase 0: White-Labeling MVP         | ✅ Critical Path
Week 3-5   | Phase 1: Multi-Tenant Hierarchy     | ✅ Critical Path
Week 6-7   | Phase 2: Enterprise Features        | ✅ Critical Path
Week 8-10  | Phase 3: Advanced Capabilities      | 🔄 If resources allow
Week 11-12 | Phase 4: Edge Compute + Jupyter     | ⏳ Post-MVP or Phase 2

Critical Path: 7 weeks to 60% parity (CPF + hierarchy + white-labeling)
Extended Path: 12 weeks to 80% parity (add Image Overlay + Data Tables + Jupyter)
```

### Success Metrics (Revised)

**MVP Metrics (Week 2):**
- White-labeling works
- 1 test customer can access branded platform
- Feature parity: 45%

**Phase 1 Complete (Week 5):**
- Multi-tenant hierarchy in production
- 3-level role-based access working
- Feature parity: 55%

**Phase 2 Complete (Week 7):**
- Data Tables and Resource Jobs working
- Device Recipes in place
- Feature parity: 65%

**Phase 3 Complete (Week 10):**
- Image Overlay SCADA displays working
- Custom HTML with AI code generation
- Feature parity: 75%

**Phase 4 Complete (Week 12):**
- Jupyter integration with Query Time
- Edge compute (Modbus/BACnet/OPC-UA)
- **Feature parity: 85-90%** (approaching Losant 1:1)

### Budget Impact

**Assuming $150/hour developer cost:**

| Phase | Duration | Team | Hours | Cost |
|-------|----------|------|-------|------|
| Phase 0 | 2 weeks | 3 devs | 240 | $36K |
| Phase 1 | 3 weeks | 3 devs | 360 | $54K |
| Phase 2 | 2 weeks | 2 devs | 160 | $24K |
| Phase 3 | 3 weeks | 2 devs | 240 | $36K |
| Phase 4 | 2 weeks | 2 devs | 160 | $24K |
| **Total** | **12 weeks** | **2-3 FTE** | **1,160** | **$174K** |

---

**Document Version:** 2.1 (Briefing Document Analysis Complete)
**Last Updated:** February 17, 2026
**Analysis Methodology:** Feature-by-feature comparison with Losant Briefing_Document.md (149 lines)
**Coverage:** All 5 Losant pillars + CPF + Enterprise features
**Data Sources:**
- docs/Losant_IoT_Architecture_Deep_Dive.pdf
- docs/Briefing_Document.md
- docs/pre-execution/updated_requirements.md
**Status:** Ready for Stakeholder Review and Decision
