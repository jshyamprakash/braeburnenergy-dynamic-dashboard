'use client';

interface ArchDiagramProps {
  config: {
    title?: string;
  };
}

const LAYERS = [
  {
    label: 'Physical Layer',
    blocks: [
      { name: 'Gas Turbine (GE / Siemens / MHI)', type: 'sensor' },
      { name: 'Balance of Plant', type: 'sensor' },
    ],
  },
  {
    label: 'BE Sense™',
    blocks: [
      { name: 'Multimodal Sensor Fusion', type: 'fusion' },
      { name: 'CalorieSense™ Edge', type: 'fusion' },
    ],
    arrowBefore: '⇄',
  },
  {
    label: 'BE Agent™',
    blocks: [
      { name: 'Agentic AI Framework', type: 'agent' },
      { name: 'CD Precursor Detection', type: 'agent' },
    ],
    arrowBefore: '→',
  },
  {
    label: 'Cloud / On-Prem',
    blocks: [
      { name: 'Fleet Analytics', type: 'cloud' },
      { name: 'Asset Life Management', type: 'cloud' },
    ],
    arrowBefore: '⇄',
  },
  {
    label: 'Outputs',
    blocks: [
      { name: 'CMMS Integration', type: 'output' },
      { name: 'Operator Dashboard', type: 'output' },
    ],
    arrowBefore: '→',
  },
];

const BLOCK_STYLES: Record<string, React.CSSProperties> = {
  sensor: {
    background: 'rgba(13,60,122,0.6)',
    border: '1px solid var(--k-mid)',
    color: 'var(--k-pale)',
  },
  fusion: {
    background: 'rgba(21,96,189,0.3)',
    border: '1px solid var(--k-soft)',
    color: 'var(--k-ultra-light)',
  },
  agent: {
    background: 'rgba(0,176,80,0.15)',
    border: '1px solid var(--k-green)',
    color: 'var(--k-green)',
    boxShadow: '0 0 12px rgba(0,176,80,0.2)',
  },
  cloud: {
    background: 'rgba(60,140,211,0.2)',
    border: '1px solid var(--k-mid)',
    color: 'var(--k-soft)',
  },
  output: {
    background: 'rgba(13,60,122,0.4)',
    border: '1px solid var(--k-base)',
    color: 'var(--k-pale)',
  },
};

export function ArchDiagram({ config }: ArchDiagramProps) {
  const { title = 'DATA FLOW — KOSMOS PLATFORM ARCHITECTURE' } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
      <div className="k-section-heading">{title}</div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          justifyContent: 'center',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {LAYERS.map((layer, li) => (
          <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 0, flex: li === 0 ? '1 1 0' : undefined }}>
            {layer.arrowBefore && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--k-mid)',
                  fontSize: 18,
                  padding: '0 4px',
                  flexShrink: 0,
                  userSelect: 'none',
                }}
              >
                {layer.arrowBefore}
              </div>
            )}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '0 6px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--k-font-tech)',
                  fontSize: 9,
                  color: 'var(--k-text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {layer.label}
              </div>
              {layer.blocks.map((block, bi) => (
                <div
                  key={bi}
                  style={{
                    width: '100%',
                    padding: '8px 6px',
                    borderRadius: 4,
                    fontFamily: 'var(--k-font-display)',
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.25s, filter 0.25s',
                    wordBreak: 'break-word',
                    lineHeight: 1.3,
                    ...BLOCK_STYLES[block.type],
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.filter = 'brightness(1.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.filter = 'brightness(1)';
                  }}
                >
                  {block.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
