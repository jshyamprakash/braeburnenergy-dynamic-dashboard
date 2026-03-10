'use client';

interface VsOemPlatformsProps {
  config: {
    title?: string;
    points?: string[];
  };
}

export function VsOemPlatforms({ config }: VsOemPlatformsProps) {
  const { title = 'KOSMOS™ vs OEM PLATFORMS', points = [] } = config;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderTop: '2px solid transparent',
        backgroundImage: 'linear-gradient(var(--k-bg-card), var(--k-bg-card)), linear-gradient(90deg, transparent, var(--k-green), transparent)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
      }}
    >
      {/* Green accent top border via pseudo-element equivalent */}
      <div
        style={{
          height: 2,
          background: 'linear-gradient(90deg, transparent, var(--k-green), transparent)',
          flexShrink: 0,
        }}
      />
      <div className="k-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="k-card-title">{title}</span>
        <span className="k-card-badge">USP</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            fontFamily: 'var(--k-font-tech)',
            fontSize: 10,
            color: 'var(--k-text-dim)',
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          KOSMOS™ ADVANTAGE
        </div>
        {points.map((point, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--k-green)', marginTop: 1, flexShrink: 0 }}>✓</span>
            <span style={{ fontFamily: 'var(--k-font-main)', fontSize: 12, color: 'var(--k-text-primary)', lineHeight: 1.4 }}>
              {point}
            </span>
          </div>
        ))}
        {points.length === 0 && (
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>
            No points configured.
          </div>
        )}
      </div>
    </div>
  );
}
