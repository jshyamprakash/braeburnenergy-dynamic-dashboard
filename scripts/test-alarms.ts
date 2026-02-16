/**
 * Test Script: ISA-18.2 Alarm Management System
 *
 * Tests the alarm management system with sample device data.
 * Run with: pnpm exec tsx src/scripts/test-alarms.ts
 */

import { connectDB, disconnectDB } from '../lib/mongoose';
import { Device } from '../models';
import { AlarmService } from '../services/alarm.service';
import { Types } from 'mongoose';

const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

async function testAlarms() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const alarmService = new AlarmService();

    // Create test device if doesn't exist
    let testDevice = await Device.findOne({ deviceId: 'test-alarm-001' });
    if (!testDevice) {
      testDevice = await Device.create({
        orgId: new Types.ObjectId(DEFAULT_ORG_ID),
        deviceId: 'test-alarm-001',
        name: 'Test Alarm Device',
        tags: ['test', 'water-quality'],
        attributes: {
          location: 'Test Lab',
          type: 'water-quality-monitor',
        },
      });
      console.log('✅ Created test device:', testDevice.deviceId);
    } else {
      console.log('ℹ️  Using existing test device:', testDevice.deviceId);
    }

    // Test 1: Normal operation (no alarms)
    console.log('\n🧪 Test 1: Normal Operation (No Alarms)');
    console.log('━'.repeat(60));

    const normalData = {
      temperature: 22.5,
      pH: 7.2,
      dissolvedOxygen: 8.5,
    };

    console.log('Data:', JSON.stringify(normalData, null, 2));

    const alarms1 = await alarmService.evaluateDeviceState(
      testDevice.deviceId,
      testDevice.tags,
      normalData,
      'state-1',
      new Date()
    );

    console.log('Alarms triggered:', alarms1.length);
    if (alarms1.length > 0) {
      alarms1.forEach(a => {
        console.log(`  - ${a.tagName} (${a.priority}): ${a.field} = ${a.triggerValue}`);
      });
    } else {
      console.log('  ✅ No alarms - all parameters within normal range');
    }

    // Test 2: High temperature warning
    console.log('\n🧪 Test 2: High Temperature Warning');
    console.log('━'.repeat(60));

    const highTempData = {
      temperature: 31.5, // Above 30°C threshold (HIGH)
      pH: 7.2,
      dissolvedOxygen: 8.5,
    };

    console.log('Data:', JSON.stringify(highTempData, null, 2));

    const alarms2 = await alarmService.evaluateDeviceState(
      testDevice.deviceId,
      testDevice.tags,
      highTempData,
      'state-2',
      new Date()
    );

    console.log('Alarms triggered:', alarms2.length);
    if (alarms2.length > 0) {
      for (const alarm of alarms2) {
        console.log(`  ⚠️  ${alarm.tagName} (${alarm.priority}): ${alarm.field} = ${alarm.triggerValue}`);
        console.log(`     State: ${alarm.state}`);
        console.log(`     Requires Ack: ${alarm.requiresAcknowledgment}`);
      }
    }

    // Test 3: Critical temperature alarm
    console.log('\n🧪 Test 3: Critical Temperature Alarm');
    console.log('━'.repeat(60));

    const criticalTempData = {
      temperature: 37.0, // Above 35°C threshold (CRITICAL)
      pH: 7.2,
      dissolvedOxygen: 8.5,
    };

    console.log('Data:', JSON.stringify(criticalTempData, null, 2));

    const alarms3 = await alarmService.evaluateDeviceState(
      testDevice.deviceId,
      testDevice.tags,
      criticalTempData,
      'state-3',
      new Date()
    );

    console.log('Alarms triggered:', alarms3.length);
    if (alarms3.length > 0) {
      for (const alarm of alarms3) {
        console.log(`  🚨 ${alarm.tagName} (${alarm.priority}): ${alarm.field} = ${alarm.triggerValue}`);
        console.log(`     State: ${alarm.state}`);
        console.log(`     Active since: ${alarm.activeTimestamp.toISOString()}`);
      }
    }

    // Test 4: pH out of range
    console.log('\n🧪 Test 4: pH Out of Range');
    console.log('━'.repeat(60));

    const lowPHData = {
      temperature: 22.5,
      pH: 6.0, // Below 6.5 threshold (HIGH)
      dissolvedOxygen: 8.5,
    };

    console.log('Data:', JSON.stringify(lowPHData, null, 2));

    const alarms4 = await alarmService.evaluateDeviceState(
      testDevice.deviceId,
      testDevice.tags,
      lowPHData,
      'state-4',
      new Date()
    );

    console.log('Alarms triggered:', alarms4.length);
    if (alarms4.length > 0) {
      for (const alarm of alarms4) {
        console.log(`  ⚠️  ${alarm.tagName} (${alarm.priority}): ${alarm.field} = ${alarm.triggerValue}`);
        console.log(`     State: ${alarm.state}`);
      }
    }

    // Test 5: Acknowledge alarm
    console.log('\n🧪 Test 5: Acknowledge Alarm');
    console.log('━'.repeat(60));

    const activeAlarms = await alarmService.getActiveAlarms(testDevice.deviceId);
    console.log('Active alarms:', activeAlarms.length);

    if (activeAlarms.length > 0) {
      const alarmToAck = activeAlarms[0];
      console.log(`Acknowledging alarm: ${alarmToAck.tagName} (${alarmToAck._id})`);

      const acknowledged = await alarmService.acknowledgeAlarm(
        alarmToAck._id.toString(),
        'test-user',
        'Acknowledged during testing'
      );

      if (acknowledged) {
        console.log('✅ Alarm acknowledged successfully');
        console.log(`   State changed: ${alarmToAck.state} → ${acknowledged.state}`);
        console.log(`   Acknowledged by: ${acknowledged.acknowledgedBy}`);
        console.log(`   Comment: ${acknowledged.acknowledgmentComment}`);
      }
    } else {
      console.log('ℹ️  No active alarms to acknowledge');
    }

    // Test 6: Clear alarm (return to normal)
    console.log('\n🧪 Test 6: Clear Alarm (Return to Normal)');
    console.log('━'.repeat(60));

    console.log('Sending normal temperature data...');
    const normalData2 = {
      temperature: 22.5, // Normal temperature
      pH: 7.2,
      dissolvedOxygen: 8.5,
    };

    const alarms6 = await alarmService.evaluateDeviceState(
      testDevice.deviceId,
      testDevice.tags,
      normalData2,
      'state-6',
      new Date()
    );

    console.log('New alarms triggered:', alarms6.length);

    const remainingActiveAlarms = await alarmService.getActiveAlarms(testDevice.deviceId);
    console.log('Remaining active alarms:', remainingActiveAlarms.length);

    if (remainingActiveAlarms.length === 0) {
      console.log('✅ All alarms cleared - system returned to normal');
    }

    // Test 7: Alarm statistics
    console.log('\n🧪 Test 7: Alarm Statistics');
    console.log('━'.repeat(60));

    const stats = await alarmService.getAlarmStatistics(testDevice.deviceId, 7);

    console.log('Alarm Statistics (last 7 days):');
    console.log('  Total alarms:', stats.total);
    console.log('  Active count:', stats.activeCount);
    console.log('  Unresolved count:', stats.unresolvedCount);
    console.log('  Average response time:', Math.round(stats.averageResponseTime), 'ms');
    console.log('\n  By State:');
    Object.entries(stats.byState).forEach(([state, count]) => {
      if (count > 0) {
        console.log(`    - ${state}: ${count}`);
      }
    });
    console.log('\n  By Priority:');
    Object.entries(stats.byPriority).forEach(([priority, count]) => {
      if (count > 0) {
        console.log(`    - ${priority}: ${count}`);
      }
    });

    // Disconnect
    await disconnectDB();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('\n🎉 Alarm system tests complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Run test
testAlarms();
