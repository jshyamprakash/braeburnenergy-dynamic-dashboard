# CURRENT TASK: ADR-031 End-to-End Verification & Demo Hardening

## Goal
Verify the two-collection storage split (ADR-031) works fully across the entire data pipeline:
simulator → device_states → workflow auto-trigger → device_derived_states → WebSocket → dashboard gauges.
Fix any gaps found.

## Scope
- No architectural changes expected
- Backend: verify writeDeviceState, DeviceDerivedStateService, WebSocket broadcast
- Frontend: verify RealTimeGaugeBlock reads derived data correctly
- Seed script: add device.attributes so writeDeviceState validation passes
- Simulator: confirm targeted simulation triggers both workflows

## Key Devices
- STREETLIGHT: `01KJ9QP8JY5GHB4YYS0SN70BZR`
- OHT: `01KJ9HJSM09FWK5G3YFBQJRFZ1`
- Dashboard: `iot-operations-dashboard` (13 gauges)

## Critical Issue (Pre-identified)
Seed script sets only `tags` on devices, NOT `attributes`.
`writeDeviceState` validates against `device.attributes` — graceful skip if attributes is empty,
but derived keys must match attributes if any are defined.
Fix: seed script must upsert `attributes` (volt_deviation, power_quality_status, etc.) on each device.

## Derived Keys Required
- Streetlight attributes: `volt_deviation`, `freq_deviation`, `power_quality_status`
- OHT attributes: `turbidity_status`, `water_quality_score`, `tank_status`

## Acceptance Criteria
1. Seed script idempotently sets device.attributes for both devices
2. Simulator → workflow auto-execution confirmed in logs
3. device_derived_states documents exist after workflow runs
4. WebSocket broadcast delivers derived values to frontend
5. Dashboard gauges display derived values (no N/A or flash)
6. All 13 dashboard gauges render correct data
