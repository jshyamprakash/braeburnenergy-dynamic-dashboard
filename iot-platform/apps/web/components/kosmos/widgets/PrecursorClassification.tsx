'use client';

interface PrecursorClassificationProps {
  config: {
    confidence?: number;
    classification?: string;
    subLabel?: string;
    color?: string;
  };
}

export function PrecursorClassification({ config }: PrecursorClassificationProps) {
  const {
    confidence = 86,
    classification = 'NORMAL OPERATION',
    subLabel = 'No precursor signature detected',
    color = 'var(--k-green)',
  } = config;

  // SVG ring: r=40, circumference ≈ 251
  const circ = 251;
  const offset = circ * (1 - confidence / 100);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div className="k-card-header">
        <span className="k-card-title">◎ PRECURSOR CLASSIFICATION</span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '8px 12px',
          textAlign: 'center',
        }}
      >
        {/* Ring */}
        <div style={{ width: 100, height: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
            viewBox="0 0 100 100"
            width={100}
            height={100}
          >
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,176,80,0.1)" strokeWidth="9" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={color}
              strokeWidth="9"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 4px ${color})` }}
            />
          </svg>
          <span
            style={{
              fontFamily: 'var(--k-font-display)',
              fontSize: 26,
              fontWeight: 700,
              color,
              zIndex: 1,
            }}
          >
            {confidence}
          </span>
        </div>

        {/* Classification label */}
        <div
          style={{
            fontFamily: 'var(--k-font-display)',
            fontSize: 18,
            fontWeight: 700,
            color,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {classification}
        </div>

        {/* Sub-label */}
        {subLabel && (
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>
            {subLabel}
          </div>
        )}
      </div>
    </div>
  );
}
