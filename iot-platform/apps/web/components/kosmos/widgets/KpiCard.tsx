'use client';

interface KpiCardProps {
  config: {
    label?: string;
    value?: string | number;
    unit?: string;
    trend?: 'up' | 'down' | 'flat';
    trendLabel?: string;
    color?: string;
  };
}

const TREND_ICON = { up: '▲', down: '▼', flat: '◆' };
const TREND_COLOR = {
  up: 'var(--k-green)',
  down: 'var(--k-red)',
  flat: 'var(--k-amber)',
};

export function KpiCard({ config }: KpiCardProps) {
  const { label = 'KPI', value = '—', unit = '', trend = 'flat', trendLabel = '', color } = config;
  const trendColor = TREND_COLOR[trend];

  return (
    <div
      className="k-metric-card k-fade-in-up h-full"
      style={{ '--k-color': color || 'var(--k-soft)' } as React.CSSProperties}
    >
      <div
        style={{
          fontFamily: 'var(--k-font-tech)',
          fontSize: 10,
          color: 'var(--k-text-dim)',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--k-font-display)',
          fontSize: 28,
          fontWeight: 700,
          color: color || 'var(--k-soft)',
          lineHeight: 1,
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      {unit && (
        <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 11, color: 'var(--k-text-secondary)' }}>
          {unit}
        </div>
      )}
      {trendLabel && (
        <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, marginTop: 4, color: trendColor }}>
          {TREND_ICON[trend]} {trendLabel}
        </div>
      )}
    </div>
  );
}
