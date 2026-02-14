import { beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../lib/mongoose';
import { Organization } from '../models/organization.model';
import { Device } from '../models/device.model';
import { DeviceState } from '../models/device-state.model';
import { initializeTimeSeriesCollections } from '../models';

const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

/**
 * Test Database Setup
 *
 * This file sets up and tears down the test database for integration tests.
 * Run before integration tests to ensure clean state.
 */

// Setup: Run once before all tests
beforeAll(async () => {
  console.log('🧪 Setting up test database...');

  // Use test database
  const testUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iot_platform_test?replicaSet=rs0';
  if (!testUri.includes('test') && !testUri.includes('TEST')) {
    console.warn('⚠️  WARNING: Not using a test database! Set MONGODB_URI to include "test"');
  }

  await connectDB();
  await initializeTimeSeriesCollections();

  // Ensure default org exists
  const existingOrg = await Organization.findById(DEFAULT_ORG_ID);
  if (!existingOrg) {
    await Organization.create({
      _id: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
      name: 'Default Organization',
      slug: 'default',
      settings: {},
    });
  }
});

// Cleanup: Run before each test to ensure clean slate
beforeEach(async () => {
  // Clear all data except default org
  await DeviceState.deleteMany({});
  await Device.deleteMany({});
  await Organization.deleteMany({
    _id: { $ne: new mongoose.Types.ObjectId(DEFAULT_ORG_ID) },
  });
});

// Teardown: Run once after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test database...');

  await DeviceState.deleteMany({});
  await Device.deleteMany({});
  await Organization.deleteMany({
    _id: { $ne: new mongoose.Types.ObjectId(DEFAULT_ORG_ID) },
  });

  await disconnectDB();
});
