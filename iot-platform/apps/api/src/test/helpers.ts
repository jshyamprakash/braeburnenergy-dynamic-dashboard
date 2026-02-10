import { ulid } from 'ulid';
import { prisma } from '../lib/prisma';

/**
 * Test Data Helpers
 *
 * Utilities for creating test data in integration tests
 */

/**
 * Create a test device
 */
export async function createTestDevice(overrides: any = {}) {
  const deviceId = ulid();

  return prisma.device.create({
    data: {
      deviceId,
      name: overrides.name || 'Test Device',
      tags: overrides.tags || ['test'],
      attributes: overrides.attributes || null,
    },
  });
}

/**
 * Create multiple test devices
 */
export async function createTestDevices(count: number) {
  const devices = [];

  for (let i = 0; i < count; i++) {
    const device = await createTestDevice({
      name: `Test Device ${i + 1}`,
      tags: ['test', `device-${i + 1}`],
    });
    devices.push(device);
  }

  return devices;
}

/**
 * Create a test device state
 */
export async function createTestDeviceState(deviceId: string, data: any = {}) {
  return prisma.deviceState.create({
    data: {
      deviceId,
      data: data || { temperature: 25.0, humidity: 50.0 },
      timestamp: new Date(),
    },
  });
}

/**
 * Create multiple test device states
 */
export async function createTestDeviceStates(deviceId: string, count: number) {
  const states = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - i * 60000); // 1 minute intervals

    const state = await prisma.deviceState.create({
      data: {
        deviceId,
        data: { temperature: 20 + i, humidity: 40 + i },
        timestamp,
      },
    });

    states.push(state);
  }

  return states;
}
