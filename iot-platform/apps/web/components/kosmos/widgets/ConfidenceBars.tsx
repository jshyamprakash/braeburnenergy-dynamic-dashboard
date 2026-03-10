'use client';

interface ConfidenceBarsProps {
  config: Record<string, any>;
}

const COLOR_MAP: Record<string, string> = {
  green: 'var(--k-green)',
  amber: 'var(--k-amber)',
  red: 'var(--k-red)',
  blue: 'var(--k-base)',
  soft: 'var(--k-soft)',
};

export function ConfidenceBars({ config }: ConfidenceBarsProps) {
  const { title = 'Confidence', items = [] } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="k-card-title">{title}</div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
        {items.map((item: any, i: number) => {
          const pct = Math.min(100, Math.max(0, Number(item.value) || 0));
          const color = COLOR_MAP[item.color] || 'var(--k-base)';
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-secondary)', letterSpacing: 1 }}>
                  {item.label}
                </span>
                <span style={{ fontFamily: 'var(--k-font-display)', fontSize: 13, fontWeight: 600, color }}>
                  {pct}%
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: color,
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                    boxShadow: `0 0 6px ${color}`,
                  }}
                />
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', textAlign: 'center', padding: 16 }}>
            NO DATA
          </div>
        )}
      </div>
    </div>
  );
}
