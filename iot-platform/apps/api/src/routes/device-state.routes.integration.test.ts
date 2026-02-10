import { describe, it, expect, beforeAll } from 'vitest';
import { build } from '../server';
import type { FastifyInstance } from 'fastify';
import { createTestDevice, createTestDeviceState, createTestDeviceStates } from '../test/helpers';
import '../test/setup';

describe('DeviceState Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
    await app.ready();
  });

  describe('POST /devices/:deviceId/states', () => {
    it('should create a new device state', async () => {
      const device = await createTestDevice();

      const response = await app.inject({
        method: 'POST',
        url: `/devices/${device.deviceId}/states`,
        payload: {
          data: {
            temperature: 23.5,
            humidity: 45.2,
          },
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.deviceId).toBe(device.deviceId);
      expect(body.data.data).toMatchObject({
        temperature: 23.5,
        humidity: 45.2,
      });
      expect(body.data.timestamp).toBeDefined();
    });

    it('should create state with custom timestamp', async () => {
      const device = await createTestDevice();
      const customTimestamp = new Date('2024-01-15T10:30:00Z');

      const response = await app.inject({
        method: 'POST',
        url: `/devices/${device.deviceId}/states`,
        payload: {
          data: { temperature: 25.0 },
          timestamp: customTimestamp.toISOString(),
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(new Date(body.data.timestamp).getTime()).toBe(customTimestamp.getTime());
    });

    it('should return 404 for non-existent device', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states',
        payload: {
          data: { temperature: 25.0 },
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid data', async () => {
      const device = await createTestDevice();

      const response = await app.inject({
        method: 'POST',
        url: `/devices/${device.deviceId}/states`,
        payload: {
          // Missing required 'data' field
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /devices/:deviceId/states', () => {
    it('should list device states with pagination', async () => {
      const device = await createTestDevice();
      await createTestDeviceStates(device.deviceId, 10);

      const response = await app.inject({
        method: 'GET',
        url: `/devices/${device.deviceId}/states?limit=5&offset=0`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBe(5);
      expect(body.pagination).toMatchObject({
        limit: 5,
        offset: 0,
        total: 10,
      });
    });

    it('should filter states by time range', async () => {
      const device = await createTestDevice();

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      await createTestDeviceState(device.deviceId, { value: 1 });

      const now = new Date(); // Capture 'now' AFTER creating the state

      const response = await app.inject({
        method: 'GET',
        url: `/devices/${device.deviceId}/states?startTime=${twoHoursAgo.toISOString()}&endTime=${now.toISOString()}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThan(0);

      // All states should be within time range
      body.data.forEach((state: any) => {
        const timestamp = new Date(state.timestamp);
        expect(timestamp.getTime()).toBeGreaterThanOrEqual(twoHoursAgo.getTime());
        expect(timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('should sort states by timestamp', async () => {
      const device = await createTestDevice();
      await createTestDeviceStates(device.deviceId, 5);

      // Test descending order (default)
      const descResponse = await app.inject({
        method: 'GET',
        url: `/devices/${device.deviceId}/states?sortOrder=desc`,
      });

      expect(descResponse.statusCode).toBe(200);

      const descBody = JSON.parse(descResponse.body);
      expect(descBody.data.length).toBeGreaterThan(1);

      // Verify descending order
      for (let i = 0; i < descBody.data.length - 1; i++) {
        const current = new Date(descBody.data[i].timestamp);
        const next = new Date(descBody.data[i + 1].timestamp);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should return 404 for non-existent device', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /devices/:deviceId/states/latest', () => {
    it('should get latest device state', async () => {
      const device = await createTestDevice();
      await createTestDeviceStates(device.deviceId, 5);

      const response = await app.inject({
        method: 'GET',
        url: `/devices/${device.deviceId}/states/latest`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.deviceId).toBe(device.deviceId);
      expect(body.data.data).toBeDefined();
    });

    it('should return 404 when device has no states', async () => {
      const device = await createTestDevice();

      const response = await app.inject({
        method: 'GET',
        url: `/devices/${device.deviceId}/states/latest`,
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.error).toContain('No states found');
    });

    it('should return 404 for non-existent device', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states/latest',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /states/bulk', () => {
    it('should create multiple states in bulk', async () => {
      const device1 = await createTestDevice({ name: 'Device 1' });
      const device2 = await createTestDevice({ name: 'Device 2' });

      const response = await app.inject({
        method: 'POST',
        url: '/states/bulk',
        payload: {
          states: [
            {
              deviceId: device1.deviceId,
              data: { temperature: 20.0 },
            },
            {
              deviceId: device2.deviceId,
              data: { temperature: 25.0 },
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.count).toBe(2);
    });

    it('should return 400 for invalid bulk data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/states/bulk',
        payload: {
          states: [], // Empty array
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
