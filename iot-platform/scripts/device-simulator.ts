#!/usr/bin/env tsx

/**
 * Device Simulator
 *
 * Simulates multiple IoT devices sending data to the platform.
 * Generates realistic sensor data with configurable patterns and anomalies.
 *
 * Usage:
 *   npm run simulate                           # 3 devices, 2s interval
 *   npm run simulate -- --devices 5            # 5 devices
 *   npm run simulate -- --interval 1s          # 1 second updates
 *   npm run simulate -- --anomalies            # Enable anomaly injection
 */

import { ulid } from 'ulid';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';

interface DeviceProfile {
  type: string;
  name: string;
  sensors: SensorConfig[];
}

interface SensorConfig {
  field: string;
  min: number;
  max: number;
  unit: string;
  decimals: number;
  drift: number; // Rate of gradual change
  noise: number; // Random variation
}

// Device Profiles
const DEVICE_PROFILES: DeviceProfile[] = [
  {
    type: 'temperature_sensor',
    name: 'Temperature Sensor',
    sensors: [
      { field: 'temperature', min: 18, max: 35, unit: '°C', decimals: 1, drift: 0.1, noise: 0.5 },
      { field: 'humidity', min: 40, max: 80, unit: '%', decimals: 1, drift: 0.2, noise: 1 },
    ],
  },
  {
    type: 'pressure_sensor',
    name: 'Pressure Sensor',
    sensors: [
      { field: 'pressure', min: 980, max: 1020, unit: 'hPa', decimals: 1, drift: 0.3, noise: 2 },
      { field: 'temperature', min: 15, max: 30, unit: '°C', decimals: 1, drift: 0.1, noise: 0.3 },
    ],
  },
  {
    type: 'air_quality_sensor',
    name: 'Air Quality Sensor',
    sensors: [
      { field: 'co2', min: 400, max: 1200, unit: 'ppm', decimals: 0, drift: 5, noise: 20 },
      { field: 'pm25', min: 10, max: 100, unit: 'µg/m³', decimals: 1, drift: 1, noise: 5 },
      { field: 'voc', min: 0, max: 500, unit: 'ppb', decimals: 0, drift: 2, noise: 10 },
    ],
  },
  {
    type: 'energy_meter',
    name: 'Energy Meter',
    sensors: [
      { field: 'power', min: 100, max: 5000, unit: 'W', decimals: 0, drift: 50, noise: 100 },
      { field: 'voltage', min: 220, max: 240, unit: 'V', decimals: 1, drift: 0.5, noise: 2 },
      { field: 'current', min: 1, max: 25, unit: 'A', decimals: 2, drift: 0.5, noise: 1 },
    ],
  },
  {
    type: 'vibration_sensor',
    name: 'Vibration Sensor',
    sensors: [
      { field: 'vibration_x', min: 0, max: 10, unit: 'mm/s', decimals: 2, drift: 0.1, noise: 0.5 },
      { field: 'vibration_y', min: 0, max: 10, unit: 'mm/s', decimals: 2, drift: 0.1, noise: 0.5 },
      { field: 'vibration_z', min: 0, max: 10, unit: 'mm/s', decimals: 2, drift: 0.1, noise: 0.5 },
      { field: 'temperature', min: 20, max: 80, unit: '°C', decimals: 1, drift: 0.5, noise: 1 },
    ],
  },
];

class DeviceSimulator {
  private deviceId: string;
  private profile: DeviceProfile;
  private currentValues: Map<string, number> = new Map();
  private anomalyMode: boolean;
  private targetValues: Map<string, number> = new Map();

  constructor(profile: DeviceProfile, anomalies: boolean = false) {
    this.deviceId = ulid();
    this.profile = profile;
    this.anomalyMode = anomalies;

    // Initialize current values to mid-range
    profile.sensors.forEach((sensor) => {
      const midValue = (sensor.min + sensor.max) / 2;
      this.currentValues.set(sensor.field, midValue);
      this.targetValues.set(sensor.field, midValue);
    });
  }

  async register(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.deviceId,
          name: `${this.profile.name} ${this.deviceId.slice(-6)}`,
          tags: [this.profile.type, 'simulated', 'demo'],
          attributes: {
            profile: this.profile.type,
            simulated: true,
            sensors: this.profile.sensors.map((s) => s.field),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to register device: ${response.statusText}`);
      }

      // Get the device ID from response (API returns deviceId in response)
      const result = await response.json();
      if (result.data?.deviceId) {
        this.deviceId = result.data.deviceId;
      }

      console.log(`✅ Registered: ${this.profile.name} (${this.deviceId.slice(-6)})`);
    } catch (error) {
      console.error(`❌ Failed to register device:`, error);
      throw error;
    }
  }

  generateData(): Record<string, number> {
    const data: Record<string, number> = {};

    this.profile.sensors.forEach((sensor) => {
      let currentValue = this.currentValues.get(sensor.field)!;
      let targetValue = this.targetValues.get(sensor.field)!;

      // Gradually drift towards target
      const diff = targetValue - currentValue;
      currentValue += diff * 0.1;

      // Add noise
      currentValue += (Math.random() - 0.5) * sensor.noise * 2;

      // Add gradual drift
      currentValue += (Math.random() - 0.5) * sensor.drift * 2;

      // Occasionally change target (simulate real-world changes)
      if (Math.random() < 0.05) {
        targetValue = sensor.min + Math.random() * (sensor.max - sensor.min);
        this.targetValues.set(sensor.field, targetValue);
      }

      // Inject anomalies if enabled
      if (this.anomalyMode && Math.random() < 0.02) {
        // 2% chance of anomaly
        const anomalyType = Math.random();
        if (anomalyType < 0.5) {
          // Spike
          currentValue += (sensor.max - sensor.min) * 0.5 * (Math.random() > 0.5 ? 1 : -1);
        } else {
          // Out of range
          currentValue = Math.random() > 0.5 ? sensor.max * 1.2 : sensor.min * 0.8;
        }
      }

      // Clamp to reasonable bounds (not strict, allow some overshoot for realism)
      currentValue = Math.max(
        sensor.min * 0.9,
        Math.min(sensor.max * 1.1, currentValue)
      );

      // Update current value
      this.currentValues.set(sensor.field, currentValue);

      // Round to specified decimals
      data[sensor.field] = Number(currentValue.toFixed(sensor.decimals));
    });

    return data;
  }

  async sendData(): Promise<void> {
    const data = this.generateData();

    try {
      const response = await fetch(`${API_URL}/devices/${this.deviceId}/states`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send data: ${response.statusText}`);
      }

      // Format data for display
      const dataStr = Object.entries(data)
        .map(([key, value]) => {
          const sensor = this.profile.sensors.find((s) => s.field === key);
          return `${key}=${value}${sensor?.unit || ''}`;
        })
        .join(', ');

      console.log(`📡 ${this.deviceId.slice(-6)}: ${dataStr}`);
    } catch (error) {
      console.error(`❌ Failed to send data for ${this.deviceId}:`, error);
    }
  }
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    devices: 3,
    interval: 2000, // ms
    anomalies: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--devices':
        config.devices = parseInt(args[++i], 10);
        break;
      case '--interval':
        const intervalStr = args[++i];
        const match = intervalStr.match(/^(\d+)(s|ms)?$/);
        if (match) {
          const value = parseInt(match[1], 10);
          const unit = match[2] || 'ms';
          config.interval = unit === 's' ? value * 1000 : value;
        }
        break;
      case '--anomalies':
        config.anomalies = true;
        break;
      case '--help':
        console.log(`
Device Simulator - Generate realistic IoT device data

Usage:
  npm run simulate [options]

Options:
  --devices <n>       Number of devices to simulate (default: 3)
  --interval <time>   Update interval (default: 2s)
                      Examples: 1s, 500ms, 2000ms
  --anomalies         Enable anomaly injection (spikes, drift)
  --help              Show this help message

Examples:
  npm run simulate
  npm run simulate -- --devices 5 --interval 1s
  npm run simulate -- --devices 10 --interval 500ms --anomalies
        `);
        process.exit(0);
    }
  }

  return config;
}

// Main function
async function main() {
  const config = parseArgs();

  console.log(`
🚀 Device Simulator Starting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Devices: ${config.devices}
⏱️  Interval: ${config.interval}ms
⚠️  Anomalies: ${config.anomalies ? 'Enabled' : 'Disabled'}
🌐 API: ${API_URL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  // Create devices with random profiles
  const devices: DeviceSimulator[] = [];
  for (let i = 0; i < config.devices; i++) {
    const profile = DEVICE_PROFILES[Math.floor(Math.random() * DEVICE_PROFILES.length)];
    const device = new DeviceSimulator(profile, config.anomalies);
    devices.push(device);
  }

  // Register all devices
  console.log('📝 Registering devices...\n');
  for (const device of devices) {
    await device.register();
  }

  console.log(`\n✅ All devices registered. Starting data generation...\n`);

  // Start sending data
  setInterval(async () => {
    for (const device of devices) {
      await device.sendData();
    }
  }, config.interval);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down simulator...');
    process.exit(0);
  });
}

// Run simulator
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
