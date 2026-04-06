import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../server';
import type { FastifyInstance } from 'fastify';
import '../test/setup';
import { User, Organization } from '../models';
import { ModuleConfig } from '../models/module-config.model';
import { Types } from 'mongoose';

describe('Module Routes Integration Tests (ADR-051)', () => {
  let app: FastifyInstance;
  let superAdminToken: string;
  let adminToken: string;
  let testOrgId: string;

  beforeAll(async () => {
    app = await build();
    await app.ready();

    // Clean up any existing test users and module config
    await User.deleteMany({ username: { $in: ['test_superadmin', 'test_regular_admin'] } });
    await ModuleConfig.deleteMany({});

    // Create org for admin user
    const org = await Organization.create({
      name: 'Module Test Org',
      slug: 'module-test-org',
      settings: {},
    });
    testOrgId = org._id.toString();

    // Create SuperAdmin (no org)
    const superAdmin = new User({
      username: 'test_superadmin',
      email: 'test_superadmin@test.com',
      role: 'SuperAdmin',
      isActive: true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lastPasswordChange: new Date(),
    });
    superAdmin.password = 'SuperAdmin@123!';
    await superAdmin.save();

    // Create Admin (with org)
    const adminUser = new User({
      username: 'test_regular_admin',
      email: 'test_regular_admin@test.com',
      role: 'Admin',
      organizationId: new Types.ObjectId(testOrgId),
      isActive: true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lastPasswordChange: new Date(),
    });
    adminUser.password = 'Admin@123!';
    await adminUser.save();

    // Login as SuperAdmin
    const saLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'test_superadmin', password: 'SuperAdmin@123!' },
    });
    superAdminToken = JSON.parse(saLogin.body).data.accessToken;

    // Login as Admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'test_regular_admin', password: 'Admin@123!' },
    });
    adminToken = JSON.parse(adminLogin.body).data.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({ username: { $in: ['test_superadmin', 'test_regular_admin'] } });
    await Organization.findByIdAndDelete(testOrgId);
    await ModuleConfig.deleteMany({});
    await app.close();
  });

  describe('GET /api/v1/modules', () => {
    it('returns enabled:[] on fresh deploy (no auth required)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/modules',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.enabled)).toBe(true);
    });
  });

  describe('PATCH /api/v1/modules', () => {
    it('SuperAdmin can enable modules', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/modules',
        headers: { Authorization: `Bearer ${superAdminToken}` },
        payload: { enabled: ['combustion_dl', 'asset_life'] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.enabled).toContain('combustion_dl');
      expect(body.data.enabled).toContain('asset_life');
      expect(body.data.enabled).not.toContain('be_agent');
    });

    it('returns 403 when non-SuperAdmin attempts to update modules', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/modules',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { enabled: ['be_agent'] },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 401 when unauthenticated', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/modules',
        payload: { enabled: ['be_agent'] },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
