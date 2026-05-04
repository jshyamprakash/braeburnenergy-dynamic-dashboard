# Client Feasibility Report
## Kosmos Cortex Platform — Proposed Capabilities

**Date:** 2026-04-25
**Prepared by:** Sarvam Infotech
**Classification:** Client Discussion Document

---

## Overview

This document covers the feasibility of five key capabilities discussed with the client, assessed against the current state of the Kosmos Cortex platform.

---

## 1. Data Improvisation via Workflow → AI/ML Model → Dashboard Widget

### What is being proposed
- Raw sensor/device data flows through a **Visual Workflow** (drag-and-drop pipeline).
- Inside the workflow, a **Model Node** sends the data to an AI/ML model (e.g., a combustion prediction model, anomaly detector, or digital twin endpoint).
- The model's output (predictions, scores, recommendations) is routed back into the platform and mapped to specific **dashboard widgets**.

### Feasibility: FEASIBLE with planned development

**What already exists:**
- The Visual Workflow Editor is fully built with a node-based pipeline (triggers → conditions → transformations → actions).
- A `logic:function` node (custom JavaScript sandbox) can already call external HTTP endpoints — meaning an existing AI model API can be integrated today by writing a short fetch call inside this node.
- The workflow can write results to device state via `action:writeDeviceState`, which the dashboard reads in real time via WebSocket.
- Dashboard widgets already bind to device state streams and update live.

**What needs to be built:**
- A dedicated **Model Node** (first-class UI node in the palette) with a clean configuration panel: model endpoint URL, input field mapping, output field mapping, authentication headers. This is a UI/UX improvement over the raw function node, not a new architectural capability.
- Widget-level binding to a named model output field (a configuration option in the widget's config panel).

**Data flow (end-to-end):**
```
Device/Sensor Data
    → Workflow Trigger (e.g., on new device state)
    → Transform Node (clean/normalise data)
    → Model Node (POST to model API → get prediction)
    → action:writeDeviceState (store result as a virtual device channel)
    → WebSocket pushes update to dashboard
    → Widget renders the prediction value in real time
```

**Effort estimate:** Medium (3–5 days for the Model Node UI + widget binding config)

---

## 2. Combustion DL — Multiple Screens, Admin-Controlled Widget Layout

### What is being proposed
- The Combustion DL section of the dashboard should support **multiple screens (pages)**.
- An **Admin** decides which widgets appear on which screen.
- Each screen can have a different set of widgets arranged freely.

### Feasibility: FULLY FEASIBLE — largely already built

**What already exists:**
- The Kosmos dashboard has a **multi-page architecture** where each dashboard can have unlimited pages/screens.
- Each page is independent: widgets are added, resized, and repositioned per page via drag-and-drop.
- The Combustion DL tab is a dedicated mandatory page, and additional custom pages can be added alongside it.
- Admins (and Operators with permission) access an **Edit Mode** to manage the layout — adding widgets from a palette, dragging them to position, resizing them, and removing them. Changes auto-save within 2 seconds.
- A **Reset Page** button restores a page to its default layout if needed.

**What needs to be confirmed with client:**
- Should the multiple screens be sub-tabs *within* Combustion DL, or separate top-level dashboard tabs? (Both are possible; sub-tabs would require a small UI addition.)

**Effort estimate:** Low (1–2 days if sub-tabs are needed; zero effort if top-level tabs suffice)

---

## 3. Admin Assigns Dashboard to Viewer — Viewer Sees Only Their Assigned Dashboard

### What is being proposed
- An Admin selects which users can see a specific dashboard.
- A **Viewer** logs in and sees only the dashboards assigned to them — no access to others.
- The Viewer's interface is a clean, read-only display with no edit controls.

### Feasibility: FULLY FEASIBLE — already built

**What already exists:**
- A dedicated **Viewer role** is implemented at the platform level.
- Each dashboard has a `sharedWithUsers` list. Admins use a built-in **Share modal** (👥 SHARE button) to select users from a searchable list and save the assignment.
- A dedicated **Viewer page** (`/viewer`) shows the logged-in viewer only the dashboards they have been assigned to.
- The Viewer kiosk opens dashboards in **read-only mode** — all edit buttons, palettes, and config panels are completely hidden.
- Viewers cannot access any other part of the application.

**No additional development is required for this capability.**

---

## 4. Admin/Operator Working on Multiple Dashboards Simultaneously (Different Logins)

### What is being proposed
- An Admin and an Operator (or multiple users) should be able to work on **different dashboards at the same time** using their own login sessions.
- Each user's changes should not interfere with the other's work.

### Feasibility: FULLY FEASIBLE for different dashboards; noted limitation for same dashboard

**What already exists:**
- Each user authenticates with their own JWT session — sessions are completely independent.
- Dashboards are stored individually in the database; editing Dashboard A has no effect on Dashboard B.
- Multiple users working on **different dashboards simultaneously** is fully supported with no conflicts.

**Noted limitation (same dashboard, multiple editors):**
- If two users edit the **same** dashboard at the same time, the platform uses a **last-write-wins** approach — the second user's save will overwrite the first user's. There is currently no real-time conflict detection or co-editing (like Google Docs).
- For the described use case (Admin on their dashboard, Operator on a different dashboard), this is not a concern.
- If needed, a dashboard-level lock or "currently editing" indicator can be added in a future sprint.

**No additional development is required for the primary use case.**

---

## 5. Widgets Displayed as Icons — Expandable to Show Full Name

### What is being proposed
- Widgets in the dashboard should initially appear as **compact icons**.
- A user can expand an icon to see the widget's full name or details (like a collapsed/expanded menu).

### Feasibility: FEASIBLE with development

**What currently exists:**
- Widgets are rendered in full expanded mode only. There is no compact/icon mode today.
- Widget sizes are controlled by a grid layout (width/height in grid units), so a small widget is already possible by reducing its grid size — but there is no toggle between icon and full view.

**What needs to be built:**
- A **compact mode** for widgets: when the widget's grid cell is below a size threshold, render only an icon + short label instead of the full widget body.
- A click or hover interaction to expand the widget inline (or open it in a panel/modal).
- Icon assets or symbol mapping per widget type.

**Design recommendation:**
- This pattern works well for sensor metric widgets (temperature, pressure, flow rate), where the icon shows a colored status indicator and the full view shows the chart or gauge.
- For complex widgets (charts, timelines), full-size rendering is usually preferred.

**Effort estimate:** Medium (3–4 days for compact mode + expand interaction across all widget types)

---

## 6. Attaching Client Simulated Data (Files or Functions) — Hooked into Pipeline → Dashboard Widgets

### What is being proposed
- The client has their own **simulated data** — either as static files (CSV, JSON) or as simulation scripts/functions that generate realistic sensor readings.
- This data needs to be **ingested into the platform's data pipeline** so it flows through the system exactly as live sensor data would.
- The ingested data should be **mappable to dashboard widgets** — charts, gauges, live stream panels — for demonstration or testing purposes.

### Feasibility: FULLY FEASIBLE — infrastructure already in place

**What already exists:**

- **Device Simulator (built-in):** The platform ships with a ready-made device simulator (`scripts/device-simulator.ts`) that generates realistic data for 5 device profiles — temperature, pressure, air quality, energy, and vibration — with drift, noise, and anomaly patterns. This can be run immediately to populate any dashboard widget with live-simulated data.
  - Run command: `pnpm run simulate -- --devices 5 --interval 1s`

- **REST API Ingestion:** Any external script or file-based data can be posted directly to the platform via REST:
  - `POST /api/v1/applications/:id/devices/:deviceId/states` — accepts a JSON payload with sensor readings. A simple script can read a CSV/JSON file row-by-row and POST each row at a configurable replay speed.

- **MQTT Gateway (built-in):** If the client's simulation tool publishes MQTT messages, the platform has a built-in MQTT Gateway that subscribes to topics and auto-ingests the data — no custom code needed on the platform side.

- **Storage Pipeline:** All ingested data (REST, MQTT, or simulator) flows through the same pipeline: NATS JetStream → Storage Worker → MongoDB time-series collection → WebSocket push → dashboard widget update in real time.

- **Seed Script:** A `seed-kosmos-dashboard.ts` script pre-populates a dashboard with realistic demo data, useful for client presentations without needing live devices.

**Supported ingestion methods:**

| Method | Description | Effort |
|---|---|---|
| Built-in simulator | Run existing simulator scripts — widgets populate immediately | Zero |
| File replay (CSV/JSON) | Write a small replay script that POSTs file rows via REST API | Low (1 day) |
| MQTT publish | Client's tool publishes to an MQTT topic → MQTT Gateway auto-ingests | Zero (config only) |
| Webhook / HTTP push | Client's simulation function POSTs to REST endpoint | Zero (API already exists) |
| Upload UI | Browser-based file upload that triggers a batch ingest | Medium (2–3 days) |

**What the client needs to provide:**
- The format of their simulated data (CSV columns, JSON schema, or MQTT topic structure).
- Whether the simulation is one-shot historical data or continuous streaming.
- Whether they want a UI to upload files, or a command-line/API approach is acceptable.

**No new pipeline or backend architecture is needed.** The platform's data pipeline is agnostic to the data source — simulated data is treated identically to live sensor data once it enters the system.

---

## Summary Table

| # | Capability | Feasibility | Status | Effort |
|---|---|---|---|---|
| 1 | Workflow → Model Node → Dashboard Widget | Feasible | Needs Model Node UI + widget binding | Medium (3–5 days) |
| 2 | Combustion DL — Multiple Admin-Controlled Screens | Fully Feasible | Already built (pages system) | Low / Zero |
| 3 | Admin assigns dashboard to Viewer (read-only) | Fully Feasible | Already built (share + viewer kiosk) | Zero |
| 4 | Admin/Operator on separate dashboards simultaneously | Fully Feasible | Already built (independent sessions) | Zero |
| 5 | Widget icon mode — collapsed/expanded | Feasible | Needs compact mode development | Medium (3–4 days) |
| 6 | Client simulated data → pipeline → dashboard widgets | Fully Feasible | Already built (REST, MQTT, simulator) | Zero to Low |

---

## Key Takeaways

- **Items 2, 3, and 4 require no new development** — they are live capabilities in the platform today.
- **Item 1 (Model Node)** is architecturally supported by the existing workflow engine and WebSocket data pipeline. The work is a UI/configuration layer on top of existing infrastructure.
- **Item 5 (Widget Icons)** is a frontend UX feature that can be phased in — a basic compact mode can ship quickly, with richer expand interactions in a follow-up.
- **Item 6 (Simulated Data)** requires zero backend work. The platform ingests data from REST, MQTT, or the built-in simulator out of the box. A browser-based upload UI is optional and adds ~2–3 days if the client prefers it.
- **Total estimated new development:** 6–9 days for items 1 and 5 combined (item 6 adds 0–3 days depending on UI preference).

---

## Next Steps

1. Confirm with client whether Combustion DL sub-tabs are needed or top-level tabs are sufficient.
2. Confirm the AI/ML model endpoint format (REST API, cloud-hosted, on-premise) for the Model Node design.
3. Prioritise widget icon mode — confirm which widget types should support compact display.
4. Agree on phasing: which capabilities go into the next demo vs. full delivery.
5. For simulated data — confirm the file format (CSV/JSON schema or MQTT topic structure) and whether a browser upload UI is needed or a script/API approach is sufficient.

---

*Document prepared based on current platform codebase as of 2026-04-25.*
*All feasibility assessments reflect implemented architecture and confirmed capability.*
