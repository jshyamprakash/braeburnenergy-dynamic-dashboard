-- Enable TimescaleDB extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Convert device_states table to hypertable
-- Partition by 'timestamp' column with 7-day chunks
SELECT create_hypertable(
  'device_states',
  'timestamp',
  chunk_time_interval => INTERVAL '7 days',
  if_not_exists => TRUE
);

-- Add retention policy
-- Automatically drop chunks older than 90 days
SELECT add_retention_policy(
  'device_states',
  INTERVAL '90 days',
  if_not_exists => TRUE
);

-- Note: Compression policy can be added later with:
-- ALTER TABLE device_states SET (timescaledb.compress, timescaledb.compress_segmentby = 'device_id');
-- SELECT add_compression_policy('device_states', INTERVAL '7 days');

-- Create additional performance indexes
-- Index for device_id queries (if not exists from Prisma)
CREATE INDEX IF NOT EXISTS idx_device_states_device_id
  ON device_states (device_id);

-- Index for timestamp range queries
CREATE INDEX IF NOT EXISTS idx_device_states_timestamp
  ON device_states (timestamp DESC);

-- Composite index for device + time queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_device_states_device_timestamp
  ON device_states (device_id, timestamp DESC);

-- Comment for documentation
COMMENT ON TABLE device_states IS 'TimescaleDB hypertable for device telemetry data. Auto-compressed after 7 days, retained for 90 days.';
