'use client';

import { useDeviceRealtime } from '@/hooks/useDeviceData';

interface HealthRingProps {
  config: {
    title?: string;
    deviceId?: string;
    field?: string;
    max?: number;
    staticValue?: number;
    color?: string;
  };
}

export function HealthRing({ config }: HealthRingProps) {
  const { title = 'Health Index', deviceId, field, max = 100, staticValue, color } = config;
  const { state } = useDeviceRealtime(deviceId || '');

  const raw = staticValue !== undefined ? staticValue : (field && state ? Number(state.data?.[field]) : NaN);
  const value = isNaN(raw) ? 78 : raw; // Default to 78 for demo
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const R = 44;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * R;
  const dashOffset = circumference * (1 - pct / 100);

  const ringColor = pct > 70 ? 'var(--k-green)' : pct > 40 ? 'var(--k-amber)' : 'var(--k-red)';
  const effectiveColor = color || ringColor;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <div className="k-section-heading">{title}</div>
      <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(21,96,189,0.15)" strokeWidth={8} />
          {/* Progress */}
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={effectiveColor}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 6px ${effectiveColor})` }}
          />
        </svg>
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 26, fontWeight: 700, lineHeight: 1, color: effectiveColor }}>
            {value.toFixed(0)}
          </div>
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 9, color: 'var(--k-text-dim)' }}>/ {max}</div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', letterSpacing: 1 }}>
        {pct.toFixed(0)}% HEALTH INDEX
      </div>
    </div>
  );
}
