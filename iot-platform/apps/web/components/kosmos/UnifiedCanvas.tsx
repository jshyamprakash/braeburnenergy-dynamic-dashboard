'use client';

import { useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _rgl = require('react-grid-layout');
const GridLayout = (_rgl.default ?? _rgl) as any;
import type { KosmosWidget } from './types';
import { RenderWidget } from './widgets/index';

interface UnifiedCanvasProps {
  widgets: KosmosWidget[];
  editMode: boolean;
  onDrop: (widgetType: string) => void;
  onRemove: (widgetId: string) => void;
  onLayoutChange: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  onSelect?: (widgetId: string | null) => void;
  selectedWidgetId?: string | null;
}

const COL = 12;
const ROW_H = 80;

/**
 * UnifiedCanvas — full-width free-canvas for all widgets on a page (ADR-044).
 * Replaces the split ColumnStack + MiddleCanvas approach.
 * All 13+ widget types draggable and resizable anywhere on the canvas.
 */
export function UnifiedCanvas({
  widgets,
  editMode,
  onDrop,
  onRemove,
  onLayoutChange,
  onSelect,
  selectedWidgetId,
}: UnifiedCanvasProps) {
  const [isOver, setIsOver] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);

  const measureRef = (el: HTMLDivElement | null) => {
    if (el) {
      const obs = new ResizeObserver(([entry]) => {
        setContainerWidth(entry.contentRect.width);
      });
      obs.observe(el);
      setContainerWidth(el.clientWidth);
    }
  };

  /* ── Palette drop ── */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsOver(true);
  };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const widgetType = e.dataTransfer.getData('application/kosmos-widget');
    if (widgetType) onDrop(widgetType);
  };

  const layouts = widgets.map((w) => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: 2,
    minH: 1,
  }));

  return (
    <div
      ref={measureRef}
      style={{
        flex: 1,
        height: '100%',
        overflow: 'auto',
        position: 'relative',
        background: isOver && editMode ? 'rgba(0,176,80,0.02)' : 'transparent',
        transition: 'background 0.15s',
      }}
      onDragOver={editMode ? handleDragOver : undefined}
      onDragLeave={editMode ? handleDragLeave : undefined}
      onDrop={editMode ? handleDrop : undefined}
    >
      {/* Empty canvas hint */}
      {widgets.length === 0 && editMode && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            border: '1px dashed var(--k-border)',
            margin: 16,
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 32, color: 'var(--k-text-dim)' }}>+</div>
          <div
            style={{
              fontFamily: 'var(--k-font-tech)',
              fontSize: 11,
              color: 'var(--k-text-dim)',
              letterSpacing: 2,
              textAlign: 'center',
            }}
          >
            DRAG WIDGETS FROM PALETTE ONTO CANVAS
          </div>
        </div>
      )}

      <GridLayout
        className="layout"
        layout={layouts}
        cols={COL}
        rowHeight={ROW_H}
        width={containerWidth}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={onLayoutChange}
        margin={[8, 8]}
        containerPadding={[8, 8]}
        style={{ minHeight: '100%' }}
      >
        {widgets.map((widget) => {
          const isSelected = selectedWidgetId === widget.id;
          return (
            <div
              key={widget.id}
              onClick={() => editMode && onSelect?.(isSelected ? null : widget.id)}
              style={{
                background: 'var(--k-bg-card)',
                border: isSelected
                  ? '1px solid var(--k-green)'
                  : '1px solid var(--k-border)',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                cursor: editMode ? 'pointer' : 'default',
                boxShadow: isSelected ? '0 0 14px rgba(0,176,80,0.25)' : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            >
              {/* Top accent line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: isSelected
                    ? 'linear-gradient(90deg, transparent, var(--k-green), transparent)'
                    : 'linear-gradient(90deg, transparent, var(--k-base), transparent)',
                  zIndex: 2,
                }}
              />

              {/* Remove button */}
              {editMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(widget.id);
                    onSelect?.(null);
                  }}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    zIndex: 10,
                    background: 'rgba(255,58,58,0.15)',
                    border: '1px solid rgba(255,58,58,0.4)',
                    borderRadius: 2,
                    color: 'var(--k-red)',
                    cursor: 'pointer',
                    fontSize: 10,
                    padding: '2px 5px',
                    fontFamily: 'var(--k-font-tech)',
                  }}
                >
                  ✕
                </button>
              )}

              {/* Widget content */}
              <div style={{ padding: '10px 10px', height: '100%', overflow: 'hidden' }}>
                <RenderWidget widget={widget} editMode={editMode} />
              </div>
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
