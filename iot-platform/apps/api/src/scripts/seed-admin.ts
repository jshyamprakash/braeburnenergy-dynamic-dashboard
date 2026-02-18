import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model';
import { Organization } from '../models/organization.model';
import { connectDB } from '../lib/mongoose';

const DEFAULT_ORG_ID = new mongoose.Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa');

async function seedAdmin() {
  try {
    await connectDB();
    console.log('✓ Connected to MongoDB');

    // Ensure organization exists
    let org = await Organization.findById(DEFAULT_ORG_ID);
    if (!org) {
      org = await Organization.create({
        _id: DEFAULT_ORG_ID,
        name: 'Default Organization',
        description: 'Default organization for POC',
        isActive: true,
      });
      console.log('✓ Created default organization');
    } else {
      console.log('✓ Default organization exists');
    }

    // Check if admin already exists
    const countBefore = await User.countDocuments();
    console.log(`  Total users in database: ${countBefore}`);

    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('✓ Admin user already exists');
      console.log(`  Username: ${existingAdmin.username}`);
      console.log(`  Email: ${existingAdmin.email}`);
      console.log('\nℹ️  To use a different password, delete the user first:');
      console.log('  mongosh --port 27018 --eval "db.users.deleteOne({username: \'admin\'})"');
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const password = 'Admin@12345';
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'SuperAdmin',
      organizationId: DEFAULT_ORG_ID,
      isActive: true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lastPasswordChange: new Date(),
    });

    console.log('✓ Admin user created successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Username: admin`);
    console.log(`  Password: ${password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n1. Go to http://localhost:3000/login');
    console.log('2. Enter credentials above');
    console.log('3. You will be logged in\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('✗ Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
