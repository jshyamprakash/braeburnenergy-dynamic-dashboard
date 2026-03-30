# Open Gaps — CaloriSense / Gas Turbine Platform
# Updated: 2026-03-30

## License
- GAP-L1: CLOSED — License Generator CLI delivered at packages/license-cli/ (within monorepo)
           HS256 JWT; generate + verify subcommands via Commander; pnpm workspace auto-detects
           Upgrade path: RS256 asymmetric when client establishes key infra (ADR-048)

## Deferred
- GAP-D1: CLOSED — feature_cells:'json' attribute added to combustion_ml_engine; MQTT gateway mapping added; combustion-mqtt-sim.ts publishes 25-cell array; CombustionDlFeatureMatrixWidget reads live snapshot with simulator fallback
- GAP-D2: BE Agent full AI backend — be_sense_edge MQTT device added (ADR-048); full LLM/inference engine deferred
- GAP-D3: ML model latency characterisation for real-time anomaly prevention use case
