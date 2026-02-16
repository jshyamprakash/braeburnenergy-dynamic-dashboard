/**
 * Test Script: Data Quality Validation
 *
 * Tests the data quality validation system with sample water quality data.
 * Run with: pnpm exec tsx src/scripts/test-validation.ts
 */

import { connectDB, disconnectDB } from '../lib/mongoose';
import { DataQualityService } from '../services/data-quality.service';

async function testValidation() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const dataQualityService = new DataQualityService();

    // Test 1: Valid water quality data (should pass all checks)
    console.log('🧪 Test 1: Valid Water Quality Data');
    console.log('━'.repeat(60));
    const validData = {
      pH: 7.2,
      temperature: 20.5,
      dissolvedOxygen: 8.5,
      turbidity: 2.1,
    };

    const result1 = await dataQualityService.validateDeviceState(
      'test-device-001',
      validData,
      new Date()
    );

    console.log('Data:', JSON.stringify(validData, null, 2));
    console.log('Quality Status:', result1.quality.status);
    console.log('Quality Score:', result1.quality.score);
    console.log('Flags:', result1.quality.flags);
    console.log('Is Valid:', result1.isValid);
    console.log('Errors:', result1.errors);
    console.log('Warnings:', result1.warnings);

    // Test 2: pH out of range (should flag as ERROR)
    console.log('\n🧪 Test 2: pH Out of Range (Too Acidic)');
    console.log('━'.repeat(60));
    const acidicData = {
      pH: 5.5, // Below EPA minimum of 6.5
      temperature: 20.5,
      dissolvedOxygen: 8.5,
      turbidity: 2.1,
    };

    const result2 = await dataQualityService.validateDeviceState(
      'test-device-001',
      acidicData,
      new Date()
    );

    console.log('Data:', JSON.stringify(acidicData, null, 2));
    console.log('Quality Status:', result2.quality.status);
    console.log('Quality Score:', result2.quality.score);
    console.log('Flags:', result2.quality.flags);
    console.log('Is Valid:', result2.isValid);
    console.log('Errors:', result2.errors);
    console.log('Warnings:', result2.warnings);

    // Test 3: Multiple violations
    console.log('\n🧪 Test 3: Multiple Violations');
    console.log('━'.repeat(60));
    const badData = {
      pH: 9.5, // Above EPA maximum of 8.5
      temperature: 45, // Above warning threshold
      dissolvedOxygen: 25, // Above maximum
      turbidity: 1200, // Above maximum
    };

    const result3 = await dataQualityService.validateDeviceState(
      'test-device-001',
      badData,
      new Date()
    );

    console.log('Data:', JSON.stringify(badData, null, 2));
    console.log('Quality Status:', result3.quality.status);
    console.log('Quality Score:', result3.quality.score);
    console.log('Flags:', result3.quality.flags);
    console.log('Is Valid:', result3.isValid);
    console.log('Errors:', result3.errors);
    console.log('Warnings:', result3.warnings);

    // Test 4: Borderline acceptable
    console.log('\n🧪 Test 4: Borderline Acceptable Data');
    console.log('━'.repeat(60));
    const borderlineData = {
      pH: 6.6, // Just above minimum
      temperature: 39, // Just below warning threshold
      dissolvedOxygen: 19.5, // Just below maximum
      turbidity: 900, // High but within range
    };

    const result4 = await dataQualityService.validateDeviceState(
      'test-device-001',
      borderlineData,
      new Date()
    );

    console.log('Data:', JSON.stringify(borderlineData, null, 2));
    console.log('Quality Status:', result4.quality.status);
    console.log('Quality Score:', result4.quality.score);
    console.log('Flags:', result4.quality.flags);
    console.log('Is Valid:', result4.isValid);
    console.log('Errors:', result4.errors);
    console.log('Warnings:', result4.warnings);

    // Disconnect
    await disconnectDB();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('\n🎉 Validation tests complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Run test
testValidation();
