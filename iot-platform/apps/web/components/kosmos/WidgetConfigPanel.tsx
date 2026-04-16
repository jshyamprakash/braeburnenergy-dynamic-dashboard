'use client';

import { useState } from 'react';
import { useAppDispatch } from '@/lib/store';
import { updateKosmosWidgetConfig } from '@/lib/store/slices/dashboardSlice';
import type { KosmosWidget, DataFlowLayerConfig, DataFlowBlockConfig } from './types';
import { PALETTE_ENTRIES } from './types';
import { useDevices, useDevice } from '@/lib/hooks/useDevices';

interface WidgetConfigPanelProps {
  pageId: string;
  widget: KosmosWidget;
  applicationId?: string;
  onClose: () => void;
  onConfigChange?: () => void;
}

const CHART_WIDGET_TYPES = new Set([
  'overviewRealtimeChart',
  'combustionDlPressureSignal',
  'combustionDlAnomalyTrend',
  'combustionDlFrequencySpectrum',
  'combustionDlFeatureMatrix',
]);

// Widget types that need a device selector for deviceId but NOT a fieldName selector
const BE_AGENT_DEVICE_WIDGETS = new Set([
  'overviewBeAgentStatus',
]);

// Metric widgets with deviceId + fieldName config
const METRIC_WIDGET_TYPES = new Set([
  'overviewAnomalyMetric',
  'overviewLoadMetric',
  'overviewEgtMetric',
]);

// BeSense widget needs device selector
const BESENSE_WIDGET_TYPES = new Set([
  'overviewBeSense',
]);

/** Data Flow widget nested layers/blocks editor */
function DataFlowConfigEditor({
  initialLayers,
  onSave,
  inputStyle,
  keyLabelStyle,
}: {
  initialLayers: DataFlowLayerConfig[];
  onSave: (layers: DataFlowLayerConfig[]) => void;
  inputStyle: React.CSSProperties;
  keyLabelStyle: React.CSSProperties;
}) {
  const [layers, setLayers] = useState<DataFlowLayerConfig[]>(initialLayers);

  const updateState = (newLayers: DataFlowLayerConfig[]) => {
    setLayers(newLayers);
    onSave(newLayers);
  };

  const rand = () => Math.random().toString(36).slice(2, 10);

  const addLayer = () => {
    updateState([
      ...layers,
      { id: `layer_${rand()}`, label: 'New Layer', blocks: [], arrowAfter: 'forward' },
    ]);
  };

  const removeLayer = (li: number) => {
    updateState(layers.filter((_, i) => i !== li));
  };

  const moveLayer = (li: number, direction: -1 | 1) => {
    const newLayers = [...layers];
    const targetIdx = li + direction;
    if (targetIdx >= 0 && targetIdx < newLayers.length) {
      [newLayers[li], newLayers[targetIdx]] = [newLayers[targetIdx], newLayers[li]];
      updateState(newLayers);
    }
  };

  const updateLayerField = (li: number, field: 'label' | 'arrowAfter', value: string) => {
    updateState(
      layers.map((l, i) =>
        i === li ? { ...l, [field]: value } : l
      )
    );
  };

  const addBlock = (li: number) => {
    updateState(
      layers.map((l, i) =>
        i === li
          ? {
              ...l,
              blocks: [...l.blocks, { id: `block_${rand()}`, label: 'New Block', color: 'sensor' as const }],
            }
          : l
      )
    );
  };

  const removeBlock = (li: number, bi: number) => {
    updateState(
      layers.map((l, i) =>
        i === li ? { ...l, blocks: l.blocks.filter((_, j) => j !== bi) } : l
      )
    );
  };

  const moveBlock = (li: number, bi: number, direction: -1 | 1) => {
    updateState(
      layers.map((l, i) => {
        if (i !== li) return l;
        const blocks = [...l.blocks];
        const targetIdx = bi + direction;
        if (targetIdx >= 0 && targetIdx < blocks.length) {
          [blocks[bi], blocks[targetIdx]] = [blocks[targetIdx], blocks[bi]];
        }
        return { ...l, blocks };
      })
    );
  };

  const updateBlockField = (li: number, bi: number, field: 'label' | 'color', value: string) => {
    updateState(
      layers.map((l, i) =>
        i === li
          ? {
              ...l,
              blocks: l.blocks.map((b, j) =>
                j === bi ? { ...b, [field]: value } : b
              ),
            }
          : l
      )
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {layers.map((layer, li) => (
        <div key={layer.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Layer row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => moveLayer(li, -1)}
              disabled={li === 0}
              style={{
                padding: '2px 6px',
                background: 'none',
                border: 'none',
                color: li === 0 ? 'var(--k-text-dim)' : 'var(--k-green)',
                cursor: li === 0 ? 'default' : 'pointer',
                fontSize: 12,
              }}
            >
              ↑
            </button>
            <button
              onClick={() => moveLayer(li, 1)}
              disabled={li === layers.length - 1}
              style={{
                padding: '2px 6px',
                background: 'none',
                border: 'none',
                color: li === layers.length - 1 ? 'var(--k-text-dim)' : 'var(--k-green)',
                cursor: li === layers.length - 1 ? 'default' : 'pointer',
                fontSize: 12,
              }}
            >
              ↓
            </button>
            <input
              type="text"
              value={layer.label}
              onChange={(e) => updateLayerField(li, 'label', e.target.value)}
              placeholder="Layer label"
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={layer.arrowAfter}
              onChange={(e) => updateLayerField(li, 'arrowAfter', e.target.value)}
              style={{ ...inputStyle, flex: 0.5 }}
            >
              <option value="forward">→</option>
              <option value="backward">←</option>
              <option value="bidirectional">⇄</option>
              <option value="none">none</option>
            </select>
            <button
              onClick={() => removeLayer(li)}
              style={{
                padding: '2px 6px',
                background: 'none',
                border: 'none',
                color: 'var(--k-red)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              ✕
            </button>
          </div>

          {/* Blocks for this layer */}
          <div style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {layer.blocks.map((block, bi) => (
              <div key={block.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => moveBlock(li, bi, -1)}
                  disabled={bi === 0}
                  style={{
                    padding: '2px 4px',
                    background: 'none',
                    border: 'none',
                    color: bi === 0 ? 'var(--k-text-dim)' : 'var(--k-green)',
                    cursor: bi === 0 ? 'default' : 'pointer',
                    fontSize: 11,
                  }}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveBlock(li, bi, 1)}
                  disabled={bi === layer.blocks.length - 1}
                  style={{
                    padding: '2px 4px',
                    background: 'none',
                    border: 'none',
                    color: bi === layer.blocks.length - 1 ? 'var(--k-text-dim)' : 'var(--k-green)',
                    cursor: bi === layer.blocks.length - 1 ? 'default' : 'pointer',
                    fontSize: 11,
                  }}
                >
                  ↓
                </button>
                <input
                  type="text"
                  value={block.label}
                  onChange={(e) => updateBlockField(li, bi, 'label', e.target.value)}
                  placeholder="Block label"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <select
                  value={block.color}
                  onChange={(e) => updateBlockField(li, bi, 'color', e.target.value)}
                  style={{ ...inputStyle, flex: 0.6 }}
                >
                  <option value="sensor">sensor</option>
                  <option value="fusion">fusion</option>
                  <option value="agent">agent</option>
                  <option value="cloud">cloud</option>
                  <option value="output">output</option>
                </select>
                <button
                  onClick={() => removeBlock(li, bi)}
                  style={{
                    padding: '2px 4px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--k-red)',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => addBlock(li)}
              style={{
                padding: '3px 8px',
                background: 'none',
                border: '1px solid var(--k-green)',
                color: 'var(--k-green)',
                cursor: 'pointer',
                fontSize: 9,
                marginTop: 2,
              }}
            >
              + block
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addLayer}
        style={{
          padding: '4px 10px',
          background: 'none',
          border: '1px solid var(--k-soft)',
          color: 'var(--k-soft)',
          cursor: 'pointer',
          fontSize: 10,
          marginTop: 4,
        }}
      >
        + layer
      </button>
    </div>
  );
}

/**
 * WidgetConfigPanel — key-value config editor for widget configuration (ADR-044).
 * Keys are read-only labels; only values are editable.
 */
export function WidgetConfigPanel({ pageId, widget, applicationId, onClose, onConfigChange }: WidgetConfigPanelProps) {
  const dispatch = useAppDispatch();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [localArrayState, setLocalArrayState] = useState<Record<string, string | boolean>>({});
  const { type } = widget;

  // Fetch devices for this application (for device selector on chart widgets)
  const { data: devicesData } = useDevices(
    applicationId ? { applicationId, limit: 100 } : undefined
  );
  const devices = devicesData?.devices ?? [];

  // Fetch selected device to get its attributes for field selector
  const selectedDeviceId = (widget.config?.deviceId as string) || '';
  const { data: selectedDevice } = useDevice(
    selectedDeviceId && (CHART_WIDGET_TYPES.has(type) || BE_AGENT_DEVICE_WIDGETS.has(type) || METRIC_WIDGET_TYPES.has(type) || BESENSE_WIDGET_TYPES.has(type)) ? selectedDeviceId : ''
  );
  const deviceAttributes = selectedDevice?.attributes ? Object.keys(selectedDevice.attributes) : [];

  // Merge palette defaults + stored config so new fields appear for existing widgets
  const paletteEntry = PALETTE_ENTRIES.find(p => p.type === widget.type);
  const displayConfig = { ...(paletteEntry?.defaultConfig ?? {}), ...widget.config };

  const saveField = (key: string, newValue: unknown) => {
    dispatch(updateKosmosWidgetConfig({
      pageId,
      widgetId: widget.id,
      config: { ...widget.config, [key]: newValue },
    }));
    onConfigChange?.();
  };

  const keyLabelStyle: React.CSSProperties = {
    fontFamily: 'var(--k-font-tech)',
    fontSize: 9,
    color: 'var(--k-text-dim)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    paddingTop: 4,
    minWidth: 72,
    userSelect: 'none',
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '3px 6px',
    background: 'var(--k-bg-card)',
    border: 'none',
    borderBottom: '1px solid var(--k-green)',
    borderRadius: 0,
    color: 'var(--k-soft)',
    fontFamily: 'var(--k-font-tech)',
    fontSize: 10,
    outline: 'none',
    minWidth: 0,
  };

  const hasConfig = Object.keys(displayConfig).length > 0;

  // ── Array field specs ──────────────────────────────────────────────────────
  interface SubFieldSpec { key: string; kind: 'text' | 'bool' | 'select'; options?: string[]; }
  interface ArrayFieldSpec { subFields: SubFieldSpec[]; }

  const ARRAY_FIELD_SPECS: Record<string, Record<string, ArrayFieldSpec>> = {
    overviewBeSense: {
      sensors: { subFields: [
        { key: 'name',      kind: 'text' },
        { key: 'fieldName', kind: 'text' },
        { key: 'value',     kind: 'text' },
        { key: 'active',    kind: 'bool' },
        { key: 'status',    kind: 'select', options: ['s-ok', 's-warn'] },
      ]},
    },
    overviewBeAgentStatus: {
      modules: { subFields: [
        { key: 'name',   kind: 'text' },
        { key: 'desc',   kind: 'text' },
        { key: 'status', kind: 'select', options: ['RUN', 'IDLE'] },
      ]},
      alerts: { subFields: [
        { key: 'time',  kind: 'text' },
        { key: 'msg',   kind: 'text' },
        { key: 'sub',   kind: 'text' },
        { key: 'level', kind: 'select', options: ['ok', 'warning', 'info'] },
      ]},
    },
    combustionDlHeader: {
      tags: { subFields: [
        { key: 'text',  kind: 'text' },
        { key: 'color', kind: 'select', options: ['', 'green', 'amber', 'blue', 'red'] },
      ]},
    },
    combustionDlFeatureMatrix: {
      featureCells: { subFields: [
        { key: 'label', kind: 'text' },
        { key: 'value', kind: 'text' },
      ]},
    },
    combustionDlFrameworkPipeline: {
      pipelineLayers: { subFields: [
        { key: 'label',      kind: 'text' },
        { key: 'name',       kind: 'text' },
        { key: 'value',      kind: 'text' },
        { key: 'background', kind: 'text' },
        { key: 'border',     kind: 'text' },
        { key: 'color',      kind: 'text' },
      ]},
    },
    combustionDlPhysicsMetrics: {
      metrics: { subFields: [
        { key: 'label', kind: 'text' },
        { key: 'value', kind: 'text' },
        { key: 'width', kind: 'text' },
      ]},
    },
    combustionDlClassifierOutputs: {
      outputs: { subFields: [
        { key: 'label', kind: 'text' },
        { key: 'value', kind: 'text' },
        { key: 'width', kind: 'text' },
      ]},
    },
    combustionDlTrainingPerformance: {
      rows: { subFields: [
        { key: 'label', kind: 'text' },
        { key: 'value', kind: 'text' },
      ]},
    },
  };

  const saveArrayItem = (
    fieldKey: string,
    items: Record<string, any>[],
    itemIndex: number,
    subKey: string,
    newValue: string | boolean
  ) => {
    const updated = items.map((item, i) =>
      i === itemIndex ? { ...item, [subKey]: newValue } : item
    );
    saveField(fieldKey, updated);
  };
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div
      key={widget.id}
      style={{
        width: 320,
        height: '100%',
        background: 'var(--k-bg-panel)',
        borderLeft: '1px solid var(--k-border-bright)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--k-border)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--k-font-display)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 2,
              color: 'var(--k-soft)',
              textTransform: 'uppercase',
            }}
          >
            Configure Widget
          </div>
          <div
            style={{
              fontFamily: 'var(--k-font-tech)',
              fontSize: 9,
              color: 'var(--k-text-dim)',
              letterSpacing: 1,
              marginTop: 2,
            }}
          >
            {type}
          </div>
        </div>
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
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 12,
          overflowY: 'auto',
          gap: 10,
        }}
      >
        {widget.type === 'overviewDataFlow' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={keyLabelStyle}>title</div>
              <input
                type="text"
                value={(displayConfig.title as string) ?? 'DATA FLOW — KOSMOS PLATFORM'}
                onChange={(e) => saveField('title', e.target.value)}
                style={inputStyle}
              />
            </div>
            {/* Layers editor */}
            <DataFlowConfigEditor
              initialLayers={(displayConfig.layers ?? []) as DataFlowLayerConfig[]}
              onSave={(layers) => saveField('layers', layers)}
              inputStyle={inputStyle}
              keyLabelStyle={keyLabelStyle}
            />
          </div>
        ) : !hasConfig ? (
          <div
            style={{
              fontFamily: 'var(--k-font-tech)',
              fontSize: 10,
              color: 'var(--k-text-dim)',
              textAlign: 'center',
              padding: '20px 0',
            }}
          >
            No configurable fields
          </div>
        ) : (
          Object.entries(displayConfig).map(([key, value]) => {
            // ── Structured array field branch ────────────────────────────────
            const arraySpec = ARRAY_FIELD_SPECS[widget.type]?.[key];
            if (arraySpec && Array.isArray(value)) {
              const items = value as Record<string, any>[];
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Field-level label */}
                  <div style={keyLabelStyle}>{key}</div>

                  {items.length === 0 ? (
                    <div
                      style={{
                        fontFamily: 'var(--k-font-tech)',
                        fontSize: 9,
                        color: 'var(--k-text-dim)',
                        paddingLeft: 8,
                        fontStyle: 'italic',
                      }}
                    >
                      (empty)
                    </div>
                  ) : (
                    items.map((item, itemIndex) => {
                      const itemLabel = (item.text ?? item.name ?? item.label ?? item.time ?? `ITEM ${itemIndex + 1}`) as string;
                      return (
                        <div key={itemIndex}>
                          {/* Item divider */}
                          <div
                            style={{
                              fontSize: 8,
                              letterSpacing: 1.5,
                              color: 'var(--k-text-dim)',
                              fontFamily: 'var(--k-font-tech)',
                              textTransform: 'uppercase',
                              borderTop: '1px solid var(--k-border)',
                              paddingTop: 5,
                              marginTop: itemIndex > 0 ? 6 : 2,
                            }}
                          >
                            {key.replace(/s$/, '')} · {itemLabel}
                          </div>

                          {/* Sub-fields */}
                          {arraySpec.subFields.map((sf) => {
                            const stateKey = `${key}.${itemIndex}.${sf.key}`;
                            const rawVal = item[sf.key];

                            if (sf.kind === 'bool') {
                              const checked = stateKey in localArrayState
                                ? (localArrayState[stateKey] as boolean)
                                : Boolean(rawVal);
                              return (
                                <div
                                  key={sf.key}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, marginTop: 3 }}
                                >
                                  <div style={keyLabelStyle}>{sf.key}</div>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      setLocalArrayState(prev => ({ ...prev, [stateKey]: e.target.checked }));
                                      saveArrayItem(key, items, itemIndex, sf.key, e.target.checked);
                                    }}
                                    style={{ cursor: 'pointer', accentColor: 'var(--k-green)' }}
                                  />
                                </div>
                              );
                            }

                            if (sf.kind === 'select') {
                              const current = stateKey in localArrayState
                                ? (localArrayState[stateKey] as string)
                                : String(rawVal ?? '');
                              return (
                                <div
                                  key={sf.key}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, marginTop: 3 }}
                                >
                                  <div style={keyLabelStyle}>{sf.key}</div>
                                  <select
                                    value={current}
                                    onChange={(e) => {
                                      setLocalArrayState(prev => ({ ...prev, [stateKey]: e.target.value }));
                                      saveArrayItem(key, items, itemIndex, sf.key, e.target.value);
                                    }}
                                    style={{ ...inputStyle, cursor: 'pointer' }}
                                  >
                                    {sf.options!.map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            }

                            // text
                            const textVal = stateKey in localArrayState
                              ? (localArrayState[stateKey] as string)
                              : String(rawVal ?? '');
                            return (
                              <div
                                key={sf.key}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, marginTop: 3 }}
                              >
                                <div style={keyLabelStyle}>{sf.key}</div>
                                <input
                                  type="text"
                                  value={textVal}
                                  onChange={(e) =>
                                    setLocalArrayState(prev => ({ ...prev, [stateKey]: e.target.value }))
                                  }
                                  onBlur={(e) =>
                                    saveArrayItem(key, items, itemIndex, sf.key, e.target.value)
                                  }
                                  style={inputStyle}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            }
            // ── End structured array branch ──────────────────────────────────

            const isComplex = typeof value === 'object' && value !== null;
            const isBool = typeof value === 'boolean';
            const error = fieldErrors[key];

            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={keyLabelStyle}>{key}</div>
                  {isBool ? (
                    <input
                      type="checkbox"
                      defaultChecked={value as boolean}
                      onChange={(e) => saveField(key, e.target.checked)}
                      style={{ marginTop: 4, cursor: 'pointer', accentColor: 'var(--k-green)' }}
                    />
                  ) : isComplex ? (
                    <textarea
                      defaultValue={JSON.stringify(value, null, 2)}
                      onBlur={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
                          saveField(key, parsed);
                        } catch (err) {
                          setFieldErrors(prev => ({ ...prev, [key]: (err as Error).message }));
                        }
                      }}
                      style={{
                        ...inputStyle,
                        border: error ? '1px solid var(--k-red)' : '1px solid var(--k-border)',
                        borderRadius: 2,
                        height: 80,
                        resize: 'vertical',
                        lineHeight: '1.4',
                        padding: 6,
                      }}
                    />
                  ) : key === 'deviceId' && (CHART_WIDGET_TYPES.has(type) || BE_AGENT_DEVICE_WIDGETS.has(type) || METRIC_WIDGET_TYPES.has(type) || BESENSE_WIDGET_TYPES.has(type)) ? (
                    <select
                      value={String(value)}
                      onChange={(e) => saveField(key, e.target.value)}
                      style={inputStyle as React.CSSProperties}
                    >
                      <option value="">-- Select Device --</option>
                      {devices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.name}
                        </option>
                      ))}
                    </select>
                  ) : key === 'fieldName' && (CHART_WIDGET_TYPES.has(type) || METRIC_WIDGET_TYPES.has(type)) ? (
                    deviceAttributes.length > 0 ? (
                      <select
                        value={String(value)}
                        onChange={(e) => saveField(key, e.target.value)}
                        style={inputStyle as React.CSSProperties}
                      >
                        <option value="">-- Select Field --</option>
                        {deviceAttributes.map((attr) => (
                          <option key={attr} value={attr}>
                            {attr}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Select device first"
                        value={String(value)}
                        onChange={(e) =>
                          setLocalArrayState(prev => ({ ...prev, [key]: e.target.value }))
                        }
                        onBlur={(e) => saveField(key, e.target.value)}
                        style={inputStyle}
                        disabled={!selectedDeviceId}
                      />
                    )
                  ) : (
                    <input
                      type="text"
                      defaultValue={String(value)}
                      onBlur={(e) => saveField(key, e.target.value)}
                      style={inputStyle}
                    />
                  )}
                </div>
                {error && (
                  <div
                    style={{
                      fontFamily: 'var(--k-font-tech)',
                      fontSize: 9,
                      color: 'var(--k-red)',
                      letterSpacing: 0.5,
                      padding: '3px 6px',
                      background: 'rgba(255,58,58,0.1)',
                      borderRadius: 2,
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 14px',
          borderTop: '1px solid var(--k-border)',
          fontFamily: 'var(--k-font-tech)',
          fontSize: 9,
          color: 'var(--k-text-dim)',
          letterSpacing: 1,
        }}
      >
        CHANGES AUTO-SAVE · CLICK CANVAS TO DESELECT
      </div>
    </div>
  );
}
