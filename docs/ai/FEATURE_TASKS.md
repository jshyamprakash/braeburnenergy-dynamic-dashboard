# FEATURE TASKS: ADR-031 E2E Verification & Demo Hardening

## Tasks

1. [ ] Fix seed script: add `attributes` upsert for STREETLIGHT device
       (keys: volt_deviation, freq_deviation, power_quality_status — type: string)

2. [ ] Fix seed script: add `attributes` upsert for OHT device
       (keys: turbidity_status, water_quality_score, tank_status — type: string/number)

3. [ ] Verify DeviceDerivedStateService.upsert() per-key $set paths are correct
       (no whole-object replacement; confirm `derived.key` path format)

4. [ ] Verify writeDeviceState handler imports and calls deviceDerivedStateService.upsert()
       (check broadcastState includes derived values from upsert result)

5. [ ] Verify WebSocket broadcast emits derived values after writeDeviceState
       (device:state event must include `derived` field from device_derived_states)

6. [ ] Verify models/index.ts exports DeviceDerivedState model and service
       (check for missing exports causing runtime undefined errors)

7. [ ] Run seed script and confirm 0 errors + both devices have attributes set

8. [ ] Run simulator (--deviceId STREETLIGHT_ID) and confirm Workflow A auto-executes
       (check API logs for WorkflowTriggerDispatcher dispatch + execution log)

9. [ ] Run simulator (--deviceId OHT_ID) and confirm Workflow B auto-executes
       (verify alarm created when turbidity > 4, derived state written)

10. [ ] Verify device_derived_states collection in MongoDB after workflow runs
        (mongosh: db.device_derived_states.findOne({deviceId: OHT_ID}))

11. [ ] Verify RealTimeGaugeBlock fetches/merges derived data correctly
        (check useDeviceRealtime hook merges raw + derived; no useState flash)

12. [ ] Open IOT Operations Dashboard and verify all 13 gauges show values
        (status gauges: power_quality_status, turbidity_status, tank_status)

13. [ ] Update TASK_HISTORY.md and CURRENT_DECISIONS.md on completion
