# CURRENT TASK: Historical Trend Charts on IOT Operations Dashboard

## Goal
Add time-series chart blocks to the IOT Operations Dashboard (currently 13 gauges only),
showing historical trends for key fields with a time-range selector (1h / 6h / 24h).

## Scope — No architectural changes
- Backend: no changes needed. API already supports startTime/endTime/limit on GET /devices/:id/states
- Hook: extend useDeviceStates to accept startTime/endTime (currently only limit)
- Component: add time-range tab selector (1h/6h/24h) to RealTimeChartBlock
- Seed script: add chart blocks to the IOT Operations Dashboard
- Verify: chart blocks render with live data in dashboard detail page

## Key Existing Infrastructure
- RealTimeChartBlock: wraps TimeSeriesChart, fetches via useDeviceStates(deviceId, {limit:50})
- TimeSeriesChart: full Recharts component (line/area/bar), downsample, export
- useDeviceStates hook: `apiClient.get('/devices/{id}/states?limit=N')` — needs startTime/endTime
- API query schema: supports startTime, endTime, limit, page, sortOrder
- DashboardBuilder: already handles block.type === 'chart' case (renders RealTimeChartBlock)

## Chart Blocks to Add (Seed Script)
- STREETLIGHT: phase_volt line chart (row y=15), freq area chart (row y=15, x=6)
- OHT: turbidity line chart (row y=15, x=0 after SL), water_quality_score area chart
- Each chart block: w=6 h=6, single-field series, title, 1h default time range

## Acceptance Criteria
1. useDeviceStates hook accepts { startTime, endTime, limit } options
2. RealTimeChartBlock renders 1h/6h/24h time-range tabs, re-fetches on change
3. Seed script adds 4 chart blocks to the IOT Operations Dashboard
4. Charts render with real data from device_states time series collection
5. Dashboard page shows 13 gauges + 4 charts without layout overflow
