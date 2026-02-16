#!/usr/bin/env tsx

/**
 * Seed Default Admin User
 *
 * Creates a default SuperAdmin user for initial system access.
 * Only runs if no users exist in the system.
 *
 * Usage:
 *   pnpm seed:admin
 *   # or
 *   tsx src/scripts/seed-admin.ts
 */

import { connectDB, disconnectDB } from '../iot-platform/apps/api/src/lib/mongoose';
import { User } from '../iot-platform/apps/api/src/models/user.model';
import { Organization } from '../iot-platform/apps/api/src/models/organization.model';
import { AuthService } from '../iot-platform/apps/api/src/services/auth.service';

// Default organization ID (must match DEFAULT_ORG_ID in config)
const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

// Default admin credentials
const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@iot-platform.com',
  password: 'Admin123!', // Meets EPA password requirements
  role: 'SuperAdmin' as const,
  organizationId: DEFAULT_ORG_ID,
};

async function seedAdmin() {
  try {
    console.log('🌱 Starting admin user seed...\n');

    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected\n');

    // Check if any users already exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log(`ℹ️  Found ${userCount} existing user(s)`);
      console.log('⏭️  Skipping admin seed (users already exist)\n');
      return;
    }

    console.log('📝 No users found. Creating default admin user...\n');

    // Ensure default organization exists
    let organization = await Organization.findById(DEFAULT_ORG_ID);
    if (!organization) {
      console.log('🏢 Creating default organization...');
      organization = new Organization({
        _id: DEFAULT_ORG_ID,
        name: 'Default Organization',
        slug: 'default',
        settings: {
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
        },
      });
      await organization.save();
      console.log('✅ Default organization created\n');
    } else {
      console.log('✅ Default organization exists\n');
    }

    // Create admin user
    const authService = new AuthService();
    const admin = await authService.createUser(
      DEFAULT_ADMIN.username,
      DEFAULT_ADMIN.email,
      DEFAULT_ADMIN.password,
      DEFAULT_ADMIN.role,
      DEFAULT_ADMIN.organizationId
    );

    // For POC/testing, allow login without password change
    // In production, set mustChangePassword = true for security
    admin.mustChangePassword = false;
    await admin.save();

    console.log('✅ Default admin user created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Admin User Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Username:     ${admin.username}`);
    console.log(`   Email:        ${admin.email}`);
    console.log(`   Password:     ${DEFAULT_ADMIN.password}`);
    console.log(`   Role:         ${admin.role}`);
    console.log(`   Organization: ${organization.name}`);
    console.log(`   Org ID:       ${admin.organizationId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  SECURITY NOTICE:');
    console.log('   • Password change required on first login');
    console.log('   • Change password immediately after login');
    console.log('   • Use a strong, unique password in production');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎯 Next Steps:');
    console.log('   1. Start the API server: pnpm dev');
    console.log('   2. Login via POST /auth/login with credentials above');
    console.log('   3. Change password via POST /auth/change-password');
    console.log('   4. Create additional users via POST /auth/register\n');

    console.log('📚 API Documentation:');
    console.log('   http://localhost:3001/docs\n');
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    if (error instanceof Error) {
      console.error(`   ${error.message}\n`);
    }
    process.exit(1);
  } finally {
    await disconnectDB();
    console.log('🔌 MongoDB disconnected');
  }
}

// Run seed if executed directly (ESM check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedAdmin()
    .then(() => {
      console.log('✅ Seed completed successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export { seedAdmin };
