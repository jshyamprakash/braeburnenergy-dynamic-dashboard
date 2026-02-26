# CURRENT_DECISIONS: Historical Trend Charts on IOT Operations Dashboard

## What Changed (Historical Trend Charts Implementation)

**Frontend Hook Enhancement:**
- useDeviceStates hook now accepts { startTime, endTime, limit } options
- Dates converted to ISO strings for API query params
- Enables time-range filtering on /devices/:id/states endpoint

**RealTimeChartBlock Enhancement:**
- Added timeRange state with 1h/6h/24h tab selector UI
- computeTimeRange() helper computes start/end Date boundaries
- Tabs trigger re-fetch with new time-range when clicked
- Added field prop to filter series to single configured field
- DashboardBuilder passes block.config.field to RealTimeChartBlock

**Seed Script Enhancement:**
- Added makeChartBlock() helper (similar to makeGaugeBlock pattern)
- Dashboard now includes 4 chart blocks:
  * STREETLIGHT: phase_volt (line chart), freq (area chart)
  * OHT: turbidity (line chart), water_quality_score (area chart)
- Charts positioned at y=15/y=21 to avoid gauges (y=0 to y=10)
- All blocks auto-included in layout arrays (lg/md/sm)
- Dashboard now 17 blocks total: 13 gauges + 4 historical trend charts

## Technical Implications (Historical Charts)
- useDeviceStates hook now supports time-range queries on the time-series `device_states` collection
- Chart blocks render data with downsample LTTB algorithm (recharts-integrated) for large datasets
- Time-range tabs trigger new queries (re-fetch on 1h/6h/24h selection)
- Single-field filtering reduces series complexity in RealTimeChartBlock
- All chart blocks set limit:200 (sufficient for downsampling across 24h window)
- Charts include stale time 0 + refetch interval 5s (keeps data fresh for tab switches)

## Constraints & Implementation Notes
1. Time-range tabs (1h/6h/24h) use Date.getHours() and Date.getDate() for boundaries
2. RealTimeChartBlock field prop filters useDeviceFields() results (optional; defaults to all fields)
3. Seed script makeChartBlock() defaults: w=6 h=6 (half-width blocks, 2 per row)
4. DashboardBuilder already handles 'chart' block type — no changes needed
5. Chart blocks inherit TimeSeriesChart export capability (CSV, PNG, SVG)
6. RealTimeChartBlock merges derived over data (same precedence as RealTimeGaugeBlock)
7. Dashboard layout arrays auto-populate from blocks map (no manual grid management)
