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

    // Connect to MongoDB
    console.log('🗄️  Connecting to MongoDB...');
    await connectDB();
    await initializeTimeSeriesCollections();

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

    // Register trigger dispatcher with Modbus gateway manager (for workflow dispatch on polling)
    modbusGatewayManager.setTriggerDispatcher(triggerDispatcher, fastify.log as any);

    // Register trigger dispatcher with OPC-UA gateway manager (for workflow dispatch on polling)
    opcuaGatewayManager.setTriggerDispatcher(triggerDispatcher, fastify.log as any);

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
