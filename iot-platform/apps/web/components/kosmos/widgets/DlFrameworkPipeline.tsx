'use client';

interface DlLayer {
  label: string;
  name: string;
  val: string;
  color: string;
  border: string;
  text: string;
}

interface DlFrameworkPipelineProps {
  config: {
    title?: string;
    layers?: DlLayer[];
  };
}

const DEFAULT_LAYERS: DlLayer[] = [
  { label: 'INPUT', name: 'Raw CD Signal [N×1]', val: '50 kHz', color: 'rgba(13,60,122,0.5)', border: 'var(--k-mid)', text: 'var(--k-pale)' },
  { label: 'FEATURE EXT.', name: 'Physics-Informed Features', val: 'DFT·SPL·H·S', color: 'rgba(21,96,189,0.25)', border: 'var(--k-soft)', text: 'var(--k-ultra-light)' },
  { label: 'ENCODER', name: 'Conv1D Autoencoder', val: '128→32', color: 'rgba(0,176,80,0.12)', border: 'var(--k-green)', text: 'var(--k-green)' },
  { label: 'TEMPORAL', name: 'Bi-LSTM Sequence', val: '32→64', color: 'rgba(0,176,80,0.12)', border: 'var(--k-green)', text: 'var(--k-green)' },
  { label: 'DECODER', name: 'Reconstruction', val: '64→128', color: 'rgba(21,96,189,0.2)', border: 'var(--k-mid)', text: 'var(--k-soft)' },
  { label: 'ANOMALY', name: 'Reconstruction Error → Score', val: '0.14', color: 'rgba(255,184,0,0.1)', border: 'var(--k-amber)', text: 'var(--k-amber)' },
];

export function DlFrameworkPipeline({ config }: DlFrameworkPipelineProps) {
  const { title = 'DL FRAMEWORK PIPELINE', layers = DEFAULT_LAYERS } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
      {/* Shimmer keyframe injected once */}
      <style>{`@keyframes kShimmer { to { left: 150% } }`}</style>

      <div className="k-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="k-card-title">{title}</span>
        <span className="k-tag k-tag-green" style={{ fontSize: 9 }}>LIVE INFERENCE</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {layers.map((layer, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Label */}
              <div
                style={{
                  fontFamily: 'var(--k-font-tech)',
                  fontSize: 10,
                  color: 'var(--k-text-dim)',
                  width: 90,
                  textAlign: 'right',
                  flexShrink: 0,
                  letterSpacing: 0.5,
                }}
              >
                {layer.label}
              </div>

              {/* Bar with shimmer */}
              <div
                style={{
                  flex: 1,
                  height: 28,
                  borderRadius: 2,
                  background: layer.color,
                  border: `1px solid ${layer.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--k-font-display)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: layer.text,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Shimmer overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '60%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                    animation: 'kShimmer 3s infinite linear',
                  }}
                />
                <span style={{ position: 'relative', zIndex: 1 }}>{layer.name}</span>
              </div>

              {/* Value */}
              <div
                style={{
                  fontFamily: 'var(--k-font-tech)',
                  fontSize: 10,
                  color: 'var(--k-text-secondary)',
                  width: 60,
                  flexShrink: 0,
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {layer.val}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
