#!/usr/bin/env tsx

/**
 * Device Simulator
 *
 * Simulates IoT devices sending data to the platform.
 * Generates realistic sensor data with drift, noise, and optional anomalies.
 *
 * Usage:
 *   pnpm run simulate                                         # 3 random devices, 2s interval
 *   pnpm run simulate -- --devices 5                          # 5 random devices
 *   pnpm run simulate -- --interval 1s                        # 1 second updates
 *   pnpm run simulate -- --anomalies                          # Enable anomaly injection
 *   pnpm run simulate -- --deviceId 01KGPQZ53TRMAG5Y1H2S2SH  # Stream to existing device
 *   pnpm run simulate -- --deviceId <ULID> --interval 2s      # Existing device, 2s interval
 *   pnpm run simulate -- --applicationId <ULID>               # Register new devices to application
 */

import { ulid } from 'ulid';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
let authToken: string | null = null;
let refreshToken: string | null = null;
let tokenRefreshInterval: NodeJS.Timeout | null = null;

// ============================================================================
// Field range lookup — used when targeting an existing device by ID
// Falls back to DEFAULT_NUMBER_CONFIG for unknown field names
// ============================================================================

interface NumberFieldConfig {
  min: number;
  max: number;
  decimals: number;
  drift: number;
  noise: number;
}

const FIELD_DEFAULTS: Record<string, NumberFieldConfig> = {
  temperature:  { min: 15,  max: 40,   decimals: 1, drift: 0.2, noise: 0.5 },
  humidity:     { min: 30,  max: 90,   decimals: 1, drift: 0.3, noise: 1   },
  pressure:     { min: 980, max: 1020, decimals: 1, drift: 0.3, noise: 2   },
  co2:          { min: 400, max: 1200, decimals: 0, drift: 5,   noise: 20  },
  pm25:         { min: 10,  max: 100,  decimals: 1, drift: 1,   noise: 5   },
  voc:          { min: 0,   max: 500,  decimals: 0, drift: 2,   noise: 10  },
  power:        { min: 100, max: 5000, decimals: 0, drift: 50,  noise: 100 },
  voltage:      { min: 210, max: 250,  decimals: 1, drift: 0.5, noise: 2   },
  current:      { min: 0,   max: 30,   decimals: 2, drift: 0.5, noise: 1   },
  flow_rate:    { min: 0,   max: 100,  decimals: 2, drift: 1,   noise: 2   },
  level:        { min: 0,   max: 100,  decimals: 1, drift: 0.5, noise: 1   },
  ph:           { min: 6,   max: 9,    decimals: 2, drift: 0.1, noise: 0.2 },
  turbidity:    { min: 0,   max: 10,   decimals: 2, drift: 0.1, noise: 0.3 },
  conductivity: { min: 100, max: 1000, decimals: 0, drift: 5,   noise: 10  },
};

const DEFAULT_NUMBER_CONFIG: NumberFieldConfig = {
  min: 0, max: 100, decimals: 2, drift: 1, noise: 2,
};

// ============================================================================
// Authentication
// ============================================================================

async function authenticate(): Promise<void> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@12345' }),
  });

  if (!response.ok) throw new Error(`Auth failed: ${response.statusText}`);

  const result = await response.json();
  authToken = result.data.accessToken;
  refreshToken = result.data.refreshToken;
  console.log('✅ Authenticated\n');

  if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
  tokenRefreshInterval = setInterval(refreshAccessToken, 10 * 60 * 1000);
}

async function refreshAccessToken(): Promise<void> {
  try {
    if (!refreshToken) { await authenticate(); return; }
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) throw new Error(`Refresh failed: ${response.statusText}`);
    const result = await response.json();
    authToken = result.data.accessToken;
    refreshToken = result.data.refreshToken;
    console.log('🔄 Token refreshed');
  } catch {
    await authenticate();
  }
}

function authHeader(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

// ============================================================================
// Device Profiles (for new device creation mode)
// ============================================================================

interface SensorConfig {
  field: string;
  type: 'number' | 'string' | 'boolean' | 'timestamp';
  config: NumberFieldConfig;
}

interface DeviceProfile {
  profileType: string;
  name: string;
  sensors: SensorConfig[];
}

const DEVICE_PROFILES: DeviceProfile[] = [
  {
    profileType: 'temperature_sensor',
    name: 'Temperature Sensor',
    sensors: [
      { field: 'temperature', type: 'number', config: FIELD_DEFAULTS.temperature },
      { field: 'humidity',    type: 'number', config: FIELD_DEFAULTS.humidity    },
    ],
  },
  {
    profileType: 'pressure_sensor',
    name: 'Pressure Sensor',
    sensors: [
      { field: 'pressure',    type: 'number', config: FIELD_DEFAULTS.pressure    },
      { field: 'temperature', type: 'number', config: FIELD_DEFAULTS.temperature },
    ],
  },
  {
    profileType: 'air_quality_sensor',
    name: 'Air Quality Sensor',
    sensors: [
      { field: 'co2',  type: 'number', config: FIELD_DEFAULTS.co2  },
      { field: 'pm25', type: 'number', config: FIELD_DEFAULTS.pm25 },
      { field: 'voc',  type: 'number', config: FIELD_DEFAULTS.voc  },
    ],
  },
  {
    profileType: 'energy_meter',
    name: 'Energy Meter',
    sensors: [
      { field: 'power',   type: 'number', config: FIELD_DEFAULTS.power   },
      { field: 'voltage', type: 'number', config: FIELD_DEFAULTS.voltage },
      { field: 'current', type: 'number', config: FIELD_DEFAULTS.current },
    ],
  },
  {
    profileType: 'water_quality',
    name: 'Water Quality Sensor',
    sensors: [
      { field: 'ph',           type: 'number', config: FIELD_DEFAULTS.ph           },
      { field: 'turbidity',    type: 'number', config: FIELD_DEFAULTS.turbidity    },
      { field: 'conductivity', type: 'number', config: FIELD_DEFAULTS.conductivity },
      { field: 'temperature',  type: 'number', config: FIELD_DEFAULTS.temperature  },
    ],
  },
];

// ============================================================================
// DeviceSimulator
// ============================================================================

class DeviceSimulator {
  readonly deviceId: string;
  private sensors: SensorConfig[];
  private currentValues: Map<string, number> = new Map();
  private targetValues: Map<string, number> = new Map();
  private anomalyMode: boolean;
  private label: string;

  /**
   * @param deviceId  ULID — either pre-existing (targeted mode) or freshly generated
   * @param sensors   Field configs derived from profile or device attributes
   * @param anomalies Whether to inject anomalies
   * @param label     Display label for console output
   */
  constructor(
    deviceId: string,
    sensors: SensorConfig[],
    anomalies = false,
    label = '',
  ) {
    this.deviceId = deviceId;
    this.sensors = sensors;
    this.anomalyMode = anomalies;
    this.label = label || deviceId.slice(-6);

    sensors.forEach(s => {
      if (s.type === 'number') {
        const mid = (s.config.min + s.config.max) / 2;
        this.currentValues.set(s.field, mid);
        this.targetValues.set(s.field, mid);
      }
    });
  }

  /**
   * Register a NEW device via API (skip in targeted mode).
   * Tags: Record<string,string> — matches model schema.
   * Attributes: { fieldName: 'number' | 'string' | ... } — matches deviceAttributesSchema.
   */
  async register(applicationId?: string): Promise<void> {
    const attributes: Record<string, string> = {};
    for (const s of this.sensors) attributes[s.field] = s.type;

    const body: Record<string, any> = {
      name: this.label,
      tags: { category: 'simulated', env: 'demo' },
      attributes,
    };
    if (applicationId) body.applicationId = applicationId;

    const response = await fetch(`${API_URL}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Register failed (${response.status}): ${text}`);
    }

    const result = await response.json();
    console.log(`✅ Registered: ${this.label} (${(result.data?.deviceId ?? this.deviceId).slice(-6)})`);
  }

  generateData(): Record<string, any> {
    const data: Record<string, any> = {};

    for (const sensor of this.sensors) {
      if (sensor.type === 'number') {
        let current = this.currentValues.get(sensor.field)!;
        let target  = this.targetValues.get(sensor.field)!;
        const cfg = sensor.config;

        current += (target - current) * 0.1;
        current += (Math.random() - 0.5) * cfg.noise * 2;
        current += (Math.random() - 0.5) * cfg.drift * 2;

        if (Math.random() < 0.05) {
          target = cfg.min + Math.random() * (cfg.max - cfg.min);
          this.targetValues.set(sensor.field, target);
        }

        if (this.anomalyMode && Math.random() < 0.02) {
          current += (cfg.max - cfg.min) * 0.5 * (Math.random() > 0.5 ? 1 : -1);
        }

        current = Math.max(cfg.min * 0.9, Math.min(cfg.max * 1.1, current));
        this.currentValues.set(sensor.field, current);
        data[sensor.field] = Number(current.toFixed(cfg.decimals));

      } else if (sensor.type === 'boolean') {
        data[sensor.field] = Math.random() > 0.5;

      } else if (sensor.type === 'timestamp') {
        data[sensor.field] = new Date().toISOString();

      } else {
        // string: leave it out (not meaningful to generate random strings)
      }
    }

    return data;
  }

  async sendData(): Promise<void> {
    const data = this.generateData();
    if (Object.keys(data).length === 0) {
      console.log(`⚠️  ${this.label}: No numeric/boolean/timestamp fields to send`);
      return;
    }

    const response = await fetch(`${API_URL}/devices/${this.deviceId}/states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      console.error(`❌ ${this.label}: send failed (${response.status})`);
      return;
    }

    const dataStr = Object.entries(data)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    console.log(`📡 ${this.label}: ${dataStr}`);
  }
}

// ============================================================================
// Fetch existing device attributes from API
// ============================================================================

async function fetchDeviceSensors(deviceId: string, skip: string[] = []): Promise<SensorConfig[]> {
  const response = await fetch(`${API_URL}/devices/${deviceId}`, {
    headers: { ...authHeader() },
  });

  if (!response.ok) {
    throw new Error(`Device not found: ${deviceId} (${response.status})`);
  }

  const result = await response.json();
  const device = result.data;
  const attrs: Record<string, string> = device?.attributes ?? {};
  const name: string = device?.name ?? deviceId.slice(-6);

  if (Object.keys(attrs).length === 0) {
    console.warn(`⚠️  Device ${deviceId.slice(-6)} has no attributes defined — using temperature+humidity defaults`);
    return [
      { field: 'temperature', type: 'number', config: FIELD_DEFAULTS.temperature },
      { field: 'humidity',    type: 'number', config: FIELD_DEFAULTS.humidity    },
    ];
  }

  const skipped = Object.keys(attrs).filter(f => skip.includes(f));
  const active  = Object.entries(attrs).filter(([f]) => !skip.includes(f));

  console.log(`📋 Device: ${name} (${deviceId.slice(-6)})`);
  console.log(`   Fields: ${active.map(([k, v]) => `${k}:${v}`).join(', ')}`);
  if (skipped.length) console.log(`   Skipped (derived): ${skipped.join(', ')}`);

  return active.map(([field, type]) => ({
    field,
    type: (type as SensorConfig['type']),
    config: FIELD_DEFAULTS[field] ?? DEFAULT_NUMBER_CONFIG,
  }));
}

// ============================================================================
// CLI argument parser
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    devices: 3,
    interval: 2000,
    anomalies: false,
    deviceId: '',        // --deviceId <ULID> — target an existing device
    applicationId: '',   // --applicationId <ULID> — attach new devices to an application
    skip: [] as string[], // --skip field1,field2 — exclude derived/computed fields
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--devices':
        config.devices = parseInt(args[++i], 10);
        break;
      case '--interval': {
        const s = args[++i];
        const m = s.match(/^(\d+)(s|ms)?$/);
        if (m) config.interval = m[2] === 's' ? parseInt(m[1]) * 1000 : parseInt(m[1]);
        break;
      }
      case '--anomalies':
        config.anomalies = true;
        break;
      case '--deviceId':
        config.deviceId = args[++i];
        break;
      case '--applicationId':
        config.applicationId = args[++i];
        break;
      case '--skip':
        config.skip = args[++i].split(',').map(f => f.trim());
        break;
      case '--help':
        console.log(`
Device Simulator — stream realistic IoT data to the platform

Usage:
  pnpm run simulate [options]

Options:
  --devices <n>           Number of NEW devices to create and simulate (default: 3)
  --interval <time>       Update interval, e.g. 1s, 500ms, 2000ms (default: 2s)
  --anomalies             Inject random anomaly spikes
  --deviceId <ULID>       Stream to an EXISTING device (reads its attributes schema)
  --applicationId <ULID>  Link newly-created devices to this application
  --skip <fields>         Comma-separated fields to exclude (e.g. workflow-derived fields)

Examples:
  pnpm run simulate                                         # 3 new random devices
  pnpm run simulate -- --deviceId 01KGPQZ53TRMAG5Y1H2S2SH  # existing device, 2s
  pnpm run simulate -- --deviceId <ID> --interval 1s        # existing device, 1s
  pnpm run simulate -- --devices 2 --applicationId <APP_ID> # 2 new devices in app
        `);
        process.exit(0);
    }
  }

  return config;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const config = parseArgs();

  const isTargeted = !!config.deviceId;

  console.log(`
🚀 Device Simulator Starting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${isTargeted
  ? `🎯 Mode:     Targeted (deviceId: ...${config.deviceId.slice(-8)})`
  : `📦 Mode:     Create ${config.devices} new device(s)`}
⏱️  Interval:  ${config.interval}ms
⚠️  Anomalies: ${config.anomalies ? 'Enabled' : 'Disabled'}
🌐 API:       ${API_URL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  await authenticate();

  const simulators: DeviceSimulator[] = [];

  if (isTargeted) {
    // --- Targeted mode: stream to a single existing device ---
    console.log(`🔍 Fetching device schema for ${config.deviceId.slice(-8)}...\n`);
    const sensors = await fetchDeviceSensors(config.deviceId, config.skip);
    simulators.push(new DeviceSimulator(config.deviceId, sensors, config.anomalies));
    console.log(`\n✅ Ready. Starting stream...\n`);

  } else {
    // --- Create mode: register new devices with random profiles ---
    console.log('📝 Registering devices...\n');
    for (let i = 0; i < config.devices; i++) {
      const profile = DEVICE_PROFILES[Math.floor(Math.random() * DEVICE_PROFILES.length)];
      const deviceId = ulid();
      const label = `${profile.name} ${deviceId.slice(-6)}`;
      const sim = new DeviceSimulator(deviceId, profile.sensors, config.anomalies, label);
      await sim.register(config.applicationId || undefined);
      simulators.push(sim);
    }
    console.log(`\n✅ ${simulators.length} device(s) registered. Starting stream...\n`);
  }

  setInterval(async () => {
    for (const sim of simulators) {
      await sim.sendData();
    }
  }, config.interval);

  process.on('SIGINT', () => {
    console.log('\n\n👋 Simulator stopped.');
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
