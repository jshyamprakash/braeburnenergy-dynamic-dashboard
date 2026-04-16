#!/usr/bin/env tsx

/**
 * Seed Default Users
 *
 * Upserts two users (safe to re-run at any time):
 *   1. superadmin — SuperAdmin role (system management, key-based login in production per ADR-053)
 *   2. admin      — Admin role (regular platform operations: devices, workflows, dashboards)
 *
 * Usage:
 *   cd scripts && pnpm seed:admin
 */

import { connectDB, disconnectDB } from '../iot-platform/apps/api/src/lib/mongoose';
import { User } from '../iot-platform/apps/api/src/models/user.model';
import { Organization } from '../iot-platform/apps/api/src/models/organization.model';

const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

const USERS = [
  {
    username:  'superadmin',
    email:     'superadmin@iot-platform.com',
    password:  'SuperAdmin123!',
    role:      'SuperAdmin' as const,
  },
  {
    username:  'admin',
    email:     'admin@iot-platform.com',
    password:  'Admin@12345',
    role:      'Admin' as const,
  },
];

async function seedAdmin() {
  try {
    console.log('🌱 Upserting default users...\n');

    await connectDB();
    console.log('✅ MongoDB connected\n');

    // Ensure default organization exists
    let organization = await Organization.findById(DEFAULT_ORG_ID);
    if (!organization) {
      console.log('🏢 Creating default organization...');
      organization = new Organization({
        _id: DEFAULT_ORG_ID,
        name: 'Default Organization',
        slug: 'default',
        settings: { timezone: 'UTC', dateFormat: 'YYYY-MM-DD', timeFormat: '24h' },
      });
      await organization.save();
      console.log('✅ Default organization created\n');
    }

    for (const u of USERS) {
      const existing = await User.findOne({ username: u.username }).select('+passwordHash');
      if (existing) {
        // Update role and password (re-hash via model setter)
        existing.role = u.role;
        existing.email = u.email;
        (existing as any).password = u.password;
        existing.mustChangePassword = false;
        existing.isActive = true;
        existing.failedLoginAttempts = 0;
        existing.lockedUntil = undefined;
        await existing.save();
        console.log(`✅ Updated  ${u.role}: ${u.username} / ${u.password}`);
      } else {
        const user = new User({
          username: u.username,
          email: u.email,
          role: u.role,
          organizationId: DEFAULT_ORG_ID,
          isActive: true,
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lastPasswordChange: new Date(),
        });
        (user as any).password = u.password;
        await user.save();
        console.log(`✅ Created  ${u.role}: ${u.username} / ${u.password}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Users:');
    console.log('   admin      / Admin@12345     →  Admin (platform operations)');
    console.log('   superadmin / SuperAdmin123!  →  SuperAdmin (system ops)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n   Use admin / Admin@12345 to log into the platform.\n');
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) console.error(`   ${error.message}\n`);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedAdmin()
    .then(() => { console.log('✅ Done\n'); process.exit(0); })
    .catch((error) => { console.error('❌ Failed:', error); process.exit(1); });
}

export { seedAdmin };
