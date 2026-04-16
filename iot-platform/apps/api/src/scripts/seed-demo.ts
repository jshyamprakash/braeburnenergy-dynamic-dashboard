/**
 * seed-demo.ts — POC Demo Seed Script
 *
 * Creates demo Application, Devices, MqttGateway, AlarmRules, and Dashboard
 * for the POC environment. Fully idempotent — safe to run multiple times.
 *
 * Usage: pnpm seed:demo
 */

import mongoose from 'mongoose';
import { config } from '../config/config.js';
import { Application } from '../models/application.model.js';
import { Device } from '../models/device.model.js';
import { MqttGateway } from '../models/mqtt-gateway.model.js';
import { AlarmRule } from '../models/alarm-rule.model.js';
import { Dashboard } from '../models/dashboard.model.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = new mongoose.Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa');

// Stable seed IDs — fixed strings ensure idempotent upserts across runs
const SEED = {
  APP_ID:          '01SEEDDEMO0000000000000001',
  DASHBOARD_ID:    '01SEEDDEMO0000000000000006',
  DEVICE: {
    be_sense_edge:        '01SEEDDEMO0000000000000002',
    combustion_ml_engine: '01SEEDDEMO0000000000000003',
    water_monitor_01:     '01SEEDDEMO0000000000000004',
    edge_controller_01:   '01SEEDDEMO0000000000000005',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(step: string, result: string) {
  console.log(`[seed] ${step.padEnd(22)} → ${result}`);
}

// ── Seed functions ────────────────────────────────────────────────────────────

async function seedApplication() {
  const doc = await Application.findOneAndUpdate(
    { orgId: ORG_ID, slug: 'poc-demo' },
    {
      $set: {
        applicationId: SEED.APP_ID,
        name: 'POC Demo',
        slug: 'poc-demo',
        orgId: ORG_ID,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  ).lean();
  log('Application', `${doc!.name} (${doc!.applicationId})`);
  return doc!.applicationId;
}

async function seedDevices(applicationId: string) {
  const devices = [
    {
      deviceId: SEED.DEVICE.be_sense_edge,
      name: 'be_sense_edge',
      dataSource: 'gateway' as const,
      attributes: {
        health_score:      'number',
        anomaly_score:     'number',
        operational_mode:  'string',
      },
    },
    {
      deviceId: SEED.DEVICE.combustion_ml_engine,
      name: 'combustion_ml_engine',
      dataSource: 'gateway' as const,
      attributes: {
        anomaly_score:      'number',
        cd_pressure:        'number',
        normal_prob:        'number',
        lean_blowout_prob:  'number',
        shannon_entropy:    'number',
        hurst_exponent:     'number',
        dft_energy:         'number',
        spl:                'number',
      },
    },
    {
      deviceId: SEED.DEVICE.water_monitor_01,
      name: 'water_monitor_01',
      dataSource: 'gateway' as const,
      attributes: {
        ph:                'number',
        turbidity:         'number',
        dissolved_oxygen:  'number',
        flow_rate:         'number',
        chlorine:          'number',
      },
    },
    {
      deviceId: SEED.DEVICE.edge_controller_01,
      name: 'edge_controller_01',
      dataSource: 'http' as const,
      attributes: {
        cpu_usage:         'number',
        memory_usage:      'number',
        uptime:            'number',
        firmware_version:  'string',
      },
    },
  ];

  for (const d of devices) {
    await Device.findOneAndUpdate(
      { orgId: ORG_ID, deviceId: d.deviceId },
      {
        $set: {
          orgId: ORG_ID,
          applicationId,
          deviceId: d.deviceId,
          name: d.name,
          dataSource: d.dataSource,
          attributes: d.attributes,
          tags: {},
        },
      },
      { upsert: true, new: true }
    );
    log(`Device:${d.name}`, `${d.deviceId} [${d.dataSource}]`);
  }
}

async function seedMqttGateway(applicationId: string) {
  const topicMappings = [
    // be_sense_edge
    {
      topic: 'poc/be_sense_edge/health_score',
      field: 'health_score',
      deviceId: SEED.DEVICE.be_sense_edge,
      payloadFormat: 'raw' as const,
      qos: 0 as const,
    },
    {
      topic: 'poc/be_sense_edge/anomaly_score',
      field: 'anomaly_score',
      deviceId: SEED.DEVICE.be_sense_edge,
      payloadFormat: 'raw' as const,
      qos: 0 as const,
    },
    {
      topic: 'poc/be_sense_edge/operational_mode',
      field: 'operational_mode',
      deviceId: SEED.DEVICE.be_sense_edge,
      payloadFormat: 'raw' as const,
      qos: 0 as const,
    },
    // combustion_ml_engine
    {
      topic: 'poc/combustion/anomaly_score',
      field: 'anomaly_score',
      deviceId: SEED.DEVICE.combustion_ml_engine,
      payloadFormat: 'raw' as const,
      qos: 0 as const,
    },
    {
      topic: 'poc/combustion/cd_pressure',
      field: 'cd_pressure',
      deviceId: SEED.DEVICE.combustion_ml_engine,
      payloadFormat: 'raw' as const,
      qos: 0 as const,
    },
    {
      topic: 'poc/combustion/data',
      field: 'spl',
      deviceId: SEED.DEVICE.combustion_ml_engine,
      payloadFormat: 'json' as const,
      jsonPath: 'spl',
      qos: 0 as const,
    },
  ];

  const doc = await MqttGateway.findOneAndUpdate(
    { orgId: ORG_ID, name: 'Demo MQTT Broker' },
    {
      $set: {
        orgId: ORG_ID,
        applicationId,
        name: 'Demo MQTT Broker',
        brokerUrl: 'mqtt://localhost:1883',
        clientId: 'iot-platform-seed-demo',
        keepalive: 60,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        auth: {},
        tls: { enabled: false, rejectUnauthorized: true },
        topicMappings,
        status: 'disconnected',
        isActive: true,
        totalMessagesReceived: 0,
      },
    },
    { upsert: true, new: true }
  ).lean();
  log('MqttGateway', `${doc!.name} (${topicMappings.length} mappings)`);
}

async function seedAlarmRules() {
  const rules = [
    {
      tagName: 'GAS_LEAK_CRITICAL',
      name: 'Gas Leak Critical',
      description: 'Gas level exceeds critical threshold — immediate action required',
      deviceId: SEED.DEVICE.be_sense_edge,
      field: 'gas_level',
      conditionType: 'THRESHOLD' as const,
      operator: 'GREATER_THAN' as const,
      parameters: { threshold: 80, deadband: 2 },
      priority: 'CRITICAL' as const,
    },
    {
      tagName: 'HIGH_TEMP_WARNING',
      name: 'High Temperature Warning',
      description: 'Temperature exceeds safe operating limit',
      deviceId: SEED.DEVICE.be_sense_edge,
      field: 'temperature',
      conditionType: 'THRESHOLD' as const,
      operator: 'GREATER_THAN' as const,
      parameters: { threshold: 75, deadband: 1 },
      priority: 'HIGH' as const,
    },
    {
      tagName: 'COMBUSTION_ANOMALY',
      name: 'Combustion Anomaly Detected',
      description: 'ML model anomaly score exceeds detection threshold',
      deviceId: SEED.DEVICE.combustion_ml_engine,
      field: 'anomaly_score',
      conditionType: 'THRESHOLD' as const,
      operator: 'GREATER_THAN' as const,
      parameters: { threshold: 0.85, deadband: 0.02 },
      priority: 'HIGH' as const,
    },
  ];

  for (const r of rules) {
    await AlarmRule.findOneAndUpdate(
      { tagName: r.tagName },
      {
        $set: {
          name: r.name,
          description: r.description,
          tagName: r.tagName,
          deviceId: r.deviceId,
          field: r.field,
          conditionType: r.conditionType,
          operator: r.operator,
          parameters: r.parameters,
          priority: r.priority,
          requiresAcknowledgment: r.priority === 'CRITICAL',
          notificationChannels: ['websocket'],
          isActive: true,
          isEnabled: true,
          isShelved: false,
        },
      },
      { upsert: true, new: true }
    );
    log(`AlarmRule`, `${r.tagName} [${r.priority}]`);
  }
}

async function seedDashboard(applicationId: string) {
  const pages = [
    {
      pageId: 'page-poc-overview',
      name: 'Overview',
      order: 0,
      layoutSchemaVersion: 3,
      columns: {
        left:   [],
        middle: [],
        right:  [],
      },
    },
  ];

  const doc = await Dashboard.findOneAndUpdate(
    { orgId: ORG_ID, dashboardId: SEED.DASHBOARD_ID },
    {
      $set: {
        orgId: ORG_ID,
        applicationId,
        dashboardId: SEED.DASHBOARD_ID,
        name: 'POC Overview',
        description: 'POC demo dashboard',
        blocks: [],
        layouts: {},
        pages,
        sharedWithUsers: [],
      },
    },
    { upsert: true, new: true }
  ).lean();
  log('Dashboard', `${doc!.name} (${doc!.dashboardId})`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[seed] Connecting to MongoDB...');
  await mongoose.connect(config.database.uri);
  console.log('[seed] Connected.\n');

  const applicationId = await seedApplication();
  await seedDevices(applicationId);
  await seedMqttGateway(applicationId);
  await seedAlarmRules();
  await seedDashboard(applicationId);

  console.log('\n[seed] Done. All entities upserted successfully.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed] Fatal error:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
