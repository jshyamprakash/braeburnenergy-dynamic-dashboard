# FEATURE TASKS: Historical Trend Charts on IOT Operations Dashboard

## Tasks

1. [ ] Extend useDeviceStates hook to accept startTime/endTime options
       (pass as ISO string query params: ?startTime=...&endTime=...&limit=200)

2. [ ] Add computeTimeRange() helper: given '1h'|'6h'|'24h' → { startTime, endTime }
       (place in hooks/useDeviceData.ts or lib/utils/time.ts)

3. [ ] Add timeRange state + tab selector to RealTimeChartBlock
       (tabs: 1h | 6h | 24h — default '1h'; re-fetches on tab change)

4. [ ] Pass startTime/endTime from selected timeRange into useDeviceStates call
       (replace fixed limit:50 with time-range based query + limit:200)

5. [ ] Add makeChartBlock() helper to seed script
       (similar to makeGaugeBlock; params: id, title, deviceId, field, chartType, x, y)

6. [ ] Add STREETLIGHT chart blocks to seed script
       (phase_volt line chart at y=15 x=0 w=6 h=6; freq area chart at y=15 x=6 w=6 h=6)

7. [ ] Add OHT chart blocks to seed script
       (turbidity line chart at y=21 x=0 w=6 h=6; water_quality_score area chart at y=21 x=6 w=6 h=6)

8. [ ] Include chart blocks in seed script dashboard layout arrays (lg/md/sm)

9. [ ] Re-run seed script to update IOT Operations Dashboard with chart blocks
       (verify 17 blocks total: 13 gauges + 4 charts)

10. [ ] Verify DashboardBuilder renders chart block type correctly
        (check block.type === 'chart' branch; ensure RealTimeChartBlock receives deviceId + field)

11. [ ] Verify RealTimeChartBlock field filtering: show only the single configured field
        (currently auto-generates all fields as series — add field prop filter)

12. [ ] Open IOT Operations Dashboard and confirm charts render with data
        (ensure device_states has historical data from simulator runs)

13. [ ] Update TASK_HISTORY.md and CURRENT_DECISIONS.md on completion
