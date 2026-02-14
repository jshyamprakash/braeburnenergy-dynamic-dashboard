import mongoose from 'mongoose';
import { config } from '../config/config';

/**
 * MongoDB Connection Manager
 *
 * Manages Mongoose connection lifecycle with:
 * - Connection pooling
 * - Graceful shutdown handlers
 * - Singleton pattern (Mongoose handles this internally)
 */

/**
 * Connect to MongoDB
 */
export async function connectDB(): Promise<typeof mongoose> {
  const uri = config.database.uri;

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const conn = await mongoose.connect(uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

  return conn;
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

export { mongoose };
