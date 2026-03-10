'use client';

interface PlatformDiagramProps {
  config: Record<string, any>;
}

const LAYER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  base:  { bg: 'rgba(21,96,189,0.2)',   border: 'rgba(21,96,189,0.6)',   text: 'var(--k-soft)' },
  soft:  { bg: 'rgba(111,170,230,0.12)', border: 'rgba(111,170,230,0.4)', text: 'var(--k-ultra-light)' },
  green: { bg: 'rgba(0,176,80,0.12)',   border: 'rgba(0,176,80,0.5)',    text: 'var(--k-green)' },
  teal:  { bg: 'rgba(0,181,216,0.10)',  border: 'rgba(0,181,216,0.4)',   text: '#00B5D8' },
  amber: { bg: 'rgba(255,184,0,0.10)',  border: 'rgba(255,184,0,0.4)',   text: 'var(--k-amber)' },
};

export function PlatformDiagram({ config }: PlatformDiagramProps) {
  const { title = 'Platform Architecture', layers = [] } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="k-card-title">{title}</div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
        {layers.map((layer: any, i: number) => {
          const s = LAYER_STYLES[layer.color] || LAYER_STYLES.base;
          return (
            <div key={i}>
              <div
                style={{
                  fontFamily: 'var(--k-font-tech)',
                  fontSize: 8,
                  color: 'var(--k-text-dim)',
                  letterSpacing: 2,
                  marginBottom: 4,
                  textTransform: 'uppercase',
                }}
              >
                LAYER {i} — {layer.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(layer.items || []).map((item: string, j: number) => (
                  <div
                    key={j}
                    style={{
                      padding: '3px 8px',
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      borderRadius: 2,
                      fontFamily: 'var(--k-font-tech)',
                      fontSize: 10,
                      color: s.text,
                      letterSpacing: 0.5,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
              {i < layers.length - 1 && (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--k-border-bright)',
                    fontSize: 14,
                    marginTop: 6,
                    letterSpacing: 4,
                  }}
                >
                  ⇅
                </div>
              )}
            </div>
          );
        })}
        {layers.length === 0 && (
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', textAlign: 'center', padding: 16 }}>
            NO LAYERS CONFIGURED
          </div>
        )}
      </div>
    </div>
  );
}
