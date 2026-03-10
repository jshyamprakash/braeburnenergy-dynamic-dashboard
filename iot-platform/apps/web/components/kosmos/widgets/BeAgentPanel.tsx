'use client';

interface AgentModule {
  name: string;
  desc: string;
  status: 'active' | 'idle' | 'offline';
}

interface AgentAlert {
  time: string;
  msg: string;
  sub?: string;
  severity: 'ok' | 'warning' | 'info' | 'critical';
}

interface BeAgentPanelProps {
  config: {
    title?: string;
    modules?: AgentModule[];
    alerts?: AgentAlert[];
    healthScore?: number;
    healthLabel?: string;
  };
}

const SEVERITY_COLOR: Record<string, string> = {
  ok: 'var(--k-green)',
  warning: 'var(--k-amber)',
  info: 'var(--k-base)',
  critical: 'var(--k-red)',
};

export function BeAgentPanel({ config }: BeAgentPanelProps) {
  const {
    title = 'BE AGENT™',
    modules = [],
    alerts = [],
    healthScore = 86,
    healthLabel = 'TURBINE HEALTH INDEX',
  } = config;

  // SVG ring: circumference = 2π×40 ≈ 251
  const circ = 251;
  const offset = circ * (1 - healthScore / 100);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div className="k-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="k-card-title">⟳ {title}</span>
        <span className="k-card-badge">AGENTIC AI</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Active Modules */}
        {modules.length > 0 && (
          <div>
            <div className="k-section-heading" style={{ marginBottom: 6 }}>Active Modules</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {modules.map((mod, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(6,15,30,0.7)',
                    border: '1px solid var(--k-border)',
                    borderLeft: `3px solid ${mod.status === 'active' ? 'var(--k-green)' : 'var(--k-base)'}`,
                    borderRadius: '0 3px 3px 0',
                    padding: '6px 10px',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 12, fontWeight: 600, color: 'var(--k-pale)' }}>
                    {mod.name}
                  </div>
                  <div style={{ fontFamily: 'var(--k-font-main)', fontSize: 10, color: 'var(--k-text-dim)', marginTop: 1 }}>
                    {mod.desc}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontFamily: 'var(--k-font-tech)',
                      fontSize: 9,
                      color: mod.status === 'active' ? 'var(--k-green)' : 'var(--k-text-dim)',
                    }}
                  >
                    {mod.status === 'active' ? '● RUN' : '○ IDLE'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="k-divider" />

        {/* Alerts */}
        {alerts.length > 0 && (
          <div>
            <div className="k-section-heading" style={{ marginBottom: 6 }}>Alerts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 3,
                    padding: '6px 10px',
                    borderLeft: `3px solid ${SEVERITY_COLOR[alert.severity] || 'var(--k-base)'}`,
                    background: 'rgba(6,15,30,0.6)',
                  }}
                >
                  <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', marginBottom: 2 }}>
                    {alert.time}
                  </div>
                  <div style={{ fontFamily: 'var(--k-font-main)', fontSize: 11, color: 'var(--k-text-primary)' }}>
                    {alert.msg}
                  </div>
                  {alert.sub && (
                    <div style={{ fontFamily: 'var(--k-font-main)', fontSize: 10, color: 'var(--k-text-dim)', marginTop: 1 }}>
                      {alert.sub}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="k-divider" />

        {/* Health Ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingBottom: 4 }}>
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
                stroke="var(--k-green)"
                strokeWidth="9"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 4px var(--k-green))' }}
              />
            </svg>
            <span style={{ fontFamily: 'var(--k-font-display)', fontSize: 26, fontWeight: 700, color: 'var(--k-green)', zIndex: 1 }}>
              {healthScore}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', textAlign: 'center' }}>
            {healthLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
