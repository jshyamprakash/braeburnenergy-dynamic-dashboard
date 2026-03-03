/**
 * Modbus TCP Simulator
 * Simulates a Modbus TCP device for testing gateway connections.
 *
 * Usage:
 *   node modbus-simulator.js [port]
 *
 * Default port: 1502
 * Example: node modbus-simulator.js 1502
 */

const net = require('net');

const PORT = parseInt(process.argv[2] || '1502', 10);

// Simulated register values (address → value)
const holdingRegisters = new Array(100).fill(0).map((_, i) => i * 10);
const inputRegisters   = new Array(100).fill(0).map((_, i) => i * 5);
const coils            = new Array(100).fill(false).map((_, i) => i % 2 === 0);

function buildResponse(transactionId, unitId, functionCode, data) {
  const pdu = Buffer.concat([Buffer.from([functionCode]), data]);
  const header = Buffer.alloc(6);
  header.writeUInt16BE(transactionId, 0); // Transaction ID
  header.writeUInt16BE(0, 2);             // Protocol ID (always 0)
  header.writeUInt16BE(pdu.length + 1, 4); // Length (unit id + pdu)
  return Buffer.concat([header, Buffer.from([unitId]), pdu]);
}

function handleRequest(data) {
  if (data.length < 8) return null;

  const transactionId = data.readUInt16BE(0);
  const unitId        = data[6];
  const functionCode  = data[7];
  const startAddr     = data.readUInt16BE(8);
  const quantity      = data.readUInt16BE(10);

  console.log(`  FC${functionCode} | unit=${unitId} | addr=${startAddr} | qty=${quantity}`);

  switch (functionCode) {
    case 0x03: { // Read Holding Registers
      const vals = holdingRegisters.slice(startAddr, startAddr + quantity);
      const payload = Buffer.alloc(1 + vals.length * 2);
      payload[0] = vals.length * 2;
      vals.forEach((v, i) => payload.writeUInt16BE(v, 1 + i * 2));
      return buildResponse(transactionId, unitId, functionCode, payload);
    }
    case 0x04: { // Read Input Registers
      const vals = inputRegisters.slice(startAddr, startAddr + quantity);
      const payload = Buffer.alloc(1 + vals.length * 2);
      payload[0] = vals.length * 2;
      vals.forEach((v, i) => payload.writeUInt16BE(v, 1 + i * 2));
      return buildResponse(transactionId, unitId, functionCode, payload);
    }
    case 0x01: { // Read Coils
      const vals = coils.slice(startAddr, startAddr + quantity);
      const byteCount = Math.ceil(vals.length / 8);
      const payload = Buffer.alloc(1 + byteCount, 0);
      payload[0] = byteCount;
      vals.forEach((v, i) => {
        if (v) payload[1 + Math.floor(i / 8)] |= (1 << (i % 8));
      });
      return buildResponse(transactionId, unitId, functionCode, payload);
    }
    case 0x06: { // Write Single Register
      const value = data.readUInt16BE(10);
      holdingRegisters[startAddr] = value;
      const payload = Buffer.alloc(4);
      payload.writeUInt16BE(startAddr, 0);
      payload.writeUInt16BE(value, 2);
      return buildResponse(transactionId, unitId, functionCode, payload);
    }
    default: {
      // Exception response: unsupported function
      const payload = Buffer.from([functionCode | 0x80, 0x01]);
      return buildResponse(transactionId, unitId, payload[0], payload.slice(1));
    }
  }
}

const server = net.createServer((socket) => {
  const client = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`\n[+] Client connected: ${client}`);

  socket.on('data', (data) => {
    try {
      const response = handleRequest(data);
      if (response) {
        socket.write(response);
      }
    } catch (err) {
      console.error('Error handling request:', err.message);
    }
  });

  socket.on('close', () => console.log(`[-] Client disconnected: ${client}`));
  socket.on('error', (err) => console.error(`Socket error (${client}):`, err.message));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('╔══════════════════════════════════════╗');
  console.log(`║  Modbus TCP Simulator                ║`);
  console.log(`║  Listening on port ${PORT}              ║`);
  console.log('║                                      ║');
  console.log('║  Supported function codes:           ║');
  console.log('║    FC01 - Read Coils                 ║');
  console.log('║    FC03 - Read Holding Registers     ║');
  console.log('║    FC04 - Read Input Registers       ║');
  console.log('║    FC06 - Write Single Register      ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('\nWaiting for connections...\n');
});

server.on('error', (err) => {
  if (err.code === 'EACCES') {
    console.error(`Permission denied on port ${PORT}. Try a port > 1024 (e.g. node modbus-simulator.js 1502)`);
  } else if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use.`);
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});
