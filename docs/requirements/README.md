# Requirements & Analysis

This folder contains requirements documentation, Losant platform analysis, and comparative studies.

## 📄 Documents

### **Briefing_Document.md** (149 lines - CRITICAL)
**Losant Platform Briefing: Comprehensive Feature Overview**

Executive summary of Losant's five-pillar architecture:
- **Connected Product Foundation (CPF)** - Production-ready multi-tenant template
- **Device Connectivity** - MQTT, REST, gateway support, peripheral types
- **Visual Workflow Engine** - 4 execution scopes (Application, Experience, Edge, Embedded)
- **Data Visualization** - 25+ blocks, custom HTML, SCADA overlays, Jupyter
- **End-User Experiences** - Custom web apps, SSE streaming, API endpoints
- **Advanced Features** - Data Tables, Resource Jobs, Jupyter integration

**Key Insights:**
- Workflow types: Application (cloud), Experience (web UI), Edge (gateway), Embedded (microcontroller)
- Embedded constraints: no parallel paths, 16-level max payload depth, no Handlebars
- Data Tables: 50 columns max, 3 types (String, Number, Boolean), SQL-like queries
- Resource Jobs: Parallel execution (up to 10 concurrent) with Job Acknowledge Node requirement
- User Roles: 3 roles (Viewer, Editor, Admin) with hierarchy-aware scoping
- White-labeling: No-code UI customization (logos, colors, navigation)

**Use when:** Understanding Losant capabilities, benchmarking, or gap analysis

---

### **LOSANT_REQUIREMENTS.md**
Updated summarized version of Losant key features:
- Feature requirements extracted from deeper analysis
- Specific constraints and limitations
- Implementation considerations
- Integration patterns

**Use when:** Planning implementation, understanding Losant specifics

---

### **Losant_IoT_Architecture_Deep_Dive.pdf**
Visual diagrams and comprehensive architecture documentation from Losant:
- Five-pillar model diagram
- CPF structure and hierarchy
- Device connectivity types
- Edge compute architecture
- Workflow execution model
- Visualization blocks overview

**Use when:** Visual understanding of architecture, presentations, team briefings

---

## 📊 Comparative Analysis

### Feature Parity Summary
**Current Implementation:** 42% of Losant feature set
**Gap:** 56% (9 missing, 4 partial, 3 matched)

| Feature | Losant | Current | Gap |
|---------|--------|---------|-----|
| CPF Template | ✅ | ❌ | Critical |
| White-labeling | ✅ | ❌ | Critical |
| 3-level Hierarchy | ✅ | 🔄 | Critical |
| Data Tables (50 cols) | ✅ | ❌ | High |
| Resource Jobs | ✅ | ❌ | High |
| Image Overlay (SCADA) | ✅ | ❌ | High |
| Custom HTML + AI | ✅ | ❌ | High |
| Floating Peripherals | ✅ | ❌ | Medium |
| Jupyter Integration | ✅ | ❌ | Medium |
| Workflow Scopes (4) | ✅ | 🔄 (1 only) | High |

**See:** docs/architecture/gaps_architecture.md for detailed analysis

---

## 🎯 Use Cases

### Benchmarking Against Losant
1. Read **Briefing_Document.md** for Losant features
2. Check **gaps_architecture.md** in architecture/ for comparison
3. Identify priority gaps
4. Plan implementation roadmap

### Understanding Requirements
1. Read **Briefing_Document.md** for overview
2. Review specific sections for detailed specs
3. Cross-reference with **LOSANT_REQUIREMENTS.md**
4. Consult **gaps_architecture.md** for implementation context

### Planning Enterprise Features
1. Review **Briefing_Document.md** CPF section
2. Check **gaps_architecture.md** for effort estimates
3. Consult **planning/POC_TO_ENTERPRISE_PLAN.md** for roadmap
4. Review **compliance/** for regulatory requirements

---

## 📈 Key Requirements

### CPF (Connected Product Foundation)
- Multi-tenant: Customer → Site → Device (3-level)
- White-labeling: Logos, colors, navigation (no-code)
- User management: Invitations, password reset, RBAC
- Device recipes: Template-based bulk creation
- Pre-built workflows: Registration, onboarding, alerts

**Implementation effort:** 8-10 weeks
**Business impact:** Critical for enterprise sales

### Advanced Visualization
- **Image Overlay (SCADA):** Indicators, bars, labels on blueprints
- **Custom HTML:** AI code generation for Chart.js, Google Charts, D3.js
- **Jupyter:** Query Time concept for relative historical analysis
- **Data Tables:** 50 columns, SQL-like queries

**Implementation effort:** 4-5 weeks for core features
**Business impact:** Differentiator for industrial IoT

### Data Processing
- **Resource Jobs:** Parallel batch (up to 10 concurrent)
- **Data Tables:** SQL-like queryable storage
- **Jupyter:** Batch analytics and ML model training

**Implementation effort:** 2-3 weeks
**Business impact:** Enterprise operations efficiency

---

## 📋 Requirements Traceability

### From Briefing Document to Implementation
- CPF → See `planning/POC_TO_ENTERPRISE_PLAN.md` (Phase 3)
- White-labeling → See `planning/` for timeline
- Workflows (4 scopes) → See `implementation/` for current status
- Data Tables → See `implementation/data/` for patterns
- SCADA → See `architecture/gaps_architecture.md` for design

---

## 🔍 Analysis Documents

See **docs/architecture/gaps_architecture.md** for:
- Detailed feature-by-feature comparison
- Implementation effort estimates
- Critical path to enterprise readiness
- Budget and resource requirements

---

**Last Updated:** February 17, 2026
**Primary Source:** Losant Enterprise IoT Platform
**Analysis Coverage:** All 5 pillars + CPF + Enterprise features
**Feature Parity:** 42% → Target 85% (12 weeks with CPF)

