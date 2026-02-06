#!/usr/bin/env node

/**
 * WebSocket Test Client
 * Tests real-time device state updates via Socket.io
 */

import { io } from 'socket.io-client';

const DEVICE_ID = '01KGPQZ53TRMAG5Y1H2S2SHPVG';
const WS_URL = 'http://localhost:3001';

console.log('🔌 WebSocket Test Client Starting...\n');

// Connect to WebSocket server
const socket = io(WS_URL, {
  path: '/ws',
  transports: ['websocket', 'polling'],
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log(`   Socket ID: ${socket.id}\n`);

  // Subscribe to specific device
  console.log(`📡 Subscribing to device: ${DEVICE_ID}`);
  socket.emit('subscribe:device', DEVICE_ID);

  // Also subscribe to all devices
  setTimeout(() => {
    console.log('📡 Subscribing to all devices\n');
    socket.emit('subscribe:all');
  }, 1000);
});

socket.on('disconnect', (reason) => {
  console.log(`\n❌ Disconnected: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Subscription confirmations
socket.on('subscribed', (data) => {
  console.log('✅ Subscription confirmed:', data);
});

socket.on('unsubscribed', (data) => {
  console.log('✅ Unsubscription confirmed:', data);
});

// Listen for device state updates
socket.on('device:state', (update) => {
  console.log('\n🔔 Device State Update Received:');
  console.log(`   Device ID: ${update.deviceId}`);
  console.log(`   Timestamp: ${update.timestamp}`);
  console.log(`   Data:`, JSON.stringify(update.data, null, 2));
});

// Listen for device status updates
socket.on('device:status', (update) => {
  console.log('\n🔔 Device Status Update Received:');
  console.log(`   Device ID: ${update.deviceId}`);
  console.log(`   Status: ${update.status}`);
  console.log(`   Timestamp: ${update.timestamp}`);
});

// Ping/Pong health check
setInterval(() => {
  console.log('\n💓 Sending ping...');
  socket.emit('ping');
}, 10000);

socket.on('pong', (data) => {
  console.log(`✅ Pong received at ${data.timestamp}`);
});

// Keep alive
console.log('👂 Listening for real-time updates...');
console.log('   Press Ctrl+C to exit\n');
console.log('📝 To trigger updates, create device states via API:');
console.log(`   curl -X POST http://localhost:3001/devices/${DEVICE_ID}/states \\`);
console.log(`     -H "Content-Type: application/json" \\`);
console.log(`     -d '{"data": {"temperature": 26.5, "humidity": 50}}'\n`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  socket.disconnect();
  process.exit(0);
});
