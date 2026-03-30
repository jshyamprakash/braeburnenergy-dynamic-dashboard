'use client';

import { useState } from 'react';
import { useAppDispatch } from '@/lib/store';
import { updateKosmosWidgetConfig } from '@/lib/store/slices/dashboardSlice';
import type { KosmosWidget } from './types';
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
    selectedDeviceId && (CHART_WIDGET_TYPES.has(type) || BE_AGENT_DEVICE_WIDGETS.has(type)) ? selectedDeviceId : ''
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
        { key: 'name',   kind: 'text' },
        { key: 'value',  kind: 'text' },
        { key: 'active', kind: 'bool' },
        { key: 'status', kind: 'select', options: ['s-ok', 's-warn'] },
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
        {!hasConfig ? (
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
                  ) : key === 'deviceId' && (CHART_WIDGET_TYPES.has(type) || BE_AGENT_DEVICE_WIDGETS.has(type)) ? (
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
                  ) : key === 'fieldName' && CHART_WIDGET_TYPES.has(type) ? (
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
