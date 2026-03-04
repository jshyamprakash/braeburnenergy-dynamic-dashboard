import { ulid } from 'ulid';
import mongoose from 'mongoose';
import { Device } from '../models/device.model';
import { DeviceState } from '../models/device-state.model';
import { DEFAULT_ORG_ID } from '../lib/request-context';

/**
 * Test Data Helpers
 *
 * Utilities for creating test data in integration tests
 */

export { DEFAULT_ORG_ID };

/**
 * Create a test device
 */
export async function createTestDevice(overrides: any = {}) {
  const deviceId = ulid();

  const device = new Device({
    orgId: new mongoose.Types.ObjectId(overrides.orgId || DEFAULT_ORG_ID),
    deviceId,
    name: overrides.name || 'Test Device',
    tags: overrides.tags || ['test'],
    attributes: overrides.attributes || null,
  });

  const saved = await device.save();
  return saved.toObject();
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
export async function createTestDeviceState(deviceId: string, data: any = {}, orgId: string = DEFAULT_ORG_ID) {
  const state = new DeviceState({
    timestamp: new Date(),
    metadata: {
      deviceId,
      orgId: new mongoose.Types.ObjectId(orgId),
    },
    data: data && Object.keys(data).length > 0 ? data : { temperature: 25.0, humidity: 50.0 },
  });

  const saved = await state.save();
  const obj = saved.toObject();

  // Return flat format matching API response
  return {
    id: obj._id,
    deviceId: obj.metadata.deviceId,
    data: obj.data,
    timestamp: obj.timestamp,
  };
}

/**
 * Create multiple test device states
 */
export async function createTestDeviceStates(deviceId: string, count: number, orgId: string = DEFAULT_ORG_ID) {
  const states = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - i * 60000); // 1 minute intervals

    const state = new DeviceState({
      timestamp,
      metadata: {
        deviceId,
        orgId: new mongoose.Types.ObjectId(orgId),
      },
      data: { temperature: 20 + i, humidity: 40 + i },
    });

    const saved = await state.save();
    const obj = saved.toObject();

    states.push({
      id: obj._id,
      deviceId: obj.metadata.deviceId,
      data: obj.data,
      timestamp: obj.timestamp,
    });
  }

  return states;
}
