# Reference & Quick Guides

This folder contains quick reference materials, guides, API documentation, and user instructions.

## 📄 Documents

### **README.md**
Main project overview and quick start guide.

### **API_INDEX.md**
Complete API endpoint reference including:
- REST endpoints (Devices, States, Workflows, Organizations)
- WebSocket events (real-time connections)
- Request/response schemas
- Error codes and status messages
- Authentication requirements

**Use when:** Looking up endpoint paths, request formats, or response structures

### **SIMULATOR_GUIDE.md**
Device simulator usage and configuration:
- How to run the simulator
- Device profiles (temperature, pressure, air quality, energy, vibration)
- Data generation options
- Integration with running API
- Troubleshooting common issues

**Use when:** Setting up test devices or generating demo data

### **USER_GUIDE.md**
End-user documentation for operators:
- Dashboard navigation
- Creating and managing devices
- Viewing real-time data
- Creating dashboards
- Setting alerts
- Exporting data

**Use when:** Training operators or documenting user workflows

### **IMPLEMENTATION_GUIDE.md**
Step-by-step implementation guide for developers:
- Project setup
- Database configuration
- Running services
- Building features
- Testing procedures
- Deployment

**Use when:** Setting up development environment or onboarding new developers

### **IMPLEMENTATION_REFERENCE.md**
Reference materials and patterns:
- Code examples
- Common patterns
- Best practices
- Architecture diagrams
- Technology references

**Use when:** Looking for code examples or architectural patterns

### **WHATS_NEXT.md**
Roadmap and future capabilities:
- Upcoming features
- Planned improvements
- Known limitations
- Feature requests
- Next steps for development

**Use when:** Planning future work or understanding roadmap

## 🎯 Common Tasks

### Task: Find an API Endpoint
1. Go to **API_INDEX.md**
2. Search for the resource (e.g., "devices")
3. Find the endpoint method (GET/POST/PUT/DELETE)
4. Copy the path and request schema

### Task: Set Up the Device Simulator
1. Read **SIMULATOR_GUIDE.md**
2. Run: `pnpm run simulate -- --devices 5 --interval 1s`
3. Verify devices appear in dashboard
4. Customize device profiles as needed

### Task: Train a New Operator
1. Have them read **USER_GUIDE.md**
2. Walk through dashboard navigation
3. Create a test dashboard together
4. Practice adding devices and viewing data

### Task: Onboard a New Developer
1. Have them read **IMPLEMENTATION_GUIDE.md**
2. Follow setup steps in order
3. Run the dev server: `pnpm run dev`
4. Explore the codebase following patterns in **IMPLEMENTATION_REFERENCE.md**

## 📚 Document Usage by Role

### For Operations/Support
- **USER_GUIDE.md** - How to use the platform
- **API_INDEX.md** - Understanding API capabilities
- **WHATS_NEXT.md** - What features are coming

### For Developers
- **IMPLEMENTATION_GUIDE.md** - Setup and development
- **IMPLEMENTATION_REFERENCE.md** - Code patterns and examples
- **API_INDEX.md** - Building API integrations
- **SIMULATOR_GUIDE.md** - Testing with synthetic data

### For DevOps/Infrastructure
- See `docs/infrastructure/` folder

### For Project Managers
- See `docs/planning/` folder
- **WHATS_NEXT.md** - Roadmap overview

## 🔗 Quick Links

### API Documentation
- **REST Endpoints:** API_INDEX.md
- **WebSocket Events:** API_INDEX.md (WebSocket section)
- **Data Models:** See implementation/data/ docs

### How-To Guides
- **Device Setup:** USER_GUIDE.md
- **Dashboard Creation:** USER_GUIDE.md
- **Data Export:** USER_GUIDE.md
- **Alert Configuration:** USER_GUIDE.md

### Development Resources
- **Project Setup:** IMPLEMENTATION_GUIDE.md
- **Code Examples:** IMPLEMENTATION_REFERENCE.md
- **Common Patterns:** IMPLEMENTATION_REFERENCE.md
- **Architecture:** See docs/architecture/ folder

### Troubleshooting
- **API Issues:** API_INDEX.md (error codes)
- **Simulator Problems:** SIMULATOR_GUIDE.md
- **Deployment Issues:** See docs/infrastructure/DEPLOYMENT.md

## 📖 Reading Recommendations

**For Quick Start:**
1. README.md (5 min)
2. IMPLEMENTATION_GUIDE.md (20 min)
3. API_INDEX.md (browse)

**For Comprehensive Understanding:**
1. README.md
2. IMPLEMENTATION_GUIDE.md
3. IMPLEMENTATION_REFERENCE.md
4. USER_GUIDE.md (if supporting users)
5. Relevant docs in `/implementation/`, `/architecture/`, `/infrastructure/`

**For API Integration:**
1. API_INDEX.md (find endpoints)
2. IMPLEMENTATION_REFERENCE.md (see examples)
3. Relevant API section in implementation/core/ or implementation/backend/

---

**Last Updated:** February 17, 2026
**Target Audience:** Developers, Operators, DevOps, Support
**Coverage:** Quick references and guides
