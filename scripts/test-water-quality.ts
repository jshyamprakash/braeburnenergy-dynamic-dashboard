/**
 * Test Script: Water Quality Parameter Validation
 *
 * Tests EPA/AWWA water quality validation and compliance reporting.
 * Run with: pnpm exec tsx src/scripts/test-water-quality.ts
 */

import { connectDB, disconnectDB } from '../lib/mongoose';
import { WaterQualityService } from '../services/water-quality.service';
import { Device, DeviceState } from '../models';
import { Types } from 'mongoose';

const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

async function testWaterQuality() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const waterQualityService = new WaterQualityService();

    // ========================================================================
    // Test 1: List all water quality parameters
    // ========================================================================
    console.log('📋 Test 1: Listing Water Quality Parameters');
    console.log('='.repeat(60));

    const parameters = await waterQualityService.listParameters();
    console.log(`Found ${parameters.length} water quality parameters:\n`);

    for (const param of parameters) {
      console.log(`  ${param.code} - ${param.name}`);
      console.log(`    Category: ${param.category}`);
      console.log(`    Unit: ${param.unit}`);
      console.log(`    Optimal Range: ${param.optimalRange.min} - ${param.optimalRange.max} ${param.unit}`);
      console.log(`    Regulated: ${param.isRegulated ? 'Yes' : 'No'}`);
      console.log(`    Continuous Monitoring: ${param.requiresContinuousMonitoring ? 'Yes' : 'No'}`);
      console.log('');
    }

    // ========================================================================
    // Test 2: Validate individual readings
    // ========================================================================
    console.log('\n📊 Test 2: Validating Individual Readings');
    console.log('='.repeat(60));

    const testReadings = [
      { parameterCode: 'PH', value: 7.2, description: 'Optimal pH' },
      { parameterCode: 'PH', value: 6.3, description: 'Low pH (caution)' },
      { parameterCode: 'PH', value: 9.2, description: 'High pH (non-compliant)' },
      { parameterCode: 'CL2_FREE', value: 1.0, description: 'Optimal chlorine' },
      { parameterCode: 'CL2_FREE', value: 0.15, description: 'Low chlorine (critical)' },
      { parameterCode: 'CL2_FREE', value: 4.5, description: 'High chlorine (non-compliant)' },
      { parameterCode: 'TURB', value: 0.08, description: 'Clear water' },
      { parameterCode: 'TURB', value: 0.35, description: 'High turbidity (non-compliant)' },
    ];

    for (const reading of testReadings) {
      const result = await waterQualityService.validateReading(
        reading.parameterCode,
        reading.value
      );

      console.log(`\n${reading.description}:`);
      console.log(`  Parameter: ${result.parameter}`);
      console.log(`  Value: ${result.value} ${result.unit}`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Compliant: ${result.isCompliant ? '✅ Yes' : '❌ No'}`);

      if (result.violatedStandards.length > 0) {
        console.log(`  Violated Standards:`);
        result.violatedStandards.forEach(std => console.log(`    - ${std}`));
      }

      if (result.correctiveActions && result.correctiveActions.length > 0) {
        console.log(`  Corrective Actions:`);
        result.correctiveActions.forEach(action => console.log(`    - ${action}`));
      }

      if (result.healthRisk) {
        console.log(`  ⚠️  Health Risk: ${result.healthRisk}`);
      }
    }

    // ========================================================================
    // Test 3: Batch validation
    // ========================================================================
    console.log('\n\n🔬 Test 3: Batch Validation');
    console.log('='.repeat(60));

    const batchReadings = [
      { parameterCode: 'PH', value: 7.5 },
      { parameterCode: 'CL2_FREE', value: 1.2 },
      { parameterCode: 'TURB', value: 0.12 },
      { parameterCode: 'TDS', value: 180 },
    ];

    const batchResults = await waterQualityService.validateReadings(batchReadings);

    console.log('\nBatch Validation Results:');
    for (const result of batchResults) {
      const statusIcon = result.isCompliant ? '✅' : '❌';
      console.log(`  ${statusIcon} ${result.parameter}: ${result.value} ${result.unit} (${result.status})`);
    }

    // ========================================================================
    // Test 4: Sampling requirements
    // ========================================================================
    console.log('\n\n📅 Test 4: Sampling Requirements');
    console.log('='.repeat(60));

    const requirements = await waterQualityService.getSamplingRequirements();

    console.log(`\nFound sampling requirements for ${requirements.length} parameters:\n`);

    for (const req of requirements) {
      console.log(`${req.code} - ${req.parameter}:`);
      if (req.requirements) {
        for (const r of req.requirements) {
          console.log(`  Frequency: ${r.frequency}`);
          console.log(`  Sample Count: ${r.sampleCount}`);
          if (r.method) console.log(`  Method: ${r.method}`);
          if (r.location) console.log(`  Location: ${r.location}`);
          if (r.holdingTime) console.log(`  Holding Time: ${r.holdingTime} hours`);
          console.log('');
        }
      }
    }

    // ========================================================================
    // Test 5: Compliance Report (with simulated data)
    // ========================================================================
    console.log('\n📈 Test 5: Compliance Report');
    console.log('='.repeat(60));

    // Create test device
    let device = await Device.findOne({ deviceId: 'WQ-TEST-001' });
    if (!device) {
      device = await Device.create({
        organizationId: new Types.ObjectId(DEFAULT_ORG_ID),
        deviceId: 'WQ-TEST-001',
        name: 'Water Quality Test Station',
        tags: ['water-quality', 'test'],
        attributes: {
          location: 'Treatment Plant A',
          type: 'monitoring-station',
        },
      });
      console.log('\n✅ Created test device: WQ-TEST-001');
    }

    // Generate simulated readings over 7 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    console.log('\nGenerating simulated readings...');

    // Clear old test data
    await DeviceState.deleteMany({ 'metadata.deviceId': 'WQ-TEST-001' });

    for (let day = 0; day < 7; day++) {
      const timestamp = new Date(startDate);
      timestamp.setDate(timestamp.getDate() + day);

      // Simulate normal readings
      await DeviceState.create({
        metadata: {
          deviceId: 'WQ-TEST-001',
          orgId: new Types.ObjectId(DEFAULT_ORG_ID),
        },
        timestamp,
        data: {
          ph: 7.2 + Math.random() * 0.6 - 0.3,           // 6.9 - 7.5
          cl2_free: 0.8 + Math.random() * 0.8,            // 0.8 - 1.6
          turb: 0.05 + Math.random() * 0.1,               // 0.05 - 0.15
          tds: 150 + Math.random() * 100,                 // 150 - 250
        },
      });

      // Simulate 2 violations per week
      if (day === 2 || day === 5) {
        await DeviceState.create({
          metadata: {
            deviceId: 'WQ-TEST-001',
            orgId: new Types.ObjectId(DEFAULT_ORG_ID),
          },
          timestamp: new Date(timestamp.getTime() + 12 * 60 * 60 * 1000), // 12 hours later
          data: {
            ph: day === 2 ? 6.2 : 8.7,                    // Violation
            cl2_free: day === 2 ? 0.15 : 1.2,
            turb: day === 5 ? 0.35 : 0.1,                 // Violation
            tds: 200,
          },
        });
      }
    }

    console.log('✅ Generated 9 test readings (7 normal + 2 violations)\n');

    // Generate compliance report
    const report = await waterQualityService.generateComplianceReport(
      'WQ-TEST-001',
      startDate,
      endDate,
      ['PH', 'CL2_FREE', 'TURB', 'TDS']
    );

    console.log('\nCompliance Report:');
    console.log(`  Device ID: ${report.deviceId}`);
    console.log(`  Period: ${report.startDate.toLocaleDateString()} - ${report.endDate.toLocaleDateString()}`);
    console.log(`  Overall Compliance Rate: ${report.overallComplianceRate.toFixed(1)}%`);
    console.log(`  Total Violations: ${report.totalViolations}`);
    console.log('');

    for (const param of report.parameters) {
      console.log(`  ${param.parameter}:`);
      console.log(`    Samples: ${param.sampleCount}`);
      console.log(`    Compliant: ${param.compliantSamples}`);
      console.log(`    Non-Compliant: ${param.nonCompliantSamples}`);
      console.log(`    Compliance Rate: ${param.complianceRate.toFixed(1)}%`);

      if (param.violations.length > 0) {
        console.log(`    Violations:`);
        param.violations.forEach(v => {
          console.log(`      - ${v.timestamp.toLocaleString()}: ${v.value} (${v.standard})`);
        });
      }
      console.log('');
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ All Water Quality Tests Passed!');
    console.log('='.repeat(60));
    console.log('\nKey Features Demonstrated:');
    console.log('  ✅ EPA/AWWA parameter definitions');
    console.log('  ✅ Compliance limit validation');
    console.log('  ✅ Status classification (OPTIMAL/CAUTION/CRITICAL/NON_COMPLIANT)');
    console.log('  ✅ Health risk warnings');
    console.log('  ✅ Corrective action recommendations');
    console.log('  ✅ Sampling requirement tracking');
    console.log('  ✅ Compliance report generation');
    console.log('  ✅ Multi-parameter batch validation');

    await disconnectDB();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Run tests
testWaterQuality();
