import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { build } from '../server';
import { connectDB, disconnectDB } from '../lib/mongoose';
import { ModbusGateway } from '../models/modbus-gateway.model';
import { Device } from '../models/device.model';
import mongoose from 'mongoose';

/**
 * Modbus Gateway Routes Integration Tests
 *
 * Tests all Modbus gateway API endpoints with real database operations.
 */

describe('Modbus Gateway Routes', () => {
  let server: FastifyInstance;
  const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  let testGatewayId: string;

  const sampleGateway = {
    name: 'Test Gateway - Temperature Sensor',
    description: 'Test Modbus TCP gateway',
    protocol: 'tcp',
    connection: {
      host: '192.168.1.100',
      port: 502,
      unitId: 1,
      timeout: 5000,
      retryDelay: 3000,
    },
    polling: {
      enabled: true,
      interval: 5000,
      onError: 'continue',
    },
    registers: [
      {
        name: 'temperature',
        address: 30001,
        type: 'input',
        dataType: 'int16',
        scale: 0.1,
        offset: 0,
        unit: '°C',
      },
      {
        name: 'pressure',
        address: 30002,
        type: 'input',
        dataType: 'uint16',
        scale: 0.01,
        unit: 'bar',
      },
    ],
    deviceMapping: {
      autoRegister: true,
      deviceIdPrefix: 'MODBUS_TEST_',
      defaultTags: ['modbus', 'test'],
    },
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
    await ModbusGateway.deleteMany({ orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID) });
    await Device.deleteMany({ name: { $regex: /^MODBUS_TEST_/ } });
  });

  // ==================== Gateway CRUD ====================

  describe('POST /modbus-gateways', () => {
    it('should create a new Modbus TCP gateway', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/modbus-gateways',
        payload: sampleGateway,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('_id');
      expect(body.data.name).toBe(sampleGateway.name);
      expect(body.data.protocol).toBe('tcp');
      expect(body.data.status).toBe('disconnected');
      expect(body.data.registers).toHaveLength(2);

      testGatewayId = body.data._id;
    });

    it('should create a new Modbus RTU gateway', async () => {
      const rtuGateway = {
        ...sampleGateway,
        name: 'Test RTU Gateway',
        protocol: 'rtu',
        connection: {
          host: '/dev/ttyUSB0',
          port: 502,
          unitId: 1,
          timeout: 5000,
          retryDelay: 3000,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/modbus-gateways',
        payload: rtuGateway,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.protocol).toBe('rtu');
      expect(body.data.connection.baudRate).toBe(9600);
    });

    it('should validate required fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/modbus-gateways',
        payload: {
          name: 'Invalid Gateway',
          // Missing required fields
        },
      });

      expect(response.statusCode).toBe(400); // Fastify schema validation error
    });
  });

  describe('GET /modbus-gateways', () => {
    beforeEach(async () => {
      // Create test gateways
      await ModbusGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      await ModbusGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
        name: 'Test Gateway 2',
        protocol: 'rtu',
      });
    });

    it('should list all gateways', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/modbus-gateways',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toHaveProperty('total', 2);
      expect(body.pagination).toHaveProperty('pages', 1);
    });

    it('should filter gateways by protocol', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/modbus-gateways?protocol=tcp',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].protocol).toBe('tcp');
    });

    it('should paginate results', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/modbus-gateways?page=1&limit=1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(2);
      expect(body.pagination.pages).toBe(2);
    });

    it('should filter by status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/modbus-gateways?status=disconnected',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].status).toBe('disconnected');
    });
  });

  describe('GET /modbus-gateways/:id', () => {
    beforeEach(async () => {
      const gateway = await ModbusGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should get gateway by ID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/modbus-gateways/${testGatewayId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data._id).toBe(testGatewayId);
      expect(body.data.name).toBe(sampleGateway.name);
      expect(body.data.runtime).toHaveProperty('running');
      expect(body.data.runtime).toHaveProperty('connected');
    });

    it('should return 404 for non-existent gateway', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await server.inject({
        method: 'GET',
        url: `/modbus-gateways/${fakeId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Gateway not found');
    });
  });

  describe('PATCH /modbus-gateways/:id', () => {
    beforeEach(async () => {
      const gateway = await ModbusGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should update gateway configuration', async () => {
      const updates = {
        name: 'Updated Gateway Name',
        description: 'Updated description',
        polling: {
          enabled: false,
          interval: 10000,
          onError: 'stop',
        },
      };

      const response = await server.inject({
        method: 'PATCH',
        url: `/modbus-gateways/${testGatewayId}`,
        payload: updates,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe(updates.name);
      expect(body.data.description).toBe(updates.description);
      expect(body.data.polling.enabled).toBe(false);
      expect(body.data.polling.interval).toBe(10000);
    });

    it('should return 404 for non-existent gateway', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await server.inject({
        method: 'PATCH',
        url: `/modbus-gateways/${fakeId}`,
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('DELETE /modbus-gateways/:id', () => {
    beforeEach(async () => {
      const gateway = await ModbusGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should delete gateway', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: `/modbus-gateways/${testGatewayId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Gateway deleted');

      // Verify deletion
      const gateway = await ModbusGateway.findById(testGatewayId);
      expect(gateway).toBeNull();
    });

    it('should return 404 for non-existent gateway', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await server.inject({
        method: 'DELETE',
        url: `/modbus-gateways/${fakeId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  // ==================== Gateway Operations ====================

  describe('POST /modbus-gateways/:id/test', () => {
    beforeEach(async () => {
      const gateway = await ModbusGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should test connection (will fail for non-existent device)', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/modbus-gateways/${testGatewayId}/test`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('message');
      // Will be false since device doesn't exist, but endpoint works
    });
  });

  describe('GET /modbus-gateways/:id/status', () => {
    beforeEach(async () => {
      const gateway = await ModbusGateway.create({
        orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
        ...sampleGateway,
      });
      testGatewayId = gateway._id.toString();
    });

    it('should get gateway status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/modbus-gateways/${testGatewayId}/status`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('running');
      expect(body.data).toHaveProperty('connected');
      expect(body.data.running).toBe(false);
      expect(body.data.connected).toBe(false);
    });
  });

  // ==================== Data Validation ====================

  describe('Register Configuration Validation', () => {
    it('should accept valid register types', async () => {
      const gateway = {
        ...sampleGateway,
        registers: [
          { name: 'holding', address: 40001, type: 'holding', dataType: 'uint16' },
          { name: 'input', address: 30001, type: 'input', dataType: 'int16' },
          { name: 'coil', address: 1, type: 'coil', dataType: 'boolean' },
          { name: 'discrete', address: 10001, type: 'discrete', dataType: 'boolean' },
        ],
      };

      const response = await server.inject({
        method: 'POST',
        url: '/modbus-gateways',
        payload: gateway,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.registers).toHaveLength(4);
    });

    it('should accept valid data types', async () => {
      const gateway = {
        ...sampleGateway,
        registers: [
          { name: 'int16', address: 1, type: 'input', dataType: 'int16' },
          { name: 'uint16', address: 2, type: 'input', dataType: 'uint16' },
          { name: 'int32', address: 3, type: 'input', dataType: 'int32' },
          { name: 'uint32', address: 5, type: 'input', dataType: 'uint32' },
          { name: 'float', address: 7, type: 'input', dataType: 'float' },
          { name: 'boolean', address: 9, type: 'coil', dataType: 'boolean' },
        ],
      };

      const response = await server.inject({
        method: 'POST',
        url: '/modbus-gateways',
        payload: gateway,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.registers).toHaveLength(6);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle gateway with no registers', async () => {
      const gateway = {
        ...sampleGateway,
        registers: [],
      };

      const response = await server.inject({
        method: 'POST',
        url: '/modbus-gateways',
        payload: gateway,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.registers).toHaveLength(0);
    });

    it('should handle gateway with disabled polling', async () => {
      const gateway = {
        ...sampleGateway,
        polling: {
          enabled: false,
          interval: 5000,
          onError: 'continue',
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/modbus-gateways',
        payload: gateway,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.polling.enabled).toBe(false);
    });

    it('should handle gateway with auto-register disabled', async () => {
      const gateway = {
        ...sampleGateway,
        deviceMapping: {
          autoRegister: false,
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/modbus-gateways',
        payload: gateway,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.deviceMapping.autoRegister).toBe(false);
    });
  });
});
