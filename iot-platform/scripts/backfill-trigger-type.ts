#!/usr/bin/env node

/**
 * Backfill Script: Populate triggerType on existing workflows
 *
 * Usage: npx ts-node scripts/backfill-trigger-type.ts
 *
 * This one-time script populates the triggerType field on all existing workflows
 * by extracting the first trigger node's type from the workflow nodes array.
 *
 * Safe to run multiple times — idempotent operation.
 */

import mongoose from 'mongoose';
import { config } from '../apps/api/src/config/config';
import { Workflow, extractTriggerType } from '../apps/api/src/models/workflow.model';

async function backfillTriggerType() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.database.uri);
    console.log('✅ Connected');

    console.log('📊 Fetching all workflows...');
    const workflows = await Workflow.find({}).lean();
    console.log(`📋 Found ${workflows.length} workflows`);

    if (workflows.length === 0) {
      console.log('✨ No workflows to backfill');
      await mongoose.disconnect();
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const workflow of workflows) {
      try {
        const triggerType = extractTriggerType(workflow.nodes as any);

        // Only update if triggerType is currently null/undefined
        if (!workflow.triggerType && triggerType) {
          await Workflow.updateOne(
            { _id: workflow._id },
            { $set: { triggerType } }
          );
          updated++;
          console.log(`✅ ${workflow.workflowId}: Set triggerType = ${triggerType}`);
        } else if (workflow.triggerType === triggerType) {
          console.log(`⏭️  ${workflow.workflowId}: Already correct (${triggerType})`);
        } else if (!triggerType) {
          console.log(`⚠️  ${workflow.workflowId}: No trigger node found`);
        }
      } catch (err) {
        errors++;
        console.error(`❌ ${workflow.workflowId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log(`\n📈 Backfill complete:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${workflows.length}`);

    await mongoose.disconnect();
    console.log('✨ Done');
  } catch (err) {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  }
}

backfillTriggerType();
