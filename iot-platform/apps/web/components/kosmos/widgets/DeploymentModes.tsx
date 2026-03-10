'use client';

interface DeploymentMode {
  title: string;
  description: string;
  color: string;
}

interface DeploymentModesProps {
  config: {
    title?: string;
    modes?: DeploymentMode[];
  };
}

export function DeploymentModes({ config }: DeploymentModesProps) {
  const { title = 'DEPLOYMENT MODES', modes = [] } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="k-card-header">
        <span className="k-card-title">{title}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {modes.map((mode, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--k-border)',
              borderRadius: 3,
              padding: '8px 10px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--k-font-display)',
                fontSize: 13,
                fontWeight: 700,
                color: mode.color,
                letterSpacing: 1,
              }}
            >
              {mode.title}
            </div>
            <div
              style={{
                fontFamily: 'var(--k-font-main)',
                fontSize: 11,
                color: 'var(--k-text-secondary)',
                marginTop: 2,
                lineHeight: 1.4,
              }}
            >
              {mode.description}
            </div>
          </div>
        ))}
        {modes.length === 0 && (
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)' }}>
            No deployment modes configured.
          </div>
        )}
      </div>
    </div>
  );
}
