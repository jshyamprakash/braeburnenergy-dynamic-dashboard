/*
  Warnings:

  - The primary key for the `device_states` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `devices` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `device_states` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `devices` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "device_states" DROP CONSTRAINT "device_states_device_id_fkey";

-- DropIndex
DROP INDEX "device_states_timestamp_idx";

-- DropIndex
DROP INDEX "idx_device_states_device_id";

-- DropIndex
DROP INDEX "idx_device_states_device_timestamp";

-- DropIndex
DROP INDEX "idx_device_states_timestamp";

-- AlterTable
ALTER TABLE "device_states" DROP CONSTRAINT "device_states_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "device_states_pkey" PRIMARY KEY ("id", "timestamp");

-- AlterTable
ALTER TABLE "devices" DROP CONSTRAINT "devices_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "device_states" ADD CONSTRAINT "device_states_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("device_id") ON DELETE CASCADE ON UPDATE CASCADE;
