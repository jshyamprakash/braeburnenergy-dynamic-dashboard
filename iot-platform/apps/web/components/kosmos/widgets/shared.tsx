'use client';

import type { ReactNode } from 'react';

function buildLinePath(values: number[], width: number, height: number, min: number, max: number) {
  const range = Math.max(0.0001, max - min);
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function WidgetCard({
  title,
  right,
  accentGreen,
  children,
}: {
  title: string | ReactNode;
  right?: ReactNode;
  accentGreen?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`k-card ${accentGreen ? 'accent-green' : ''}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="k-card-header">
        <div className="k-card-title">{title}</div>
        {right ?? null}
      </div>
      <div className="k-card-body" style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

export function Tag({ children, color = 'blue' }: { children: ReactNode; color?: 'blue' | 'green' | 'amber' | 'red' }) {
  return <span className={`k-tag k-tag-${color}`}>{children}</span>;
}

export function ChartPanel({
  values,
  color,
  fill,
  min,
  max,
  threshold,
  framed = true,
}: {
  values: number[];
  color: string;
  fill: string;
  min: number;
  max: number;
  threshold?: number;
  framed?: boolean;
}) {
  const width = 540;
  const height = 180;
  const path = buildLinePath(values, width, height, min, max);
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const thresholdY = threshold === undefined ? null : height - ((threshold - min) / Math.max(0.0001, max - min)) * height;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 130,
        border: framed ? '1px solid var(--k-border)' : 'none',
        borderRadius: 3,
        background: framed ? 'rgba(6,15,30,0.6)' : 'transparent',
        overflow: 'hidden',
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2={width}
            y1={height * fraction}
            y2={height * fraction}
            stroke="rgba(21,96,189,0.12)"
            strokeWidth="1"
          />
        ))}
        {thresholdY !== null && (
          <line
            x1="0"
            x2={width}
            y1={thresholdY}
            y2={thresholdY}
            stroke="rgba(255,58,58,0.4)"
            strokeDasharray="6 4"
            strokeWidth="2"
          />
        )}
        <path d={areaPath} fill={fill} />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function MetricBar({ label, value, width, color }: { label: string; value: string; width: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-secondary)' }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(21,96,189,0.15)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', borderRadius: 3, background: color }} />
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  trend,
  trendColor,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  trend: string;
  trendColor: string;
  color: string;
}) {
  return (
    <div
      style={{
        height: '100%',
        padding: '14px 16px',
        background: 'rgba(10,22,43,0.88)',
        border: `1px solid ${color}`,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: `0 0 24px color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', letterSpacing: 1.5 }}>{label}</div>
      <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 34, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-secondary)', letterSpacing: 1.2 }}>{unit}</div>
      <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 11, color: trendColor, letterSpacing: 1.2 }}>{trend}</div>
    </div>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', letterSpacing: 1.5, marginBottom: 8 }}>
      {children}
    </div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: 'rgba(21,96,189,0.18)', margin: '12px 0' }} />;
}
