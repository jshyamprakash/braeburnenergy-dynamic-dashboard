'use client';

import { useState } from 'react';

import type { KosmosWidget } from '../types';
import { useCombustionSimulator } from './combustion-simulator';
import { ChartPanel, MetricBar, Tag, WidgetCard } from './shared';

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

  const title = widget?.config?.title ?? 'FEATURE-DRIVEN DEEP LEARNING — GT2026 PAPER DEMO';
  const cfg = widget?.config ?? {};
  const description = (cfg.description as string) ?? DEFAULT_DESC;
  const tags = (cfg.tags as TagItem[]) ?? DEFAULT_TAGS;

  return (
    <WidgetCard
      title={title}
      right={
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag>GT2026-179161</Tag>
          <Tag color="green">LIVE INFERENCE</Tag>
        </div>
      }
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
  const { cdBuf2 } = useCombustionSimulator();
  const title = widget?.config?.title ?? 'CD PRESSURE SIGNAL';

  return (
    <WidgetCard title={title} right={<Tag>50 kHz</Tag>}>
      <div style={{ height: '100%', padding: 4 }}>
        <ChartPanel values={cdBuf2} color="#00B050" fill="rgba(0,176,80,0.04)" min={-3} max={3} />
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
  const { fftFreqs, fftAmps } = useCombustionSimulator();
  const title = widget?.config?.title ?? 'FREQUENCY SPECTRUM (DFT)';

  return (
    <WidgetCard title={title} right={<Tag color="green">FFT LIVE</Tag>}>
      <div style={{ height: '100%', padding: '6px 2px 0', display: 'flex', alignItems: 'end', gap: 8 }}>
        {fftAmps.map((value, index) => (
          <div key={fftFreqs[index]} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: '100%',
                height: `${Math.max(10, value * 110)}px`,
                borderRadius: '3px 3px 0 0',
                background: index === 3 ? 'rgba(0,176,80,0.6)' : 'rgba(21,96,189,0.5)',
                border: `1px solid ${index === 3 ? '#00B050' : '#1560BD'}`,
              }}
            />
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 9, color: 'var(--k-text-dim)' }}>{fftFreqs[index]}</span>
          </div>
        ))}
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
  type ConfigCell = { label: string; value: string };

  const { featureCells } = useCombustionSimulator();
  const [hovered, setHovered] = useState<{ label: string; x: number; y: number } | null>(null);
  const title = widget?.config?.title ?? 'EXTRACTED FEATURES';

  // Merge config overrides with simulator values
  const configCells = widget?.config?.featureCells as ConfigCell[] | undefined;
  const cells = featureCells.map((cell, i) => {
    const over = configCells?.[i];
    const value = over ? (parseFloat(over.value) || cell.value) : cell.value;
    const label = over?.label ?? cell.label;
    const hue = value < 0.3 ? 210 : value < 0.7 ? 140 : 35;
    const alpha = 0.2 + value * 0.5;
    return { label, value, hue, alpha };
  });

  return (
    <WidgetCard title={title}>
      <div
        style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3, marginTop: 8, alignContent: 'start' }}
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
                fontSize: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `hsla(${cell.hue}, 70%, 50%, ${cell.alpha})`,
                border: `1px solid hsla(${cell.hue}, 70%, 60%, 0.3)`,
                color: `hsla(${cell.hue}, 70%, 80%, 0.9)`,
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
              fontSize: 9,
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

  const { reconErrorDisplay } = useCombustionSimulator();
  const title = widget?.config?.title ?? 'DL FRAMEWORK PIPELINE';

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
    <WidgetCard title={`⬡ ${title}`} right={<Tag color="green">ACTIVE</Tag>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pipelineLayers.map((layer, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', width: 100, textAlign: 'right', flexShrink: 0 }}>
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
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', width: 100, textAlign: 'right', flexShrink: 0 }}>
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
  const { anomBuf, anomalyDisplay } = useCombustionSimulator();
  const title = widget?.config?.title ?? 'ANOMALY SCORE TREND';

  return (
    <WidgetCard title={title} right={<Tag color="green">{`LIVE ${anomalyDisplay}`}</Tag>}>
      <div style={{ height: '100%', padding: 4 }}>
        <ChartPanel values={anomBuf} color="#FFB800" fill="rgba(255,184,0,0.05)" min={0} max={0.8} threshold={0.5} />
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

  const DEFAULT_METRICS: MetricRow[] = [
    { label: 'SPL (Overall)', value: '142.3 dB', width: 72 },
    { label: 'Hurst Exponent', value: '0.63', width: 63 },
    { label: 'Shannon Entropy', value: '4.21 nats', width: 55 },
    { label: 'Mutual Info (P·T)', value: '0.38', width: 38 },
    { label: 'DFT Dominant Freq.', value: '186 Hz', width: 45 },
  ];

  const METRIC_COLORS = ['var(--k-soft)', 'var(--k-mid)', 'var(--k-green)', 'var(--k-amber)', 'var(--k-base)'];

  const title = widget?.config?.title ?? 'PHYSICS FEATURE METRICS';
  const cfg = widget?.config ?? {};
  const metrics = (cfg.metrics as MetricRow[]) ?? DEFAULT_METRICS;

  return (
    <WidgetCard title={title}>
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
  const cfg = widget?.config ?? {};
  const confidence = (cfg.confidence as number) ?? 86;
  const classLabel = (cfg.classLabel as string) ?? 'NORMAL OPERATION';
  const subText = (cfg.subText as string) ?? 'No precursor signature detected';
  const dashOffset = Math.round(251 - (confidence / 100) * 216);

  return (
    <WidgetCard title={title} accentGreen>
      <div style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ width: 100, height: 100, margin: '0 auto 8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 100 100" width="100" height="100" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,176,80,0.1)" strokeWidth="9" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--k-green)" strokeWidth="9" strokeDasharray="251" strokeDashoffset={dashOffset} strokeLinecap="round" />
          </svg>
          <div>
            <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 26, fontWeight: 700, color: 'var(--k-green)', lineHeight: 1 }}>
              {`${confidence}%`}
            </div>
            <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 9, color: 'var(--k-text-dim)' }}>CONFIDENCE</div>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 18, fontWeight: 700, color: 'var(--k-green)', letterSpacing: 2, marginBottom: 4 }}>
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

  const DEFAULT_OUTPUTS: OutputRow[] = [
    { label: 'Normal Operation', value: '86%', width: 86 },
    { label: 'Lean Blowout Risk', value: '9%', width: 9 },
    { label: 'Flashback Risk', value: '3%', width: 3 },
    { label: 'Thermo-acoustic Instb.', value: '2%', width: 2 },
  ];

  const OUTPUT_COLORS = ['var(--k-green)', 'var(--k-amber)', 'var(--k-mid)', 'var(--k-red)'];

  const title = widget?.config?.title ?? 'CLASSIFIER OUTPUTS';
  const cfg = widget?.config ?? {};
  const outputs = (cfg.outputs as OutputRow[]) ?? DEFAULT_OUTPUTS;

  return (
    <WidgetCard title={title}>
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
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>{label}</span>
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 11, color: ROW_COLORS[i % ROW_COLORS.length] }}>{value}</span>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
