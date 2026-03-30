'use client';

import { useAppDispatch } from '@/lib/store';
import { updateKosmosWidgetConfig } from '@/lib/store/slices/dashboardSlice';
import type { KosmosWidget } from '../types';
import { useCombustionSimulator } from './combustion-simulator';
import { ChartPanel } from './shared';
import { EChartsLine } from './EChartsLine';
import { useDeviceTimeSeries } from '@/lib/hooks/useDeviceTimeSeries';
import { useDeviceSnapshot } from '@/lib/hooks/useDeviceSnapshot';
import { useLicense } from '@/lib/hooks/useLicense';

// Note: dispatch and updateKosmosWidgetConfig are used in OverviewMetricCard, OverviewRealtimeChartWidget, and OverviewDataFlowWidget
// BeSense and BeAgentStatus widgets no longer edit inline

export function OverviewBeSenseWidget({
  widget,
  editMode,
  pageId,
  onConfigChange
}: {
  widget?: KosmosWidget;
  editMode?: boolean;
  pageId?: string;
  onConfigChange?: () => void;
} = {}) {
  type SensorItem = { name: string; value: string; active: boolean; status: string };

  const defaultSensors: SensorItem[] = [
    { name: 'CD-P01', value: '4.2 kPa', active: true, status: 's-ok' },
    { name: 'CD-P02', value: '4.1 kPa', active: true, status: 's-ok' },
    { name: 'T-EGT', value: '612°C', active: true, status: 's-ok' },
    { name: 'VIB-X', value: '2.1 mm/s', active: false, status: 's-warn' },
    { name: 'NOx', value: '18.4 ppm', active: true, status: 's-ok' },
    { name: 'CO', value: '12.1 ppm', active: true, status: 's-ok' },
    { name: 'CV', value: '38.2 MJ/m³', active: true, status: 's-ok' },
    { name: 'H₂%', value: '3.2 %', active: true, status: 's-ok' },
  ];

  const sampleRate = widget?.config?.sampleRate ?? '50 kHz';
  const channels = widget?.config?.channels ?? '16 Active';
  const latency = widget?.config?.latency ?? '< 8 ms';
  const cvValue = widget?.config?.cvValue ?? '38.2 MJ/m³';

  const cfg = widget?.config ?? {};
  const sensors = (cfg.sensors as SensorItem[]) ?? defaultSensors;

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div className="card-title"><span className="icon">◈</span> BE SENSE™</div>
        <div className="card-badge">SENSOR FUSION</div>
      </div>
      <div className="card-body" style={{ flex: 1, minHeight: 0 }}>
        <div className="section-heading">Multimodal Inputs</div>
        <div className="sense-grid">
          {sensors.map(({ name, value, active, status }, i) => (
            <div key={i} className={`sensor-item${active ? ' active' : ''}`}>
              <div>
                <div className="sensor-name">{name}</div>
                <div className="sensor-val">{value}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div className={`sensor-status ${status}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="divider" style={{ margin: '12px 0' }} />
        <div className="section-heading">Acquisition</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>SAMPLE RATE</span>
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 11, color: 'var(--k-soft)' }}>{sampleRate}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>CHANNELS</span>
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 11, color: 'var(--k-soft)' }}>{channels}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>LATENCY</span>
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 11, color: 'var(--k-green)' }}>{latency}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>EDGE NODE</span>
            <span className="tag tag-green">ACTIVE</span>
          </div>
        </div>

        <div className="divider" style={{ margin: '12px 0' }} />
        <div className="section-heading">CalorieSense™ Link</div>
        <div style={{ background: 'rgba(21,96,189,0.1)', border: '1px solid var(--k-border)', borderRadius: 3, padding: 8 }}>
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', marginBottom: 4 }}>CALORIFIC VALUE</div>
          <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--k-soft)' }}>
            {cvValue}
            <span style={{ fontSize: 13, color: 'var(--k-text-secondary)' }}> MJ/m³</span>
          </div>
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-secondary)', marginTop: 2 }}>1024.7 BTU/SCF</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <span className="tag tag-green">CV ✓</span>
            <span className="tag tag-green">H2F ✓</span>
            <span className="tag tag-blue">CARI</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewMetricCard({
  color,
  label: defaultLabel,
  value: defaultValue,
  unit: defaultUnit,
  trendClass,
  trend: defaultTrend,
  id,
  editMode,
  widget,
  pageId,
  onConfigChange,
}: {
  color: string;
  label: string;
  value: string;
  unit: string;
  trendClass: string;
  trend: string;
  id?: string;
  editMode?: boolean;
  widget?: KosmosWidget;
  pageId?: string;
  onConfigChange?: () => void;
}) {
  const dispatch = useAppDispatch();
  const label = widget?.config?.label ?? defaultLabel;
  const unit = widget?.config?.unit ?? defaultUnit;
  const value = widget?.config?.value ?? defaultValue;
  const trend = widget?.config?.trend ?? defaultTrend;

  const handleLabelChange = (newLabel: string) => {
    if (widget && pageId) {
      dispatch(updateKosmosWidgetConfig({ pageId, widgetId: widget.id, config: { label: newLabel } }));
      onConfigChange?.();
    }
  };

  const handleUnitChange = (newUnit: string) => {
    if (widget && pageId) {
      dispatch(updateKosmosWidgetConfig({ pageId, widgetId: widget.id, config: { unit: newUnit } }));
      onConfigChange?.();
    }
  };

  return (
    <div className="metric-card" style={{ ['--color' as string]: color, height: '100%' }}>
      <div className="metric-label">
        {editMode ? (
          <input
            defaultValue={label}
            onBlur={(e) => handleLabelChange(e.target.value)}
            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--k-green)', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', outline: 'none', width: '100%' }}
          />
        ) : (
          label
        )}
      </div>
      <div className="metric-value" id={id}>{value}</div>
      <div className="metric-unit">
        {editMode ? (
          <input
            defaultValue={unit}
            onBlur={(e) => handleUnitChange(e.target.value)}
            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--k-green)', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', outline: 'none', width: '80px' }}
          />
        ) : (
          unit
        )}
      </div>
      <div className={`metric-trend ${trendClass}`}>{trend}</div>
    </div>
  );
}

export function OverviewAnomalyMetricWidget({
  widget,
  editMode,
  pageId,
  onConfigChange
}: {
  widget?: KosmosWidget;
  editMode?: boolean;
  pageId?: string;
  onConfigChange?: () => void;
} = {}) {
  const { anomalyDisplay } = useCombustionSimulator();
  return (
    <OverviewMetricCard
      color="var(--k-green)"
      label="CD ANOMALY SCORE"
      value={anomalyDisplay}
      unit="Normalised Index"
      trendClass="trend-down"
      trend="▼ LOW RISK"
      id="m-anomaly"
      editMode={editMode}
      widget={widget}
      pageId={pageId}
      onConfigChange={onConfigChange}
    />
  );
}

export function OverviewLoadMetricWidget({
  widget,
  editMode,
  pageId,
  onConfigChange
}: {
  widget?: KosmosWidget;
  editMode?: boolean;
  pageId?: string;
  onConfigChange?: () => void;
} = {}) {
  return (
    <OverviewMetricCard
      color="var(--k-soft)"
      label="TURBINE LOAD"
      value="84.2"
      unit="% MCR"
      trendClass="trend-flat"
      trend="◆ STEADY"
      id="m-load"
      editMode={editMode}
      widget={widget}
      pageId={pageId}
      onConfigChange={onConfigChange}
    />
  );
}

export function OverviewEgtMetricWidget({
  widget,
  editMode,
  pageId,
  onConfigChange
}: {
  widget?: KosmosWidget;
  editMode?: boolean;
  pageId?: string;
  onConfigChange?: () => void;
} = {}) {
  return (
    <OverviewMetricCard
      color="var(--k-amber)"
      label="EGT SPREAD"
      value="12.4"
      unit="°C Δ"
      trendClass="trend-flat"
      trend="▲ MONITOR"
      id="m-egt"
      editMode={editMode}
      widget={widget}
      pageId={pageId}
      onConfigChange={onConfigChange}
    />
  );
}

export function OverviewRealtimeChartWidget({
  widget,
  editMode,
  pageId,
  onConfigChange
}: {
  widget?: KosmosWidget;
  editMode?: boolean;
  pageId?: string;
  onConfigChange?: () => void;
} = {}) {
  const dispatch = useAppDispatch();
  const title = widget?.config?.title ?? 'COMBUSTION DYNAMICS — REAL-TIME';
  const deviceId = widget?.config?.deviceId as string | undefined;
  const fieldName = (widget?.config?.fieldName as string) ?? 'cd_pressure';

  // Fetch time-series data based on deviceId + fieldName
  const { points, isLoading } = useDeviceTimeSeries(deviceId || '', {
    field: fieldName,
    maxPoints: 200,
    seedCount: 50,
  });

  const handleTitleChange = (newTitle: string) => {
    if (widget && pageId) {
      dispatch(updateKosmosWidgetConfig({ pageId, widgetId: widget.id, config: { title: newTitle } }));
      onConfigChange?.();
    }
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div className="card-title">
          <span className="icon">〜</span>
          {editMode ? (
            <input
              defaultValue={title}
              onBlur={(e) => handleTitleChange(e.target.value)}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--k-green)', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', outline: 'none', maxWidth: 400 }}
            />
          ) : (
            title
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`tag ${isLoading ? 'tag-blue' : 'tag-green'}`}>
            {isLoading ? 'LOADING' : 'LIVE'}
          </span>
          <span className="tag tag-blue">50 kHz</span>
        </div>
      </div>
      <div className="card-body" style={{ padding: 8, flex: 1, minHeight: 0 }}>
        <div className="chart-container" style={{ height: 160 }}>
          {!deviceId ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--k-text-dim)',
                fontSize: 12,
                fontFamily: 'var(--k-font-tech)',
              }}
            >
              Configure deviceId in settings
            </div>
          ) : (
            <EChartsLine
              points={points}
              color="#1560BD"
              fill={true}
              label={fieldName}
              height={160}
              min={-3}
              max={3}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function OverviewDataFlowWidget({
  widget,
  editMode,
  pageId,
  onConfigChange
}: {
  widget?: KosmosWidget;
  editMode?: boolean;
  pageId?: string;
  onConfigChange?: () => void;
} = {}) {
  type DataFlowLayer = { id: string; label: string; blockClass: string; blocks: string[]; module?: string; always?: boolean };

  const dispatch = useAppDispatch();
  const { isModuleEnabled } = useLicense();
  const title = widget?.config?.title ?? 'DATA FLOW — KOSMOS PLATFORM';

  const ALL_LAYERS: DataFlowLayer[] = [
    { id: 'physical', label: 'Physical Layer', blockClass: 'sensor', blocks: ['Gas Turbine\nGE / Siemens / MHI', 'Balance of Plant'], always: true },
    { id: 'be_sense', label: 'BE Sense™', blockClass: 'fusion', blocks: ['Multimodal\nSensor Fusion', 'CalorieSense™\nEdge'], always: true },
    { id: 'be_agent', label: 'BE Agent™', blockClass: 'agent', blocks: ['Agentic AI\nFramework', 'CD Precursor\nDetection'], module: 'be_agent' },
    { id: 'combustion_dl', label: 'CD Precursor DL', blockClass: 'cloud', blocks: ['DL Model\nServer', 'Anomaly\nDetection', 'CD Precursor\nClassifier'], module: 'combustion_dl' },
    { id: 'asset_life', label: 'Asset Life Mgmt', blockClass: 'cloud', blocks: ['Fleet\nAnalytics', 'Asset Life\nManagement'], module: 'asset_life' },
    { id: 'outputs', label: 'Outputs', blockClass: 'output', blocks: ['CMMS\nIntegration', 'Operator\nDashboard'], always: true },
  ];

  const cfg = widget?.config ?? {};
  const storedLayers = (cfg.layers as DataFlowLayer[]) ?? [];

  // Filter layers based on license and always flag
  const DEFAULT_LAYERS = ALL_LAYERS.filter(
    (l) => l.always || (l.module ? isModuleEnabled(l.module) : true)
  );

  const layers = storedLayers.length > 0 ? storedLayers : DEFAULT_LAYERS;

  // Compute arrow configuration based on filtered layers (one less than layer count)
  const LAYER_ARROWS = Array(Math.max(0, layers.length - 1)).fill(null).map((_, i) =>
    i % 2 === 0 ? 'bidirectional' : 'forward'
  );

  const persist = (partial: Record<string, unknown>) => {
    if (widget && pageId) {
      dispatch(updateKosmosWidgetConfig({ pageId, widgetId: widget.id, config: { ...cfg, ...partial } }));
      onConfigChange?.();
    }
  };

  const updateLayerLabel = (li: number, val: string) =>
    persist({ layers: layers.map((l, idx) => idx === li ? { ...l, label: val } : l) });
  const addBlock = (li: number) =>
    persist({ layers: layers.map((l, idx) => idx === li ? { ...l, blocks: [...l.blocks, 'New Block'] } : l) });
  const removeBlock = (li: number, bi: number) =>
    persist({ layers: layers.map((l, idx) => idx === li ? { ...l, blocks: l.blocks.filter((_, bIdx) => bIdx !== bi) } : l) });
  const updateBlock = (li: number, bi: number, val: string) =>
    persist({ layers: layers.map((l, idx) => idx === li ? { ...l, blocks: l.blocks.map((b, bIdx) => bIdx === bi ? val : b) } : l) });

  return (
    <div className="card arch-diagram" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div className="card-title">
          <span className="icon">⬡</span>
          {editMode ? (
            <input
              defaultValue={title}
              onBlur={(e) => persist({ title: e.target.value })}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--k-green)', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', outline: 'none', maxWidth: 400 }}
            />
          ) : (
            title
          )}
        </div>
        <div className="card-badge">OEM-AGNOSTIC</div>
      </div>
      <div className="card-body" style={{ flex: 1, minHeight: 0 }}>
        <div className="arch-flow">
          {layers.flatMap((layer, li) => {
            const nodes = [];
            nodes.push(
              <div key={`l-${li}`} className="arch-layer">
                <div className="layer-label">
                  {editMode ? (
                    <input defaultValue={layer.label} onBlur={e => updateLayerLabel(li, e.target.value)}
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--k-green)',
                               color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', outline: 'none', width: '100%' }} />
                  ) : layer.label}
                </div>
                {layer.blocks.map((blockText, bi) => (
                  <div key={bi} className={`arch-block ${layer.blockClass}`} style={{ marginTop: bi > 0 ? 4 : 0, position: 'relative' }}>
                    {editMode ? (
                      <input defaultValue={blockText.replace(/\n/g, ' ')} onBlur={e => updateBlock(li, bi, e.target.value)}
                        style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--k-green)',
                                 color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', outline: 'none', width: '100%' }} />
                    ) : (
                      <>
                        {blockText.split('\n').map((line, lineIdx) => lineIdx === 0 ? <span key={lineIdx}>{line}</span> : <span key={lineIdx}><br /><small style={{ fontSize: 10, opacity: 0.7 }}>{line}</small></span>)}
                      </>
                    )}
                    {editMode && (
                      <button onClick={() => removeBlock(li, bi)}
                        style={{ position: 'absolute', top: -6, right: -6, color: 'var(--k-red)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 10 }}>✕</button>
                    )}
                  </div>
                ))}
                {editMode && (
                  <button onClick={() => addBlock(li)} className="k-btn k-btn-ghost" style={{ marginTop: 4, fontSize: 9, width: '100%' }}>+ block</button>
                )}
              </div>
            );
            if (li < layers.length - 1) {
              nodes.push(<div key={`a-${li}`} className={`arch-arrow ${LAYER_ARROWS[li] ?? 'forward'}`} />);
            }
            return nodes;
          })}
        </div>
      </div>
    </div>
  );
}

export function OverviewBeAgentStatusWidget({
  widget,
  editMode,
  pageId,
  onConfigChange
}: {
  widget?: KosmosWidget;
  editMode?: boolean;
  pageId?: string;
  onConfigChange?: () => void;
} = {}) {
  type ModuleItem = { name: string; desc: string; status: string };
  type AlertItem = { time: string; msg: string; sub: string; level: string };

  const DEFAULT_MODULES: ModuleItem[] = [
    { name: 'CD Precursor', desc: 'Feature-driven DL anomaly detection', status: 'RUN' },
    { name: 'Thermo Perf.', desc: 'Compressor / turbine efficiency', status: 'RUN' },
    { name: 'Vibration', desc: 'Rotor dynamics & blade health', status: 'IDLE' },
    { name: 'Emissions Opt.', desc: 'NOx/CO optimisation loop', status: 'IDLE' },
    { name: 'Fuel Quality', desc: 'CalorieSense™ adaptive tuning', status: 'RUN' },
    { name: 'Asset Life', desc: 'Creep / LCF remaining life', status: 'IDLE' },
  ];

  const DEFAULT_ALERTS: AlertItem[] = [
    { time: '14:58:02', msg: 'Combustion stable', sub: 'CD anomaly score nominal', level: 'ok' },
    { time: '14:52:17', msg: 'VIB-X elevated', sub: '2.1 mm/s — monitor bearing', level: 'warning' },
    { time: '14:40:00', msg: 'CV shift detected', sub: 'H₂ fraction +0.4% — adapting', level: 'info' },
  ];

  const cfg = widget?.config ?? {};
  const liveDeviceId = (cfg.deviceId as string) || '';

  // If a BE Sense edge device is configured, read live health_score from it
  const { snapshot } = useDeviceSnapshot(liveDeviceId);
  const liveHealthScore =
    liveDeviceId && snapshot?.fields?.health_score != null
      ? Number(snapshot.fields.health_score)
      : null;

  const modules = (cfg.modules as ModuleItem[]) ?? DEFAULT_MODULES;
  const alerts = (cfg.alerts as AlertItem[]) ?? DEFAULT_ALERTS;
  const healthScore = liveHealthScore ?? (cfg.healthScore as number) ?? 86;
  const dashOffset = Math.round(251 - (healthScore / 100) * 216);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div className="card-title"><span className="icon">⟳</span> BE AGENT™</div>
        <div className="card-badge">AGENTIC AI</div>
      </div>
      <div className="card-body" style={{ flex: 1, minHeight: 0 }}>
        <div className="section-heading">Active Modules</div>
        <div className="agent-modules">
          {modules.map((m, i) => (
            <div key={i} className={`agent-module${m.status === 'RUN' ? ' active-mod' : ''}`}>
              <div className="mod-name">{m.name}</div>
              <div className="mod-desc">{m.desc}</div>
              <div className="mod-status">
                {m.status === 'RUN' ? '● RUN' : '○ IDLE'}
              </div>
            </div>
          ))}
        </div>

        <div className="divider" style={{ margin: '12px 0' }} />
        <div className="section-heading">Alerts</div>
        <div className="alert-list">
          {alerts.map((a, i) => (
            <div key={i} className={`alert-item ${a.level}`}>
              <div className="alert-time">{a.time}</div>
              <div className="alert-msg">{a.msg}</div>
              <div className="alert-sub">{a.sub}</div>
            </div>
          ))}
        </div>

        <div className="divider" style={{ margin: '12px 0' }} />
        <div style={{ textAlign: 'center' }}>
          <div className="score-ring">
            <svg viewBox="0 0 100 100" width="100" height="100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(21,96,189,0.15)" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--k-green)" strokeWidth="8" strokeDasharray="251" strokeDashoffset={dashOffset} strokeLinecap="round" />
            </svg>
            <div>
              <div className="score-val" style={{ color: 'var(--k-green)' }}>
                {healthScore}
              </div>
              <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 9, color: 'var(--k-text-dim)' }}>HEALTH</div>
            </div>
          </div>
          <div className="score-label">TURBINE HEALTH INDEX</div>
        </div>
      </div>
    </div>
  );
}
