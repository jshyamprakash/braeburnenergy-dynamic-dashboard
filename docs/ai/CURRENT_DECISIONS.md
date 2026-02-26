# CURRENT_DECISIONS: ADR-031 Verification Complete + Device Attributes Fix

## What Changed (E2E Verification & Seed Script Fix)

**ADR-031 End-to-End Verification:**
- Backend: DeviceDerivedStateService, writeDeviceState handler, WebSocket broadcast all verified working
- Database: device_derived_states collection populated with workflow output values (per-key $set upserts)
- Simulator: Correctly triggered both Workflows A (STREETLIGHT) and B (OHT) on raw sensor field updates
- Frontend: useDeviceRealtime hook merges derived data; RealTimeGaugeBlock reads derived with priority

**Seed Script Enhancement (Critical Fix):**
- STREETLIGHT device.attributes now includes: phase_volt, freq, current_line, kwh_total, battery (input) + volt_deviation, freq_deviation, power_quality_status (output)
- OHT device.attributes now includes: turbidity, ground_level, totalizer (input) + turbidity_status, water_quality_score, tank_status (output)
- Simulator uses attributes to generate telemetry; writeDeviceState validates against attributes
- Workflows auto-execute on raw field updates; derived values written to device_derived_states

## Technical Implications (Verified)
- Raw sensor data (`device_states`) is immutable time series (append-only, TTL 5yr).
- Workflow outputs (via writeDeviceState) go to `device_derived_states.derived.*` via per-key $set upserts.
- Simulator generates telemetry using device.attributes (both input + output fields); workflows filter on input fields.
- writeDeviceState validates keys against device.attributes (graceful skip if no attributes; rejects unknown keys if attributes exist).
- WebSocket broadcasts merged derived+raw data; frontend useDeviceRealtime preserves derived values across updates.
- RealTimeGaugeBlock reads `derived` field with priority; falls back to `data` for raw telemetry fields.

## Constraints & Verified Requirements
1. Device.attributes must include BOTH input sensor fields AND output derived fields.
   - Input fields enable simulator to generate telemetry.
   - Output fields enable writeDeviceState to validate derived keys.
2. MongoDB replica set REQUIRED (time series, compliance, oplog).
3. Per-key $set paths (`derived.${key}`) prevent whole-object replacement during concurrent updates.
4. Seed script is idempotent (safe to re-run multiple times).
5. Workflow auto-trigger dispatch runs fire-and-forget (no wait for execution completion).
6. Dashboard must fetch from /devices/{id}/states/latest (includes derived in response).
