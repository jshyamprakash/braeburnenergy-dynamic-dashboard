# Architecture Discrepancy Report (2026-02-16)

## Summary
Comprehensive scan of `iot-platform/` revealed discrepancies between CLAUDE.md documentation and actual implemented architecture. Prioritized implemented code as source of truth.

## Key Discrepancies Found

### 1. State Management Architecture ⚠️
**CLAUDE.md:** TanStack Query (server state) + Zustand (client state)
**Reality:** Redux Toolkit with 5 slices + TanStack Query (limited use)

**Impact:** Major architectural difference
**Action:** Created ADR-003-redux-state-migration.md

**Details:**
- Redux Toolkit 2.11.2 is primary state manager
- 5 slices: authSlice, uiSlice, dashboardSlice, websocketSlice, workflowSlice
- TanStack Query only used for device/deviceState queries (being phased out)
- Zustand deprecated in favor of Redux

### 2. Data Retention Period ⚠️
**CLAUDE.md:** 90-day TTL (`expireAfterSeconds: 7776000`)
**Reality:** 5-year TTL (`expireAfterSeconds: 157680000`)

**Impact:** Critical for compliance and storage planning
**Action:** Created ADR-004-epa-retention-5year.md

**Reason:** EPA 40 CFR Part 141 requires minimum 5-year retention for water quality monitoring data

### 3. Workflow Editor Specifics
**CLAUDE.md:** Mentions workflow editor in general
**Reality:** 19 node types (5 triggers, 5 conditions, 6 actions, 4 transforms)

**Impact:** Implementation detail
**Action:** Updated ARCH_SUMMARY.md with specifics

### 4. File Count Statistics
**CLAUDE.md:** General descriptions
**Reality:** 92 backend TS files (14 controllers, 22 services, 18 models)

**Impact:** Documentation accuracy
**Action:** Updated ARCH_SUMMARY.md with actual counts

### 5. Route Count
**CLAUDE.md:** "26/26 endpoints tested"
**Reality:** 16 route files with 63+ test cases across 8 integration test suites

**Impact:** Test coverage reporting
**Action:** Updated ARCH_SUMMARY.md with accurate test metrics

### 6. Compliance Implementation Status
**CLAUDE.md:** Mentions compliance as planned
**Reality:** Fully implemented (EPA 21 CFR Part 11, ISA-18.2, AWWA M36, IEC 61158, OPC-UA)

**Impact:** Feature completeness
**Action:** Updated ARCH_SUMMARY.md to reflect full implementation

### 7. Redux Async Thunk Typing
**CLAUDE.md:** Not documented
**Reality:** Critical pattern - explicit type parameters required

**Impact:** Development pattern
**Action:** Added to ARCH_SUMMARY.md critical pitfalls

### 8. React Flow Implementation Details
**CLAUDE.md:** Not documented
**Reality:** 4 custom nodes, Handle components with ID branching

**Impact:** Development pattern
**Action:** Added to ARCH_SUMMARY.md

## Actions Taken

### 1. Created ADRs
- **ADR-003:** Redux Toolkit state management migration
- **ADR-004:** EPA-compliant 5-year data retention

### 2. Updated ARCH_SUMMARY.md
- Pinned version numbers (Fastify 4.25.2, Redux 2.11.2, etc.)
- Corrected state management architecture
- Updated TTL to 5 years for device_states
- Added workflow editor specifics (19 node types)
- Added file counts (92 backend files)
- Added critical pitfall: Redux async thunk typing
- Added critical pitfall: React Flow Handle ID branching
- Documented compliance implementations

### 3. Preserved CLAUDE.md
- CLAUDE.md serves as high-level overview and quick start guide
- No changes made to preserve stability
- ARCH_SUMMARY.md now source of truth for architecture details

## Validation

**Source of Truth Hierarchy:**
1. **Implemented Code** (highest priority) - `iot-platform/`
2. **ARCH_SUMMARY.md** - Reflects actual code (updated 2026-02-16)
3. **ADRs** - Architectural decisions with context
4. **CLAUDE.md** - High-level overview (may lag behind implementation)

**Scan Method:**
- Explore agent (haiku model) with "very thorough" mode
- 92 backend TypeScript files analyzed
- 30+ frontend component files analyzed
- All integration tests reviewed
- Docker configuration validated
- MongoDB models inspected

## Recommendations

### For Future Development
1. **Update ARCH_SUMMARY.md** after significant architectural changes
2. **Create ADRs** for major decisions (state management, data retention, etc.)
3. **Trust the code** as source of truth when discrepancies arise
4. **Keep CLAUDE.md high-level** - detailed architecture in ARCH_SUMMARY.md

### For Documentation Sync
1. CLAUDE.md: Update line 60 to mention Redux Toolkit as primary
2. CLAUDE.md: Update line 191, 269 to reflect 5-year retention
3. CLAUDE.md: Add workflow node type details (19 types)
4. Consider: Auto-generate ARCH_SUMMARY.md sections from code analysis

## Sign-off

**Scan Date:** 2026-02-16
**Method:** Automated codebase exploration (Explore agent)
**Scope:** Complete `iot-platform/` directory
**Files Analyzed:** 120+ (backend + frontend + config)
**Discrepancies Found:** 8 major
**ADRs Created:** 2
**ARCH_SUMMARY.md:** Updated to reflect reality

**Status:** ✅ Complete - Architecture documentation now accurate
