'use client';

interface ConferenceInfoProps {
  config: {
    conference?: string;
    paperTitle?: string;
    paperRef?: string;
    org?: string;
  };
}

export function ConferenceInfo({ config }: ConferenceInfoProps) {
  const {
    conference = 'ASME TURBO EXPO 2026',
    paperTitle = 'Paper GT2026-179161: Feature-Driven Deep Learning Framework for Combustion Dynamics Precursor Detection in Gas Turbines',
    paperRef = 'GT2026-179161',
    org = 'BRAEBURN ENERGY',
  } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="k-card-header">
        <span className="k-card-title">◆ CONFERENCE REFERENCE</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Conference name */}
        <div
          style={{
            fontFamily: 'var(--k-font-tech)',
            fontSize: 10,
            color: 'var(--k-text-dim)',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {conference}
        </div>

        {/* Paper title */}
        {paperTitle && (
          <p
            style={{
              fontFamily: 'var(--k-font-main)',
              fontSize: 12,
              color: 'var(--k-text-secondary)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {paperTitle}
          </p>
        )}

        {/* Tags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {paperRef && (
            <span className="k-tag k-tag-blue" style={{ fontSize: 10, display: 'inline-block', width: 'fit-content' }}>
              {paperRef}
            </span>
          )}
          {org && (
            <span className="k-tag k-tag-green" style={{ fontSize: 10, display: 'inline-block', width: 'fit-content' }}>
              {org}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
