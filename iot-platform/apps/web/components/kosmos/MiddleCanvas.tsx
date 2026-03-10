'use client';

import { useRef, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _rgl = require('react-grid-layout');
const GridLayout = (_rgl.default ?? _rgl) as any;
import type { KosmosWidget } from './types';
import { RenderWidget } from './widgets/index';

interface Layout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  static?: boolean;
}

interface MiddleCanvasProps {
  widgets: KosmosWidget[];
  editMode: boolean;
  onDrop: (column: 'middle', widgetType: string) => void;
  onRemove: (widgetId: string) => void;
  onLayoutChange: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
}

const COL = 12;
const ROW_H = 80;

/**
 * MiddleCanvas — free-position canvas for the middle column.
 * Uses react-grid-layout for drag-to-place and resize.
 * Accepts widget drops from WidgetPalette via HTML5 drag API.
 */
export function MiddleCanvas({ widgets, editMode, onDrop, onRemove, onLayoutChange }: MiddleCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);

  // Measure container width
  const measureRef = (el: HTMLDivElement | null) => {
    if (el) {
      const obs = new ResizeObserver(([entry]) => {
        setContainerWidth(entry.contentRect.width);
      });
      obs.observe(el);
      (containerRef as any).current = el;
      setContainerWidth(el.clientWidth);
    }
  };

  /* ── Palette drop into middle ── */
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
    if (widgetType) {
      onDrop('middle', widgetType);
    }
  };

  const layouts: Layout[] = widgets.map((w) => ({
    i: w.id,
    x: w.layout?.x ?? 0,
    y: w.layout?.y ?? 0,
    w: w.layout?.w ?? 6,
    h: w.layout?.h ?? 3,
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
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 11, color: 'var(--k-text-dim)', letterSpacing: 2, textAlign: 'center' }}>
            DRAG WIDGETS FROM PALETTE INTO CANVAS
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
        {widgets.map((widget) => (
          <div
            key={widget.id}
            style={{
              background: 'var(--k-bg-card)',
              border: '1px solid var(--k-border)',
              borderRadius: 4,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Top accent */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, transparent, var(--k-base), transparent)',
                zIndex: 2,
              }}
            />

            {/* Remove button in edit mode */}
            {editMode && (
              <button
                className="react-grid-item-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(widget.id);
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

            {/* Content */}
            <div style={{ padding: '10px 10px', height: '100%', overflow: 'hidden' }}>
              <RenderWidget widget={widget} editMode={editMode} />
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
