'use client';

interface ModuleItem {
  name: string;
  description?: string;
  status: 'active' | 'idle' | 'offline';
}

interface ModuleStatusListProps {
  config: {
    title?: string;
    modules?: ModuleItem[];
  };
}

const DEMO_MODULES: ModuleItem[] = [
  { name: 'BE Sense™ Fusion', description: 'Multimodal sensor integration', status: 'active' },
  { name: 'CD Precursor', description: 'Combustion dynamics analysis', status: 'active' },
  { name: 'CalorieSense™', description: 'Calorific value estimation', status: 'active' },
  { name: 'Fleet Analytics', description: 'Cross-fleet benchmarking', status: 'idle' },
  { name: 'CMMS Bridge', description: 'Work order integration', status: 'offline' },
];

const STATUS_DOT: Record<string, string> = {
  active: 'var(--k-green)',
  idle: 'var(--k-amber)',
  offline: 'var(--k-text-dim)',
};

const STATUS_LABEL: Record<string, string> = {
  active: '● ACTIVE',
  idle: '○ IDLE',
  offline: '○ OFFLINE',
};

export function ModuleStatusList({ config }: ModuleStatusListProps) {
  const { title = 'Modules', modules = DEMO_MODULES } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="k-section-heading">{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'auto' }}>
        {modules.map((mod, i) => (
          <div key={i} className={`k-agent-module ${mod.status === 'active' ? 'active-mod' : ''}`}>
            <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 13, fontWeight: 600, letterSpacing: 1, color: 'var(--k-pale)' }}>
              {mod.name}
            </div>
            {mod.description && (
              <div style={{ fontFamily: 'var(--k-font-main)', fontSize: 11, color: 'var(--k-text-dim)', marginTop: 2 }}>
                {mod.description}
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: 'var(--k-font-tech)',
                fontSize: 10,
                color: STATUS_DOT[mod.status],
              }}
            >
              {STATUS_LABEL[mod.status]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
