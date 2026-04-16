#!/usr/bin/env node
/**
 * Combustion ML Engine MQTT Simulator
 *
 * Publishes realistic combustion inference data to the MQTT topic
 * `combustion/ml/data` at a configurable interval.
 *
 * Replaces the browser-side combustion-simulator.ts for integration testing.
 * Use this to simulate a live combustion_ml_engine device publishing to the
 * MQTT gateway configured in the platform UI.
 *
 * Usage:
 *   cd iot-platform
 *   npx ts-node scripts/combustion-mqtt-sim.ts [options]
 *
 * Options:
 *   --broker  MQTT broker URL  (default: mqtt://broker.hivemq.com:1883)
 *   --topic   MQTT topic       (default: combustion/ml/data)
 *   --interval  Publish interval in ms  (default: 1000)
 *   --mode    Scenario mode: normal | lean_blowout | flashback | thermo_acoustic (default: normal)
 *
 * Example:
 *   npx ts-node scripts/combustion-mqtt-sim.ts --broker mqtt://broker.hivemq.com:1883 --mode flashback
 */

import mqtt from 'mqtt';

// ─── CLI argument parsing ────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const BROKER   = getArg('broker',   'mqtt://broker.hivemq.com:1883');
const TOPIC    = getArg('topic',    'combustion/ml/data');
const INTERVAL = parseInt(getArg('interval', '1000'), 10);
const MODE     = getArg('mode',     'normal') as 'normal' | 'lean_blowout' | 'flashback' | 'thermo_acoustic';

// ─── Precursor class probabilities by mode ──────────────────────────────────
const MODE_CONFIGS = {
  normal: {
    precursor_class: 'NORMAL OPERATION',
    anomaly_score: () => 0.05 + Math.random() * 0.08,
    normal_prob: () => 0.85 + Math.random() * 0.10,
    lean_blowout_prob: () => Math.random() * 0.05,
    flashback_prob: () => Math.random() * 0.05,
    thermo_acoustic_prob: () => Math.random() * 0.05,
  },
  lean_blowout: {
    precursor_class: 'LEAN BLOWOUT PRECURSOR',
    anomaly_score: () => 0.55 + Math.random() * 0.25,
    normal_prob: () => Math.random() * 0.15,
    lean_blowout_prob: () => 0.65 + Math.random() * 0.20,
    flashback_prob: () => Math.random() * 0.10,
    thermo_acoustic_prob: () => Math.random() * 0.10,
  },
  flashback: {
    precursor_class: 'FLASHBACK PRECURSOR',
    anomaly_score: () => 0.60 + Math.random() * 0.30,
    normal_prob: () => Math.random() * 0.10,
    lean_blowout_prob: () => Math.random() * 0.10,
    flashback_prob: () => 0.70 + Math.random() * 0.20,
    thermo_acoustic_prob: () => Math.random() * 0.10,
  },
  thermo_acoustic: {
    precursor_class: 'THERMO-ACOUSTIC INSTABILITY',
    anomaly_score: () => 0.50 + Math.random() * 0.35,
    normal_prob: () => Math.random() * 0.10,
    lean_blowout_prob: () => Math.random() * 0.10,
    flashback_prob: () => Math.random() * 0.10,
    thermo_acoustic_prob: () => 0.65 + Math.random() * 0.25,
  },
};

// ─── Physics signal generators ───────────────────────────────────────────────
function generatePayload(tick: number) {
  const cfg = MODE_CONFIGS[MODE] ?? MODE_CONFIGS.normal;

  // Slow drift on physics signals to simulate real turbine dynamics
  const drift = Math.sin(tick * 0.02) * 0.15;

  return {
    // Core ML outputs
    anomaly_score:        parseFloat(clamp(cfg.anomaly_score(), 0, 1).toFixed(4)),
    confidence:           parseFloat(clamp(80 + Math.random() * 15 + drift * 10, 60, 100).toFixed(1)),
    precursor_class:      cfg.precursor_class,

    // Classifier probabilities (must sum ≈ 1)
    normal_prob:          parseFloat(clamp(cfg.normal_prob(), 0, 1).toFixed(4)),
    lean_blowout_prob:    parseFloat(clamp(cfg.lean_blowout_prob(), 0, 1).toFixed(4)),
    flashback_prob:       parseFloat(clamp(cfg.flashback_prob(), 0, 1).toFixed(4)),
    thermo_acoustic_prob: parseFloat(clamp(cfg.thermo_acoustic_prob(), 0, 1).toFixed(4)),

    // Physics features
    cd_pressure:          parseFloat((101.3 + drift * 5 + (Math.random() - 0.5) * 2).toFixed(2)),    // kPa
    dft_energy:           parseFloat(clamp(0.35 + drift * 0.2 + Math.random() * 0.15, 0.1, 1.0).toFixed(4)),
    spl:                  parseFloat((72 + drift * 4 + (Math.random() - 0.5) * 3).toFixed(1)),       // dB
    hurst_exponent:       parseFloat(clamp(0.55 + drift * 0.1 + (Math.random() - 0.5) * 0.05, 0.3, 0.9).toFixed(4)),
    shannon_entropy:      parseFloat(clamp(2.8 + drift * 0.3 + (Math.random() - 0.5) * 0.2, 1.5, 4.0).toFixed(4)),

    // Feature matrix — 25 physics-informed cells (GAP-D1)
    // Format: Array<{ label: string, value: number, hue: number, alpha: number }>
    feature_cells:        buildFeatureCells(drift, cfg.anomaly_score()),

    // Metadata
    _tick: tick,
    _ts: new Date().toISOString(),
    _mode: MODE,
  };
}

const FEATURE_LABELS = [
  'DFT-50Hz', 'DFT-80Hz', 'DFT-120Hz', 'DFT-186Hz', 'DFT-240Hz',
  'SPL-RMS',  'SPL-Peak', 'SPL-Var',   'SPL-dB',    'SPL-idx',
  'Hurst-H',  'Hurst-R/S','Hurst-var', 'Hurst-lag', 'Hurst-fit',
  'Entropy-S','Entropy-R','Entropy-P', 'Entropy-K', 'Entropy-J',
  'MI-P/T',   'MI-T/N',   'MI-N/P',   'MI-cross',  'MI-auto',
];

function buildFeatureCells(drift: number, anomalyScore: number) {
  return FEATURE_LABELS.map((label, i) => {
    // Vary values based on group (DFT, SPL, Hurst, Entropy, MI) and anomaly score
    const group = Math.floor(i / 5);
    const base = [0.4, 0.35, 0.55, 0.3, 0.45][group] ?? 0.4;
    const noise = (Math.random() - 0.5) * 0.12;
    const anomalyBias = anomalyScore * 0.3 * (group % 2 === 0 ? 1 : -0.5);
    const value = parseFloat(clamp(base + drift * 0.1 + noise + anomalyBias, 0, 1).toFixed(3));
    const hue = value < 0.3 ? 210 : value < 0.7 ? 140 : 35;
    const alpha = parseFloat((0.2 + value * 0.5).toFixed(3));
    return { label, value, hue, alpha };
  });
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log(`[combustion-mqtt-sim] Connecting to ${BROKER}`);
console.log(`[combustion-mqtt-sim] Topic: ${TOPIC} | Interval: ${INTERVAL}ms | Mode: ${MODE}`);

const client = mqtt.connect(BROKER, {
  clientId: `combustion-sim-${Date.now()}`,
  keepalive: 60,
  reconnectPeriod: 3000,
});

let tick = 0;
let publishInterval: ReturnType<typeof setInterval> | null = null;

client.on('connect', () => {
  console.log(`[combustion-mqtt-sim] Connected ✓`);
  publishInterval = setInterval(() => {
    const payload = generatePayload(tick++);
    client.publish(TOPIC, JSON.stringify(payload), { qos: 0 }, (err) => {
      if (err) {
        console.error(`[combustion-mqtt-sim] Publish error: ${err.message}`);
      } else if (tick % 10 === 0) {
        console.log(`[combustion-mqtt-sim] tick=${tick} | anomaly=${payload.anomaly_score} | class=${payload.precursor_class}`);
      }
    });
  }, INTERVAL);
});

client.on('error', (err) => {
  console.error(`[combustion-mqtt-sim] MQTT error: ${err.message}`);
});

client.on('close', () => {
  console.log('[combustion-mqtt-sim] Disconnected');
  if (publishInterval) clearInterval(publishInterval);
});

process.on('SIGINT', () => {
  console.log('\n[combustion-mqtt-sim] Shutting down...');
  if (publishInterval) clearInterval(publishInterval);
  client.end(false, {}, () => process.exit(0));
});
