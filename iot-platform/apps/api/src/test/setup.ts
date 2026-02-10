import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';

/**
 * Test Database Setup
 *
 * This file sets up and tears down the test database for integration tests.
 * Run before integration tests to ensure clean state.
 */

// Setup: Run once before all tests
beforeAll(async () => {
  console.log('🧪 Setting up test database...');

  // Ensure we're using a test database (safety check)
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('test') && !dbUrl.includes('TEST')) {
    console.warn('⚠️  WARNING: Not using a test database! Set DATABASE_URL to include "test"');
  }
});

// Cleanup: Run before each test to ensure clean slate
beforeEach(async () => {
  // Clear all data in reverse order of dependencies
  await prisma.deviceState.deleteMany({});
  await prisma.device.deleteMany({});

  // Delete all organizations except the default one (created in migration)
  await prisma.organization.deleteMany({
    where: {
      id: {
        not: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Keep default org
      },
    },
  });
});

// Teardown: Run once after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test database...');

  // Final cleanup
  await prisma.deviceState.deleteMany({});
  await prisma.device.deleteMany({});
  await prisma.organization.deleteMany({
    where: {
      id: {
        not: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Keep default org
      },
    },
  });

  // Disconnect
  await prisma.$disconnect();
});
