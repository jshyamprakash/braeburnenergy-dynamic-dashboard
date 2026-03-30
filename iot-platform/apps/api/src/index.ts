import { createServer } from './server';
import { createWebSocketServer } from './websocket/server';
import { validateConfig, config } from './config/config';
import { connectDB, disconnectDB } from './lib/mongoose';
import { initializeTimeSeriesCollections } from './models';
import { WorkflowService } from './services/workflow.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { WorkflowTriggerDispatcher } from './services/workflow-trigger-dispatcher.service';
import { workflowSchedulerService } from './services/workflow-scheduler.service';
import { heartbeatService } from './services/heartbeat.service';
import { modbusGatewayManager } from './services/modbus-gateway-manager.service';
import { opcuaGatewayManager } from './services/opcua-gateway-manager.service';
import { mqttGatewayManager } from './services/mqtt-gateway-manager.service';
import { natsClient } from './lib/nats-client.js';
import { licenseService } from './services/license.service';
import { startStorageWorker, stopStorageWorker } from './workers/storage-worker.js';
import { startProcessingEngine, stopProcessingEngine, setProcessingEngineDispatcher } from './workers/processing-engine.js';
import { startWebSocketBridge, stopWebSocketBridge, setWebSocketBridgeIO } from './workers/websocket-bridge.js';

/**
 * Application Entry Point
 *
 * Starts both HTTP (Fastify) and WebSocket (Socket.io) servers
 */
async function main() {
  try {
    // Validate configuration
    console.log('🔍 Validating configuration...');
    validateConfig();
    console.log('✅ Configuration validated');

    // Initialise license (ADR-048) — must run before any request is served
    licenseService.init();
    const licenseState = licenseService.getState();
    if (licenseState.valid) {
      const moduleList = licenseState.modules.length ? licenseState.modules.join(', ') : 'core only';
      const expiry = licenseState.expiresAt ? ` (expires: ${licenseState.expiresAt})` : '';
      console.log(`🔑 License: [${moduleList}] — ${licenseState.customer}${expiry}`);
    } else {
      console.log('⚠️  License: not set or invalid — optional modules disabled');
    }

    // Connect to MongoDB
    console.log('🗄️  Connecting to MongoDB...');
    await connectDB();
    await initializeTimeSeriesCollections();

    // Connect to NATS JetStream
    console.log('📡 Connecting to NATS...');
    await natsClient.connect(config.nats.url);
    console.log(`✅ NATS connected (${config.nats.url})`);

    // Start Storage Worker (ADR-043: NATS → BullMQ → MongoDB insertMany)
    console.log('💾 Starting Storage Worker...');
    await startStorageWorker();

    // Create Fastify server (but don't start yet)
    console.log('🚀 Creating HTTP server...');
    const fastify = await createServer();

    // Create WebSocket server using Fastify's HTTP server
    console.log('🔌 Creating WebSocket server...');
    const io = createWebSocketServer(fastify.server);

    // Make WebSocket server available to routes (before starting)
    fastify.decorate('io', io);

    // Initialize workflow trigger dispatcher for auto-triggering workflows
    console.log('⚙️  Initializing workflow trigger dispatcher...');
    const workflowService = new WorkflowService();
    const workflowEngineService = new WorkflowEngineService(io);
    const triggerDispatcher = new WorkflowTriggerDispatcher(
      workflowService,
      workflowEngineService,
      fastify.log as any
    );
    fastify.decorate('triggerDispatcher', triggerDispatcher);

    // Inject dispatcher into Processing Engine (ADR-043 Phase 3)
    setProcessingEngineDispatcher(triggerDispatcher, fastify.log as any);

    // Inject Socket.io into WebSocket Bridge (ADR-043 Phase 4)
    setWebSocketBridgeIO(io);

    // Start Processing Engine (ADR-043 Phase 3: noise filter + delta detection + Redis cache + workflow dispatch)
    console.log('⚙️  Starting Processing Engine...');
    await startProcessingEngine();

    // Start WebSocket Bridge (ADR-043 Phase 4: sensor.processed → Socket.io device:state)
    console.log('🔌 Starting WebSocket Bridge...');
    await startWebSocketBridge();

    // Register trigger dispatcher with Modbus gateway manager (for workflow dispatch on polling)
    modbusGatewayManager.setTriggerDispatcher(triggerDispatcher, fastify.log as any);

    // Register trigger dispatcher with OPC-UA gateway manager (for workflow dispatch on polling)
    opcuaGatewayManager.setTriggerDispatcher(triggerDispatcher, fastify.log as any);

    // Inject NATS client into gateway managers (ADR-043: NATS publishing)
    modbusGatewayManager.setNatsClient(natsClient);
    opcuaGatewayManager.setNatsClient(natsClient);
    mqttGatewayManager.setNatsClient(natsClient);

    // Register trigger dispatcher with MQTT gateway manager (deprecated: handled by Processing Engine)
    mqttGatewayManager.setTriggerDispatcher(triggerDispatcher, fastify.log as any);

    // Register trigger dispatcher with heartbeat service (ADR-041: device offline detection)
    heartbeatService.setTriggerDispatcher(triggerDispatcher, fastify.log as any);

    // Start workflow scheduler for trigger:scheduled workflows
    console.log('⏰ Starting workflow scheduler...');
    await workflowSchedulerService.start(workflowEngineService, fastify.log as any);

    // Start device heartbeat monitor (ADR-041)
    console.log('💓 Starting device heartbeat monitor...');
    heartbeatService.start(fastify.log as any);

    // Now start the server
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    console.log('\n✨ IoT Platform API is ready!\n');
    console.log('📡 Services running:');
    console.log(`   HTTP API:  http://${config.server.host}:${config.server.port}`);
    console.log(`   WebSocket: ws://${config.server.host}:${config.server.port}/ws`);
    console.log(`   Health:    http://${config.server.host}:${config.server.port}/health`);
    console.log(`   Database:  MongoDB (${config.database.uri.split('?')[0]})\n`);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        fastify.log.info(`Received ${signal}, closing server gracefully...`);
        workflowSchedulerService.stop();
        heartbeatService.stop();
        await stopWebSocketBridge();
        await stopProcessingEngine();
        await stopStorageWorker();
        await natsClient.drain();
        await fastify.close();
        await disconnectDB();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start application
main();
