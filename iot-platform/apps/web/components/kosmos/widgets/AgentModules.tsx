'use client';

import { useState } from 'react';

interface ModuleMetric {
  label: string;
  value: string;
  color: string;
}

interface AgentModule {
  name: string;
  desc: string;
  status: 'active' | 'idle';
  detailDesc: string;
  metrics: ModuleMetric[];
}

interface AgentModulesProps {
  config: {
    title?: string;
    modules?: AgentModule[];
  };
}

const DEFAULT_MODULES: AgentModule[] = [
  {
    name: 'CD Precursor Detection',
    desc: 'GT2026 — Autoencoder·LSTM·DFT features',
    status: 'active',
    detailDesc: 'Physics-informed DL framework for combustion instability precursor identification. Autoencoder-LSTM pipeline with 45-second advance warning on lean blowout and flashback events.',
    metrics: [
      { label: 'ANOMALY SCORE', value: '0.14', color: 'var(--k-green)' },
      { label: 'LEAD TIME', value: '~45s', color: 'var(--k-soft)' },
      { label: 'F1 SCORE', value: '0.94', color: 'var(--k-amber)' },
    ],
  },
  {
    name: 'Thermodynamic Performance',
    desc: 'Compressor map · efficiency tracking',
    status: 'active',
    detailDesc: 'Monitors compressor efficiency, turbine inlet temperature, and heat rate trends to detect performance degradation and fouling.',
    metrics: [
      { label: 'EFFICIENCY', value: '91.2%', color: 'var(--k-green)' },
      { label: 'HEAT RATE', value: '9.82', color: 'var(--k-soft)' },
      { label: 'DELTA T', value: '12.4°C', color: 'var(--k-amber)' },
    ],
  },
  {
    name: 'Fuel Quality Adaptation',
    desc: 'CalorieSense™ link · CV · H₂ adaptive',
    status: 'active',
    detailDesc: 'Real-time fuel calorific value monitoring with adaptive control. CalorieSense™ integration ensures safe combustion across variable H₂ blends.',
    metrics: [
      { label: 'CV', value: '38.2 MJ/m³', color: 'var(--k-green)' },
      { label: 'H₂%', value: '3.2%', color: 'var(--k-soft)' },
      { label: 'ADAPT.', value: 'ACTIVE', color: 'var(--k-green)' },
    ],
  },
  {
    name: 'Vibration & Rotor Dynamics',
    desc: 'Blade pass · sub-sync · bearing',
    status: 'idle',
    detailDesc: 'Vibration spectral analysis for blade pass frequencies, sub-synchronous instabilities, and bearing health assessment.',
    metrics: [
      { label: 'VIB-X', value: '2.1 mm/s', color: 'var(--k-amber)' },
      { label: 'BLADE PASS', value: '186 Hz', color: 'var(--k-soft)' },
      { label: 'BEARING', value: 'MONITOR', color: 'var(--k-amber)' },
    ],
  },
  {
    name: 'Emissions Optimisation',
    desc: 'NOx · CO · CEMS closed-loop',
    status: 'idle',
    detailDesc: 'Closed-loop emissions control targeting regulatory NOx and CO limits. CEMS integration with real-time trim adjustments.',
    metrics: [
      { label: 'NOx', value: '18.4 ppm', color: 'var(--k-green)' },
      { label: 'CO', value: '12.1 ppm', color: 'var(--k-green)' },
      { label: 'LIMIT', value: '25 ppm', color: 'var(--k-soft)' },
    ],
  },
  {
    name: 'Asset Life Management',
    desc: 'Creep · LCF · RUL · hot section',
    status: 'idle',
    detailDesc: 'Remaining useful life prediction for hot section components using creep and low-cycle fatigue models.',
    metrics: [
      { label: 'RUL', value: '4,200 h', color: 'var(--k-green)' },
      { label: 'LCF', value: '78%', color: 'var(--k-soft)' },
      { label: 'CREEP', value: 'LOW', color: 'var(--k-green)' },
    ],
  },
  {
    name: 'Inlet Conditioning',
    desc: 'Evap cooler · chiller · fogging',
    status: 'idle',
    detailDesc: 'Inlet air temperature and humidity management for power augmentation and stable combustion at varying ambient conditions.',
    metrics: [
      { label: 'INLET T', value: '18.2°C', color: 'var(--k-soft)' },
      { label: 'POWER AUG', value: '+2.1%', color: 'var(--k-green)' },
      { label: 'STATUS', value: 'IDLE', color: 'var(--k-text-dim)' },
    ],
  },
  {
    name: 'Balance of Plant',
    desc: 'HRSG · FGC · electrical systems',
    status: 'idle',
    detailDesc: 'Balance of plant monitoring including HRSG performance, fuel gas conditioning, and auxiliary electrical systems.',
    metrics: [
      { label: 'HRSG EFF.', value: '88.4%', color: 'var(--k-soft)' },
      { label: 'FGC', value: 'NORMAL', color: 'var(--k-green)' },
      { label: 'ELEC.', value: 'OK', color: 'var(--k-green)' },
    ],
  },
  {
    name: 'Multi-fleet Benchmarking',
    desc: 'OEM-agnostic KPI normalisation',
    status: 'idle',
    detailDesc: 'Cross-OEM fleet performance normalisation and benchmarking. Identifies best-in-fleet practices and outlier units.',
    metrics: [
      { label: 'FLEET SIZE', value: '12 units', color: 'var(--k-soft)' },
      { label: 'ONLINE', value: '10', color: 'var(--k-green)' },
      { label: 'OEMs', value: '3', color: 'var(--k-pale)' },
    ],
  },
];

export function AgentModules({ config }: AgentModulesProps) {
  const { title = 'BE AGENT™ MODULES', modules = DEFAULT_MODULES } = config;
  const [selectedIdx, setSelectedIdx] = useState(0);

  const selected = modules[selectedIdx];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="k-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="k-card-title">⟳ {title}</span>
        <span className="k-card-badge">v2.1</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Module list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {modules.map((mod, i) => (
            <div
              key={i}
              onClick={() => setSelectedIdx(i)}
              style={{
                background: 'rgba(6,15,30,0.7)',
                border: '1px solid var(--k-border)',
                borderLeft: `3px solid ${i === selectedIdx ? 'var(--k-green)' : (mod.status === 'active' ? 'var(--k-mid)' : 'var(--k-base)')}`,
                borderRadius: '0 3px 3px 0',
                padding: '7px 10px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'border-left-color 0.2s, background 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(21,96,189,0.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,15,30,0.7)'; }}
            >
              <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 12, fontWeight: 600, color: 'var(--k-pale)', paddingRight: 50 }}>
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
                {mod.status === 'active' ? '● ACTIVE' : '○ IDLE'}
              </div>
            </div>
          ))}
        </div>

        {/* Module detail panel */}
        {selected && (
          <div
            style={{
              background: 'rgba(13,60,122,0.15)',
              border: '1px solid var(--k-border)',
              borderRadius: 3,
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="k-card-title">◈ {selected.name.toUpperCase()}</span>
              <span className={`k-tag ${selected.status === 'active' ? 'k-tag-green' : ''}`} style={{ fontSize: 9 }}>
                {selected.status.toUpperCase()}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--k-font-main)', fontSize: 12, color: 'var(--k-text-secondary)', lineHeight: 1.5, margin: '0 0 10px' }}>
              {selected.detailDesc}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {selected.metrics.map((m, mi) => (
                <div
                  key={mi}
                  style={{
                    background: 'rgba(6,15,30,0.5)',
                    border: '1px solid var(--k-border)',
                    borderBottom: `2px solid ${m.color}`,
                    borderRadius: 3,
                    padding: '6px 8px',
                  }}
                >
                  <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 9, color: 'var(--k-text-dim)', marginBottom: 2, letterSpacing: 0.5 }}>
                    {m.label}
                  </div>
                  <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 16, fontWeight: 700, color: m.color }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
