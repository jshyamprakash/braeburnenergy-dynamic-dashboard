import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { build } from '../server';
import { connectDB, disconnectDB } from '../lib/mongoose';
import { OpcuaGateway } from '../models/opcua-gateway.model';
import { Device } from '../models/device.model';
import mongoose from 'mongoose';

/**
 * OPC UA Gateway Routes Integration Tests
 *
 * Tests all OPC UA gateway API endpoints with real database operations.
 */

describe('OPC UA Gateway Routes', () => {
  let server: FastifyInstance;
  const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  let testGatewayId: string;

  const sampleGateway = {
    name: 'Test OPC UA Gateway - Process Data',
    description: 'Test OPC UA gateway for process monitoring',
    deviceId: 'OPCUA_TEST_DEVICE_01',
    endpointUrl: 'opc.tcp://localhost:4840',
    securityMode: 'None',
    securityPolicy: 'None',
    monitoringMode: 'Subscription',
    subscriptionSettings: {
      publishingInterval: 1000,
      samplingInterval: 100,
      queueSize: 10,
    },
    nodeMappings: [
      {
        field: 'temperature',
        nodeId: 'ns=2;s=Temperature',
        dataType: 'Double',
        scale: 1,
        offset: 0,
        unit: '°C',
        description: 'Process temperature sensor',
      },
      {
        field: 'pressure',
        nodeId: 'ns=2;s=Pressure',
        dataType: 'Double',
        scale: 0.1,
        unit: 'bar',
        description: 'Process pressure sensor',
      },
    ],
    tags: ['opcua', 'test', 'process'],
  };

  beforeAll(async () => {
    await connectDB();
    server = await build();
  });

  afterAll(async () => {
    await server.close();
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up test data
    await OpcuaGateway.deleteMany({});
    await Device.deleteMany({ deviceId: { $regex: /^OPCUA_TEST_/ } });
  });

  // ==================== Gateway CRUD ====================

  describe('POST /opcua-gateways', () => {
    it('should create a new OPC UA gateway with subscription mode', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/opcua-gateways',
        payload: sampleGateway,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('_id');
      expect(body.data.name).toBe(sampleGateway.name);
      expect(body.data.endpointUrl).toBe('opc.tcp://localhost:4840');
      expect(body.data.monitoringMode).toBe('Subscription');
      expect(body.data.securityMode).toBe('None');
      expect(body.data.isActive).toBe(true);
      expect(body.data.isConnected).toBe(false);
      expect(body.data.nodeMappings).toHaveLength(2);

      testGatewayId = body.data._id;
    });

    it('should create a new OPC UA gateway with polling mode', async () => {
      const pollingGateway = {
        ...sampleGateway,
        name: 'Test Polling Gateway',
        monitoringMode: 'Polling',
        pollingInterval: 5000,
        subscriptionSettings: undefined,
      };

      const response = await server.inject({
        method: 'POST',
        url: '/opcua-gateways',
        payload: pollingGateway,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.monitoringMode).toBe('Polling');
      expect(body.data.pollingInterval).toBe(5000);
    });

    it('should create gateway with security settings', async () => {
      const secureGateway = {
        ...sampleGateway,
        name: 'Secure Gateway',
        securityMode: 'SignAndEncrypt',
        securityPolicy: 'Basic256Sha256',
        username: 'admin',
        password: 'password123',
      };

      const response = await server.inject({
        method: 'POST',
        url: '/opcua-gateways',
        payload: secureGateway,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.securityMode).toBe('SignAndEncrypt');
      expect(body.data.securityPolicy).toBe('Basic256Sha256');
      expect(body.data.username).toBe('admin');
    });

    it('should validate required fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/opcua-gateways',
        payload: {
          name: 'Invalid Gateway',
          // Missing required fields: deviceId, endpointUrl, nodeMappings
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require at least one node mapping', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/opcua-gateways',
        payload: {
          ...sampleGateway,
          nodeMappings: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /opcua-gateways', () => {
    beforeEach(async () => {
      // Create test gateways
      await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
        name: 'Test Gateway 2',
        monitoringMode: 'Polling',
        pollingInterval: 3000,
      });
      await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
        name: 'Inactive Gateway',
        isActive: false,
      });
    });

    it('should list all gateways', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/opcua-gateways',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
      expect(body.pagination).toHaveProperty('total', 3);
      expect(body.pagination).toHaveProperty('pages', 1);
    });

    it('should filter gateways by monitoring mode', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/opcua-gateways?monitoringMode=Polling',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].monitoringMode).toBe('Polling');
    });

    it('should filter gateways by active status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/opcua-gateways?isActive=false',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].isActive).toBe(false);
    });

    it('should paginate results', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/opcua-gateways?page=1&limit=2',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(3);
      expect(body.pagination.pages).toBe(2);
    });

    it('should include runtime status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/opcua-gateways',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data[0]).toHaveProperty('runtime');
      expect(body.data[0].runtime).toHaveProperty('isRunning');
      expect(body.data[0].runtime).toHaveProperty('isConnected');
    });
  });

  describe('GET /opcua-gateways/:id', () => {
    beforeEach(async () => {
      const gateway = await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should get gateway by ID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/opcua-gateways/${testGatewayId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data._id).toBe(testGatewayId);
      expect(body.data.name).toBe(sampleGateway.name);
      expect(body.data).toHaveProperty('runtime');
    });

    it('should return 404 for non-existent gateway', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await server.inject({
        method: 'GET',
        url: `/opcua-gateways/${fakeId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Gateway not found');
    });
  });

  describe('PATCH /opcua-gateways/:id', () => {
    beforeEach(async () => {
      const gateway = await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should update gateway configuration', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/opcua-gateways/${testGatewayId}`,
        payload: {
          name: 'Updated Gateway Name',
          description: 'Updated description',
          pollingInterval: 8000,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Gateway Name');
      expect(body.data.description).toBe('Updated description');
      expect(body.data.pollingInterval).toBe(8000);
    });

    it('should update node mappings', async () => {
      const newMappings = [
        {
          field: 'flowRate',
          nodeId: 'ns=2;s=FlowRate',
          dataType: 'Double',
          scale: 1,
          unit: 'm³/h',
        },
      ];

      const response = await server.inject({
        method: 'PATCH',
        url: `/opcua-gateways/${testGatewayId}`,
        payload: {
          nodeMappings: newMappings,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.nodeMappings).toHaveLength(1);
      expect(body.data.nodeMappings[0].field).toBe('flowRate');
    });

    it('should return 404 for non-existent gateway', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await server.inject({
        method: 'PATCH',
        url: `/opcua-gateways/${fakeId}`,
        payload: { name: 'New Name' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /opcua-gateways/:id', () => {
    beforeEach(async () => {
      const gateway = await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should delete gateway', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: `/opcua-gateways/${testGatewayId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('deleted');

      // Verify deletion
      const gateway = await OpcuaGateway.findById(testGatewayId);
      expect(gateway).toBeNull();
    });

    it('should return 404 for non-existent gateway', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await server.inject({
        method: 'DELETE',
        url: `/opcua-gateways/${fakeId}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==================== Gateway Operations ====================

  describe('POST /opcua-gateways/:id/start', () => {
    beforeEach(async () => {
      const gateway = await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should attempt to start gateway', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/opcua-gateways/${testGatewayId}/start`,
      });

      // Will fail to connect since no real OPC UA server is running
      // But should handle error gracefully
      expect([200, 400, 500]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
    });
  });

  describe('POST /opcua-gateways/:id/stop', () => {
    beforeEach(async () => {
      const gateway = await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should attempt to stop gateway', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/opcua-gateways/${testGatewayId}/stop`,
      });

      // Should fail gracefully if not running
      expect([200, 400, 500]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
    });
  });

  describe('POST /opcua-gateways/:id/test', () => {
    beforeEach(async () => {
      const gateway = await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should test connection', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/opcua-gateways/${testGatewayId}/test`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('message');
      // Will fail since no real server, but should return structured response
    });
  });

  describe('GET /opcua-gateways/:id/status', () => {
    beforeEach(async () => {
      const gateway = await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should get gateway status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/opcua-gateways/${testGatewayId}/status`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('isRunning');
      expect(body.data).toHaveProperty('isConnected');
      expect(body.data.isRunning).toBe(false);
      expect(body.data.isConnected).toBe(false);
    });
  });

  describe('POST /opcua-gateways/:id/browse', () => {
    beforeEach(async () => {
      const gateway = await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should browse nodes with default root', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/opcua-gateways/${testGatewayId}/browse`,
        payload: {},
      });

      // Will fail since no real server, but should handle gracefully
      expect([200, 400, 500]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
    });

    it('should browse specific node', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/opcua-gateways/${testGatewayId}/browse`,
        payload: {
          nodeId: 'ns=2;s=CustomNode',
        },
      });

      // Will fail since no real server
      expect([200, 400, 500]).toContain(response.statusCode);
    });
  });

  describe('GET /opcua-gateways/:id/statistics', () => {
    beforeEach(async () => {
      const gateway = await OpcuaGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
        totalReads: 100,
        successfulReads: 95,
        failedReads: 5,
        averageResponseTime: 45.5,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should get gateway statistics', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/opcua-gateways/${testGatewayId}/statistics`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('statistics');
      expect(body.data.statistics.totalReads).toBe(100);
      expect(body.data.statistics.successfulReads).toBe(95);
      expect(body.data.statistics.failedReads).toBe(5);
      expect(body.data.statistics.successRate).toBe(95);
      expect(body.data.statistics.averageResponseTime).toBe(45.5);
    });
  });
});
