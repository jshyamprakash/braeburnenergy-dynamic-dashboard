'use client';

import { CodeBlock } from '@/components/guide/CodeBlock';
import { Printer, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const SECTIONS = [
  { id: 'quick-start', title: 'Quick Start' },
  { id: 'dashboard-builder', title: 'Dashboard Builder' },
  { id: 'device-simulator', title: 'Device Simulator' },
  { id: 'workflow-editor', title: 'Workflow Editor' },
  { id: 'alarms', title: 'Alarm Management' },
  { id: 'data-quality', title: 'Data Quality' },
  { id: 'water-quality', title: 'Water Quality' },
  { id: 'modbus', title: 'Modbus Gateway' },
  { id: 'audit-logs', title: 'Audit Logs' },
];

function GuideContent() {
  const [activeSection, setActiveSection] = useState('quick-start');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track active section on scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-50px 0px -66% 0px' }
    );

    SECTIONS.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observerRef.current?.observe(element);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const handlePrint = () => window.print();

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Platform Guide
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="hidden rounded-lg bg-slate-100 p-2 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 sm:flex transition-colors"
              title="Print guide"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg bg-slate-100 p-2 sm:hidden dark:bg-slate-800"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div>
        <div className="grid grid-cols-1 gap-6 py-8 sm:grid-cols-4">
          {/* Sidebar TOC */}
          <aside
            className={`${
              mobileMenuOpen ? 'block' : 'hidden'
            } sm:sticky sm:top-20 sm:block sm:h-max`}
          >
            <nav className="space-y-1">
              {SECTIONS.map(({ id, title }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => {
                    setActiveSection(id);
                    setMobileMenuOpen(false);
                  }}
                  className={`block rounded px-3 py-2 text-sm transition-colors ${
                    activeSection === id
                      ? 'text-indigo-600 dark:text-indigo-400 font-medium border-l-2 border-l-indigo-500 pl-2 -ml-0.5 bg-indigo-50/60 dark:bg-indigo-950/30'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 border-l-2 border-l-transparent'
                  }`}
                >
                  {title}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content area */}
          <div className="sm:col-span-3">
            {/* Quick Start */}
            <section
              id="quick-start"
              className="mb-12 scroll-mt-24"
            >
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                Quick Start
              </h2>
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <p>
                  Welcome to the IoT Platform. This guide covers the key features and workflows to help you get
                  started with device management, dashboards, and real-time monitoring.
                </p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Authentication
                </h3>
                <p>
                  All users authenticate with JWT tokens. Upon first login, a refresh token is stored locally
                  and used to automatically refresh your session. Tokens are tracked in the backend for
                  security—logging out immediately revokes your token.
                </p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Key Concepts
                </h3>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>Devices:</strong> IoT sensors or instruments that transmit telemetry data
                  </li>
                  <li>
                    <strong>Dashboards:</strong> Customizable layouts of data blocks (gauges, charts, live feeds)
                  </li>
                  <li>
                    <strong>Workflows:</strong> Visual automation pipelines triggered by events or schedules
                  </li>
                  <li>
                    <strong>Alarms:</strong> Rules that activate when sensor data crosses thresholds
                  </li>
                  <li>
                    <strong>Compliance:</strong> EPA/AWWA frameworks for water quality and data retention
                  </li>
                </ul>
              </div>
            </section>

            {/* Dashboard Builder */}
            <section
              id="dashboard-builder"
              className="mb-12 scroll-mt-24"
            >
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                Dashboard Builder
              </h2>
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <p>
                  Create custom dashboards by dragging and dropping data visualization blocks onto a grid
                  layout.
                </p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  How to Create a Dashboard
                </h3>
                <ol className="list-inside list-decimal space-y-2">
                  <li>Navigate to Dashboards → Dashboard Builder</li>
                  <li>Click the <strong>Edit</strong> button to toggle edit mode</li>
                  <li>Select a block type from the Block Palette (Gauge, Chart, or Live Stream)</li>
                  <li>Drag it onto the grid and position it as desired</li>
                  <li>Click the block to open its config panel and select a device/field</li>
                  <li>
                    Resize the block by dragging the bottom-right corner
                  </li>
                  <li>Dashboards auto-save after 1 second of inactivity</li>
                </ol>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Block Types
                </h3>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>Gauge:</strong> Radial gauge showing current sensor value with color zones
                  </li>
                  <li>
                    <strong>Time Series Chart:</strong> Line, area, or bar chart of historical data
                  </li>
                  <li>
                    <strong>Live Stream:</strong> Real-time feed of incoming sensor readings
                  </li>
                </ul>
              </div>
            </section>

            {/* Device Simulator */}
            <section
              id="device-simulator"
              className="mb-12 scroll-mt-24"
            >
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                Device Simulator
              </h2>
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <p>
                  The device simulator generates realistic synthetic data for testing. Run it from the
                  backend directory.
                </p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Basic Usage
                </h3>
                <CodeBlock
                  label="Run simulator with 5 devices"
                  language="bash"
                  code="cd iot-platform/apps/api\npnpm run simulate -- --devices 5 --interval 1s"
                />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Device Profiles
                </h3>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>Temperature Sensor:</strong> 15–35°C with ±0.5°C drift
                  </li>
                  <li>
                    <strong>Pressure Gauge:</strong> 980–1030 hPa with periodic spikes
                  </li>
                  <li>
                    <strong>Air Quality:</strong> AQI 0–500 with anomalies
                  </li>
                  <li>
                    <strong>Energy Monitor:</strong> 0–10 kW with realistic consumption patterns
                  </li>
                  <li>
                    <strong>Vibration Sensor:</strong> 0–100 Hz acceleration
                  </li>
                </ul>
              </div>
            </section>

            {/* Workflow Editor */}
            <section
              id="workflow-editor"
              className="mb-12 scroll-mt-24"
            >
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                Workflow Editor
              </h2>
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <p>
                  Workflows are visual automation pipelines. Create them by connecting nodes on a canvas
                  and then execute them on-demand or on a schedule.
                </p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Creating a Workflow
                </h3>
                <ol className="list-inside list-decimal space-y-2">
                  <li>Navigate to Workflows → New Workflow (or select a template)</li>
                  <li>Drag trigger nodes (Device Update, Schedule, Manual) from the palette</li>
                  <li>Add condition and action nodes to build your logic</li>
                  <li>Click and drag from Handle ports to connect nodes</li>
                  <li>Save the workflow (auto-save every 1 second)</li>
                  <li>Click Run to execute the workflow and see step-by-step logs</li>
                </ol>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Node Types (19 total)
                </h3>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>Triggers (5):</strong> Device Update, Schedule, Manual, Webhook, Alarm
                  </li>
                  <li>
                    <strong>Conditions (5):</strong> Threshold, Range, Deviation, Rate of Change, Quality
                  </li>
                  <li>
                    <strong>Actions (6):</strong> HTTP Request, Email, Slack, Database Insert, Transform,
                    Aggregate
                  </li>
                  <li>
                    <strong>Transforms (4):</strong> Map, Filter, Group, Calculate
                  </li>
                </ul>
              </div>
            </section>

            {/* Alarm Management */}
            <section
              id="alarms"
              className="mb-12 scroll-mt-24"
            >
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                Alarm Management
              </h2>
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <p>
                  Alarms notify you when sensor data triggers configured rules. They follow the ISA-18.2
                  state machine for rigorous alert management.
                </p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  ISA-18.2 State Machine
                </h3>
                <CodeBlock
                  label="Alarm states and transitions"
                  language="text"
                  code="ACTIVE_UNACKED → ACTIVE_ACKED → CLEARED\n\n- ACTIVE_UNACKED: Alarm triggered, operator must acknowledge\n- ACTIVE_ACKED: Operator acknowledged the alarm\n- CLEARED: Condition no longer met, alarm resolved"
                />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Alarm Types
                </h3>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>Threshold:</strong> Trigger when value exceeds a limit
                  </li>
                  <li>
                    <strong>Range:</strong> Trigger when value outside min–max band
                  </li>
                  <li>
                    <strong>Deviation:</strong> Trigger when rate of change exceeds threshold
                  </li>
                  <li>
                    <strong>Rate of Change:</strong> Trigger on rapid slope changes
                  </li>
                  <li>
                    <strong>Quality:</strong> Trigger when data quality score drops below threshold
                  </li>
                </ul>
              </div>
            </section>

            {/* Data Quality */}
            <section
              id="data-quality"
              className="mb-12 scroll-mt-24"
            >
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                Data Quality
              </h2>
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <p>
                  The platform validates all incoming sensor data against configurable rules and computes
                  a quality score (0–100). This is essential for EPA QAPP compliance.
                </p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Validation Rules
                </h3>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>RANGE:</strong> Value must fall within min–max bounds
                  </li>
                  <li>
                    <strong>RATE_OF_CHANGE:</strong> Change per time unit must not exceed limit
                  </li>
                  <li>
                    <strong>MISSING_VALUE:</strong> Field cannot be null or undefined
                  </li>
                  <li>
                    <strong>SPIKE:</strong> Sudden jump beyond σ threshold
                  </li>
                  <li>
                    <strong>DUPLICATE:</strong> Consecutive identical readings flagged for review
                  </li>
                  <li>
                    <strong>PRECISION:</strong> Decimal precision must match expected
                  </li>
                  <li>
                    <strong>OUTLIER:</strong> Statistical anomaly detection (IQR method)
                  </li>
                </ul>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Quality Score
                </h3>
                <p>
                  Score = (passed validations / total validations) × 100
                </p>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>81–100:</strong> Pass (green) — data ready for use
                  </li>
                  <li>
                    <strong>51–80:</strong> Marginal (yellow) — review before use
                  </li>
                  <li>
                    <strong>0–50:</strong> Fail (red) — flag for investigation
                  </li>
                </ul>
              </div>
            </section>

            {/* Water Quality */}
            <section
              id="water-quality"
              className="mb-12 scroll-mt-24"
            >
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                Water Quality Compliance
              </h2>
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <p>
                  The platform enforces EPA 40 CFR Part 141 and AWWA M36 standards for water quality
                  monitoring. All measurements are automatically validated and compliance reports generated.
                </p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  EPA Parameters
                </h3>
                <p>
                  The system ships with 60+ EPA/AWWA parameters including:
                </p>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>Temperature:</strong> 0.1–30°C (Celsius)
                  </li>
                  <li>
                    <strong>pH:</strong> 6.5–8.5 (dimensionless)
                  </li>
                  <li>
                    <strong>Turbidity:</strong> ≤0.5 NTU (Nephelometric Turbidity Units)
                  </li>
                  <li>
                    <strong>Chlorine:</strong> 0.2–4.0 mg/L (residual free chlorine)
                  </li>
                  <li>
                    <strong>Bacteria (Total Coliform):</strong> 0 CFU/100mL
                  </li>
                </ul>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Sampling Requirements
                </h3>
                <p>
                  Different parameters require different sampling frequencies. The platform tracks compliance
                  with AWWA M36 sampling schedules automatically.
                </p>
              </div>
            </section>

            {/* Modbus Gateway */}
            <section
              id="modbus"
              className="mb-12 scroll-mt-24"
            >
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                Modbus Gateway
              </h2>
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <p>
                  Connect to legacy industrial equipment via Modbus TCP or RTU. The gateway automatically
                  polls registers and ingests data into the platform.
                </p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Supported Protocols
                </h3>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>Modbus TCP:</strong> Ethernet-based, port 502 (default)
                  </li>
                  <li>
                    <strong>Modbus RTU:</strong> Serial or TCP wrapper, binary encoding
                  </li>
                </ul>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Register Types
                </h3>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>Holding Registers:</strong> Read/write 16-bit values
                  </li>
                  <li>
                    <strong>Input Registers:</strong> Read-only 16-bit values
                  </li>
                  <li>
                    <strong>Coils:</strong> Read/write boolean (1-bit)
                  </li>
                  <li>
                    <strong>Discrete Inputs:</strong> Read-only boolean
                  </li>
                </ul>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Data Types
                </h3>
                <p>
                  Registers are combined to form larger data types:
                </p>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>int16, uint16:</strong> Single register
                  </li>
                  <li>
                    <strong>int32, uint32:</strong> Two registers (big-endian or little-endian)
                  </li>
                  <li>
                    <strong>float:</strong> IEEE 754 (two registers)
                  </li>
                  <li>
                    <strong>boolean:</strong> Coil or discrete input
                  </li>
                </ul>
              </div>
            </section>

            {/* Audit Logs */}
            <section
              id="audit-logs"
              className="mb-12 scroll-mt-24"
            >
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                Audit Logs
              </h2>
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                <p>
                  The platform maintains an immutable audit trail of all CRUD operations for EPA 21 CFR
                  Part 11 compliance. Logs are retained for 10 years.
                </p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Logged Events
                </h3>
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong>Create:</strong> New device, workflow, rule, dashboard
                  </li>
                  <li>
                    <strong>Read:</strong> Accessed sensitive resources
                  </li>
                  <li>
                    <strong>Update:</strong> Field changes with before/after values
                  </li>
                  <li>
                    <strong>Delete:</strong> Removed resources and reason
                  </li>
                </ul>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Audit Log Fields
                </h3>
                <CodeBlock
                  label="Example audit log entry"
                  language="json"
                  code={`{
  "timestamp": "2026-02-20T14:32:45Z",
  "userId": "user_123",
  "action": "UPDATE",
  "resource": "device",
  "resourceId": "dev_456",
  "status": "SUCCESS",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "changes": {
    "before": { "status": "active" },
    "after": { "status": "inactive" }
  }
}`}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <>
      <GuideContent />
    </>
  );
}
