'use client';

interface FeatureMatrixProps {
  config: {
    title?: string;
    /** 5x5 matrix of values 0–1 */
    data?: number[][];
    labels?: string[];
  };
}

function heatColor(v: number): string {
  if (v < 0.2) return 'rgba(13,60,122,0.6)';
  if (v < 0.4) return 'rgba(21,96,189,0.4)';
  if (v < 0.6) return 'rgba(60,140,211,0.5)';
  if (v < 0.8) return 'rgba(111,170,230,0.6)';
  return 'rgba(0,176,80,0.55)';
}

const DEFAULT_MATRIX = Array.from({ length: 5 }, () =>
  Array.from({ length: 5 }, () => Math.random())
);

export function FeatureMatrix({ config }: FeatureMatrixProps) {
  const { title = 'Feature Matrix', data = DEFAULT_MATRIX, labels = [] } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="k-section-heading">{title}</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 3,
          flex: 1,
        }}
      >
        {data.flat().map((v, i) => (
          <div
            key={i}
            title={`${labels[Math.floor(i / 5)] || `F${Math.floor(i / 5) + 1}`}×${labels[i % 5] || `F${(i % 5) + 1}`}: ${(v * 100).toFixed(0)}%`}
            style={{
              background: heatColor(v),
              border: '1px solid rgba(21,96,189,0.2)',
              borderRadius: 2,
              aspectRatio: '1',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--k-font-tech)',
              fontSize: 9,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            {(v * 100).toFixed(0)}
          </div>
        ))}
      </div>
    </div>
  );
}
