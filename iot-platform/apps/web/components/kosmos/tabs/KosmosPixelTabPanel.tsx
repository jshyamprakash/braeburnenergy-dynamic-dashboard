'use client';

import { useRef, useState, useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _rgl = require('react-grid-layout');
const GridLayout = (_rgl.default ?? _rgl) as any;
const getCompactor = _rgl.getCompactor as Function;
// noCompactor (free positioning) + preventCollision (cap resize/drag at neighbour)
const COMPACTOR = getCompactor(null, false, true);

import type { KosmosPage, KosmosWidgetType } from '../types';
import { RenderWidget } from '../widgets';

const COL = 48;
const ROW_H = 20;

export type WidgetLimitMap = Record<KosmosWidgetType, { minW: number; minH: number }>;

interface Props {
  page: KosmosPage;
  editMode: boolean;
  layoutLocked?: boolean;
  widgetLimits: WidgetLimitMap;
  onLayoutChange?: (
    pageId: string,
    layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>
  ) => void;
  onRemoveWidget?: (widgetId: string) => void;
  onDrop?: (widgetType: string) => void;
  onConfigChange?: () => void;
  onSelect?: (widgetId: string | null) => void;
  selectedWidgetId?: string | null;
}

export function KosmosPixelTabPanel({
  page,
  editMode,
  layoutLocked,
  widgetLimits,
  onLayoutChange = () => {},
  onRemoveWidget = () => {},
  onDrop,
  onConfigChange,
  onSelect,
  selectedWidgetId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const layouts = page.widgets.map((w) => {
    const lim = widgetLimits[w.type];
    return {
      i: w.id,
      x: w.layout.x,
      y: w.layout.y,
      w: w.layout.w,
      h: w.layout.h,
      minW: lim.minW,
      minH: lim.minH,
    };
  });

  function handleLayoutChange(newLayouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) {
    onLayoutChange(
      page.id,
      newLayouts.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-auto bg-gray-950"
      onDragOver={(e) => {
        if (!editMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const widgetType = e.dataTransfer.getData('application/kosmos-widget');
        if (widgetType && onDrop) onDrop(widgetType);
      }}
      style={{
        position: 'relative',
        outline: isOver ? '2px dashed var(--k-soft)' : undefined,
        outlineOffset: isOver ? -2 : undefined,
      }}
    >
      <GridLayout
        className="layout"
        layout={layouts}
        width={containerWidth}
        gridConfig={{ cols: COL, rowHeight: ROW_H, margin: [8, 8], containerPadding: [8, 8] }}
        dragConfig={{ enabled: editMode && !layoutLocked, cancel: 'button, input, select, textarea, .react-resizable-handle' }}
        resizeConfig={{ enabled: editMode && !layoutLocked }}
        compactor={COMPACTOR}
        onLayoutChange={handleLayoutChange}
        style={{ minHeight: '100%' }}
      >
        {page.widgets.map((widget) => {
          const isSelected = selectedWidgetId === widget.id;
          return (
            <div
              key={widget.id}
              style={{
                background: 'var(--k-bg-card)',
                border: isSelected
                  ? '2px solid var(--k-green)'
                  : '1px solid var(--k-border)',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {editMode && (
                <div
                  className="k-drag-handle"
                  style={{
                    height: 6,
                    width: '100%',
                    cursor: 'grab',
                    background: 'linear-gradient(90deg, transparent, var(--k-border-bright), transparent)',
                    borderRadius: '2px 2px 0 0',
                    flexShrink: 0,
                  }}
                />
              )}
              {editMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(widget.id === selectedWidgetId ? null : widget.id);
                  }}
                  title="Configure widget"
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    zIndex: 10,
                    background: isSelected ? 'rgba(0,176,80,0.18)' : 'rgba(255,255,255,0.06)',
                    border: isSelected ? '1px solid var(--k-green)' : '1px solid var(--k-border)',
                    borderRadius: 2,
                    color: isSelected ? 'var(--k-green)' : 'var(--k-text-dim)',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '2px 5px',
                    lineHeight: 1,
                  }}
                >
                  ⚙
                </button>
              )}
              <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                <RenderWidget widget={widget} editMode={editMode} pageId={page.id} onConfigChange={onConfigChange} />
              </div>
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
