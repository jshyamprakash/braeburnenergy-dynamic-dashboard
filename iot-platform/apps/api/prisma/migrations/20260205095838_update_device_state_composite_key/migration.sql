/*
  Warnings:

  - The primary key for the `device_states` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "device_states" DROP CONSTRAINT "device_states_pkey",
ADD CONSTRAINT "device_states_pkey" PRIMARY KEY ("id", "timestamp");
