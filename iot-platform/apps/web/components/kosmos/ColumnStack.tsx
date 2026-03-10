'use client';

import { useRef, useState, useCallback } from 'react';
import type { KosmosWidget } from './types';

/** @deprecated Replaced by UnifiedCanvas (ADR-044). Kept for reference only. */
type KosmosColumn = 'left' | 'middle' | 'right';
import { RenderWidget } from './widgets/index';

interface ColumnStackProps {
  column: KosmosColumn;
  widgets: KosmosWidget[];
  editMode: boolean;
  onDrop: (column: KosmosColumn, widgetType: string) => void;
  onRemove: (widgetId: string) => void;
  onReorder: (widgetIds: string[]) => void;
  onResizeHeight: (widgetId: string, height: number) => void;
}

interface DragState {
  draggingId: string | null;
  overId: string | null;
}

/**
 * ColumnStack — vertical stack of Kosmos widgets for left/right columns.
 * Supports:
 * - Drop from WidgetPalette (HTML5 drag)
 * - Reorder via drag-handle
 * - Height resize via bottom drag-handle
 * - Remove in edit mode
 */
export function ColumnStack({ column, widgets, editMode, onDrop, onRemove, onReorder, onResizeHeight }: ColumnStackProps) {
  const [isOver, setIsOver] = useState(false);
  const [drag, setDrag] = useState<DragState>({ draggingId: null, overId: null });
  const resizeRef = useRef<{ id: string; startY: number; startH: number } | null>(null);

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
    if (widgetType) {
      onDrop(column, widgetType);
    }
  };

  /* ── Widget reorder drag ── */
  const handleItemDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/kosmos-reorder', id);
    setDrag((d) => ({ ...d, draggingId: id }));
  };
  const handleItemDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (drag.draggingId && drag.draggingId !== id) {
      setDrag((d) => ({ ...d, overId: id }));
    }
  };
  const handleItemDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('application/kosmos-reorder');
    if (sourceId && sourceId !== targetId) {
      const ids = widgets.map((w) => w.id);
      const fromIdx = ids.indexOf(sourceId);
      const toIdx = ids.indexOf(targetId);
      const reordered = [...ids];
      reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, sourceId);
      onReorder(reordered);
    }
    setDrag({ draggingId: null, overId: null });
  };
  const handleItemDragEnd = () => setDrag({ draggingId: null, overId: null });

  /* ── Height resize ── */
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, widget: KosmosWidget) => {
      e.preventDefault();
      resizeRef.current = { id: widget.id, startY: e.clientY, startH: (widget as any).height ?? 200 };

      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const delta = ev.clientY - resizeRef.current.startY;
        const newH = Math.max(80, resizeRef.current.startH + delta);
        onResizeHeight(resizeRef.current.id, newH);
      };

      const onUp = () => {
        resizeRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [onResizeHeight]
  );

  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px 8px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderRight: column === 'left' ? '1px solid var(--k-border)' : 'none',
        borderLeft: column === 'right' ? '1px solid var(--k-border)' : 'none',
        background: isOver && editMode ? 'rgba(0,176,80,0.03)' : 'transparent',
        transition: 'background 0.15s',
      }}
      onDragOver={editMode ? handleDragOver : undefined}
      onDragLeave={editMode ? handleDragLeave : undefined}
      onDrop={editMode ? handleDrop : undefined}
    >
      {widgets.map((widget) => {
        const isBeingDragged = drag.draggingId === widget.id;
        const isDropTarget = drag.overId === widget.id;

        return (
          <div
            key={widget.id}
            draggable={editMode}
            onDragStart={editMode ? (e) => handleItemDragStart(e, widget.id) : undefined}
            onDragOver={editMode ? (e) => handleItemDragOver(e, widget.id) : undefined}
            onDrop={editMode ? (e) => handleItemDrop(e, widget.id) : undefined}
            onDragEnd={editMode ? handleItemDragEnd : undefined}
            style={{
              position: 'relative',
              height: (widget as any).height ?? 200,
              flexShrink: 0,
              opacity: isBeingDragged ? 0.4 : 1,
              borderRadius: 4,
              border: isDropTarget
                ? '2px dashed var(--k-green)'
                : '1px solid var(--k-border)',
              background: 'var(--k-bg-card)',
              overflow: 'hidden',
              transition: 'opacity 0.15s, border-color 0.15s',
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
                background: 'linear-gradient(90deg, transparent, var(--k-base), transparent)',
                zIndex: 2,
              }}
            />

            {/* Edit mode controls */}
            {editMode && (
              <>
                {/* Drag handle */}
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    zIndex: 10,
                    cursor: 'grab',
                    color: 'var(--k-text-dim)',
                    fontSize: 14,
                    lineHeight: 1,
                    userSelect: 'none',
                    padding: '2px 4px',
                  }}
                  title="Drag to reorder"
                >
                  ⠿
                </div>
                {/* Remove button */}
                <button
                  onClick={() => onRemove(widget.id)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    zIndex: 10,
                    background: 'rgba(255,58,58,0.15)',
                    border: '1px solid rgba(255,58,58,0.4)',
                    borderRadius: 2,
                    color: 'var(--k-red)',
                    cursor: 'pointer',
                    fontSize: 10,
                    lineHeight: 1,
                    padding: '2px 5px',
                    fontFamily: 'var(--k-font-tech)',
                  }}
                >
                  ✕
                </button>
              </>
            )}

            {/* Widget content */}
            <div style={{ padding: '10px 10px', height: '100%', overflow: 'hidden' }}>
              <RenderWidget widget={widget} editMode={editMode} />
            </div>

            {/* Resize handle */}
            {editMode && (
              <div
                onMouseDown={(e) => handleResizeMouseDown(e, widget)}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 8,
                  cursor: 'ns-resize',
                  background: 'rgba(21,96,189,0.2)',
                  borderTop: '1px solid var(--k-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 5,
                }}
              >
                <div style={{ width: 24, height: 2, background: 'var(--k-text-dim)', borderRadius: 1 }} />
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state drop hint */}
      {widgets.length === 0 && editMode && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            border: '1px dashed var(--k-border)',
            borderRadius: 4,
            minHeight: 120,
          }}
        >
          <div style={{ fontSize: 24, color: 'var(--k-text-dim)' }}>+</div>
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', letterSpacing: 1, textAlign: 'center' }}>
            DRAG WIDGETS HERE
          </div>
        </div>
      )}
    </div>
  );
}
