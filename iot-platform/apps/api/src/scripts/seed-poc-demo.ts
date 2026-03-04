#!/usr/bin/env node
/**
 * Seed Script: POC Demo — Streetlight + OHT Devices
 *
 * Creates device tags, alarm rule, workflows, and dashboard
 * for the two live devices transmitting real telemetry.
 *
 * Usage:
 *   cd /home/shyamprakashj/Documents/PROJECTS/DYNAMIC_DASHBOARD/iot-platform
 *   npx ts-node scripts/seed-poc-demo.ts
 *
 * Idempotent: safe to run multiple times.
 */

import mongoose from 'mongoose';
import { ulid } from 'ulid';
import { config } from '../config/config';
import { Device } from '../models/device.model';
import { Workflow, extractTriggerType } from '../models/workflow.model';
import { Dashboard } from '../models/dashboard.model';
import { AlarmRule } from '../models/alarm-rule.model';
import { User } from '../models/user.model';
import { Application } from '../models/application.model';

const ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const STREETLIGHT_ID = '01KJ9QP8JY5GHB4YYS0SN70BZR';
const OHT_ID = '01KJ9HJSM09FWK5G3YFBQJRFZ1';
const DASHBOARD_ID = 'iot-operations-dashboard';

// ─── Layout helper ──────────────────────────────────────────────────────────
function makeLayout(id: string, x: number, y: number, w = 2, h = 5) {
  const base = { i: id, x, y, w, h, minW: 2, maxW: 4, minH: 4, maxH: 8, static: false };
  return { lg: { ...base }, md: { ...base }, sm: { ...base } };
}

function makeGaugeBlock(
  id: string,
  title: string,
  deviceId: string,
  field: string,
  min: number,
  max: number,
  unit: string,
  x: number,
  y: number
) {
  return {
    id,
    type: 'gauge' as const,
    layouts: makeLayout(id, x, y),
    config: { title, deviceId, field, min, max, unit },
  };
}

function makeChartBlock(
  id: string,
  title: string,
  deviceId: string,
  field: string,
  chartType: 'line' | 'area' | 'bar',
  x: number,
  y: number,
  w = 6,
  h = 6
) {
  return {
    id,
    type: 'chart' as const,
    layouts: makeLayout(id, x, y, w, h),
    config: { title, deviceId, field, chartType, showLegend: false, showGrid: true, smooth: true },
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(config.database.uri);
  console.log('✅ Connected\n');

  const orgIdObj = new mongoose.Types.ObjectId(ORG_ID);

  // ── 0. Ensure POC Demo application exists ─────────────────────────────────
  let pocApp = await Application.findOne({ orgId: orgIdObj, slug: 'poc-demo' }).lean() as any;
  if (!pocApp) {
    pocApp = await Application.create({
      orgId: orgIdObj,
      applicationId: ulid(),
      name: 'POC Demo',
      description: 'Live device monitoring demo with Streetlight SPEM and OHT water system.',
      slug: 'poc-demo',
      isActive: true,
    });
    console.log(`✅ Created POC Demo application`);
  } else {
    console.log(`⏭️  POC Demo application already exists`);
  }
  const POC_APPLICATION_ID = (pocApp as any).applicationId;
  console.log(`   applicationId: ${POC_APPLICATION_ID}\n`);

  // ── 1. Tag devices & set attributes for workflow output validation ─────────
  const streetlightResult = await Device.findOneAndUpdate(
    { orgId: orgIdObj, deviceId: STREETLIGHT_ID },
    {
      $set: {
        applicationId: POC_APPLICATION_ID,
        tags: { streetlight: 'true', 'energy-meter': 'true', electrical: 'true' },
        attributes: {
          // Raw sensor fields (input telemetry)
          phase_volt: 'number',
          freq: 'number',
          current_line: 'number',
          kwh_total: 'number',
          battery: 'number',
          // Derived fields (workflow output)
          volt_deviation: 'number',
          freq_deviation: 'number',
          power_quality_status: 'string',
        },
      },
    },
    { new: true }
  );
  if (streetlightResult) {
    console.log(`✅ Tagged STREETLIGHT device (${STREETLIGHT_ID})`);
    console.log(`   Input attributes: phase_volt, freq, current_line, kwh_total, battery`);
    console.log(`   Output attributes: volt_deviation, freq_deviation, power_quality_status`);
  } else {
    console.warn(`⚠️  STREETLIGHT device not found (${STREETLIGHT_ID}) — skipping tag/attributes`);
  }

  const ohtResult = await Device.findOneAndUpdate(
    { orgId: orgIdObj, deviceId: OHT_ID },
    {
      $set: {
        applicationId: POC_APPLICATION_ID,
        tags: { oht: 'true', 'water-tank': 'true', 'water-quality': 'true' },
        attributes: {
          // Raw sensor fields (input telemetry)
          turbidity: 'number',
          ground_level: 'number',
          totalizer: 'number',
          // Derived fields (workflow output)
          turbidity_status: 'string',
          water_quality_score: 'number',
          tank_status: 'string',
        },
      },
    },
    { new: true }
  );
  if (ohtResult) {
    console.log(`✅ Tagged OHT device (${OHT_ID})`);
    console.log(`   Input attributes: turbidity, ground_level, totalizer`);
    console.log(`   Output attributes: turbidity_status, water_quality_score, tank_status`);
  } else {
    console.warn(`⚠️  OHT device not found (${OHT_ID}) — skipping tag/attributes`);
  }

  // ── 2. Ensure OHT turbidity alarm rule ─────────────────────────────────────
  let alarmRule = await AlarmRule.findOne({ deviceId: OHT_ID, field: 'turbidity' }).lean();
  let alarmRuleId = '';
  if (!alarmRule) {
    const rule = new AlarmRule({
      name: 'OHT Turbidity High Alert',
      tagName: 'OHT-TURBIDITY-H',
      deviceId: OHT_ID,
      field: 'turbidity',
      conditionType: 'THRESHOLD',
      operator: 'GREATER_THAN',
      parameters: { threshold: 4 },
      priority: 'HIGH',
      requiresAcknowledgment: true,
      notificationChannels: ['websocket'],
      isActive: true,
      isEnabled: true,
      isShelved: false,
    });
    const saved = await rule.save();
    alarmRuleId = saved._id.toString();
    console.log(`✅ Created OHT turbidity alarm rule (id: ${alarmRuleId})`);
  } else {
    alarmRuleId = (alarmRule as any)._id.toString();
    console.log(`⏭️  OHT alarm rule already exists (id: ${alarmRuleId})`);
  }

  // ── 3. Resolve admin userId ────────────────────────────────────────────────
  const adminUser = await User.findOne({ email: 'admin@iot-platform.com' }).lean();
  const userId = adminUser ? (adminUser as any)._id.toString() : 'system';
  console.log(`✅ Using userId: ${userId}\n`);

  // ── 4. Workflow A — Streetlight Power Quality Monitor ──────────────────────
  const wfAName = 'Streetlight Power Quality Monitor';

  const nodeA1 = ulid();
  const nodeA2 = ulid();
  const nodeA3 = ulid();

  const wfANodes = [
    {
      id: nodeA1,
      type: 'trigger:deviceStateChange',
      position: { x: 250, y: 50 },
      data: {
        label: 'Phase Volt Trigger',
        description: 'Fires when phase_volt telemetry arrives from SPEM',
        config: { deviceId: STREETLIGHT_ID, field: 'phase_volt' },
      },
    },
    {
      id: nodeA2,
      type: 'logic:function',
      position: { x: 250, y: 200 },
      data: {
        label: 'Compute Power Quality',
        description: 'Calculates % voltage/frequency deviation and classifies power quality',
        config: {
          outputField: 'computed',
          code: [
            'const volt = Number(context.trigger.value);',
            'const freq = Number(context.workspace && context.workspace.freq != null ? context.workspace.freq : 50);',
            "const volt_dev = ((volt - 230) / 230 * 100).toFixed(1);",
            "const freq_dev = ((freq - 50) / 50 * 100).toFixed(2);",
            "const pq = Math.abs(volt - 230) > 20 ? 'CRITICAL'",
            "         : Math.abs(volt - 230) > 10 ? 'WARNING' : 'NORMAL';",
            'return { volt_dev: volt_dev, freq_dev: freq_dev, power_quality: pq };',
          ].join('\n'),
        },
      },
    },
    {
      id: nodeA3,
      type: 'action:writeDeviceState',
      position: { x: 250, y: 380 },
      data: {
        label: 'Write Power Quality',
        description: 'Persists derived fields to DeviceState derived sub-document for dashboard display',
        config: {
          mappings: [
            { key: '{{derived.volt_deviation}}', expression: '{{computed.volt_dev}}' },
            { key: '{{derived.freq_deviation}}', expression: '{{computed.freq_dev}}' },
            { key: '{{derived.power_quality_status}}', expression: '{{computed.power_quality}}' },
          ],
        },
      },
    },
  ];

  const wfAEdges = [
    { id: `e-${nodeA1}-${nodeA2}`, source: nodeA1, target: nodeA2 },
    { id: `e-${nodeA2}-${nodeA3}`, source: nodeA2, target: nodeA3 },
  ];

  const existingWfA = await Workflow.findOne({ orgId: orgIdObj, name: wfAName }).lean();
  if (!existingWfA) {
    const wfA = new Workflow({
      workflowId: ulid(),
      name: wfAName,
      description: 'Computes voltage/frequency deviation and power quality status from SPEM readings.',
      tags: ['streetlight', 'power-quality'],
      orgId: orgIdObj,
      userId,
      type: 'Application',
      applicationId: POC_APPLICATION_ID,
      nodes: wfANodes,
      edges: wfAEdges,
      isEnabled: true,
      priority: 'HIGH',
      triggerType: extractTriggerType(wfANodes as any),
      executionCount: 0,
      version: 1,
      maxConcurrentExecutions: 1,
      timeoutSeconds: 30,
    });
    await wfA.save();
    console.log(`✅ Created Workflow A: ${wfAName}`);
  } else {
    await Workflow.updateOne(
      { orgId: orgIdObj, name: wfAName },
      {
        $set: {
          applicationId: POC_APPLICATION_ID,
          nodes: wfANodes,
          edges: wfAEdges,
          isEnabled: true,
          triggerType: 'trigger:deviceStateChange',
        },
      }
    );
    console.log(`⏭️  Updated Workflow A: ${wfAName}`);
  }

  // ── 5. Workflow B — OHT Water Quality Monitor ──────────────────────────────
  const wfBName = 'OHT Water Quality Monitor';

  const nodeB1 = ulid();
  const nodeB2 = ulid();
  const nodeB3 = ulid();
  const nodeB4 = ulid();
  const nodeB5 = ulid();

  const wfBNodes = [
    {
      id: nodeB1,
      type: 'trigger:deviceStateChange',
      position: { x: 250, y: 50 },
      data: {
        label: 'Turbidity Trigger',
        description: 'Fires when turbidity telemetry arrives from OHT device',
        config: { deviceId: OHT_ID, field: 'turbidity' },
      },
    },
    {
      id: nodeB2,
      type: 'logic:function',
      position: { x: 250, y: 200 },
      data: {
        label: 'Classify Water Quality',
        description: 'Classifies turbidity level and tank fill status',
        config: {
          outputField: 'computed',
          code: [
            'const turb = Number(context.trigger.value);',
            'const wl = Number(context.workspace && context.workspace.ground_level != null ? context.workspace.ground_level : 0);',
            "const turb_status = turb > 10 ? 'CRITICAL' : turb > 4 ? 'WARNING' : 'NORMAL';",
            'const water_score = Math.max(0, Math.round((10 - Math.min(turb, 10)) / 10 * 100));',
            "const tank_status = wl < 5 ? 'LOW' : wl < 10 ? 'MODERATE' : 'GOOD';",
            'return { turb_status: turb_status, water_score: water_score, tank_status: tank_status };',
          ].join('\n'),
        },
      },
    },
    {
      id: nodeB3,
      type: 'condition:comparison',
      position: { x: 250, y: 380 },
      data: {
        label: 'Turbidity Elevated?',
        description: 'Branches: true = elevated (WARNING/CRITICAL), false = NORMAL',
        config: {
          field: 'computed.turb_status',
          operator: '!=',
          value: 'NORMAL',
        },
      },
    },
    {
      id: nodeB4,
      type: 'action:createAlarm',
      position: { x: 0, y: 550 },
      data: {
        label: 'Raise Turbidity Alarm',
        description: 'Creates HIGH priority alarm when turbidity exceeds safe threshold',
        config: {
          severity: 'HIGH',
          message: 'Turbidity Alert: {{trigger.value}} NTU',
          deviceId: OHT_ID,
          field: 'turbidity',
          alarmRuleId: alarmRuleId,
        },
      },
    },
    {
      id: nodeB5,
      type: 'action:writeDeviceState',
      position: { x: 250, y: 720 },
      data: {
        label: 'Write Water Quality',
        description: 'Persists derived water quality fields for dashboard display',
        config: {
          mappings: [
            { key: '{{derived.turbidity_status}}', expression: '{{computed.turb_status}}' },
            { key: '{{derived.water_quality_score}}', expression: '{{computed.water_score}}' },
            { key: '{{derived.tank_status}}', expression: '{{computed.tank_status}}' },
          ],
        },
      },
    },
  ];

  // Edge layout:
  //   Node1 → Node2 → Node3
  //   Node3 →(true)→ Node4 → Node5   (alarm path)
  //   Node3 →(false)→ Node5           (normal path, skip alarm)
  const wfBEdges = [
    { id: `e-${nodeB1}-${nodeB2}`, source: nodeB1, target: nodeB2 },
    { id: `e-${nodeB2}-${nodeB3}`, source: nodeB2, target: nodeB3 },
    { id: `e-${nodeB3}-${nodeB4}`, source: nodeB3, target: nodeB4, sourceHandle: 'true' },
    { id: `e-${nodeB4}-${nodeB5}`, source: nodeB4, target: nodeB5 },
    { id: `e-${nodeB3}-${nodeB5}`, source: nodeB3, target: nodeB5, sourceHandle: 'false' },
  ];

  const existingWfB = await Workflow.findOne({ orgId: orgIdObj, name: wfBName }).lean();
  if (!existingWfB) {
    const wfB = new Workflow({
      workflowId: ulid(),
      name: wfBName,
      description: 'Classifies turbidity and tank level; raises alarm when turbidity is elevated.',
      tags: ['oht', 'water-quality'],
      orgId: orgIdObj,
      userId,
      type: 'Application',
      applicationId: POC_APPLICATION_ID,
      nodes: wfBNodes,
      edges: wfBEdges,
      isEnabled: true,
      priority: 'HIGH',
      triggerType: extractTriggerType(wfBNodes as any),
      executionCount: 0,
      version: 1,
      maxConcurrentExecutions: 1,
      timeoutSeconds: 30,
    });
    await wfB.save();
    console.log(`✅ Created Workflow B: ${wfBName}`);
  } else {
    await Workflow.updateOne(
      { orgId: orgIdObj, name: wfBName },
      {
        $set: {
          applicationId: POC_APPLICATION_ID,
          nodes: wfBNodes,
          edges: wfBEdges,
          isEnabled: true,
          triggerType: 'trigger:deviceStateChange',
        },
      }
    );
    console.log(`⏭️  Updated Workflow B: ${wfBName}`);
  }

  // ── 5.5. Workflow C — OPC-UA Node Monitor ────────────────────────────────────
  const wfCName = 'OPC-UA Node Monitor';

  const nodeC1 = ulid();
  const nodeC2 = ulid();
  const nodeC3 = ulid();

  const wfCNodes = [
    {
      id: nodeC1,
      type: 'trigger:deviceStateChange',
      position: { x: 250, y: 50 },
      data: {
        label: 'OPC-UA Poll Trigger',
        description: 'Fires when OPC-UA gateway publishes device state changes',
        config: { deviceId: '', field: '' }, // Intentionally blank — triggers on ANY field from OPC-UA devices
      },
    },
    {
      id: nodeC2,
      type: 'condition:comparison',
      position: { x: 250, y: 200 },
      data: {
        label: 'Value Threshold Check',
        description: 'Branches on whether value exceeds threshold',
        config: {
          field: '{{workspace}}', // Monitor workspace (OPC-UA published data)
          operator: 'exists',
          value: '',
        },
      },
    },
    {
      id: nodeC3,
      type: 'action:writeDeviceState',
      position: { x: 250, y: 380 },
      data: {
        label: 'Persist OPC-UA Derived State',
        description: 'Writes OPC-UA monitored values to derived state for dashboard display',
        config: {
          mappings: [
            { key: '{{derived.opcua_last_read}}', expression: '{{trigger.timestamp}}' },
          ],
        },
      },
    },
  ];

  const wfCEdges = [
    { id: `e-${nodeC1}-${nodeC2}`, source: nodeC1, target: nodeC2 },
    { id: `e-${nodeC2}-${nodeC3}`, source: nodeC2, target: nodeC3, sourceHandle: 'true' },
  ];

  const existingWfC = await Workflow.findOne({ orgId: orgIdObj, name: wfCName }).lean();
  if (!existingWfC) {
    const wfC = new Workflow({
      workflowId: ulid(),
      name: wfCName,
      description: 'Demonstrates OPC-UA gateway → device state → workflow trigger → derived state pipeline.',
      tags: ['opcua', 'gateway'],
      orgId: orgIdObj,
      userId,
      type: 'Application',
      applicationId: POC_APPLICATION_ID,
      nodes: wfCNodes,
      edges: wfCEdges,
      isEnabled: true,
      priority: 'MEDIUM',
      triggerType: extractTriggerType(wfCNodes as any),
      executionCount: 0,
      version: 1,
      maxConcurrentExecutions: 1,
      timeoutSeconds: 30,
    });
    await wfC.save();
    console.log(`✅ Created Workflow C: ${wfCName}`);
  } else {
    await Workflow.updateOne(
      { orgId: orgIdObj, name: wfCName },
      {
        $set: {
          applicationId: POC_APPLICATION_ID,
          nodes: wfCNodes,
          edges: wfCEdges,
          isEnabled: true,
          triggerType: 'trigger:deviceStateChange',
        },
      }
    );
    console.log(`⏭️  Updated Workflow C: ${wfCName}`);
  }

  // ── 6. Dashboard — IOT Operations Dashboard ────────────────────────────────
  console.log('\n📊 Building dashboard blocks...');

  const sl = STREETLIGHT_ID;
  const oht = OHT_ID;

  // Layout: 12-col grid, w=2 h=5 gauges
  // Row y=0 : 6 STREETLIGHT gauges (Phase Volt, Freq, Current, Energy, Battery, Volt Dev)
  // Row y=5 : Power Quality (x=0) | Turbidity (x=2) | GndLevel (x=4) | Totalizer (x=6) | WQ Score (x=8) | Turb Status (x=10)
  // Row y=10: Tank Status (x=0)
  const blocks = [
    // ── STREETLIGHT row 1 ────────────────────────────────────────────────────
    makeGaugeBlock('sl-volt',     'Phase Voltage',    sl,  'phase_volt',         200, 260,   'V',     0, 0),
    makeGaugeBlock('sl-freq',     'Frequency',        sl,  'freq',                48,  52,   'Hz',    2, 0),
    makeGaugeBlock('sl-current',  'Line Current',     sl,  'current_line',         0,  10,   'A',     4, 0),
    makeGaugeBlock('sl-energy',   'Energy (Total)',   sl,  'kwh_total',            0, 500,   'kWh',   6, 0),
    makeGaugeBlock('sl-battery',  'Battery',          sl,  'battery',              0, 100,   '%',     8, 0),
    makeGaugeBlock('sl-voltdev',  'Volt Deviation',   sl,  'volt_deviation',     -20,  20,   '%',    10, 0),
    // ── STREETLIGHT row 2 / OHT row 1 (shared y=5) ──────────────────────────
    makeGaugeBlock('sl-pqstatus', 'Power Quality',    sl,  'power_quality_status', 0,   2,   '',      0, 5),
    makeGaugeBlock('oht-turb',    'Turbidity',       oht,  'turbidity',            0,  10,   'NTU',   2, 5),
    makeGaugeBlock('oht-gndlvl',  'Ground Level',    oht,  'ground_level',         0,  30,   'm',     4, 5),
    makeGaugeBlock('oht-total',   'Totalizer',       oht,  'totalizer',            0, 200,   'm³',    6, 5),
    makeGaugeBlock('oht-wqscore', 'Water Quality',   oht,  'water_quality_score',  0, 100,   'score', 8, 5),
    makeGaugeBlock('oht-turbstat','Turbidity Status', oht, 'turbidity_status',     0,   2,   '',     10, 5),
    // ── OHT row 2 ────────────────────────────────────────────────────────────
    makeGaugeBlock('oht-tankstat','Tank Status',      oht, 'tank_status',          0,   2,   '',      0,10),
    // ── STREETLIGHT Chart row (y=15) ──────────────────────────────────────────
    makeChartBlock('sl-volt-trend',   'Phase Voltage Trend',  sl,  'phase_volt',          'line', 0, 15),
    makeChartBlock('sl-freq-trend',   'Frequency Trend',      sl,  'freq',                'area', 6, 15),
    // ── OHT Chart row (y=21) ──────────────────────────────────────────────────
    makeChartBlock('oht-turb-trend',  'Turbidity Trend',      oht, 'turbidity',           'line', 0, 21),
    makeChartBlock('oht-wq-trend',    'Water Quality Trend',  oht, 'water_quality_score', 'area', 6, 21),
  ];

  const layouts = {
    lg: blocks.map(b => b.layouts.lg),
    md: blocks.map(b => b.layouts.md),
    sm: blocks.map(b => b.layouts.sm),
  };

  const existingDash = await Dashboard.findOne({ orgId: orgIdObj, dashboardId: DASHBOARD_ID }).lean();
  if (!existingDash) {
    const dashboard = new Dashboard({
      orgId: orgIdObj,
      applicationId: POC_APPLICATION_ID,
      dashboardId: DASHBOARD_ID,
      name: 'IOT Operations Dashboard',
      description:
        'Real-time monitoring of Streetlight SPEM and OHT water system ' +
        'with workflow-derived power quality and water quality analytics.',
      blocks,
      layouts,
    });
    await dashboard.save();
    console.log(`✅ Created dashboard: IOT Operations Dashboard (${blocks.length} blocks)`);
  } else {
    await Dashboard.updateOne(
      { orgId: orgIdObj, dashboardId: DASHBOARD_ID },
      { $set: { applicationId: POC_APPLICATION_ID, blocks, layouts, name: 'IOT Operations Dashboard' } }
    );
    console.log(`⏭️  Updated dashboard: IOT Operations Dashboard (${blocks.length} blocks)`);
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  await mongoose.disconnect();

  console.log('\n🎉 Seed complete!\n');
  console.log('  📡 STREETLIGHT device tagged  (streetlight, energy-meter, electrical)');
  console.log('  📡 OHT device tagged           (oht, water-tank, water-quality)');
  console.log('  🔔 OHT turbidity alarm rule    (OHT-TURBIDITY-H, threshold > 4 NTU)');
  console.log('  ⚡ Workflow A enabled           Streetlight Power Quality Monitor');
  console.log('  💧 Workflow B enabled           OHT Water Quality Monitor');
  console.log('  🛰️  Workflow C enabled           OPC-UA Node Monitor (gateway integration)');
  console.log('  📊 Dashboard created            IOT Operations Dashboard (13 gauges)');
  console.log('\nNext steps:');
  console.log('  1. http://localhost:3000/dashboards    — open dashboard');
  console.log('  2. http://localhost:3000/workflows     — verify workflows are enabled');
  console.log('  3. Wait for live telemetry or run simulator to trigger auto-execution');
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
