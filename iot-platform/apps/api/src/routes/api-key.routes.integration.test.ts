import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../server';
import type { FastifyInstance } from 'fastify';
import '../test/setup';
import { User, Organization, ApiKey } from '../models';
import { Types } from 'mongoose';

describe('API Key Routes Integration Tests', () => {
  let app: FastifyInstance;
  let testOrgId: string;
  let userToken: string;
  let userId: string;
  let testApiKeyId: string;
  let testApiKey: string;

  beforeAll(async () => {
    app = await build();
    await app.ready();

    // Create test organization
    const org = await Organization.create({
      name: 'Test API Key Organization',
      slug: 'test-api-key-org',
      settings: { timezone: 'UTC' },
    });
    testOrgId = org._id.toString();

    // Create user for API key tests
    const user = new User({
      username: 'testuser',
      email: 'testuser@test.com',
      role: 'Operator',
      organizationId: new Types.ObjectId(testOrgId),
      isActive: true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lastPasswordChange: new Date(),
    });
    user.password = 'User@123!';
    await user.save();
    userId = user._id.toString();

    // Login to get token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'testuser',
        password: 'User@123!',
      },
    });

    const loginBody = JSON.parse(loginResponse.body);
    userToken = loginBody.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await ApiKey.deleteMany({ organizationId: testOrgId });
    await User.deleteMany({ organizationId: testOrgId });
    await Organization.findByIdAndDelete(testOrgId);
    await app.close();
  });

  describe('POST /api-keys', () => {
    it('should create new API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Test API Key',
          permissions: ['device:read', 'device-state:read'],
          prefix: 'iot_test_',
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test API Key');
      expect(body.data.key).toBeDefined();
      expect(body.data.key).toMatch(/^iot_test_/);
      expect(body.data.permissions).toEqual(['device:read', 'device-state:read']);
      expect(body.message).toContain('Save the key securely');

      testApiKeyId = body.data.id;
      testApiKey = body.data.key;
    });

    it('should create API key with default permissions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Default Permissions Key',
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.permissions).toEqual(['device:read', 'device-state:read']);
    });

    it('should create API key with expiration', async () => {
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Expiring Key',
          expiresAt: expiryDate.toISOString(),
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.expiresAt).toBeDefined();
    });

    it('should return 400 for missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        payload: {
          name: 'No Auth Key',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api-keys', () => {
    it('should list user API keys', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-keys',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      // Verify API key structure (should NOT include plain key)
      const firstKey = body.data[0];
      expect(firstKey.id).toBeDefined();
      expect(firstKey.name).toBeDefined();
      expect(firstKey.prefix).toBeDefined();
      expect(firstKey.permissions).toBeDefined();
      expect(firstKey.key).toBeUndefined(); // Plain key not returned
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-keys',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api-keys/:id', () => {
    it('should get API key details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api-keys/${testApiKeyId}`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(testApiKeyId);
      expect(body.data.name).toBe('Test API Key');
      expect(body.data.key).toBeUndefined(); // Plain key not returned
    });

    it('should return 404 for non-existent key', async () => {
      const fakeId = new Types.ObjectId().toString();

      const response = await app.inject({
        method: 'GET',
        url: `/api-keys/${fakeId}`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('PATCH /api-keys/:id', () => {
    it('should update API key name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api-keys/${testApiKeyId}`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Updated API Key Name',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated API Key Name');
    });

    it('should update API key permissions', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api-keys/${testApiKeyId}`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        payload: {
          permissions: ['device:read', 'device:write', 'device-state:read'],
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.permissions).toEqual(['device:read', 'device:write', 'device-state:read']);
    });

    it('should return 404 for non-existent key', async () => {
      const fakeId = new Types.ObjectId().toString();

      const response = await app.inject({
        method: 'PATCH',
        url: `/api-keys/${fakeId}`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api-keys/:id/rotate', () => {
    it('should rotate API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api-keys/${testApiKeyId}/rotate`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.key).toBeDefined();
      expect(body.data.key).not.toBe(testApiKey); // New key should be different
      expect(body.data.key).toMatch(/^iot_test_/);
      expect(body.message).toContain('Save the new key securely');

      // Update test API key for subsequent tests
      testApiKey = body.data.key;
    });

    it('should return 404 for non-existent key', async () => {
      const fakeId = new Types.ObjectId().toString();

      const response = await app.inject({
        method: 'POST',
        url: `/api-keys/${fakeId}/rotate`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('API Key Authentication', () => {
    it('should authenticate with valid API key', async () => {
      // Try to access a protected endpoint with API key
      const response = await app.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          Authorization: `Bearer ${testApiKey}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.username).toBe('testuser');
    });

    it('should return 401 for invalid API key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          Authorization: 'Bearer iot_test_invalidkeyhere123456789012',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api-keys/:id/revoke', () => {
    it('should revoke API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api-keys/${testApiKeyId}/revoke`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('revoked successfully');

      // Verify API key no longer works
      const authResponse = await app.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          Authorization: `Bearer ${testApiKey}`,
        },
      });

      expect(authResponse.statusCode).toBe(401);
    });
  });

  describe('DELETE /api-keys/:id', () => {
    it('should delete API key permanently', async () => {
      // Create a new key to delete
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api-keys',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Key to Delete',
        },
      });

      const createBody = JSON.parse(createResponse.body);
      const keyIdToDelete = createBody.data.id;

      // Delete the key
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api-keys/${keyIdToDelete}`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(200);

      const deleteBody = JSON.parse(deleteResponse.body);
      expect(deleteBody.success).toBe(true);
      expect(deleteBody.message).toContain('deleted successfully');

      // Verify key is gone
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api-keys/${keyIdToDelete}`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 for non-existent key', async () => {
      const fakeId = new Types.ObjectId().toString();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api-keys/${fakeId}`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
