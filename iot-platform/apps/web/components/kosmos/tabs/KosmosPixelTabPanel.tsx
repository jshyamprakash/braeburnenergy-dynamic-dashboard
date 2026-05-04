'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';

import type { KosmosPage, KosmosWidgetType } from '../types';
import { RenderWidget } from '../widgets';

const GAP = 16;
const VERTICAL_BUFFER = 480;

export type WidgetLimitMap = Record<KosmosWidgetType, { minW: number; maxW: number; minH: number; maxH: number }>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function snap(value: number) {
  return Math.round(value / GAP) * GAP;
}

function overlapsWithGap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return !(
    a.x + a.w + GAP <= b.x ||
    b.x + b.w + GAP <= a.x ||
    a.y + a.h + GAP <= b.y ||
    b.y + b.h + GAP <= a.y
  );
}

function normalizeWidgetsInCanvas(page: KosmosPage, width: number, height: number, widgetLimits: WidgetLimitMap) {
  const canvasWidth = Math.max(320, width);
  const canvasHeight = Math.max(240, height);

  return page.widgets.map((widget) => {
    const limits = widgetLimits[widget.type];
    const dynamicMaxWidth = Math.max(limits.minW, Math.min(limits.maxW, canvasWidth - GAP * 2));
    const dynamicMaxHeight = Math.max(limits.minH, Math.min(limits.maxH, canvasHeight - GAP * 2));
    const w = clamp(widget.layout.w, limits.minW, dynamicMaxWidth);
    const h = clamp(widget.layout.h, limits.minH, dynamicMaxHeight);
    const x = clamp(snap(widget.layout.x), GAP, Math.max(GAP, canvasWidth - GAP - w));
    const y = clamp(snap(widget.layout.y), GAP, Math.max(GAP, canvasHeight - GAP - h));

    return {
      ...widget,
      layout: { x, y, w, h },
    };
  });
}

function hybridPackWidgets(widgets: ReturnType<typeof normalizeWidgetsInCanvas>, canvasWidth: number) {
  const placed: typeof widgets = [];
  const maxX = Math.max(320, canvasWidth) - GAP;

  const sorted = [...widgets].sort((a, b) => {
    if (a.layout.y !== b.layout.y) return a.layout.y - b.layout.y;
    return a.layout.x - b.layout.x;
  });

  for (const widget of sorted) {
    let next = {
      ...widget,
      layout: {
        ...widget.layout,
        x: snap(widget.layout.x),
        y: snap(widget.layout.y),
      },
    };

    let guard = 0;
    while (guard < 200) {
      const blocking = placed.find((prev) => overlapsWithGap(next.layout, prev.layout));
      if (!blocking) break;

      let pushedX = snap(blocking.layout.x + blocking.layout.w + GAP);
      let pushedY = next.layout.y;

      if (pushedX + next.layout.w > maxX) {
        pushedX = GAP;
        pushedY = snap(next.layout.y + GAP);
      }

      next = {
        ...next,
        layout: {
          ...next.layout,
          x: pushedX,
          y: pushedY,
        },
      };
      guard += 1;
    }

    placed.push(next);
  }

  return placed;
}

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
  onSelect?: (widgetId: string) => void;
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
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 760 });
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const contentHeight = Math.max(
    viewportSize.height,
    (page.widgets.length ? Math.max(...page.widgets.map((widget) => widget.layout.y + widget.layout.h)) : 0) + VERTICAL_BUFFER
  );

  const normalized = normalizeWidgetsInCanvas(page, viewportSize.width, contentHeight, widgetLimits);

  const applyWidgetLayout = (
    widgetId: string,
    nextLayout: { x: number; y: number; w: number; h: number },
    options?: { reflow?: boolean }
  ) => {
    const nextPage = {
      ...page,
      widgets: normalized.map((widget) => (widget.id === widgetId ? { ...widget, layout: nextLayout } : widget)),
    };

    const nextContentHeight = Math.max(
      viewportSize.height,
      (nextPage.widgets.length ? Math.max(...nextPage.widgets.map((widget) => widget.layout.y + widget.layout.h)) : 0) + VERTICAL_BUFFER
    );
    const normalizedWidgets = normalizeWidgetsInCanvas(nextPage, viewportSize.width, nextContentHeight, widgetLimits);
    const nextNormalized = options?.reflow ? hybridPackWidgets(normalizedWidgets, viewportSize.width) : normalizedWidgets;
    onLayoutChange(
      page.id,
      nextNormalized.map((widget) => ({
        i: widget.id,
        x: widget.layout.x,
        y: widget.layout.y,
        w: widget.layout.w,
        h: widget.layout.h,
      }))
    );
  };

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
      <div style={{ position: 'relative', width: '100%', minHeight: contentHeight }}>
        {normalized.map((widget) => {
          const limits = widgetLimits[widget.type];
          const maxWidth = Math.max(limits.minW, Math.min(limits.maxW, viewportSize.width - GAP * 2));
          const maxHeight = Math.max(limits.minH, Math.min(limits.maxH, contentHeight - GAP * 2));
          return (
            <Rnd
              key={widget.id}
              bounds="parent"
              size={{ width: widget.layout.w, height: widget.layout.h }}
              position={{ x: widget.layout.x, y: widget.layout.y }}
              minWidth={limits.minW}
              maxWidth={maxWidth}
              minHeight={limits.minH}
              maxHeight={maxHeight}
              disableDragging={!editMode || !!layoutLocked}
              enableResizing={editMode && !layoutLocked}
              cancel=".k-widget-action"
              onDrag={(_, data) => {
                applyWidgetLayout(widget.id, {
                  x: data.x,
                  y: data.y,
                  w: widget.layout.w,
                  h: widget.layout.h,
                });
              }}
              onDragStop={(_, data) => {
                applyWidgetLayout(widget.id, {
                  x: data.x,
                  y: data.y,
                  w: widget.layout.w,
                  h: widget.layout.h,
                }, { reflow: true });
              }}
              onResize={(_, __, ref, ___, position) => {
                applyWidgetLayout(widget.id, {
                  x: position.x,
                  y: position.y,
                  w: ref.offsetWidth,
                  h: ref.offsetHeight,
                });
              }}
              onResizeStop={(_, __, ref, ___, position) => {
                applyWidgetLayout(widget.id, {
                  x: position.x,
                  y: position.y,
                  w: ref.offsetWidth,
                  h: ref.offsetHeight,
                }, { reflow: true });
              }}
              style={{ zIndex: 5 }}
            >
              <div
                onClick={(e) => {
                  if (!editMode || !layoutLocked) return;
                  e.stopPropagation();
                  onSelect?.(widget.id);
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'var(--k-bg-card)',
                  border: widget.id === selectedWidgetId
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
                      onRemoveWidget(widget.id);
                    }}
                    className="k-widget-action"
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
                    X
                  </button>
                )}
                <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                  <RenderWidget widget={widget} editMode={editMode} pageId={page.id} onConfigChange={onConfigChange} />
                </div>
              </div>
            </Rnd>
          );
        })}
      </div>
    </div>
  );
}
