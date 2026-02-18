# Documentation Index

**Last Updated:** February 17, 2026

This directory contains all project documentation organized by topic and purpose. The `ai/` folder contains AI-specific configuration and is maintained separately.

---

## 📚 Documentation Structure

### 🏗️ **[architecture/](./architecture/)** - System Design & Gap Analysis
Architecture decisions, technology stack rationale, and comprehensive gap analysis comparing with Losant.

- **[gaps_architecture.md](./architecture/gaps_architecture.md)** - **CRITICAL** - Comprehensive gap analysis: Losant vs current implementation (2,488 lines, 85% coverage analysis)
- **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** - System architecture overview and design patterns
- **[TECHNOLOGY_STACK_RATIONALE.md](./architecture/TECHNOLOGY_STACK_RATIONALE.md)** - Technology choices and justifications
- **[LOAD_ANALYSIS.md](./architecture/LOAD_ANALYSIS.md)** - System capacity and performance analysis

**Use when:** Understanding system design, architectural decisions, feature gaps, or technology choices

---

### ⚖️ **[compliance/](./compliance/)** - Regulatory & Standards Compliance
Compliance documentation for EPA, ISA, AWWA, and other regulatory frameworks.

- **[ISA_STANDARDS_COMPLIANCE.md](./compliance/ISA_STANDARDS_COMPLIANCE.md)** - ISA-18.2, IEC 61158, ISA/IEC 62443 compliance mapping
- **[COMPLIANCE_ROADMAP.md](./compliance/COMPLIANCE_ROADMAP.md)** - Phase-by-phase compliance implementation plan
- **[PHASE_1.1_AUDIT_LOGGING_SUMMARY.md](./compliance/PHASE_1.1_AUDIT_LOGGING_SUMMARY.md)** - EPA 21 CFR Part 11 audit logging
- **[PHASE_1.2_DATA_RETENTION_SUMMARY.md](./compliance/PHASE_1.2_DATA_RETENTION_SUMMARY.md)** - EPA 5-year retention policy implementation
- **[PHASE_1.3_DATA_QUALITY_SUMMARY.md](./compliance/PHASE_1.3_DATA_QUALITY_SUMMARY.md)** - Data quality assurance (QAPP, AWWA M36)
- **[PHASE_2.1_ALARM_MANAGEMENT_SUMMARY.md](./compliance/PHASE_2.1_ALARM_MANAGEMENT_SUMMARY.md)** - ISA-18.2 alarm state machines
- **[PHASE_3.3_AUTH_SUMMARY.md](./compliance/PHASE_3.3_AUTH_SUMMARY.md)** - Authentication & session management

**Use when:** Building compliance requirements, water utility standards, alarm management, or audit trails

---

### 🖥️ **[infrastructure/](./infrastructure/)** - Deployment & DevOps
Infrastructure setup, database configuration, containerization, and deployment guides.

- **[MONGODB_REPLICA_SET.md](./infrastructure/MONGODB_REPLICA_SET.md)** - MongoDB replica set configuration, high availability, TTL indexes
- **[DEPLOYMENT.md](./infrastructure/DEPLOYMENT.md)** - Deployment procedures and production checklist
- **[DOCKER.md](./infrastructure/DOCKER.md)** - Docker containerization, multi-stage builds, container orchestration

**Use when:** Setting up databases, configuring production environment, or deploying containers

---

### 💻 **[implementation/](./implementation/)** - Feature Implementations
Detailed implementation guides organized by area: authentication, data/protocols, frontend state, and backend services.

#### **[implementation/core/](./implementation/core/)** - Authentication & Core Services
- **[AUTH_IMPLEMENTATION_REVIEW.md](./implementation/core/AUTH_IMPLEMENTATION_REVIEW.md)** - Authentication architecture review
- **[AUTH_MIDDLEWARE_STATUS.md](./implementation/core/AUTH_MIDDLEWARE_STATUS.md)** - Middleware implementation status
- **[TOKEN_SESSION_TRACKING.md](./implementation/core/TOKEN_SESSION_TRACKING.md)** - JWT token session tracking with JTI validation
- **[AUTH_TEST_COVERAGE.md](./implementation/core/AUTH_TEST_COVERAGE.md)** - Authentication test cases and coverage
- **[AUTH_API_EXAMPLES.md](./implementation/core/AUTH_API_EXAMPLES.md)** - Example API calls and integration patterns
- **[AUTH_SEED_SCRIPT.md](./implementation/core/AUTH_SEED_SCRIPT.md)** - Database seeding for testing

#### **[implementation/data/](./implementation/data/)** - Data Storage & Protocols
- **[MODBUS_GATEWAY_DESIGN.md](./implementation/data/MODBUS_GATEWAY_DESIGN.md)** - Modbus TCP/RTU gateway architecture
- **[MODBUS_IMPLEMENTATION_STATUS.md](./implementation/data/MODBUS_IMPLEMENTATION_STATUS.md)** - Modbus implementation progress
- **[MODBUS_USAGE_GUIDE.md](./implementation/data/MODBUS_USAGE_GUIDE.md)** - How to use Modbus gateway
- **[MODBUS_COMPLETE_SUMMARY.md](./implementation/data/MODBUS_COMPLETE_SUMMARY.md)** - Complete Modbus feature summary
- **[OPCUA_COMPLETE_SUMMARY.md](./implementation/data/OPCUA_COMPLETE_SUMMARY.md)** - OPC-UA protocol support
- **[ULID_IMPLEMENTATION.md](./implementation/data/ULID_IMPLEMENTATION.md)** - ULID identifier system implementation
- **[HYBRID_DASHBOARD_STORAGE.md](./implementation/data/HYBRID_DASHBOARD_STORAGE.md)** - localStorage + backend hybrid storage for dashboards

#### **[implementation/frontend/](./implementation/frontend/)** - React Frontend
- **[REDUX_IMPLEMENTATION.md](./implementation/frontend/REDUX_IMPLEMENTATION.md)** - Redux Toolkit state management
- **[REDUX_MIGRATION_COMPLETE.md](./implementation/frontend/REDUX_MIGRATION_COMPLETE.md)** - Redux migration from Context API
- **[REDUX_QUICK_REFERENCE.md](./implementation/frontend/REDUX_QUICK_REFERENCE.md)** - Redux quick reference guide
- **[HYBRID_DASHBOARD_IMPLEMENTATION_SUMMARY.md](./implementation/frontend/HYBRID_DASHBOARD_IMPLEMENTATION_SUMMARY.md)** - Dashboard UI implementation

#### **[implementation/backend/](./implementation/backend/)** - Node.js Backend
- **[PRISMA_MIGRATION_SUMMARY.md](./implementation/backend/PRISMA_MIGRATION_SUMMARY.md)** - Database migration guide
- **[WEBSOCKET_API.md](./implementation/backend/WEBSOCKET_API.md)** - WebSocket API reference

**Use when:** Implementing features, setting up authentication, configuring protocols, or working on state management

---

### 📖 **[reference/](./reference/)** - Quick Reference & Guides
Quick reference guides, API documentation, and user guides.

- **[README.md](./reference/README.md)** - Project overview and quick start
- **[API_INDEX.md](./reference/API_INDEX.md)** - Complete API endpoint index
- **[SIMULATOR_GUIDE.md](./reference/SIMULATOR_GUIDE.md)** - Device simulator usage guide
- **[USER_GUIDE.md](./reference/USER_GUIDE.md)** - End-user guide for operators
- **[IMPLEMENTATION_GUIDE.md](./reference/IMPLEMENTATION_GUIDE.md)** - Implementation step-by-step guide
- **[IMPLEMENTATION_REFERENCE.md](./reference/IMPLEMENTATION_REFERENCE.md)** - Implementation reference material
- **[WHATS_NEXT.md](./reference/WHATS_NEXT.md)** - Next steps and roadmap

**Use when:** Looking up API endpoints, quick start, simulator usage, or user documentation

---

### 📋 **[planning/](./planning/)** - Project Planning & Roadmaps
Roadmaps, task lists, progress tracking, and project status.

- **[POC_TASKS.md](./planning/POC_TASKS.md)** - Proof of Concept (POC) task breakdown
- **[POC_TO_ENTERPRISE_PLAN.md](./planning/POC_TO_ENTERPRISE_PLAN.md)** - Roadmap from POC to enterprise
- **[PRODUCTION_READY_POC.md](./planning/PRODUCTION_READY_POC.md)** - Production-ready POC checklist
- **[PROGRESS.md](./planning/PROGRESS.md)** - Detailed project progress tracking
- **[IMPLEMENTATION_STATUS.md](./planning/IMPLEMENTATION_STATUS.md)** - Current implementation status
- **[CURRENT_PROJECT_STATUS.md](./planning/CURRENT_PROJECT_STATUS.md)** - High-level project status

**Use when:** Planning sprints, tracking progress, or reviewing roadmaps

---

### 📊 **[requirements/](./requirements/)** - Requirements & Analysis
Requirements documentation, analysis, and reference materials from Losant.

- **[Briefing_Document.md](./requirements/Briefing_Document.md)** - Losant platform briefing: Executive summary and feature overview (149 lines, comprehensive)
- **[LOSANT_REQUIREMENTS.md](./requirements/LOSANT_REQUIREMENTS.md)** - Updated Losant feature requirements summary
- **[Losant_IoT_Architecture_Deep_Dive.pdf](./requirements/Losant_IoT_Architecture_Deep_Dive.pdf)** - PDF: Losant architecture with visual diagrams

**Use when:** Understanding Losant features, requirements analysis, or benchmarking

---

### 🎓 **[learning/](./learning/)** - Learning & Completion Reports
Task completion reports, learning outcomes, and system updates documentation.

- **[WORKFLOW_WEEK1_COMPLETE.md](./learning/WORKFLOW_WEEK1_COMPLETE.md)** - Visual Workflow Editor Week 1 completion
- **[EXECUTION_NOTES.md](./learning/EXECUTION_NOTES.md)** - Execution phase notes
- **[HANDOFF.md](./learning/HANDOFF.md)** - Project handoff documentation
- **[TASK_1_COMPLETE.md](./learning/TASK_1_COMPLETE.md)** - Authentication Phase 1 completion
- **[TASK_2_COMPLETE.md](./learning/TASK_2_COMPLETE.md)** - Protected Routes Phase 2 completion
- **[TASK_3_COMPLETE.md](./learning/TASK_3_COMPLETE.md)** - Task 3 completion report
- **[UPDATE_SUMMARY.md](./learning/UPDATE_SUMMARY.md)** - System updates summary
- **[UPDATE_CONTEXT_SUMMARY.md](./learning/UPDATE_CONTEXT_SUMMARY.md)** - Context updates summary

**Use when:** Reviewing completed work, learning from past implementations, or understanding project history

---

### 🤖 **[ai/](./ai/)** - AI System Configuration (Protected)
AI-specific configuration, architecture decisions, and task management.

⚠️ **NOT TO BE MODIFIED** unless explicitly authorized. Contains:
- ADR (Architecture Decision Records)
- Task history and current assignments
- AI protocol and operating mode

---

## 🚀 Quick Navigation

### By Task Type:
- **Starting a new feature?** → Read `architecture/gaps_architecture.md` then `reference/IMPLEMENTATION_GUIDE.md`
- **Setting up infrastructure?** → Start with `infrastructure/MONGODB_REPLICA_SET.md` and `infrastructure/DOCKER.md`
- **Need compliance info?** → Go to `compliance/ISA_STANDARDS_COMPLIANCE.md`
- **Looking up API?** → Check `reference/API_INDEX.md`
- **Understanding auth?** → See `implementation/core/TOKEN_SESSION_TRACKING.md`
- **Project status?** → Check `planning/CURRENT_PROJECT_STATUS.md`

### By Area:
- **Database & Storage:** `infrastructure/` + `implementation/data/`
- **Frontend:** `implementation/frontend/`
- **Backend:** `implementation/backend/` + `infrastructure/`
- **Authentication:** `implementation/core/`
- **Protocols (Modbus, OPC-UA):** `implementation/data/`
- **Compliance & Standards:** `compliance/`

---

## 📊 Key Documents (Most Important)

1. **[gaps_architecture.md](./architecture/gaps_architecture.md)** (2,488 lines)
   - Comprehensive Losant vs current implementation gap analysis
   - Feature parity: 42% (56% gap)
   - Effort estimates for closing gaps
   - Critical for enterprise roadmap decisions

2. **[ISA_STANDARDS_COMPLIANCE.md](./compliance/ISA_STANDARDS_COMPLIANCE.md)** (23KB)
   - Water utility compliance framework
   - EPA, ISA, AWWA standards mapping
   - Regulatory requirements

3. **[POC_TO_ENTERPRISE_PLAN.md](./planning/POC_TO_ENTERPRISE_PLAN.md)**
   - Roadmap from current POC to enterprise platform
   - Phase-by-phase breakdown
   - Resource and timeline estimates

4. **[MONGODB_REPLICA_SET.md](./infrastructure/MONGODB_REPLICA_SET.md)** (12KB)
   - Critical for understanding time-series collections
   - High availability and failover mechanisms
   - TTL implementation for EPA compliance

---

## 📝 Document Naming Convention

- **UPPERCASE.md** - Major reference documents and guides
- **CamelCase.md** - Specific topic or feature documents
- **lowercase.md** - General reference or extracted content
- **PHASE_X_Y.md** - Phase-specific implementation details

---

**Last Organized:** February 17, 2026
**Total Documents:** 50+
**Folder Structure:** 9 categories + protected AI folder

