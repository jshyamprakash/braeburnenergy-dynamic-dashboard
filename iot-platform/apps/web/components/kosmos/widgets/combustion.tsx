'use client';

import { useState, useEffect, useRef } from 'react';

import type { KosmosWidget } from '../types';
import { useCombustionSimulator } from './combustion-simulator';
import { ChartPanel, MetricBar, Tag, WidgetCard } from './shared';
import { EChartsLine } from './EChartsLine';
import { EChartsBar } from './EChartsBar';
import { useDeviceTimeSeries } from '@/lib/hooks/useDeviceTimeSeries';
import { useDeviceSnapshot } from '@/lib/hooks/useDeviceSnapshot';
import { useWorkflowWorkspace } from '@/lib/hooks/useWorkflowWorkspace';

export function CombustionDlHeaderWidget({
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
  type TagItem = { text: string; color: string };

  const DEFAULT_DESC = `Agentic AI framework applying physics-informed feature extraction from high-speed combustion dynamics pressure signals.
Autoencoder + LSTM network detects thermoacoustic precursors prior to visible lean blowout or flashback events.
Features: DFT amplitude spectra, SPL, Hurst exponent, Shannon entropy, mutual information.`;

  const DEFAULT_TAGS: TagItem[] = [
    { text: 'AUTOENCODER', color: 'green' },
    { text: 'LSTM', color: '' },
    { text: 'DFT FEATURES', color: '' },
    { text: 'THERMO-ACOUSTIC', color: 'amber' },
  ];

  const title = widget?.config?.title ?? 'FEATURE-DRIVEN DEEP LEARNING';
  const cfg = widget?.config ?? {};
  const description = (cfg.description as string) ?? DEFAULT_DESC;
  const tags = (cfg.tags as TagItem[]) ?? DEFAULT_TAGS;

  return (
    <WidgetCard
      title={title}
      right={<Tag color="green">LIVE INFERENCE</Tag>}
    >
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
        <div style={{ fontFamily: 'var(--k-font-main)', fontSize: 12, color: 'var(--k-text-secondary)', maxWidth: 620, lineHeight: 1.6 }}>
          {description}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
          {tags.map((tag, i) => (
            <Tag key={i} color={(tag.color === 'green' || tag.color === 'amber' || tag.color === 'blue' || tag.color === 'red') ? tag.color : undefined}>{tag.text}</Tag>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}

export function CombustionDlPressureSignalWidget({
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
  const title = widget?.config?.title ?? 'CD PRESSURE SIGNAL';
  const deviceId = widget?.config?.deviceId as string | undefined;
  const fieldName = (widget?.config?.fieldName as string) ?? 'cd_pressure';
  const dataSource = (widget?.config?.dataSource as string) || 'device';
  const workflowId = (widget?.config?.workflowId as string) || null;
  const outputNodeId = (widget?.config?.outputNodeId as string) || null;

  // Device mode: time series from device
  const { points: devicePoints } = useDeviceTimeSeries(dataSource === 'device' ? (deviceId || '') : '', {
    field: fieldName,
    maxPoints: 200,
    seedCount: 50,
  });

  // Workspace mode: accumulate scalar values into rolling buffer (TimeSeriesPoint = [timestamp, value])
  const { workspace } = useWorkflowWorkspace(dataSource === 'workspace' ? workflowId : null);
  const wsBufferRef = useRef<[number, number][]>([]);
  const [wsPoints, setWsPoints] = useState<[number, number][]>([]);

  useEffect(() => {
    if (dataSource !== 'workspace' || !outputNodeId) return;
    const val = outputNodeId ? (workspace[outputNodeId]?.[fieldName] as number | undefined) : undefined;
    if (val == null) return;
    const next = [...wsBufferRef.current, [Date.now(), val] as [number, number]].slice(-200);
    wsBufferRef.current = next;
    setWsPoints(next);
  }, [workspace, dataSource, outputNodeId, fieldName]);

  const points = dataSource === 'workspace' ? wsPoints : devicePoints;
  const isConfigured = dataSource === 'device' ? !!deviceId : !!(workflowId && outputNodeId);

  return (
    <WidgetCard title={title} right={<Tag>50 kHz</Tag>}>
      <div style={{ height: '100%', padding: 4 }}>
        {!isConfigured ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--k-text-secondary)', fontSize: 12, fontFamily: 'var(--k-font-tech)' }}>
            {dataSource === 'workspace' ? 'Configure workflow output' : 'Configure deviceId'}
          </div>
        ) : points.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--k-text-secondary)', fontSize: 12, fontFamily: 'var(--k-font-tech)' }}>
            No data available
          </div>
        ) : (
          <EChartsLine
            points={points}
            color="#00B050"
            fill={true}
            label={fieldName}
            height={200}
            min={-0.8}
            max={0.8}
          />
        )}
      </div>
    </WidgetCard>
  );
}

export function CombustionDlFrequencySpectrumWidget({
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
  const title = widget?.config?.title ?? 'FREQUENCY SPECTRUM (DFT)';
  const deviceId = widget?.config?.deviceId as string | undefined;
  const freqField = (widget?.config?.freqField as string) || 'fft_freqs';
  const ampField = (widget?.config?.ampField as string) || 'fft_amps';
  const dataSource = (widget?.config?.dataSource as string) || 'device';
  const workflowId = (widget?.config?.workflowId as string) || null;
  const outputNodeId = (widget?.config?.outputNodeId as string) || null;

  // Device mode: snapshot
  const { snapshot } = useDeviceSnapshot(dataSource === 'device' ? (deviceId || '') : '');
  // Workspace mode
  const { workspace } = useWorkflowWorkspace(dataSource === 'workspace' ? workflowId : null);

  const freqsRaw: number[] = dataSource === 'workspace'
    ? ((outputNodeId ? workspace[outputNodeId]?.[freqField] : undefined) as number[] | undefined) ?? []
    : (snapshot?.fields?.[freqField] as number[] | undefined) ?? [];
  const fftFreqs = freqsRaw.map(String);
  const fftAmps: number[] = dataSource === 'workspace'
    ? ((outputNodeId ? workspace[outputNodeId]?.[ampField] : undefined) as number[] | undefined) ?? []
    : (snapshot?.fields?.[ampField] as number[] | undefined) ?? [];

  const isConfigured = dataSource === 'device' ? !!deviceId : !!(workflowId && outputNodeId);

  return (
    <WidgetCard title={title} right={<Tag color="green">FFT LIVE</Tag>}>
      <div style={{ height: '100%', padding: 8 }}>
        {!isConfigured ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--k-text-secondary)', fontSize: 12, fontFamily: 'var(--k-font-tech)' }}>
            {dataSource === 'workspace' ? 'Configure workflow output' : 'Configure deviceId'}
          </div>
        ) : fftAmps.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--k-text-secondary)', fontSize: 12, fontFamily: 'var(--k-font-tech)' }}>
            No data available
          </div>
        ) : (
          <EChartsBar
            categories={fftFreqs}
            values={fftAmps}
            color="#1560BD"
            label="FFT Amplitude"
            height={200}
          />
        )}
      </div>
    </WidgetCard>
  );
}

export function CombustionDlFeatureMatrixWidget({
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
  const deviceId = widget?.config?.deviceId as string | undefined;
  const fieldName = (widget?.config?.fieldName as string) ?? 'feature_cells';
  const dataSource = (widget?.config?.dataSource as string) || 'device';
  const workflowId = (widget?.config?.workflowId as string) || null;
  const outputNodeId = (widget?.config?.outputNodeId as string) || null;

  // Device mode: snapshot
  const { snapshot } = useDeviceSnapshot(dataSource === 'device' ? (deviceId ?? '') : '');
  // Workspace mode
  const { workspace } = useWorkflowWorkspace(dataSource === 'workspace' ? workflowId : null);
  const { featureCells: simCells } = useCombustionSimulator();

  // Parse live feature_cells from snapshot or workspace; fall back to simulator
  type LiveCell = { label: string; value: number; hue: number; alpha: number };
  const liveCells: LiveCell[] | null = (() => {
    let raw: unknown;
    if (dataSource === 'workspace' && outputNodeId) {
      raw = workspace[outputNodeId]?.[fieldName];
    } else if (dataSource === 'device' && deviceId && snapshot) {
      raw = snapshot.fields?.[fieldName];
    }
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as LiveCell[];
  })();

  type ConfigCell = { label: string; value: string };
  const configCells = widget?.config?.featureCells as ConfigCell[] | undefined;

  const cells = (liveCells ?? simCells).map((cell, i) => {
    // Config overrides apply on top of live/sim data
    const over = configCells?.[i];
    const value = over ? (parseFloat(over.value) || cell.value) : cell.value;
    const label = over?.label ?? cell.label;
    const hue = value < 0.3 ? 210 : value < 0.7 ? 140 : 35;
    const alpha = 0.2 + value * 0.5;
    return { label, value, hue, alpha };
  });

  const [hovered, setHovered] = useState<{ label: string; x: number; y: number } | null>(null);
  const title = widget?.config?.title ?? 'EXTRACTED FEATURES';

  return (
    <WidgetCard title={title}>
      <div
        style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginTop: 8, alignContent: 'start' }}
        onMouseLeave={() => setHovered(null)}
      >
        {cells.map((cell) => {
          return (
            <div
              key={cell.label}
              onMouseEnter={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const parentRect = event.currentTarget.parentElement?.getBoundingClientRect();
                if (!parentRect) return;
                setHovered({
                  label: cell.label,
                  x: rect.left - parentRect.left + rect.width / 2,
                  y: rect.top - parentRect.top,
                });
              }}
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const parentRect = event.currentTarget.parentElement?.getBoundingClientRect();
                if (!parentRect) return;
                setHovered({
                  label: cell.label,
                  x: rect.left - parentRect.left + rect.width / 2,
                  y: rect.top - parentRect.top,
                });
              }}
              style={{
                aspectRatio: '1',
                borderRadius: 2,
                fontFamily: 'var(--k-font-tech)',
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `hsla(${cell.hue}, 65%, 22%, 0.95)`,
                border: `1px solid hsla(${cell.hue}, 65%, 50%, 0.45)`,
                color: 'rgba(255, 255, 255, 0.95)',
                textShadow: '0 1px 3px rgba(0,0,0,0.7)',
              }}
            >
              {cell.value.toFixed(2)}
            </div>
          );
        })}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              left: hovered.x,
              top: Math.max(0, hovered.y - 28),
              transform: 'translateX(-50%)',
              background: 'var(--k-deep)',
              border: '1px solid var(--k-border-bright)',
              color: 'var(--k-text-primary)',
              fontSize: 10,
              fontFamily: 'var(--k-font-tech)',
              padding: '2px 6px',
              borderRadius: 2,
              whiteSpace: 'nowrap',
              zIndex: 5,
              pointerEvents: 'none',
            }}
          >
            {hovered.label}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

export function CombustionDlFrameworkPipelineWidget({
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
  type PipelineLayer = { label: string; name: string; value: string; background: string; border: string; color: string };

  const title = widget?.config?.title ?? 'DL FRAMEWORK PIPELINE';
  const deviceId = widget?.config?.deviceId as string | undefined;

  const { snapshot } = useDeviceSnapshot(deviceId ?? '');
  const anomalyScore = snapshot?.fields?.['anomaly_score'] as number | undefined;
  const reconErrorDisplay = anomalyScore != null ? anomalyScore.toFixed(4) : '—';

  const DEFAULT_PIPELINE_LAYERS: PipelineLayer[] = [
    { label: 'INPUT', name: 'Raw CD Signal [N×1]', value: '50 kHz', background: 'rgba(13,60,122,0.5)', border: 'var(--k-mid)', color: 'var(--k-pale)' },
    { label: 'FEATURE EXT.', name: 'Physics-Informed Features', value: 'DFT·SPL·H·S', background: 'rgba(21,96,189,0.25)', border: 'var(--k-soft)', color: 'var(--k-ultra-light)' },
    { label: 'ENCODER', name: 'Conv1D Autoencoder', value: '128→32', background: 'rgba(0,176,80,0.12)', border: 'var(--k-green)', color: 'var(--k-green)' },
    { label: 'TEMPORAL', name: 'Bi-LSTM Sequence', value: '32→64', background: 'rgba(0,176,80,0.12)', border: 'var(--k-green)', color: 'var(--k-green)' },
    { label: 'DECODER', name: 'Reconstruction', value: '64→128', background: 'rgba(21,96,189,0.2)', border: 'var(--k-mid)', color: 'var(--k-soft)' },
  ];

  const cfg = widget?.config ?? {};
  const pipelineLayers = (cfg.pipelineLayers as PipelineLayer[]) ?? DEFAULT_PIPELINE_LAYERS;

  return (
    <WidgetCard title={title} right={<Tag color="green">ACTIVE</Tag>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pipelineLayers.map((layer, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 11, color: 'var(--k-text-secondary)', width: 100, textAlign: 'right', flexShrink: 0 }}>
              {layer.label}
            </div>
            <div
              style={{
                flex: 1,
                height: 28,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--k-font-display)',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 1,
                position: 'relative',
                overflow: 'hidden',
                background: layer.background,
                border: `1px solid ${layer.border}`,
                color: layer.color,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                  transform: 'translateX(-100%)',
                  animation: 'k-shimmer 3s infinite',
                }}
              />
              <span style={{ position: 'relative', zIndex: 1 }}>{layer.name}</span>
            </div>
            <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-secondary)', width: 60, flexShrink: 0 }}>
              {layer.value}
            </div>
          </div>
        ))}
        {/* ANOMALY — always pinned last, live data */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 11, color: 'var(--k-text-secondary)', width: 100, textAlign: 'right', flexShrink: 0 }}>
            ANOMALY
          </div>
          <div style={{ flex: 1, height: 28, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--k-font-display)', fontSize: 12, fontWeight: 600, letterSpacing: 1,
                        position: 'relative', overflow: 'hidden', background: 'rgba(255,184,0,0.1)', border: '1px solid var(--k-amber)', color: 'var(--k-amber)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                          transform: 'translateX(-100%)', animation: 'k-shimmer 3s infinite' }} />
            <span style={{ position: 'relative', zIndex: 1 }}>Reconstruction Error → Score</span>
          </div>
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-amber)', width: 60, flexShrink: 0 }}>
            {reconErrorDisplay}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}

export function CombustionDlAnomalyTrendWidget({
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
  const title = widget?.config?.title ?? 'ANOMALY SCORE TREND';
  const deviceId = widget?.config?.deviceId as string | undefined;
  const fieldName = (widget?.config?.fieldName as string) ?? 'anomaly_score';
  const dataSource = (widget?.config?.dataSource as string) || 'device';
  const workflowId = (widget?.config?.workflowId as string) || null;
  const outputNodeId = (widget?.config?.outputNodeId as string) || null;

  // Device mode: time series
  const { points: devicePoints } = useDeviceTimeSeries(dataSource === 'device' ? (deviceId || '') : '', {
    field: fieldName,
    maxPoints: 200,
    seedCount: 50,
  });

  // Workspace mode: accumulate scalar values (TimeSeriesPoint = [timestamp, value])
  const { workspace } = useWorkflowWorkspace(dataSource === 'workspace' ? workflowId : null);
  const wsAnomalyBufferRef = useRef<[number, number][]>([]);
  const [wsAnomalyPoints, setWsAnomalyPoints] = useState<[number, number][]>([]);

  useEffect(() => {
    if (dataSource !== 'workspace' || !outputNodeId) return;
    const val = workspace[outputNodeId]?.[fieldName] as number | undefined;
    if (val == null) return;
    const next = [...wsAnomalyBufferRef.current, [Date.now(), val] as [number, number]].slice(-200);
    wsAnomalyBufferRef.current = next;
    setWsAnomalyPoints(next);
  }, [workspace, dataSource, outputNodeId, fieldName]);

  const points = dataSource === 'workspace' ? wsAnomalyPoints : devicePoints;
  const isConfigured = dataSource === 'device' ? !!deviceId : !!(workflowId && outputNodeId);

  return (
    <WidgetCard title={title} right={<Tag color="green">{points.length > 0 ? 'LIVE' : 'IDLE'}</Tag>}>
      <div style={{ height: '100%', padding: 4 }}>
        {!isConfigured ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--k-text-secondary)', fontSize: 12, fontFamily: 'var(--k-font-tech)' }}>
            {dataSource === 'workspace' ? 'Configure workflow output' : 'Configure deviceId'}
          </div>
        ) : points.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--k-text-secondary)', fontSize: 12, fontFamily: 'var(--k-font-tech)' }}>
            No data available
          </div>
        ) : (
          <EChartsLine
            points={points}
            color="#FFB800"
            fill={true}
            label={fieldName}
            height={200}
            min={0}
            max={1.0}
            threshold={0.5}
          />
        )}
      </div>
    </WidgetCard>
  );
}

export function CombustionDlPhysicsMetricsWidget({
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
  type MetricRow = { label: string; value: string; width: number };

  const METRIC_COLORS = ['var(--k-soft)', 'var(--k-mid)', 'var(--k-green)', 'var(--k-amber)', 'var(--k-base)'];

  const title = widget?.config?.title ?? 'PHYSICS FEATURE METRICS';
  const deviceId = widget?.config?.deviceId as string | undefined;

  const { snapshot } = useDeviceSnapshot(deviceId ?? '');
  const fields = snapshot?.fields ?? {};

  const spl = fields['spl'] as number | undefined;
  const hurst = fields['hurst_exponent'] as number | undefined;
  const shannon = fields['shannon_entropy'] as number | undefined;
  const dftEnergy = fields['dft_energy'] as number | undefined;

  const metrics: MetricRow[] = deviceId && snapshot
    ? [
        { label: 'SPL (Overall)', value: spl != null ? `${spl.toFixed(1)} dB` : '—', width: spl != null ? Math.round((spl / 200) * 100) : 0 },
        { label: 'Hurst Exponent', value: hurst != null ? hurst.toFixed(3) : '—', width: hurst != null ? Math.round(hurst * 100) : 0 },
        { label: 'Shannon Entropy', value: shannon != null ? `${shannon.toFixed(2)} nats` : '—', width: shannon != null ? Math.round((shannon / 8) * 100) : 0 },
        { label: 'DFT Energy', value: dftEnergy != null ? dftEnergy.toFixed(4) : '—', width: dftEnergy != null ? Math.min(100, Math.round(dftEnergy * 100)) : 0 },
      ]
    : [
        { label: 'SPL (Overall)', value: '—', width: 0 },
        { label: 'Hurst Exponent', value: '—', width: 0 },
        { label: 'Shannon Entropy', value: '—', width: 0 },
        { label: 'DFT Energy', value: '—', width: 0 },
      ];

  return (
    <WidgetCard title={title} right={!deviceId ? <Tag>NO DEVICE</Tag> : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {metrics.map((m, i) => (
          <MetricBar key={i} label={m.label} value={m.value} width={m.width} color={METRIC_COLORS[i % METRIC_COLORS.length]} />
        ))}
      </div>
    </WidgetCard>
  );
}

export function CombustionDlPrecursorClassificationWidget({
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
  const title = widget?.config?.title ?? 'PRECURSOR CLASSIFICATION';
  const deviceId = widget?.config?.deviceId as string | undefined;

  const { snapshot } = useDeviceSnapshot(deviceId ?? '');
  const fields = snapshot?.fields ?? {};

  const liveConfidence = fields['confidence'] as number | undefined;
  const livePrecursorClass = fields['precursor_class'] as string | undefined;

  const confidence = liveConfidence != null ? Math.round(liveConfidence) : (deviceId ? 0 : 86);
  const classLabel = livePrecursorClass ?? (deviceId ? 'WAITING...' : 'NORMAL OPERATION');
  const subText = deviceId && !snapshot
    ? 'Waiting for device data...'
    : classLabel === 'NORMAL OPERATION'
      ? 'No precursor signature detected'
      : 'Precursor signature detected';
  const dashOffset = Math.round(251 - (confidence / 100) * 216);

  const isNormal = classLabel === 'NORMAL OPERATION' || classLabel === 'WAITING...';
  const accentColor = isNormal ? 'var(--k-green)' : 'var(--k-amber)';
  const accentAlpha = isNormal ? 'rgba(0,176,80,0.1)' : 'rgba(255,184,0,0.1)';

  return (
    <WidgetCard title={title} accentGreen={isNormal}>
      <div style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ width: 100, height: 100, margin: '0 auto 8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 100 100" width="100" height="100" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke={accentAlpha} strokeWidth="9" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={accentColor} strokeWidth="9" strokeDasharray="251" strokeDashoffset={dashOffset} strokeLinecap="round" />
          </svg>
          <div>
            <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 26, fontWeight: 700, color: accentColor, lineHeight: 1 }}>
              {`${confidence}%`}
            </div>
            <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 9, color: 'var(--k-text-secondary)' }}>CONFIDENCE</div>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 18, fontWeight: 700, color: accentColor, letterSpacing: 2, marginBottom: 4 }}>
          {classLabel}
        </div>
        <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-secondary)' }}>
          {subText}
        </div>
      </div>
    </WidgetCard>
  );
}

export function CombustionDlClassifierOutputsWidget({
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
  type OutputRow = { label: string; value: string; width: number };

  const OUTPUT_COLORS = ['var(--k-green)', 'var(--k-amber)', 'var(--k-mid)', 'var(--k-red)'];

  const title = widget?.config?.title ?? 'CLASSIFIER OUTPUTS';
  const deviceId = widget?.config?.deviceId as string | undefined;

  const { snapshot } = useDeviceSnapshot(deviceId ?? '');
  const fields = snapshot?.fields ?? {};

  const pct = (v: number | undefined) => v != null ? `${Math.round(v * 100)}%` : '—';
  const w = (v: number | undefined) => v != null ? Math.round(v * 100) : 0;

  const normalProb = fields['normal_prob'] as number | undefined;
  const lbProb = fields['lean_blowout_prob'] as number | undefined;
  const fbProb = fields['flashback_prob'] as number | undefined;
  const taProb = fields['thermo_acoustic_prob'] as number | undefined;

  const outputs: OutputRow[] = deviceId && snapshot
    ? [
        { label: 'Normal Operation', value: pct(normalProb), width: w(normalProb) },
        { label: 'Lean Blowout Risk', value: pct(lbProb), width: w(lbProb) },
        { label: 'Flashback Risk', value: pct(fbProb), width: w(fbProb) },
        { label: 'Thermo-acoustic Instb.', value: pct(taProb), width: w(taProb) },
      ]
    : [
        { label: 'Normal Operation', value: '—', width: 0 },
        { label: 'Lean Blowout Risk', value: '—', width: 0 },
        { label: 'Flashback Risk', value: '—', width: 0 },
        { label: 'Thermo-acoustic Instb.', value: '—', width: 0 },
      ];

  return (
    <WidgetCard title={title} right={!deviceId ? <Tag>NO DEVICE</Tag> : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {outputs.map((o, i) => (
          <MetricBar key={i} label={o.label} value={o.value} width={o.width} color={OUTPUT_COLORS[i % OUTPUT_COLORS.length]} />
        ))}
      </div>
    </WidgetCard>
  );
}

export function CombustionDlTrainingPerformanceWidget({
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
  type TrainRow = { label: string; value: string };

  const DEFAULT_ROWS: TrainRow[] = [
    { label: 'DETECTION F1', value: '0.94' },
    { label: 'PRECISION', value: '0.92' },
    { label: 'RECALL', value: '0.96' },
    { label: 'LEAD TIME', value: '~45 sec' },
    { label: 'TRAIN DATA', value: '8,400 windows' },
  ];

  const ROW_COLORS = ['var(--k-green)', 'var(--k-soft)', 'var(--k-soft)', 'var(--k-green)', 'var(--k-pale)'];

  const title = widget?.config?.title ?? 'TRAINING PERFORMANCE';
  const cfg = widget?.config ?? {};
  const rows = (cfg.rows as TrainRow[]) ?? DEFAULT_ROWS;

  return (
    <WidgetCard title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(({ label, value }, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-secondary)' }}>{label}</span>
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 11, color: ROW_COLORS[i % ROW_COLORS.length] }}>{value}</span>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
