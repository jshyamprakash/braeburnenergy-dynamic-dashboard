'use client';

interface CombustionHeaderProps {
  config: {
    title?: string;
    paperRef?: string;
    description?: string;
    tags?: string[];
  };
}

export function CombustionHeader({ config }: CombustionHeaderProps) {
  const {
    title = 'FEATURE-DRIVEN DEEP LEARNING — GT2026 PAPER DEMO',
    paperRef,
    description,
    tags = [],
  } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        className="k-card-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}
      >
        <span className="k-card-title">◈ {title}</span>
        {paperRef && <span className="k-card-badge">{paperRef}</span>}
      </div>

      <div style={{ flex: 1, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 12, overflow: 'hidden' }}>
        {description && (
          <p
            style={{
              fontFamily: 'var(--k-font-main)',
              fontSize: 12,
              color: 'var(--k-text-secondary)',
              lineHeight: 1.5,
              maxWidth: 600,
              margin: 0,
              flexShrink: 0,
            }}
          >
            {description}
          </p>
        )}
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: 'auto', alignContent: 'flex-start' }}>
            {tags.map((tag, i) => (
              <span
                key={i}
                className={i % 2 === 0 ? 'k-tag k-tag-blue' : 'k-tag k-tag-green'}
                style={{ fontSize: 10 }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
