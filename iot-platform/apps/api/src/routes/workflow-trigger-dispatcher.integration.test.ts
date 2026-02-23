import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { build } from '../server';
import type { FastifyInstance } from 'fastify';
import { connectDB, disconnectDB } from '../lib/mongoose';
import { Workflow, extractTriggerType } from '../models/workflow.model';
import { WorkflowExecution } from '../models/workflow-execution.model';
import { Device } from '../models/device.model';
import { DeviceState } from '../models/device-state.model';
import { AlarmRule, AlarmInstance } from '../models';
import mongoose from 'mongoose';

const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const DEFAULT_ORG_ID_MONGO = new mongoose.Types.ObjectId(DEFAULT_ORG_ID);

describe('Workflow Trigger Dispatcher Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Connect to test database
    await connectDB();

    // Build Fastify app
    app = await build();
    await app.ready();
  });

  afterAll(async () => {
    // Clean up test data
    await Workflow.deleteMany({});
    await WorkflowExecution.deleteMany({});
    await Device.deleteMany({});
    await DeviceState.deleteMany({});
    await AlarmRule.deleteMany({});
    await AlarmInstance.deleteMany({});

    // Close server and database
    await app.close();
    await disconnectDB();
  });

  describe('Device State Change Trigger', () => {
    it('should auto-execute workflow when device state matches trigger filter', async () => {
      // Step 1: Create a device
      const createDeviceResponse = await app.inject({
        method: 'POST',
        url: '/devices',
        payload: {
          deviceId: 'temp-sensor-1',
          name: 'Temperature Sensor',
          tags: ['water-quality'],
          attributes: {},
        },
      });

      expect(createDeviceResponse.statusCode).toBe(201);

      // Step 2: Create workflow with trigger:deviceStateChange
      const createWorkflowResponse = await app.inject({
        method: 'POST',
        url: '/workflows',
        payload: {
          name: 'Auto-Trigger Workflow',
          description: 'Triggered on temperature changes',
          tags: ['auto-trigger'],
          type: 'Application',
          nodes: [
            {
              id: 'node-1',
              type: 'trigger:deviceStateChange',
              position: { x: 100, y: 100 },
              data: {
                label: 'Device State Change',
                config: {
                  deviceId: 'temp-sensor-1',
                  field: 'temperature',
                },
              },
            },
            {
              id: 'node-2',
              type: 'action:logMessage',
              position: { x: 300, y: 100 },
              data: {
                label: 'Log Message',
                config: {
                  message: 'Temperature changed: {{trigger.value}}',
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
          isEnabled: true,
          priority: 'HIGH',
        },
      });

      expect(createWorkflowResponse.statusCode).toBe(201);
      const workflowBody = JSON.parse(createWorkflowResponse.body);
      const workflowId = workflowBody.data.workflowId;

      // Verify triggerType was set during workflow creation
      const workflow = await Workflow.findOne({ workflowId }).lean();
      expect(workflow?.triggerType).toBe('trigger:deviceStateChange');

      // Step 3: Post device state (should trigger workflow auto-execution)
      const stateResponse = await app.inject({
        method: 'POST',
        url: '/devices/temp-sensor-1/states',
        payload: {
          data: {
            temperature: 25.5,
            humidity: 60,
          },
          timestamp: new Date().toISOString(),
        },
      });

      expect(stateResponse.statusCode).toBe(201);

      // Step 4: Wait briefly for async dispatch to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Verify workflow execution was created
      const executions = await WorkflowExecution.find({
        workflowId,
      }).lean();

      expect(executions.length).toBeGreaterThan(0);
      expect(executions[0]?.triggerType).toBe('deviceStateChange');
      expect(executions[0]?.status).toBe('completed');
    });

    it('should not execute workflow with different device ID filter', async () => {
      // Create two workflows with different device filters
      const workflow1Response = await app.inject({
        method: 'POST',
        url: '/workflows',
        payload: {
          name: 'Workflow for Sensor A',
          tags: ['filter-test'],
          type: 'Application',
          nodes: [
            {
              id: 'node-1',
              type: 'trigger:deviceStateChange',
              position: { x: 100, y: 100 },
              data: {
                label: 'Trigger for Sensor A',
                config: {
                  deviceId: 'sensor-a',
                  field: 'value',
                },
              },
            },
            {
              id: 'node-2',
              type: 'action:logMessage',
              position: { x: 300, y: 100 },
              data: {
                label: 'Log',
                config: { message: 'Sensor A triggered', level: 'info' },
              },
            },
          ],
          edges: [{ id: 'e1', source: 'node-1', target: 'node-2' }],
          isEnabled: true,
        },
      });

      const workflow1Id = JSON.parse(workflow1Response.body).data.workflowId;

      // Create device and post state for different device
      await app.inject({
        method: 'POST',
        url: '/devices',
        payload: {
          deviceId: 'sensor-b',
          name: 'Sensor B',
          tags: [],
          attributes: {},
        },
      });

      const stateResponse = await app.inject({
        method: 'POST',
        url: '/devices/sensor-b/states',
        payload: {
          data: { value: 42 },
          timestamp: new Date().toISOString(),
        },
      });

      expect(stateResponse.statusCode).toBe(201);

      // Wait for dispatch
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify workflow1 was NOT executed (wrong device ID)
      const executions = await WorkflowExecution.find({ workflowId: workflow1Id }).lean();
      expect(executions.length).toBe(0);
    });
  });

  describe('Alarm Triggered Workflow Auto-Trigger', () => {
    it('should auto-execute workflow when alarm is triggered', async () => {
      // Step 1: Create device
      const createDeviceResponse = await app.inject({
        method: 'POST',
        url: '/devices',
        payload: {
          deviceId: 'pressure-sensor-1',
          name: 'Pressure Sensor',
          tags: ['critical'],
          attributes: {},
        },
      });

      expect(createDeviceResponse.statusCode).toBe(201);

      // Step 2: Create alarm rule
      const createRuleResponse = await app.inject({
        method: 'POST',
        url: '/alarm-rules',
        payload: {
          tagName: 'high_pressure',
          deviceId: 'pressure-sensor-1',
          field: 'pressure',
          conditionType: 'THRESHOLD',
          operator: '>',
          parameters: { threshold: 100 },
          priority: 'HIGH',
          isEnabled: true,
          requiresAcknowledgment: true,
        },
      });

      expect(createRuleResponse.statusCode).toBe(201);

      // Step 3: Create workflow with trigger:alarmTriggered
      const createWorkflowResponse = await app.inject({
        method: 'POST',
        url: '/workflows',
        payload: {
          name: 'Alarm Response Workflow',
          description: 'Triggered when alarm fires',
          tags: ['alarm-response'],
          type: 'Application',
          nodes: [
            {
              id: 'node-1',
              type: 'trigger:alarmTriggered',
              position: { x: 100, y: 100 },
              data: {
                label: 'Alarm Triggered',
                config: {},
              },
            },
            {
              id: 'node-2',
              type: 'action:sendNotification',
              position: { x: 300, y: 100 },
              data: {
                label: 'Send Notification',
                config: {
                  message: 'High pressure alarm: {{trigger.value}}',
                  channel: 'email',
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
          isEnabled: true,
          priority: 'HIGH',
        },
      });

      expect(createWorkflowResponse.statusCode).toBe(201);
      const workflowBody = JSON.parse(createWorkflowResponse.body);
      const workflowId = workflowBody.data.workflowId;

      // Verify triggerType was set
      const workflow = await Workflow.findOne({ workflowId }).lean();
      expect(workflow?.triggerType).toBe('trigger:alarmTriggered');

      // Step 4: Post device state that triggers the alarm
      const stateResponse = await app.inject({
        method: 'POST',
        url: '/devices/pressure-sensor-1/states',
        payload: {
          data: {
            pressure: 150, // Exceeds threshold of 100
            temperature: 25,
          },
          timestamp: new Date().toISOString(),
        },
      });

      expect(stateResponse.statusCode).toBe(201);

      // Step 5: Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 6: Verify workflow execution was created
      const executions = await WorkflowExecution.find({
        workflowId,
      }).lean();

      expect(executions.length).toBeGreaterThan(0);
      expect(executions[0]?.triggerType).toBe('alarmTriggered');
    });

    it('should only execute alarm-triggered workflows on alarm events', async () => {
      // Create workflow with device state change trigger (not alarm)
      const workflowResponse = await app.inject({
        method: 'POST',
        url: '/workflows',
        payload: {
          name: 'Device State Workflow',
          tags: ['state-only'],
          type: 'Application',
          nodes: [
            {
              id: 'node-1',
              type: 'trigger:deviceStateChange',
              position: { x: 0, y: 0 },
              data: {
                label: 'State Change',
                config: { deviceId: 'test-device', field: 'value' },
              },
            },
            {
              id: 'node-2',
              type: 'action:logMessage',
              position: { x: 100, y: 0 },
              data: { label: 'Log', config: { message: 'State changed', level: 'info' } },
            },
          ],
          edges: [{ id: 'e1', source: 'node-1', target: 'node-2' }],
          isEnabled: true,
        },
      });

      const workflowId = JSON.parse(workflowResponse.body).data.workflowId;

      // Create and trigger alarm manually (without device state)
      const alarm = await AlarmInstance.create({
        alarmRuleId: new mongoose.Types.ObjectId(),
        tagName: 'test_alarm',
        deviceId: 'test-device',
        field: 'test_field',
        triggerValue: 42,
        triggerTimestamp: new Date(),
        state: 'ACTIVE_UNACKED',
        priority: 'MEDIUM',
        requiresAcknowledgment: true,
        activeTimestamp: new Date(),
        stateTransitions: [{ fromState: null, toState: 'ACTIVE_UNACKED', timestamp: new Date() }],
      });

      // Device state trigger should NOT execute for alarm events
      const executions = await WorkflowExecution.find({ workflowId }).lean();
      expect(executions.length).toBe(0);
    });
  });

  describe('extractTriggerType Helper', () => {
    it('should extract trigger type from workflow nodes', () => {
      const nodes = [
        {
          id: 'trigger-1',
          type: 'trigger:deviceStateChange',
          position: { x: 0, y: 0 },
          data: { label: 'Trigger', config: {} },
        },
        {
          id: 'action-1',
          type: 'action:logMessage',
          position: { x: 100, y: 0 },
          data: { label: 'Action', config: {} },
        },
      ];

      const triggerType = extractTriggerType(nodes as any);
      expect(triggerType).toBe('trigger:deviceStateChange');
    });

    it('should return null if no trigger node found', () => {
      const nodes = [
        {
          id: 'action-1',
          type: 'action:logMessage',
          position: { x: 0, y: 0 },
          data: { label: 'Action', config: {} },
        },
      ];

      const triggerType = extractTriggerType(nodes as any);
      expect(triggerType).toBeNull();
    });
  });
});
