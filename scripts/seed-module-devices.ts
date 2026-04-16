#!/usr/bin/env node
/**
 * Seed Script: Module Devices — combustion_ml_engine + be_sense_edge
 *
 * Creates the two optional-module devices and their MQTT gateway configurations.
 * Run after seed:admin. Creates POC Demo application if it doesn't exist.
 *
 * Devices:
 *   combustion_ml_engine — Combustion DL module (gas turbine ML analytics)
 *   be_sense_edge        — CaloriSense edge AI inference
 *
 * MQTT Topics:
 *   combustion/ml/data   → combustion_ml_engine fields
 *   be-sense/inference   → be_sense_edge fields
 *
 * Usage:
 *   cd /home/shyamprakashj/Documents/PROJECTS/DYNAMIC_DASHBOARD/scripts
 *   pnpm seed:module-devices
 *
 * Idempotent: safe to run multiple times.
 */

import mongoose from 'mongoose';
import { ulid } from 'ulid';
import { config } from '../iot-platform/apps/api/src/config/config';
import { Device } from '../iot-platform/apps/api/src/models/device.model';
import { MqttGateway } from '../iot-platform/apps/api/src/models/mqtt-gateway.model';
import { Application } from '../iot-platform/apps/api/src/models/application.model';
import { User } from '../iot-platform/apps/api/src/models/user.model';

const ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(config.database.uri);
  console.log('✅ Connected\n');

  const orgIdObj = new mongoose.Types.ObjectId(ORG_ID);

  // ── Ensure POC Demo application exists ───────────────────────────────────
  let pocApp = await Application.findOne({ orgId: orgIdObj, slug: 'poc-demo' }).lean() as any;
  if (!pocApp) {
    const adminUser = await User.findOne({ orgId: orgIdObj }).lean() as any;
    pocApp = await Application.create({
      orgId: orgIdObj,
      applicationId: ulid(),
      name: 'POC Demo',
      description: 'Gas turbine combustion analytics and edge AI inference.',
      slug: 'poc-demo',
      isActive: true,
      userId: adminUser?._id,
    });
    console.log(`✅ Created POC Demo application`);
  } else {
    console.log(`⏭️  POC Demo application already exists`);
  }
  const APP_ID = pocApp.applicationId as string;
  console.log(`   applicationId: ${APP_ID}\n`);

  // ── 1. combustion_ml_engine device ────────────────────────────────────────
  const combustionDevice = await Device.findOne({ orgId: orgIdObj, name: 'combustion_ml_engine' }).lean() as any;
  let combustionDeviceId: string;

  if (!combustionDevice) {
    const newDevice = await Device.create({
      orgId: orgIdObj,
      applicationId: APP_ID,
      deviceId: ulid(),
      name: 'combustion_ml_engine',
      description: 'Combustion ML Engine — edge/cloud DL model publishing anomaly detection results (module: combustion_dl)',
      dataSource: 'gateway',
      tags: {
        type: 'ml-engine',
        module: 'combustion_dl',
        protocol: 'mqtt',
      },
      attributes: {
        // Core ML outputs
        anomaly_score:        'number',  // 0.0 – 1.0
        confidence:           'number',  // 0 – 100 (%)
        precursor_class:      'string',  // e.g. "NORMAL OPERATION"
        // Classifier probabilities
        normal_prob:          'number',
        lean_blowout_prob:    'number',
        flashback_prob:       'number',
        thermo_acoustic_prob: 'number',
        // Physics features (from edge feature extraction)
        cd_pressure:          'number',  // kPa
        dft_energy:           'number',  // dominant DFT amplitude
        spl:                  'number',  // dB
        hurst_exponent:       'number',  // 0 – 1
        shannon_entropy:      'number',  // nats
        // Physics feature matrix (GAP-D1)
        feature_cells:        'json',    // Array<{label,value,hue,alpha}> — 25 cells
      },
      isActive: true,
    });
    combustionDeviceId = newDevice.deviceId;
    console.log(`✅ Created combustion_ml_engine device (deviceId: ${combustionDeviceId})`);
  } else {
    combustionDeviceId = combustionDevice.deviceId;
    // Ensure feature_cells attribute exists on older seeds (idempotent)
    if (!combustionDevice.attributes?.feature_cells) {
      await Device.updateOne(
        { orgId: orgIdObj, name: 'combustion_ml_engine' },
        { $set: { 'attributes.feature_cells': 'json' } }
      );
      console.log(`✅ combustion_ml_engine: added feature_cells:'json' attribute`);
    } else {
      console.log(`⏭️  combustion_ml_engine already exists (deviceId: ${combustionDeviceId})`);
    }
  }

  // ── 2. combustion_ml_engine MQTT gateway ──────────────────────────────────
  const combustionGateway = await MqttGateway.findOne({
    orgId: orgIdObj,
    name: 'Combustion ML Engine Gateway',
  }).lean();

  if (!combustionGateway) {
    await MqttGateway.create({
      orgId: orgIdObj,
      applicationId: APP_ID,
      name: 'Combustion ML Engine Gateway',
      description: 'Receives ML inference results from the combustion DL model (cloud/on-prem)',
      brokerUrl: process.env.COMBUSTION_MQTT_BROKER || 'mqtt://broker.hivemq.com:1883',
      clientId: `combustion-ml-${Date.now()}`,
      keepalive: 60,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      auth: {},
      tls: { enabled: false },
      topicMappings: [
        // Publish full JSON payload to combustion/ml/data
        // Each field is extracted via jsonPath
        { topic: 'combustion/ml/data', field: 'anomaly_score',        deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'anomaly_score',        qos: 0 },
        { topic: 'combustion/ml/data', field: 'confidence',           deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'confidence',           qos: 0 },
        { topic: 'combustion/ml/data', field: 'precursor_class',      deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'precursor_class',      qos: 0 },
        { topic: 'combustion/ml/data', field: 'normal_prob',          deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'normal_prob',          qos: 0 },
        { topic: 'combustion/ml/data', field: 'lean_blowout_prob',    deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'lean_blowout_prob',    qos: 0 },
        { topic: 'combustion/ml/data', field: 'flashback_prob',       deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'flashback_prob',       qos: 0 },
        { topic: 'combustion/ml/data', field: 'thermo_acoustic_prob', deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'thermo_acoustic_prob', qos: 0 },
        { topic: 'combustion/ml/data', field: 'cd_pressure',          deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'cd_pressure',          qos: 0 },
        { topic: 'combustion/ml/data', field: 'dft_energy',           deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'dft_energy',           qos: 0 },
        { topic: 'combustion/ml/data', field: 'spl',                  deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'spl',                  qos: 0 },
        { topic: 'combustion/ml/data', field: 'hurst_exponent',       deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'hurst_exponent',       qos: 0 },
        { topic: 'combustion/ml/data', field: 'shannon_entropy',      deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'shannon_entropy',      qos: 0 },
        // Feature matrix array (GAP-D1) — 25-cell physics feature vector
        { topic: 'combustion/ml/data', field: 'feature_cells',        deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'feature_cells',        qos: 0 },
      ],
      status: 'disconnected',
      isActive: false,
      totalMessagesReceived: 0,
    });
    console.log('✅ Created Combustion ML Engine MQTT gateway');
    console.log('   Topic: combustion/ml/data');
    console.log('   Configure broker URL via COMBUSTION_MQTT_BROKER env or edit in UI\n');
  } else {
    // Ensure feature_cells mapping exists on older seeds (idempotent)
    const gw = combustionGateway as any;
    const hasFeatureCells = gw.topicMappings?.some((m: any) => m.field === 'feature_cells');
    if (!hasFeatureCells) {
      await MqttGateway.updateOne(
        { orgId: orgIdObj, name: 'Combustion ML Engine Gateway' },
        {
          $push: {
            topicMappings: { topic: 'combustion/ml/data', field: 'feature_cells', deviceId: combustionDeviceId, payloadFormat: 'json', jsonPath: 'feature_cells', qos: 0 },
          },
        }
      );
      console.log('✅ Combustion ML Engine Gateway: added feature_cells topic mapping\n');
    } else {
      console.log('⏭️  Combustion ML Engine MQTT gateway already exists\n');
    }
  }

  // ── 3. be_sense_edge device ───────────────────────────────────────────────
  const beSenseDevice = await Device.findOne({ orgId: orgIdObj, name: 'be_sense_edge' }).lean() as any;
  let beSenseDeviceId: string;

  if (!beSenseDevice) {
    const newDevice = await Device.create({
      orgId: orgIdObj,
      applicationId: APP_ID,
      deviceId: ulid(),
      name: 'be_sense_edge',
      description: 'BE Sense Edge — streams AI/ML inference results from edge hardware (module: be_agent)',
      dataSource: 'gateway',
      tags: {
        type: 'ai-inference',
        module: 'be_agent',
        protocol: 'mqtt',
      },
      attributes: {
        health_score:          'number',  // 0 – 100 (overall turbine health index)
        active_module_count:   'number',  // how many BE Agent modules are RUN
        alert_count:           'number',  // active alert count
        cd_precursor_status:   'string',  // "RUN" | "IDLE"
        thermo_perf_status:    'string',  // "RUN" | "IDLE"
        vibration_status:      'string',  // "RUN" | "IDLE"
        fuel_quality_status:   'string',  // "RUN" | "IDLE"
      },
      isActive: true,
    });
    beSenseDeviceId = newDevice.deviceId;
    console.log(`✅ Created be_sense_edge device (deviceId: ${beSenseDeviceId})`);
  } else {
    beSenseDeviceId = beSenseDevice.deviceId;
    console.log(`⏭️  be_sense_edge already exists (deviceId: ${beSenseDeviceId})`);
  }

  // ── 4. be_sense_edge MQTT gateway ─────────────────────────────────────────
  const beSenseGateway = await MqttGateway.findOne({
    orgId: orgIdObj,
    name: 'BE Sense Edge Gateway',
  }).lean();

  if (!beSenseGateway) {
    await MqttGateway.create({
      orgId: orgIdObj,
      applicationId: APP_ID,
      name: 'BE Sense Edge Gateway',
      description: 'Receives AI inference results from BE Sense edge hardware',
      brokerUrl: process.env.BE_SENSE_MQTT_BROKER || 'mqtt://broker.hivemq.com:1883',
      clientId: `be-sense-${Date.now()}`,
      keepalive: 60,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      auth: {},
      tls: { enabled: false },
      topicMappings: [
        { topic: 'be-sense/inference', field: 'health_score',        deviceId: beSenseDeviceId, payloadFormat: 'json', jsonPath: 'health_score',        qos: 0 },
        { topic: 'be-sense/inference', field: 'active_module_count', deviceId: beSenseDeviceId, payloadFormat: 'json', jsonPath: 'active_module_count', qos: 0 },
        { topic: 'be-sense/inference', field: 'alert_count',         deviceId: beSenseDeviceId, payloadFormat: 'json', jsonPath: 'alert_count',         qos: 0 },
        { topic: 'be-sense/inference', field: 'cd_precursor_status', deviceId: beSenseDeviceId, payloadFormat: 'json', jsonPath: 'cd_precursor_status', qos: 0 },
        { topic: 'be-sense/inference', field: 'thermo_perf_status',  deviceId: beSenseDeviceId, payloadFormat: 'json', jsonPath: 'thermo_perf_status',  qos: 0 },
        { topic: 'be-sense/inference', field: 'vibration_status',    deviceId: beSenseDeviceId, payloadFormat: 'json', jsonPath: 'vibration_status',    qos: 0 },
        { topic: 'be-sense/inference', field: 'fuel_quality_status', deviceId: beSenseDeviceId, payloadFormat: 'json', jsonPath: 'fuel_quality_status', qos: 0 },
      ],
      status: 'disconnected',
      isActive: false,
      totalMessagesReceived: 0,
    });
    console.log('✅ Created BE Sense Edge MQTT gateway');
    console.log('   Topic: be-sense/inference');
    console.log('   Configure broker URL via BE_SENSE_MQTT_BROKER env or edit in UI\n');
  } else {
    console.log('⏭️  BE Sense Edge MQTT gateway already exists\n');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Module device seed complete');
  console.log('');
  console.log('Devices created:');
  console.log(`  combustion_ml_engine  → ${combustionDeviceId}`);
  console.log(`  be_sense_edge         → ${beSenseDeviceId}`);
  console.log('');
  console.log('MQTT Topics:');
  console.log('  combustion/ml/data   (combustion DL module)');
  console.log('  be-sense/inference   (BE AGENT module)');
  console.log('');
  console.log('Next steps:');
  console.log('  1. In the UI: go to MQTT Gateways, configure broker URL for each gateway');
  console.log('  2. Activate the gateway (toggle isActive)');
  console.log('  3. In Kosmos dashboard → BE AGENT widget → WidgetConfigPanel → set deviceId to be_sense_edge');
  console.log('  4. In Kosmos dashboard → Combustion DL widgets → configure deviceId to combustion_ml_engine');
  console.log('═══════════════════════════════════════════════════');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
