import { describe, it, expect, beforeAll } from 'vitest';
import { build } from '../server';
import type { FastifyInstance } from 'fastify';
import '../test/setup';
import mongoose from 'mongoose';
import { Device } from '../models/device.model';
import { DeviceState } from '../models/device-state.model';

describe('Organization Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
    await app.ready();
  });

  describe('POST /organizations', () => {
    it('should create a new organization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Acme Corporation',
          slug: 'acme-corp',
          settings: {
            timezone: 'UTC',
            industry: 'Manufacturing',
          },
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Acme Corporation');
      expect(body.data.slug).toBe('acme-corp');
      expect(body.data.settings).toEqual({
        timezone: 'UTC',
        industry: 'Manufacturing',
      });
      expect(body.data._id || body.data.id).toBeDefined();
    });

    it('should return 409 for duplicate slug', async () => {
      await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Test Org',
          slug: 'test-org',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Another Test Org',
          slug: 'test-org',
        },
      });

      expect(response.statusCode).toBe(409);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('already exists');
    });

    it('should validate slug format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Invalid Slug Org',
          slug: 'Invalid Slug!',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require name and slug', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          settings: {},
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /organizations', () => {
    it('should list organizations with pagination', async () => {
      for (let i = 1; i <= 3; i++) {
        await app.inject({
          method: 'POST',
          url: '/organizations',
          payload: {
            name: `Organization ${i}`,
            slug: `org-${i}`,
          },
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/organizations?limit=2&offset=0',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.pagination).toMatchObject({
        limit: 2,
        offset: 0,
      });
      expect(body.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('should search organizations by name', async () => {
      await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Manufacturing Company',
          slug: 'manufacturing-co',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/organizations?search=Manufacturing',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].name).toContain('Manufacturing');
    });
  });

  describe('GET /organizations/:orgId', () => {
    it('should get organization by ID', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Get By ID Test',
          slug: 'get-by-id-test',
        },
      });

      const created = JSON.parse(createResponse.body).data;
      const orgId = created._id || created.id;

      const response = await app.inject({
        method: 'GET',
        url: `/organizations/${orgId}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Get By ID Test');
    });

    it('should return 404 for non-existent organization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/organizations/bbbbbbbbbbbbbbbbbbbbbbbb',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /organizations/slug/:slug', () => {
    it('should get organization by slug', async () => {
      await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Slug Test Org',
          slug: 'slug-test-org',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/slug/slug-test-org',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.slug).toBe('slug-test-org');
      expect(body.data.name).toBe('Slug Test Org');
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/organizations/slug/non-existent-slug',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /organizations/:orgId', () => {
    it('should update organization', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Original Name',
          slug: 'original-slug',
        },
      });

      const created = JSON.parse(createResponse.body).data;
      const orgId = created._id || created.id;

      const response = await app.inject({
        method: 'PATCH',
        url: `/organizations/${orgId}`,
        payload: {
          name: 'Updated Name',
          settings: {
            newSetting: 'value',
          },
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Name');
      expect(body.data.slug).toBe('original-slug');
      expect(body.data.settings).toMatchObject({
        newSetting: 'value',
      });
    });

    it('should return 404 when updating non-existent organization', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/bbbbbbbbbbbbbbbbbbbbbbbb',
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 when updating to existing slug', async () => {
      await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Org A',
          slug: 'org-a',
        },
      });

      const orgBResponse = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Org B',
          slug: 'org-b',
        },
      });

      const orgB = JSON.parse(orgBResponse.body).data;
      const orgBId = orgB._id || orgB.id;

      const response = await app.inject({
        method: 'PATCH',
        url: `/organizations/${orgBId}`,
        payload: {
          slug: 'org-a',
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('DELETE /organizations/:orgId', () => {
    it('should delete organization', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Delete Test Org',
          slug: 'delete-test-org',
        },
      });

      const created = JSON.parse(createResponse.body).data;
      const orgId = created._id || created.id;

      const response = await app.inject({
        method: 'DELETE',
        url: `/organizations/${orgId}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('deleted');

      const getResponse = await app.inject({
        method: 'GET',
        url: `/organizations/${orgId}`,
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 when deleting non-existent organization', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/bbbbbbbbbbbbbbbbbbbbbbbb',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should cascade delete devices and states', async () => {
      const orgResponse = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Cascade Delete Org',
          slug: 'cascade-delete-org',
        },
      });

      const org = JSON.parse(orgResponse.body).data;
      const orgId = org._id || org.id;

      // Create device directly in database
      const device = await Device.create({
        orgId: new mongoose.Types.ObjectId(orgId),
        deviceId: 'test-device-001',
        name: 'Test Device',
        tags: ['test'],
      });

      // Create device state
      await DeviceState.create({
        timestamp: new Date(),
        metadata: {
          deviceId: device.deviceId,
          orgId: new mongoose.Types.ObjectId(orgId),
        },
        data: { temperature: 25 },
      });

      // Delete organization
      await app.inject({
        method: 'DELETE',
        url: `/organizations/${orgId}`,
      });

      // Verify devices and states were cascade deleted
      const deviceCount = await Device.countDocuments({ orgId: new mongoose.Types.ObjectId(orgId) });
      const stateCount = await DeviceState.countDocuments({ 'metadata.orgId': new mongoose.Types.ObjectId(orgId) });

      expect(deviceCount).toBe(0);
      expect(stateCount).toBe(0);
    });
  });

  describe('GET /organizations/:orgId/stats', () => {
    it('should get organization statistics', async () => {
      const orgResponse = await app.inject({
        method: 'POST',
        url: '/organizations',
        payload: {
          name: 'Stats Test Org',
          slug: 'stats-test-org',
        },
      });

      const org = JSON.parse(orgResponse.body).data;
      const orgId = org._id || org.id;

      // Create devices
      for (let i = 1; i <= 3; i++) {
        const device = await Device.create({
          orgId: new mongoose.Types.ObjectId(orgId),
          deviceId: `stats-device-${i}`,
          name: `Stats Device ${i}`,
          tags: ['test'],
        });

        // Create states for each device
        await DeviceState.create({
          timestamp: new Date(),
          metadata: {
            deviceId: device.deviceId,
            orgId: new mongoose.Types.ObjectId(orgId),
          },
          data: { value: i },
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: `/organizations/${orgId}/stats`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.deviceCount).toBe(3);
      expect(body.data.stateCount).toBe(3);
    });

    it('should return 404 for non-existent organization stats', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/organizations/bbbbbbbbbbbbbbbbbbbbbbbb/stats',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
