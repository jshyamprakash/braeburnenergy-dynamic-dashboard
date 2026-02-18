Based on the architecture rationale, only specific high-throughput components 
  should use Go, not a complete replacement of Node.js.
                                                                                
  ---                                                       
  Why NOT Full Replacement:

  1. Workflow Engine Requires Dynamic Code Execution
    - User-defined Function Nodes need JavaScript/TypeScript runtime (VM2
  sandbox)
    - Go is statically compiled - can't execute user-provided code dynamically
    - Node.js is essential for this requirement
  2. Development Velocity
    - JavaScript/TypeScript faster development than Go (2-3 weeks learning curve
   for team)
    - POC and MVP need rapid iteration
    - Go beneficial only after core platform stabilizes
  3. Ecosystem Fit
    - 2+ million npm packages vs smaller Go ecosystem
    - Shared types between frontend (React) and backend (Node.js)
    - Express/Fastify middleware ecosystem mature for HTTP APIs
  4. Team Expertise
    - Current team JavaScript-focused
    - Go requires specialized hiring or training

  ---
  Suggested Partial Replacement Areas:

  ✅ USE GO FOR (High-Throughput Components):

  ┌─────────────────────┬───────────────────────────────────────────┬──────────┐
  │      Component      │                  Reason                   │ Priority │
  ├─────────────────────┼───────────────────────────────────────────┼──────────┤
  │ Gateway Edge Agents │ Protocol translation (Modbus, OPC UA,     │ Phase    │
  │                     │ BACnet, S7)                               │ 2-3      │
  ├─────────────────────┼───────────────────────────────────────────┼──────────┤
  │ Data Ingestors      │ Pre-processing device data before cloud   │ Phase 3  │
  ├─────────────────────┼───────────────────────────────────────────┼──────────┤
  │ Message Router      │ MQTT → NATS bridge optimization           │ Phase 3  │
  ├─────────────────────┼───────────────────────────────────────────┼──────────┤
  │ Time-Series         │ Local data aggregation at edge            │ Phase 3  │
  │ Compressor          │                                           │          │
  ├─────────────────────┼───────────────────────────────────────────┼──────────┤
  │ Protocol Parsers    │ Low-level Profinet/S7 parsing             │ Phase 3  │
  └─────────────────────┴───────────────────────────────────────────┴──────────┘

  ❌ KEEP NODE.JS FOR:

  ┌────────────────────────┬───────────────────────────────────────────────┐
  │       Component        │                    Reason                     │
  ├────────────────────────┼───────────────────────────────────────────────┤
  │ Fastify API            │ REST endpoints, schema validation, middleware │
  ├────────────────────────┼───────────────────────────────────────────────┤
  │ Workflow Engine        │ Dynamic function node execution (VM2 sandbox) │
  ├────────────────────────┼───────────────────────────────────────────────┤
  │ WebSocket Server       │ Socket.io for real-time dashboards            │
  ├────────────────────────┼───────────────────────────────────────────────┤
  │ Authentication Service │ JWT tokens, session management                │
  ├────────────────────────┼───────────────────────────────────────────────┤
  │ Dashboard Backend      │ Server-side rendering (Next.js)               │
  ├────────────────────────┼───────────────────────────────────────────────┤
  │ Business Logic         │ CRUD operations, validation, orchestration    │
  └────────────────────────┴───────────────────────────────────────────────┘

  ---
  Recommended Architecture (Scaled):

  ┌─────────────────────────────────────────────────────┐
  │ Edge Compute Layer (GO)                             │
  │  ┌──────────────────────────────────────────────┐   │
  │  │ Gateway Edge Agent (Go Binary)               │   │
  │  │  - Modbus TCP/RTU parser                     │   │
  │  │  - OPC UA client                             │   │
  │  │  - BACnet protocol handler                   │   │
  │  │  - Data aggregation (reduce payload 80%)     │   │
  │  │  - Local buffering (FIFO queue)              │   │
  │  └──────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────┘
                          │
                     (MQTT, reduced traffic)
                          ▼
  ┌─────────────────────────────────────────────────────┐
  │ Cloud Layer (NODE.JS)                               │
  │  ┌──────────────────────────────────────────────┐   │
  │  │ EMQX MQTT Broker                             │   │
  │  │  - Device authentication                     │   │
  │  │  - ACL enforcement                           │   │
  │  └──────────────────────────────────────────────┘   │
  │  ┌──────────────────────────────────────────────┐   │
  │  │ Fastify API (Node.js)                        │   │
  │  │  - CRUD operations                           │   │
  │  │  - Business logic                            │   │
  │  │  - REST endpoints                            │   │
  │  └──────────────────────────────────────────────┘   │
  │  ┌──────────────────────────────────────────────┐   │
  │  │ Workflow Engine (Node.js)                    │   │
  │  │  - Dynamic function execution (VM2)          │   │
  │  │  - Orchestration                             │   │
  │  └──────────────────────────────────────────────┘   │
  │  ┌──────────────────────────────────────────────┐   │
  │  │ Socket.io WebSocket (Node.js)                │   │
  │  │  - Real-time dashboard updates               │   │
  │  │  - Live data streaming                       │   │
  │  └──────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────┘


  ---
  Timeline for Go Implementation:

  ┌─────────┬──────────────────────────┬─────────────────────────────────┐
  │  Phase  │         Timeline         │          Go Components          │
  ├─────────┼──────────────────────────┼─────────────────────────────────┤
  │ Phase 1 │ Now (POC)                │ None - All Node.js              │
  ├─────────┼──────────────────────────┼─────────────────────────────────┤
  │ Phase 2 │ 10k+ devices (Month 3-4) │ Gateway Edge Agents (optional)  │
  ├─────────┼──────────────────────────┼─────────────────────────────────┤
  │ Phase 3 │ 100k+ devices (Month 6+) │ Data ingestors, message routers │
  ├─────────┼──────────────────────────┼─────────────────────────────────┤
  │ Phase 4 │ 1M+ devices (Month 12+)  │ Full edge computing stack       │
  └─────────┴──────────────────────────┴─────────────────────────────────┘

  ---
  Example: Gateway Edge Agent in Go (Pseudo-code)

  // apps/edge/gateway-agent/main.go
  package main

  import (
        "github.com/eclipse/paho.mqtt.golang"
        "github.com/gosnmp/gosnmp"
  )

  // ModbusReader reads from Modbus RTU device
  func ReadModbusDevice(deviceConfig Config) {
        // 1. Read Modbus registers (fast, compiled)
        temp := readModbusRegister(deviceConfig.Address, 0x0000)
        pressure := readModbusRegister(deviceConfig.Address, 0x0001)

        // 2. Aggregate locally (reduce payload)
        aggregated := AggregateData([]float64{temp, pressure})

        // 3. Send to MQTT broker (less frequent, smaller payload)
        mqtt.Publish("losant/device123/state", aggregated)
  }

  // Send 100 readings every 5 minutes vs 100 times per minute
  // Reduce cloud traffic 80%+ while maintaining data integrity

  Benefits:
  - 10-50MB memory footprint (vs 100-200MB Node.js)
  - Handles 1000+ Modbus devices per agent
  - Data aggregation reduces cloud traffic 80%
  - Static binary - easy deployment

  ---
  Decision Summary:

  Decision: Keep Node.js as primary
  Rationale: Workflow engine needs dynamic code execution
  ────────────────────────────────────────
  Decision: Add Go for edge agents
  Rationale: 2-5x performance, lower memory, industrial protocols
  ────────────────────────────────────────
  Decision: Hybrid approach
  Rationale: Node.js cloud + Go edge = optimal for IoT
  ────────────────────────────────────────
  Decision: When to implement
  Rationale: After POC complete, when scaling beyond 10k devices
  ────────────────────────────────────────
  Decision: Not urgent for MVP
  Rationale: Device simulator + cloud-only sufficient for initial scale

  Current recommendation: Complete Node.js POC first, then add Go edge agents
  when you have 10k+ devices or edge protocol requirements.
  ctrl+q to copy
