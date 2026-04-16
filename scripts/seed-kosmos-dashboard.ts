#!/usr/bin/env node
/**
 * Seed Script: Kosmos Overview Dashboard
 *
 * Creates a Kosmos-format dashboard (pages[] + KosmosWidget[]) pre-wired to
 * the module devices (be_sense_edge + combustion_ml_engine).
 *
 * Prerequisites (run in order):
 *   1. pnpm seed:admin
 *   2. pnpm seed:poc-demo
 *   3. pnpm seed:module-devices
 *   4. pnpm seed:kosmos-dashboard   ← this script
 *
 * Idempotent: safe to run multiple times.
 */

import mongoose from 'mongoose';
import { config } from '../iot-platform/apps/api/src/config/config';
import { Device } from '../iot-platform/apps/api/src/models/device.model';
import { Dashboard } from '../iot-platform/apps/api/src/models/dashboard.model';
import { AlarmRule } from '../iot-platform/apps/api/src/models/alarm-rule.model';
import { Application } from '../iot-platform/apps/api/src/models/application.model';

const ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const KOSMOS_DASHBOARD_ID = 'kosmos-overview-dashboard';

// ─── Kosmos widget layout constants ─────────────────────────────────────────

const DATAFLOW_DEFAULT_CONFIG = {
  title: 'DATA FLOW — KOSMOS PLATFORM',
  layers: [
    {
      id: 'physical',
      label: 'Physical Layer',
      blocks: [
        { id: 'b1', label: 'Gas Turbine\nGE / Siemens / MHI', color: 'sensor' },
        { id: 'b2', label: 'Balance of Plant', color: 'sensor' },
      ],
      arrowAfter: 'none',
    },
    {
      id: 'be_sense',
      label: 'BE Sense™',
      blocks: [
        { id: 'b3', label: 'Multimodal\nSensor Fusion', color: 'fusion' },
        { id: 'b4', label: 'CalorieSense™\nEdge', color: 'fusion' },
      ],
      arrowAfter: 'bidirectional',
    },
    {
      id: 'be_agent',
      label: 'BE Agent™',
      blocks: [
        { id: 'b5', label: 'Agentic AI\nFramework', color: 'agent' },
        { id: 'b6', label: 'CD Precursor\nDetection', color: 'agent' },
      ],
      arrowAfter: 'forward',
    },
    {
      id: 'cloud_onprem',
      label: 'Cloud / On-Prem',
      blocks: [
        { id: 'b7', label: 'Fleet\nAnalytics', color: 'cloud' },
        { id: 'b8', label: 'Asset Life\nManagement', color: 'cloud' },
      ],
      arrowAfter: 'bidirectional',
    },
    {
      id: 'outputs',
      label: 'Outputs',
      blocks: [
        { id: 'b9', label: 'CMMS\nIntegration', color: 'output' },
        { id: 'b10', label: 'Operator\nDashboard', color: 'output' },
      ],
      arrowAfter: 'forward',
    },
  ],
};

// ─── Build KosmosPage ────────────────────────────────────────────────────────

function buildOverviewPage(combustionDeviceId: string, beSenseDeviceId: string) {
  return {
    id: 'page-kosmos-overview',
    name: 'Overview',
    order: 0,
    isMandatory: true,
    mandatoryType: 'overview',
    layoutVersion: 2,
    layoutSchemaVersion: 3,
    widgets: [
      // ── BE Sense sensor panel ──────────────────────────────────────────────
      {
        id: 'w-besense',
        type: 'overviewBeSense',
        layout: { x: 16, y: 16, w: 300, h: 760 },
        config: {
          deviceId: combustionDeviceId,
          cvFieldName: 'shannon_entropy',
          sampleRate: '50 kHz',
          channels: '16 Active',
          latency: '< 8 ms',
          cvValue: '38.2 MJ/m³',
          sensors: [
            { name: 'CD-P01',  fieldName: 'cd_pressure',      value: '4.2 kPa',   active: true,  status: 's-ok'   },
            { name: 'DFT',     fieldName: 'dft_energy',       value: '0.42',       active: true,  status: 's-ok'   },
            { name: 'SPL',     fieldName: 'spl',              value: '142.3 dB',   active: true,  status: 's-ok'   },
            { name: 'Hurst',   fieldName: 'hurst_exponent',   value: '0.63',       active: true,  status: 's-ok'   },
            { name: 'Entropy', fieldName: 'shannon_entropy',  value: '4.21 nats',  active: true,  status: 's-ok'   },
            { name: 'Anomaly', fieldName: 'anomaly_score',    value: '0.14',       active: true,  status: 's-ok'   },
            { name: 'Normal%', fieldName: 'normal_prob',      value: '86%',        active: true,  status: 's-ok'   },
            { name: 'LBO%',    fieldName: 'lean_blowout_prob',value: '9%',         active: false, status: 's-warn' },
          ],
        },
      },
      // ── Anomaly score metric card ──────────────────────────────────────────
      {
        id: 'w-anomaly',
        type: 'overviewAnomalyMetric',
        layout: { x: 332, y: 16, w: 260, h: 150 },
        config: {
          deviceId: combustionDeviceId,
          fieldName: 'anomaly_score',
        },
      },
      // ── Turbine load metric card ───────────────────────────────────────────
      {
        id: 'w-load',
        type: 'overviewLoadMetric',
        layout: { x: 608, y: 16, w: 260, h: 150 },
        config: {
          label: 'TURBINE LOAD',
          unit: '% MCR',
          value: '84.2',
          trend: '◆ STEADY',
          deviceId: combustionDeviceId,
          fieldName: 'confidence',
        },
      },
      // ── EGT spread metric card ─────────────────────────────────────────────
      {
        id: 'w-egt',
        type: 'overviewEgtMetric',
        layout: { x: 884, y: 16, w: 260, h: 150 },
        config: {
          label: 'EGT SPREAD',
          unit: '°C Δ',
          value: '12.4',
          trend: '▲ MONITOR',
          deviceId: combustionDeviceId,
          fieldName: 'thermo_acoustic_prob',
        },
      },
      // ── Realtime chart ────────────────────────────────────────────────────
      {
        id: 'w-realtime',
        type: 'overviewRealtimeChart',
        layout: { x: 332, y: 182, w: 812, h: 248 },
        config: {
          deviceId: combustionDeviceId,
          fieldName: 'anomaly_score',
        },
      },
      // ── Data flow diagram ─────────────────────────────────────────────────
      {
        id: 'w-dataflow',
        type: 'overviewDataFlow',
        layout: { x: 332, y: 446, w: 812, h: 330 },
        config: DATAFLOW_DEFAULT_CONFIG,
      },
      // ── BE Agent status panel ─────────────────────────────────────────────
      {
        id: 'w-be-agent',
        type: 'overviewBeAgentStatus',
        layout: { x: 1160, y: 16, w: 320, h: 760 },
        config: {
          deviceId: beSenseDeviceId,
          healthScore: 86,
          modules: [
            { name: 'CD Precursor',  desc: 'Feature-driven DL anomaly detection',   status: 'RUN'  },
            { name: 'Thermo Perf.',  desc: 'Compressor / turbine efficiency',        status: 'RUN'  },
            { name: 'Vibration',     desc: 'Rotor dynamics & blade health',          status: 'IDLE' },
            { name: 'Emissions Opt.',desc: 'NOx/CO optimisation loop',              status: 'IDLE' },
            { name: 'Fuel Quality',  desc: 'CalorieSense™ adaptive tuning',          status: 'RUN'  },
            { name: 'Asset Life',    desc: 'Creep / LCF remaining life',            status: 'IDLE' },
          ],
          alerts: [
            { time: '14:58:02', msg: 'Combustion stable',   sub: 'CD anomaly score nominal',          level: 'ok'      },
            { time: '14:52:17', msg: 'VIB-X elevated',      sub: '2.1 mm/s — monitor bearing',        level: 'warning' },
            { time: '14:40:00', msg: 'CV shift detected',   sub: 'H₂ fraction +0.4% — adapting',     level: 'info'    },
          ],
        },
      },
    ],
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(config.database.uri);
  console.log('✅ Connected\n');

  const orgIdObj = new mongoose.Types.ObjectId(ORG_ID);

  // ── Resolve POC Demo application ──────────────────────────────────────────
  const pocApp = await Application.findOne({ orgId: orgIdObj, slug: 'poc-demo' }).lean() as any;
  if (!pocApp) {
    console.error('❌ POC Demo application not found. Run seed-poc-demo.ts first.');
    process.exit(1);
  }
  const APP_ID: string = pocApp.applicationId;
  console.log(`✅ POC Demo application: ${APP_ID}\n`);

  // ── Resolve device IDs ────────────────────────────────────────────────────
  const combustionDevice = await Device.findOne({ orgId: orgIdObj, name: 'combustion_ml_engine' }).lean() as any;
  if (!combustionDevice) {
    console.error('❌ combustion_ml_engine device not found. Run seed-module-devices.ts first.');
    process.exit(1);
  }
  const combustionDeviceId: string = combustionDevice.deviceId;
  console.log(`✅ combustion_ml_engine: ${combustionDeviceId}`);

  const beSenseDevice = await Device.findOne({ orgId: orgIdObj, name: 'be_sense_edge' }).lean() as any;
  if (!beSenseDevice) {
    console.error('❌ be_sense_edge device not found. Run seed-module-devices.ts first.');
    process.exit(1);
  }
  const beSenseDeviceId: string = beSenseDevice.deviceId;
  console.log(`✅ be_sense_edge: ${beSenseDeviceId}\n`);

  // ── Alarm rules ───────────────────────────────────────────────────────────
  const alarmDefs = [
    {
      findKey: { tagName: 'BE-HEALTH-CRITICAL' },
      data: {
        name: 'BE Agent Health Critical',
        description: 'Fires when overall turbine health score falls below 50',
        tagName: 'BE-HEALTH-CRITICAL',
        deviceId: beSenseDeviceId,
        field: 'health_score',
        conditionType: 'THRESHOLD' as const,
        operator: 'LESS_THAN' as const,
        parameters: { threshold: 50, deadband: 2 },
        priority: 'CRITICAL' as const,
        requiresAcknowledgment: true,
        notificationChannels: ['websocket'],
        notificationRecipients: [],
        isaClass: 'ALARM' as const,
        rationalization: 'Overall BE Agent health index below safe operating threshold',
        correctiveAction: 'Inspect active modules and review recent anomaly trend',
        isActive: true,
        isEnabled: true,
        isShelved: false,
      },
    },
    {
      findKey: { tagName: 'CD-ANOMALY-HIGH' },
      data: {
        name: 'CD Precursor Anomaly High',
        description: 'Fires when combustion DL anomaly score exceeds 0.85',
        tagName: 'CD-ANOMALY-HIGH',
        deviceId: combustionDeviceId,
        field: 'anomaly_score',
        conditionType: 'THRESHOLD' as const,
        operator: 'GREATER_THAN' as const,
        parameters: { threshold: 0.85, deadband: 0.02 },
        priority: 'HIGH' as const,
        requiresAcknowledgment: true,
        notificationChannels: ['websocket'],
        notificationRecipients: [],
        isaClass: 'ALARM' as const,
        rationalization: 'DL model anomaly score above 0.85 indicates probable precursor event',
        consequence: 'Potential lean blowout or thermoacoustic instability',
        correctiveAction: 'Review classifier outputs and notify control room operator',
        isActive: true,
        isEnabled: true,
        isShelved: false,
      },
    },
    {
      findKey: { tagName: 'CD-PRECURSOR-CRITICAL' },
      data: {
        name: 'CD Precursor Critical Threshold',
        description: 'Fires when anomaly score exceeds 0.95 — imminent precursor event',
        tagName: 'CD-PRECURSOR-CRITICAL',
        deviceId: combustionDeviceId,
        field: 'anomaly_score',
        conditionType: 'THRESHOLD' as const,
        operator: 'GREATER_THAN' as const,
        parameters: { threshold: 0.95, deadband: 0.01 },
        priority: 'CRITICAL' as const,
        requiresAcknowledgment: true,
        notificationChannels: ['websocket'],
        notificationRecipients: [],
        isaClass: 'ALARM' as const,
        rationalization: 'Anomaly score >0.95 = imminent lean blowout or flashback risk',
        consequence: 'Uncontrolled combustion event — potential equipment damage',
        correctiveAction: 'Immediate operator intervention; consider load reduction or trip',
        isActive: true,
        isEnabled: true,
        isShelved: false,
      },
    },
  ];

  for (const { findKey, data } of alarmDefs) {
    const existing = await AlarmRule.findOne(findKey).lean();
    if (!existing) {
      await AlarmRule.create(data);
      console.log(`✅ Created alarm rule: ${findKey.tagName}`);
    } else {
      console.log(`⏭️  Alarm rule exists: ${findKey.tagName}`);
    }
  }
  console.log('');

  // ── Kosmos dashboard ──────────────────────────────────────────────────────
  const overviewPage = buildOverviewPage(combustionDeviceId, beSenseDeviceId);

  const existingDash = await Dashboard.findOne({
    orgId: orgIdObj,
    dashboardId: KOSMOS_DASHBOARD_ID,
  }).lean();

  if (!existingDash) {
    await Dashboard.create({
      orgId: orgIdObj,
      applicationId: APP_ID,
      dashboardId: KOSMOS_DASHBOARD_ID,
      name: 'Kosmos Overview',
      description: 'Pre-wired Kosmos dashboard: combustion DL analytics + BE Agent status + data flow',
      pages: [overviewPage],
      blocks: [],
      layouts: {},
      sharedWithUsers: [],
    });
    console.log(`✅ Created Kosmos dashboard: ${KOSMOS_DASHBOARD_ID}`);
    console.log(`   ${overviewPage.widgets.length} widgets on Overview page`);
  } else {
    await Dashboard.updateOne(
      { orgId: orgIdObj, dashboardId: KOSMOS_DASHBOARD_ID },
      {
        $set: {
          applicationId: APP_ID,
          name: 'Kosmos Overview',
          pages: [overviewPage],
        },
      }
    );
    console.log(`⏭️  Updated Kosmos dashboard: ${KOSMOS_DASHBOARD_ID}`);
    console.log(`   ${overviewPage.widgets.length} widgets on Overview page`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  await mongoose.disconnect();

  console.log('\n🎉 Kosmos dashboard seed complete!\n');
  console.log('  🔔 Alarm rules (3):');
  console.log('     BE-HEALTH-CRITICAL    health_score < 50 on be_sense_edge');
  console.log('     CD-ANOMALY-HIGH       anomaly_score > 0.85 on combustion_ml_engine');
  console.log('     CD-PRECURSOR-CRITICAL anomaly_score > 0.95 on combustion_ml_engine');
  console.log('');
  console.log('  📊 Kosmos dashboard: kosmos-overview-dashboard');
  console.log('     overviewBeSense       → combustion_ml_engine (8 sensors mapped)');
  console.log('     overviewAnomalyMetric → combustion_ml_engine.anomaly_score');
  console.log('     overviewLoadMetric    → combustion_ml_engine.confidence');
  console.log('     overviewEgtMetric     → combustion_ml_engine.thermo_acoustic_prob');
  console.log('     overviewRealtimeChart → combustion_ml_engine.anomaly_score');
  console.log('     overviewDataFlow      → static KOSMOS platform diagram');
  console.log('     overviewBeAgentStatus → be_sense_edge');
  console.log('');
  console.log('Next steps:');
  console.log('  1. http://localhost:3000/applications  — open the POC Demo application');
  console.log('  2. Open Kosmos Overview dashboard');
  console.log('  3. Activate MQTT gateways in UI to start live data flow');
  console.log('  4. Run combustion sim: pnpm run simulate (or combustion-mqtt-sim.ts)');
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
