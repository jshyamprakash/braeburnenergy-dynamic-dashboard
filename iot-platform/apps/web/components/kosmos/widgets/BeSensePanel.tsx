'use client';

interface Sensor {
  name: string;
  value: string;
  status: 'ok' | 'warn' | 'error';
}

interface BeSensePanelProps {
  config: {
    title?: string;
    sensors?: Sensor[];
    acquisition?: {
      sampleRate?: string;
      channels?: string;
      latency?: string;
      edgeNode?: string;
    };
    calorieSense?: {
      value?: string;
      sub?: string;
      tags?: string[];
    };
  };
}

const STATUS_COLOR: Record<string, string> = {
  ok: 'var(--k-green)',
  warn: 'var(--k-amber)',
  error: 'var(--k-red)',
};

const STATUS_BG: Record<string, string> = {
  ok: 'rgba(0,176,80,0.08)',
  warn: 'rgba(255,184,0,0.08)',
  error: 'rgba(255,58,58,0.08)',
};

const STATUS_BORDER: Record<string, string> = {
  ok: 'var(--k-green)',
  warn: 'var(--k-amber)',
  error: 'var(--k-red)',
};

export function BeSensePanel({ config }: BeSensePanelProps) {
  const {
    title = 'BE SENSE™',
    sensors = [],
    acquisition = {},
    calorieSense = {},
  } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div className="k-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="k-card-title">◈ {title}</span>
        <span className="k-card-badge">SENSOR FUSION</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Multimodal Inputs */}
        {sensors.length > 0 && (
          <div>
            <div className="k-section-heading" style={{ marginBottom: 8 }}>Multimodal Inputs</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {sensors.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: STATUS_BG[s.status] || 'rgba(13,60,122,0.3)',
                    border: `1px solid ${STATUS_BORDER[s.status] || 'var(--k-border)'}`,
                    borderRadius: 3,
                    padding: '6px 8px',
                  }}
                >
                  <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>
                    {s.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-secondary)' }}>
                      {s.value}
                    </span>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: STATUS_COLOR[s.status] || 'var(--k-text-dim)',
                        boxShadow: `0 0 4px ${STATUS_COLOR[s.status] || 'transparent'}`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="k-divider" />

        {/* Acquisition */}
        <div>
          <div className="k-section-heading" style={{ marginBottom: 8 }}>Acquisition</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {acquisition.sampleRate && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>SAMPLE RATE</span>
                <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-secondary)' }}>{acquisition.sampleRate}</span>
              </div>
            )}
            {acquisition.channels && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>CHANNELS</span>
                <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-secondary)' }}>{acquisition.channels}</span>
              </div>
            )}
            {acquisition.latency && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>LATENCY</span>
                <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-green)' }}>{acquisition.latency}</span>
              </div>
            )}
            {acquisition.edgeNode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>EDGE NODE</span>
                <span className="k-tag k-tag-green" style={{ fontSize: 9 }}>{acquisition.edgeNode}</span>
              </div>
            )}
          </div>
        </div>

        <div className="k-divider" />

        {/* CalorieSense Link */}
        {calorieSense.value && (
          <div>
            <div className="k-section-heading" style={{ marginBottom: 8 }}>CalorieSense™ Link</div>
            <div
              style={{
                background: 'rgba(13,60,122,0.3)',
                border: '1px solid var(--k-border)',
                borderRadius: 3,
                padding: '8px 10px',
              }}
            >
              <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--k-pale)' }}>
                {calorieSense.value}
              </div>
              {calorieSense.sub && (
                <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', marginTop: 2 }}>
                  {calorieSense.sub}
                </div>
              )}
              {calorieSense.tags && calorieSense.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                  {calorieSense.tags.map((tag, i) => (
                    <span key={i} className="k-tag k-tag-green" style={{ fontSize: 9 }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
