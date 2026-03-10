'use client';

interface StatusRow {
  label: string;
  value: string;
  tagColor: 'green' | 'amber' | 'blue' | 'red';
}

interface PlatformStatusProps {
  config: {
    title?: string;
    rows?: StatusRow[];
  };
}

const TAG_CLASS: Record<string, string> = {
  green: 'k-tag k-tag-green',
  amber: 'k-tag k-tag-amber',
  blue: 'k-tag k-tag-blue',
  red: 'k-tag k-tag-red',
};

export function PlatformStatus({ config }: PlatformStatusProps) {
  const { title = 'PLATFORM STATUS', rows = [] } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="k-card-header">
        <span className="k-card-title">{title}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>
              {row.label}
            </span>
            <span className={TAG_CLASS[row.tagColor] || 'k-tag'} style={{ fontSize: 9 }}>
              {row.value}
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>
            No status rows configured.
          </div>
        )}
      </div>
    </div>
  );
}
