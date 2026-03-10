'use client';

interface KeyValueTableProps {
  config: Record<string, any>;
}

export function KeyValueTable({ config }: KeyValueTableProps) {
  const { title = 'Overview', items = [] } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="k-card-title">{title}</div>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
        {items.map((item: any, i: number) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--k-font-tech)',
                fontSize: 10,
                color: 'var(--k-text-dim)',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {item.key}
            </span>
            <span
              style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 14,
                color: 'var(--k-pale)',
                fontWeight: 600,
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', textAlign: 'center', padding: 16 }}>
            NO DATA
          </div>
        )}
      </div>
    </div>
  );
}
