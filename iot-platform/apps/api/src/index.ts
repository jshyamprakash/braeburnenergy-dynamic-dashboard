import { createServer } from './server';
import { createWebSocketServer } from './websocket/server';
import { validateConfig, config } from './config/config';

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

    // Create Fastify server (but don't start yet)
    console.log('🚀 Creating HTTP server...');
    const fastify = await createServer();

    // Create WebSocket server using Fastify's HTTP server
    console.log('🔌 Creating WebSocket server...');
    const io = createWebSocketServer(fastify.server);

    // Make WebSocket server available to routes (before starting)
    fastify.decorate('io', io);

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
    console.log(`   Database:  ${config.database.url.split('@')[1]?.split('?')[0] || 'PostgreSQL'}\n`);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        fastify.log.info(`Received ${signal}, closing server gracefully...`);
        await fastify.close();
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
