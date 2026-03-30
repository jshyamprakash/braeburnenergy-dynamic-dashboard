'use client';

import type { KosmosPage, PlatSubsection } from '../types';
import { PlatformArchitectureBlock } from '../widgets/PlatformArchitectureBlock';
import { useLicense } from '@/lib/hooks/useLicense';

interface KosmosArchitectureTabPanelProps {
  page: KosmosPage;
  editMode: boolean;
  onConfigChange: (subsections: PlatSubsection[]) => void;
}

/**
 * KosmosArchitectureTabPanel — renders the Kosmos Architecture mandatory tab.
 * Two-column layout:
 * - Left (1fr): PlatformArchitectureBlock with editable layers
 * - Right (320px): Three stacked static cards (VS OEM, Deployment Modes, Conference Info)
 * Deployment Modes and Conference Info are license-gated.
 */
export function KosmosArchitectureTabPanel({
  page,
  editMode,
  onConfigChange,
}: KosmosArchitectureTabPanelProps) {
  const { isModuleEnabled } = useLicense();

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 12,
        height: '100%',
        padding: 16,
        overflow: 'auto',
      }}
    >
      {/* Left: Main architecture diagram */}
      <PlatformArchitectureBlock page={page} editMode={editMode} onConfigChange={onConfigChange} />

      {/* Right: Static info cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', height: '100%' }}>
        {/* VS OEM Platforms Card */}
        <div
          style={{
            background: 'var(--k-bg-card)',
            border: '1px solid var(--k-border)',
            borderRadius: 4,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--k-green), transparent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px 8px', borderBottom: '1px solid var(--k-border)' }}>
            <span style={{ fontFamily: 'var(--k-font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '2px', color: 'var(--k-soft)' }}>
              ◈ VS OEM PLATFORMS
            </span>
            <span style={{ fontSize: 9, background: 'rgba(0,176,80,0.15)', border: '1px solid var(--k-green)', color: 'var(--k-green)', padding: '2px 6px', borderRadius: 2, fontFamily: 'var(--k-font-tech)', letterSpacing: 1 }}>
              USP
            </span>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', letterSpacing: '1px', marginBottom: 4 }}>
              KOSMOS CORTEX™ ADVANTAGE
            </div>
            {[
              'OEM-agnostic — GE, Siemens, MHI, Solar',
              'Full data ownership — operator retained',
              'Transparent models — no black box',
              'Rapid deployment — weeks not years',
              'No LTSA conflict of interest',
              '50 kHz high-speed combustion data',
              'Cross-OEM fleet benchmarking',
              'Edge + cloud / on-prem deployment',
            ].map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--k-green)', marginTop: 1, flexShrink: 0, fontSize: 11 }}>✓</span>
                <span style={{ fontFamily: 'var(--k-font-main)', fontSize: 12, color: 'var(--k-text-primary)', lineHeight: 1.3 }}>
                  {point}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Deployment Modes Card — shown if combustion_dl module is enabled */}
        {isModuleEnabled('combustion_dl') && (
          <div
            style={{
              background: 'var(--k-bg-card)',
              border: '1px solid var(--k-border)',
              borderRadius: 4,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--k-base), transparent)' }} />
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--k-border)' }}>
              <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '2px', color: 'var(--k-soft)' }}>
                ◈ DEPLOYMENT MODES
              </div>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { title: 'EDGE', color: 'var(--k-soft)', desc: 'Sub-8ms latency · on-site compute · no cloud dependency' },
                { title: 'PRIVATE CLOUD', color: 'var(--k-mid)', desc: 'Fleet-wide analytics · historian · dashboards' },
                { title: 'ON-PREMISES', color: 'var(--k-base)', desc: 'Air-gapped · operator data sovereignty' },
              ].map((mode, i) => (
                <div key={i} style={{ border: '1px solid var(--k-border)', borderRadius: 3, padding: '8px 10px' }}>
                  <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 13, fontWeight: 700, color: mode.color, letterSpacing: 1 }}>
                    {mode.title}
                  </div>
                  <div style={{ fontFamily: 'var(--k-font-main)', fontSize: 11, color: 'var(--k-text-secondary)', marginTop: 2 }}>
                    {mode.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conference Info Card — shown if be_agent module is enabled */}
        {isModuleEnabled('be_agent') && (
          <div
            style={{
              background: 'var(--k-bg-card)',
              border: '1px solid var(--k-border)',
              borderRadius: 4,
              overflow: 'hidden',
              flex: 1,
            }}
          >
            <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--k-base), transparent)' }} />
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--k-border)' }}>
              <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '2px', color: 'var(--k-soft)' }}>
                ◈ CONFERENCE INFO
              </div>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', letterSpacing: '1px' }}>
                ASME TURBO EXPO 2026
              </div>
              <div style={{ fontFamily: 'var(--k-font-main)', fontSize: 12, color: 'var(--k-text-secondary)', lineHeight: 1.5 }}>
                Paper GT2026-179161: Feature-Driven Deep Learning Framework for Combustion Dynamics Precursor Detection in Gas Turbines
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 'fit-content',
                    fontSize: 9,
                    background: 'rgba(21,96,189,0.2)',
                    border: '1px solid var(--k-border-bright)',
                    color: 'var(--k-soft)',
                    padding: '2px 6px',
                    borderRadius: 2,
                    fontFamily: 'var(--k-font-tech)',
                    letterSpacing: 1,
                  }}
                >
                  GT2026-179161
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 'fit-content',
                    fontSize: 9,
                    background: 'rgba(0,176,80,0.15)',
                    border: '1px solid var(--k-green)',
                    color: 'var(--k-green)',
                    padding: '2px 6px',
                    borderRadius: 2,
                    fontFamily: 'var(--k-font-tech)',
                    letterSpacing: 1,
                  }}
                >
                  BRAEBURN ENERGY
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Asset Life & Fleet Card — shown if asset_life module is enabled */}
        {isModuleEnabled('asset_life') && (
          <div
            style={{
              background: 'var(--k-bg-card)',
              border: '1px solid var(--k-border)',
              borderRadius: 4,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--k-mid), transparent)' }} />
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--k-border)' }}>
              <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '2px', color: 'var(--k-soft)' }}>
                ◈ ASSET LIFE & FLEET
              </div>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', letterSpacing: '1px' }}>
                FLEET ANALYTICS MODULE
              </div>
              {[
                { title: 'RUL PREDICTION', color: 'var(--k-mid)', desc: 'Remaining useful life · degradation modelling · predictive maintenance' },
                { title: 'FLEET BENCHMARKING', color: 'var(--k-soft)', desc: 'Cross-asset performance · availability · OEM comparison' },
                { title: 'IBM MAXIMO', color: 'var(--k-base)', desc: 'Auto work-order creation · maintenance scheduling · CMMS sync' },
              ].map((item, i) => (
                <div key={i} style={{ border: '1px solid var(--k-border)', borderRadius: 3, padding: '8px 10px' }}>
                  <div style={{ fontFamily: 'var(--k-font-display)', fontSize: 13, fontWeight: 700, color: item.color, letterSpacing: 1 }}>
                    {item.title}
                  </div>
                  <div style={{ fontFamily: 'var(--k-font-main)', fontSize: 11, color: 'var(--k-text-secondary)', marginTop: 2 }}>
                    {item.desc}
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
