import { describe, it, expect, beforeAll } from 'vitest';
import { build } from '../server';
import type { FastifyInstance } from 'fastify';
import { createTestDevice, createTestDevices } from '../test/helpers';
import '../test/setup';

describe('Device Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
    await app.ready();
  });

  describe('POST /devices', () => {
    it('should create a new device', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices',
        payload: {
          name: 'Temperature Sensor',
          tags: ['warehouse', 'floor-1'],
          attributes: { location: 'Zone A' },
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        name: 'Temperature Sensor',
        tags: ['warehouse', 'floor-1'],
        attributes: { location: 'Zone A' },
      });
      expect(body.data.deviceId).toBeDefined();
      expect(body.data.deviceId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/); // ULID format
    });

    it('should create device without optional fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices',
        payload: {
          name: 'Simple Sensor',
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Simple Sensor');
      expect(body.data.tags).toEqual([]);
    });

    it('should return 400 for invalid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/devices',
        payload: {
          // Missing required 'name' field
          tags: ['test'],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /devices', () => {
    it('should list all devices with pagination', async () => {
      // Create test devices
      await createTestDevices(5);

      const response = await app.inject({
        method: 'GET',
        url: '/devices?limit=10&offset=0',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeGreaterThanOrEqual(5);
      expect(body.pagination).toMatchObject({
        limit: 10,
        offset: 0,
      });
      expect(body.pagination.total).toBeGreaterThanOrEqual(5);
    });

    it('should filter devices by tags', async () => {
      // Create devices with specific tags
      await createTestDevice({ name: 'Device 1', tags: ['sensor', 'floor-1'] });
      await createTestDevice({ name: 'Device 2', tags: ['sensor', 'floor-2'] });
      await createTestDevice({ name: 'Device 3', tags: ['actuator'] });

      const response = await app.inject({
        method: 'GET',
        url: '/devices?tags=sensor',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThanOrEqual(2);

      // All returned devices should have 'sensor' tag
      body.data.forEach((device: any) => {
        expect(device.tags).toContain('sensor');
      });
    });

    it('should support pagination', async () => {
      await createTestDevices(10);

      const response = await app.inject({
        method: 'GET',
        url: '/devices?limit=3&offset=0',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(3);
      expect(body.pagination.limit).toBe(3);
    });
  });

  describe('GET /devices/:deviceId', () => {
    it('should get device by deviceId', async () => {
      const device = await createTestDevice({ name: 'Test Sensor' });

      const response = await app.inject({
        method: 'GET',
        url: `/devices/${device.deviceId}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.deviceId).toBe(device.deviceId);
      expect(body.data.name).toBe('Test Sensor');
    });

    it('should return 404 for non-existent device', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A', // Non-existent ULID
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });
  });

  describe('PATCH /devices/:deviceId', () => {
    it('should update device', async () => {
      const device = await createTestDevice({ name: 'Original Name' });

      const response = await app.inject({
        method: 'PATCH',
        url: `/devices/${device.deviceId}`,
        payload: {
          name: 'Updated Name',
          tags: ['updated'],
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Updated Name');
      expect(body.data.tags).toContain('updated');
    });

    it('should return 404 when updating non-existent device', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A',
        payload: {
          name: 'Updated',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /devices/:deviceId', () => {
    it('should delete device', async () => {
      const device = await createTestDevice();

      const response = await app.inject({
        method: 'DELETE',
        url: `/devices/${device.deviceId}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify device is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/devices/${device.deviceId}`,
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 when deleting non-existent device', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
