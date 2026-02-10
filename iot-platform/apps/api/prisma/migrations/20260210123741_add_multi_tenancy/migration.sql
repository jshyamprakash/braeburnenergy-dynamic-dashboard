-- Add Multi-Tenancy Support
-- This migration adds organizations and org_id to existing tables

-- Create organizations table
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Create unique index on slug
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- Create default organization for existing data
INSERT INTO "organizations" ("id", "name", "slug", "created_at", "updated_at")
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'Default Organization',
    'default',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Add org_id to devices table
ALTER TABLE "devices" ADD COLUMN "org_id" UUID;

-- Set org_id for existing devices to default organization
UPDATE "devices" SET "org_id" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid WHERE "org_id" IS NULL;

-- Make org_id NOT NULL after backfilling
ALTER TABLE "devices" ALTER COLUMN "org_id" SET NOT NULL;

-- Drop old unique constraint on device_id
ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "devices_device_id_key";

-- Add new composite unique constraint (org_id + device_id)
ALTER TABLE "devices" ADD CONSTRAINT "devices_org_id_device_id_key" UNIQUE ("org_id", "device_id");

-- Add org_id index
CREATE INDEX "devices_org_id_idx" ON "devices"("org_id");

-- Add foreign key constraint to organizations
ALTER TABLE "devices" ADD CONSTRAINT "devices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add org_id to device_states table
ALTER TABLE "device_states" ADD COLUMN "org_id" UUID;

-- Set org_id for existing device_states by joining with devices
UPDATE "device_states" ds
SET "org_id" = d."org_id"
FROM "devices" d
WHERE ds."device_id" = d."device_id";

-- Make org_id NOT NULL after backfilling
ALTER TABLE "device_states" ALTER COLUMN "org_id" SET NOT NULL;

-- Add composite index for multi-tenant queries
CREATE INDEX "device_states_org_id_device_id_timestamp_idx" ON "device_states"("org_id", "device_id", "timestamp");

-- Add foreign key constraint to organizations
ALTER TABLE "device_states" ADD CONSTRAINT "device_states_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update device_states foreign key to use composite key
-- First, drop the old foreign key
ALTER TABLE "device_states" DROP CONSTRAINT IF EXISTS "device_states_device_id_fkey";

-- Add new composite foreign key
ALTER TABLE "device_states" ADD CONSTRAINT "device_states_device_id_org_id_fkey"
FOREIGN KEY ("device_id", "org_id") REFERENCES "devices"("device_id", "org_id") ON DELETE CASCADE ON UPDATE CASCADE;
