import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../server';
import type { FastifyInstance } from 'fastify';
import { connectDB, disconnectDB } from '../lib/mongoose';
import { Workflow } from '../models/workflow.model';
import { WorkflowExecution } from '../models/workflow-execution.model';

describe('Workflow Routes Integration Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    // Connect to test database
    await connectDB();

    // Build Fastify app
    app = await build();
    await app.ready();

    // Get admin token (assuming auth is implemented)
    // For POC, we'll skip auth or use mock token
    adminToken = 'mock-admin-token'; // TODO: Replace with actual token from auth
  });

  afterAll(async () => {
    // Clean up test data
    await Workflow.deleteMany({});
    await WorkflowExecution.deleteMany({});

    // Close server and database
    await app.close();
    await disconnectDB();
  });

  describe('POST /workflows', () => {
    it('should create a simple workflow', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/workflows',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Test Workflow',
          description: 'A simple test workflow',
          tags: ['test'],
          nodes: [
            {
              id: 'node-1',
              type: 'trigger:manual',
              position: { x: 100, y: 100 },
              data: {
                label: 'Manual Trigger',
                config: {},
              },
            },
            {
              id: 'node-2',
              type: 'action:logMessage',
              position: { x: 300, y: 100 },
              data: {
                label: 'Log Message',
                config: {
                  message: 'Workflow executed!',
                  level: 'info',
                },
              },
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'node-1',
              target: 'node-2',
            },
          ],
          isEnabled: false,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.workflowId).toBeDefined();
      expect(body.data.name).toBe('Test Workflow');
      expect(body.data.nodes).toHaveLength(2);
      expect(body.data.edges).toHaveLength(1);
    });

    it('should reject workflow without trigger node', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/workflows',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Invalid Workflow',
          nodes: [
            {
              id: 'node-1',
              type: 'action:logMessage',
              position: { x: 100, y: 100 },
              data: { config: { message: 'Test' } },
            },
          ],
          edges: [],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('trigger node');
    });

    it('should reject workflow with cycles', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/workflows',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Cyclic Workflow',
          nodes: [
            { id: 'node-1', type: 'trigger:manual', position: { x: 0, y: 0 }, data: { config: {} } },
            { id: 'node-2', type: 'action:logMessage', position: { x: 100, y: 0 }, data: { config: { message: 'A' } } },
            { id: 'node-3', type: 'action:logMessage', position: { x: 200, y: 0 }, data: { config: { message: 'B' } } },
          ],
          edges: [
            { id: 'e1', source: 'node-1', target: 'node-2' },
            { id: 'e2', source: 'node-2', target: 'node-3' },
            { id: 'e3', source: 'node-3', target: 'node-2' }, // Cycle!
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('cycle');
    });
  });

  describe('GET /workflows', () => {
    it('should list workflows', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/workflows',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter workflows by tags', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/workflows?tags=test',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('GET /workflows/:workflowId', () => {
    it('should get workflow by ID', async () => {
      // First create a workflow
      const createResponse = await app.inject({
        method: 'POST',
        url: '/workflows',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Get Test Workflow',
          nodes: [
            { id: 'n1', type: 'trigger:manual', position: { x: 0, y: 0 }, data: { config: {} } },
          ],
          edges: [],
        },
      });

      const { workflowId } = JSON.parse(createResponse.body).data;

      // Get the workflow
      const response = await app.inject({
        method: 'GET',
        url: `/workflows/${workflowId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.workflowId).toBe(workflowId);
      expect(body.data.name).toBe('Get Test Workflow');
    });

    it('should return 404 for non-existent workflow', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/workflows/01HGPQZ53TRMAG5Y1H2S2SHPVG',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('PATCH /workflows/:workflowId', () => {
    it('should update workflow', async () => {
      // Create workflow
      const createResponse = await app.inject({
        method: 'POST',
        url: '/workflows',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Update Test Workflow',
          nodes: [
            { id: 'n1', type: 'trigger:manual', position: { x: 0, y: 0 }, data: { config: {} } },
          ],
          edges: [],
        },
      });

      const { workflowId } = JSON.parse(createResponse.body).data;

      // Update workflow
      const response = await app.inject({
        method: 'PATCH',
        url: `/workflows/${workflowId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Updated Workflow Name',
          description: 'New description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Workflow Name');
      expect(body.data.description).toBe('New description');
    });
  });

  describe('DELETE /workflows/:workflowId', () => {
    it('should delete workflow', async () => {
      // Create workflow
      const createResponse = await app.inject({
        method: 'POST',
        url: '/workflows',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Delete Test Workflow',
          nodes: [
            { id: 'n1', type: 'trigger:manual', position: { x: 0, y: 0 }, data: { config: {} } },
          ],
          edges: [],
        },
      });

      const { workflowId } = JSON.parse(createResponse.body).data;

      // Delete workflow
      const response = await app.inject({
        method: 'DELETE',
        url: `/workflows/${workflowId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/workflows/${workflowId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });

  describe('POST /workflows/:workflowId/execute', () => {
    it('should execute workflow and return executionId', async () => {
      // Create and enable workflow
      const createResponse = await app.inject({
        method: 'POST',
        url: '/workflows',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Execute Test Workflow',
          isEnabled: true,
          nodes: [
            { id: 'n1', type: 'trigger:manual', position: { x: 0, y: 0 }, data: { config: {} } },
            { id: 'n2', type: 'action:logMessage', position: { x: 100, y: 0 }, data: { config: { message: 'Test' } } },
          ],
          edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
        },
      });

      const { workflowId } = JSON.parse(createResponse.body).data;

      // Execute workflow
      const response = await app.inject({
        method: 'POST',
        url: `/workflows/${workflowId}/execute`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          inputData: { test: 'value' },
        },
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.executionId).toBeDefined();
      expect(body.data.status).toBe('pending');
    });

    it('should reject execution of disabled workflow', async () => {
      // Create disabled workflow
      const createResponse = await app.inject({
        method: 'POST',
        url: '/workflows',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Disabled Workflow',
          isEnabled: false,
          nodes: [
            { id: 'n1', type: 'trigger:manual', position: { x: 0, y: 0 }, data: { config: {} } },
          ],
          edges: [],
        },
      });

      const { workflowId } = JSON.parse(createResponse.body).data;

      // Try to execute
      const response = await app.inject({
        method: 'POST',
        url: `/workflows/${workflowId}/execute`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('disabled');
    });
  });

  describe('POST /workflows/:workflowId/enable and disable', () => {
    it('should enable and disable workflow', async () => {
      // Create workflow
      const createResponse = await app.inject({
        method: 'POST',
        url: '/workflows',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Enable/Disable Test',
          isEnabled: false,
          nodes: [
            { id: 'n1', type: 'trigger:manual', position: { x: 0, y: 0 }, data: { config: {} } },
          ],
          edges: [],
        },
      });

      const { workflowId } = JSON.parse(createResponse.body).data;

      // Enable
      const enableResponse = await app.inject({
        method: 'POST',
        url: `/workflows/${workflowId}/enable`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(enableResponse.statusCode).toBe(200);
      const enableBody = JSON.parse(enableResponse.body);
      expect(enableBody.data.isEnabled).toBe(true);

      // Disable
      const disableResponse = await app.inject({
        method: 'POST',
        url: `/workflows/${workflowId}/disable`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(disableResponse.statusCode).toBe(200);
      const disableBody = JSON.parse(disableResponse.body);
      expect(disableBody.data.isEnabled).toBe(false);
    });
  });

  describe('GET /workflows/:workflowId/executions', () => {
    it('should list workflow executions', async () => {
      // Create and execute workflow
      const createResponse = await app.inject({
        method: 'POST',
        url: '/workflows',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Execution List Test',
          isEnabled: true,
          nodes: [
            { id: 'n1', type: 'trigger:manual', position: { x: 0, y: 0 }, data: { config: {} } },
          ],
          edges: [],
        },
      });

      const { workflowId } = JSON.parse(createResponse.body).data;

      // Execute once
      await app.inject({
        method: 'POST',
        url: `/workflows/${workflowId}/execute`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {},
      });

      // Wait a bit for execution to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // List executions
      const response = await app.inject({
        method: 'GET',
        url: `/workflows/${workflowId}/executions`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.pagination).toBeDefined();
    });
  });
});
