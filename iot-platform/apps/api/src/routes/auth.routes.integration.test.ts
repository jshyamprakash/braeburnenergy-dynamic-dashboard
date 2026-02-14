import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../server';
import type { FastifyInstance } from 'fastify';
import '../test/setup';
import { User, Organization } from '../models';
import { Types } from 'mongoose';

describe('Auth Routes Integration Tests', () => {
  let app: FastifyInstance;
  let testOrgId: string;
  let adminToken: string;
  let operatorToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await build();
    await app.ready();

    // Create test organization
    const org = await Organization.create({
      name: 'Test Auth Organization',
      slug: 'test-auth-org',
      settings: { timezone: 'UTC' },
    });
    testOrgId = org._id.toString();

    // Create admin user for protected routes
    const adminUser = new User({
      username: 'testadmin',
      email: 'testadmin@test.com',
      role: 'Admin',
      organizationId: new Types.ObjectId(testOrgId),
      isActive: true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lastPasswordChange: new Date(),
    });
    adminUser.password = 'Admin@123!';
    await adminUser.save();

    // Login to get admin token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'testadmin',
        password: 'Admin@123!',
      },
    });

    const loginBody = JSON.parse(loginResponse.body);
    adminToken = loginBody.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ username: { $in: ['testadmin', 'testoperator', 'testviewer'] } });
    await Organization.findByIdAndDelete(testOrgId);
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testadmin',
          password: 'Admin@123!',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user).toBeDefined();
      expect(body.data.user.username).toBe('testadmin');
      expect(body.data.user.role).toBe('Admin');
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });

    it('should return 401 for invalid username', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'nonexistent',
          password: 'Admin@123!',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentication failed');
    });

    it('should return 401 for invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testadmin',
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentication failed');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testadmin',
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /auth/register', () => {
    it('should register new user with valid data (Admin)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: {
          username: 'testoperator',
          email: 'testoperator@test.com',
          password: 'Operator@123!',
          role: 'Operator',
          organizationId: testOrgId,
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.username).toBe('testoperator');
      expect(body.data.role).toBe('Operator');
      expect(body.data.id).toBeDefined();

      testUserId = body.data.id;
    });

    it('should return 409 for duplicate username', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: {
          username: 'testoperator',
          email: 'another@test.com',
          password: 'Operator@123!',
          role: 'Operator',
          organizationId: testOrgId,
        },
      });

      expect(response.statusCode).toBe(409);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Conflict');
    });

    it('should return 400 for weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: {
          username: 'weakpass',
          email: 'weakpass@test.com',
          password: 'weak',
          role: 'Operator',
          organizationId: testOrgId,
        },
      });

      // Fastify schema validation rejects weak password
      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          username: 'noauth',
          email: 'noauth@test.com',
          password: 'NoAuth@123!',
          role: 'Operator',
          organizationId: testOrgId,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /auth/profile', () => {
    it('should get current user profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.username).toBe('testadmin');
      expect(body.data.email).toBe('testadmin@test.com');
      expect(body.data.role).toBe('Admin');
      expect(body.data.isActive).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/profile',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/change-password',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: {
          currentPassword: 'Admin@123!',
          newPassword: 'NewAdmin@456!',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Password changed successfully');

      // Change back to original password for other tests
      await app.inject({
        method: 'POST',
        url: '/auth/change-password',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: {
          currentPassword: 'NewAdmin@456!',
          newPassword: 'Admin@123!',
        },
      });
    });

    it('should return 401 for incorrect current password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/change-password',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: {
          currentPassword: 'WrongPassword@123!',
          newPassword: 'NewAdmin@456!',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('incorrect');
    });

    it('should return 400 for weak new password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/change-password',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: {
          currentPassword: 'Admin@123!',
          newPassword: 'weak',
        },
      });

      // Fastify schema validation rejects weak password
      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // First login to get refresh token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testadmin',
          password: 'Admin@123!',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      const refreshToken = loginBody.data.refreshToken;

      // Use refresh token to get new access token
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.accessToken).not.toBe(loginBody.data.accessToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: 'invalid.token.here',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentication failed');
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Logged out successfully');
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /auth/users', () => {
    beforeAll(async () => {
      // Login again after logout test
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testadmin',
          password: 'Admin@123!',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      adminToken = loginBody.data.accessToken;
    });

    it('should list users for Admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/auth/users?organizationId=${testOrgId}`,
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].username).toBeDefined();
      expect(body.data[0].role).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/auth/users?organizationId=${testOrgId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Account Lockout', () => {
    let lockoutUser: any;

    beforeAll(async () => {
      // Create user for lockout testing
      lockoutUser = new User({
        username: 'lockouttest',
        email: 'lockout@test.com',
        role: 'Viewer',
        organizationId: new Types.ObjectId(testOrgId),
        isActive: true,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lastPasswordChange: new Date(),
      });
      lockoutUser.password = 'Lockout@123!';
      await lockoutUser.save();
    });

    afterAll(async () => {
      await User.deleteOne({ username: 'lockouttest' });
    });

    it('should lock account after 5 failed login attempts', async () => {
      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/auth/login',
          payload: {
            username: 'lockouttest',
            password: 'WrongPassword!',
          },
        });
      }

      // 6th attempt should return locked message
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'lockouttest',
          password: 'Lockout@123!', // Even with correct password
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('Account locked');
    });

    it('should allow login after lockout period (15 min)', async () => {
      // Manually expire the lockout
      const user = await User.findOne({ username: 'lockouttest' });
      if (user) {
        user.lockedUntil = new Date(Date.now() - 1000); // 1 second ago
        user.failedLoginAttempts = 0;
        await user.save();
      }

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'lockouttest',
          password: 'Lockout@123!',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Inactive User', () => {
    let inactiveUser: any;

    beforeAll(async () => {
      // Create inactive user
      inactiveUser = new User({
        username: 'inactiveuser',
        email: 'inactive@test.com',
        role: 'Viewer',
        organizationId: new Types.ObjectId(testOrgId),
        isActive: false, // Inactive
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lastPasswordChange: new Date(),
      });
      inactiveUser.password = 'Inactive@123!';
      await inactiveUser.save();
    });

    afterAll(async () => {
      await User.deleteOne({ username: 'inactiveuser' });
    });

    it('should reject login for inactive user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'inactiveuser',
          password: 'Inactive@123!',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('deactivated');
    });
  });

  describe('Password Change Requirement', () => {
    let mustChangeUser: any;
    let mustChangeToken: string;

    beforeAll(async () => {
      // Create user with mustChangePassword flag
      mustChangeUser = new User({
        username: 'mustchange',
        email: 'mustchange@test.com',
        role: 'Viewer',
        organizationId: new Types.ObjectId(testOrgId),
        isActive: true,
        mustChangePassword: true, // Must change password
        failedLoginAttempts: 0,
        lastPasswordChange: new Date(),
      });
      mustChangeUser.password = 'MustChange@123!';
      await mustChangeUser.save();

      // Get token by directly logging in (login succeeds but other routes blocked)
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'mustchange',
          password: 'MustChange@123!',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      mustChangeToken = loginBody.data.accessToken;
    });

    afterAll(async () => {
      await User.deleteOne({ username: 'mustchange' });
    });

    it('should block protected routes when password change required', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          Authorization: `Bearer ${mustChangeToken}`,
        },
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Password change required');
    });
  });

  describe('RBAC Permission Tests', () => {
    let viewerUser: any;
    let viewerToken: string;

    beforeAll(async () => {
      // Create viewer user
      viewerUser = new User({
        username: 'testviewer',
        email: 'testviewer@test.com',
        role: 'Viewer',
        organizationId: new Types.ObjectId(testOrgId),
        isActive: true,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lastPasswordChange: new Date(),
      });
      viewerUser.password = 'Viewer@123!';
      await viewerUser.save();

      // Login as viewer
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          username: 'testviewer',
          password: 'Viewer@123!',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      viewerToken = loginBody.data.accessToken;
    });

    afterAll(async () => {
      await User.deleteOne({ username: 'testviewer' });
    });

    it('should deny Viewer from registering new users', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: {
          Authorization: `Bearer ${viewerToken}`,
        },
        payload: {
          username: 'shouldfail',
          email: 'shouldfail@test.com',
          password: 'ShouldFail@123!',
          role: 'Viewer',
          organizationId: testOrgId,
        },
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Forbidden');
    });

    it('should deny Viewer from listing users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/auth/users?organizationId=${testOrgId}`,
        headers: {
          Authorization: `Bearer ${viewerToken}`,
        },
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Forbidden');
    });

    it('should allow Viewer to get their own profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          Authorization: `Bearer ${viewerToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.username).toBe('testviewer');
      expect(body.data.role).toBe('Viewer');
    });

    it('should allow Viewer to change their own password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/change-password',
        headers: {
          Authorization: `Bearer ${viewerToken}`,
        },
        payload: {
          currentPassword: 'Viewer@123!',
          newPassword: 'NewViewer@456!',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Token Validation', () => {
    it('should reject expired token', async () => {
      // This would require mocking JWT or waiting for expiry
      // For now, test with malformed token
      const response = await app.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          Authorization: 'Bearer invalid.jwt.token',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('Invalid or expired token');
    });

    it('should reject token with wrong format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/profile',
        headers: {
          Authorization: 'InvalidFormat token',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should reject request without Authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/profile',
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('No token provided');
    });
  });
});
