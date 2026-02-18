# Architecture & Design Documentation

This folder contains system architecture decisions, technology stack justifications, and comprehensive gap analysis comparing the current implementation with Losant.

## 📄 Documents

### **gaps_architecture.md** (CRITICAL - 2,488 lines)
**Comprehensive gap analysis: Current implementation vs Losant IoT Platform**

- Feature parity: 42% (56% gap)
- 16 key capabilities analyzed
- Implementation effort estimates
- Phased roadmap to enterprise readiness (12 weeks, $174K)
- CPF (Connected Product Foundation) requirements
- 3-level tenant hierarchy: Customer → Site → Device
- White-labeling specifications

**Key sections:**
- CPF as production-ready template (8-10 weeks to implement)
- Workflow execution scopes (4 types: Application, Experience, Edge, Embedded)
- Embedded constraints (no parallel, 16-level max depth, no Handlebars)
- Data Tables (50 columns, SQL-like queries)
- Resource Jobs (parallel batch processing with Job Acknowledge)
- Custom HTML with AI code generation
- Jupyter integration with Query Time concept
- SCADA Image Overlay visualization
- Floating Peripherals for multi-gateway support

### **ARCHITECTURE.md**
System architecture overview including:
- Component hierarchy
- Data flow patterns
- Service layer organization
- Cross-cutting concerns (logging, error handling, auth)

### **TECHNOLOGY_STACK_RATIONALE.md**
Justification for technology choices:
- Node.js + Fastify for backend
- Next.js 16 + React 19 for frontend
- MongoDB 8 + Mongoose ODM
- Socket.io for real-time communication
- Redux Toolkit for state management
- Why each choice was made and alternatives considered

### **LOAD_ANALYSIS.md**
System capacity and performance analysis:
- Expected throughput (devices, messages/second)
- Database scaling strategies
- Memory and CPU requirements
- Network bandwidth considerations
- Bottleneck identification

## 🎯 When to Use This Folder

- Understanding system design and architectural patterns
- Feature gap analysis and prioritization
- Identifying implementation effort for new capabilities
- Benchmarking against Losant
- Making architectural decisions for new features
- Understanding technology choices and rationale

## 📊 Key Findings (From gaps_architecture.md)

**Current Feature Parity: 42%**

### Critical Gaps (8-10 weeks to close):
1. **CPF (Connected Product Foundation)** - Multi-tenant production template
2. **White-Labeling** - No-code UI customization (logos, colors)
3. **3-Level Hierarchy** - Customer → Site → Device structure
4. **Data Tables** - 50 columns, SQL-like queryable storage

### Important Gaps (4-5 weeks to close):
5. **Image Overlay (SCADA)** - Dynamic indicators, bars, labels on blueprint
6. **Custom HTML + AI** - Sandboxed visualizations with code generation
7. **Resource Jobs** - Parallel batch processing (up to 10 concurrent)
8. **Jupyter Integration** - Query Time concept for historical analysis

### Medium Priority (2-3 weeks each):
9. **Floating Peripherals** - Multi-gateway support
10. **Embedded Workflows** - Microcontroller OTA updates
11. **Edge Compute** - BACnet, OPC-UA protocols
12. **Streaming Endpoints** - SSE push (we use WebSocket instead - better)

## 🚀 Recommended Implementation Path

**Phase 0 (2 weeks): White-Labeling MVP**
- Logo upload, colors, favicon
- Admin branding UI
- Impact: 1 test customer can use branded platform

**Phase 1 (3 weeks): Multi-Tenant Hierarchy**
- Customer → Site → Device model
- Hierarchical RBAC
- Impact: Enterprise tenant isolation

**Phase 2 (2 weeks): Enterprise Features**
- Data Tables with 50 columns
- Device Recipes (bulk creation)
- Resource Jobs (parallel batch)

**Phase 3 (3 weeks): Advanced Capabilities**
- Image Overlay (SCADA visualization)
- Custom HTML with AI code generation
- Jupyter integration

**Total: 10-12 weeks to 85-90% parity**

---

**Last Updated:** February 17, 2026
**Coverage:** All 5 Losant pillars + CPF analysis
**Methodology:** Feature-by-feature detailed comparison

