'use client';

import type { KosmosPage } from './types';
import { PALETTE_ENTRIES } from './types';

interface WidgetPaletteProps {
  onClose: () => void;
  activeMandatoryType?: KosmosPage['mandatoryType'];
}

/**
 * WidgetPalette — left-edge drawer listing all draggable widget types (ADR-044).
 * All 17 widget types draggable to any position on the UnifiedCanvas.
 * Column badges removed — no column concept in the new unified layout.
 */
export function WidgetPalette({ onClose, activeMandatoryType }: WidgetPaletteProps) {
  const handleDragStart = (e: React.DragEvent, widgetType: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/kosmos-widget', widgetType);
  };

  const visibleEntries = PALETTE_ENTRIES.filter((entry) => {
    if (!entry.tabScope || entry.tabScope === 'any') return true;
    if (activeMandatoryType === 'overview') return entry.tabScope === 'overview';
    if (activeMandatoryType === 'combustionDl') return entry.tabScope === 'combustionDl';
    return false;
  });

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 98, // below header+tabs
        bottom: 28, // above footer
        width: 200,
        zIndex: 50,
        background: 'var(--k-bg-panel)',
        borderRight: '1px solid var(--k-border-bright)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 20px rgba(0,0,0,0.4)',
      }}
    >
      {/* Palette header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--k-border)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--k-font-display)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'var(--k-soft)',
          }}
        >
          Widgets
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--k-text-dim)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '2px 4px',
          }}
          title="Close palette"
        >
          ✕
        </button>
      </div>

      {/* Palette hint */}
      <div
        style={{
          padding: '6px 12px',
          fontFamily: 'var(--k-font-tech)',
          fontSize: 9,
          color: 'var(--k-text-dim)',
          letterSpacing: 1,
          borderBottom: '1px solid var(--k-border)',
          lineHeight: 1.6,
        }}
      >
        DRAG ANYWHERE ON CANVAS
      </div>

      {/* Widget list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {visibleEntries.map((entry) => (
          <div
            key={entry.type}
            draggable
            onDragStart={(e) => handleDragStart(e, entry.type)}
            className="k-palette-item"
            title={entry.description}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span
                style={{
                  fontFamily: 'var(--k-font-tech)',
                  fontSize: 14,
                  color: 'var(--k-soft)',
                  flexShrink: 0,
                  width: 18,
                  textAlign: 'center',
                }}
              >
                {entry.icon}
              </span>
              <span
                style={{
                  fontFamily: 'var(--k-font-display)',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 1,
                  color: 'var(--k-pale)',
                }}
              >
                {entry.label}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--k-font-main)',
                fontSize: 10,
                color: 'var(--k-text-dim)',
                paddingLeft: 26,
                lineHeight: 1.4,
              }}
            >
              {entry.description}
            </div>
          </div>
        ))}
        {visibleEntries.length === 0 && (
          <div
            style={{
              padding: 12,
              fontFamily: 'var(--k-font-tech)',
              fontSize: 10,
              color: 'var(--k-text-dim)',
              lineHeight: 1.6,
            }}
          >
            No widgets available for this tab.
          </div>
        )}
      </div>
    </div>
  );
}
