'use client';

import { useState } from 'react';
import { useAppDispatch } from '@/lib/store';
import { updateKosmosWidgetConfig } from '@/lib/store/slices/dashboardSlice';
import type { KosmosWidget } from './types';

interface WidgetConfigPanelProps {
  pageId: string;
  widget: KosmosWidget;
  onClose: () => void;
}

/**
 * WidgetConfigPanel — 320px right-side panel for configuring a selected widget (ADR-044).
 * Opens when a widget is clicked in edit mode.
 * Dispatches updateKosmosWidgetConfig on every field change.
 */
export function WidgetConfigPanel({ pageId, widget, onClose }: WidgetConfigPanelProps) {
  const dispatch = useAppDispatch();
  const { type, config } = widget;

  const set = (key: string, value: any) => {
    dispatch(updateKosmosWidgetConfig({ pageId, widgetId: widget.id, config: { [key]: value } }));
  };

  return (
    <div
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

      {/* Scrollable config fields */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Common: title */}
        {config.title !== undefined && (
          <Field label="Title">
            <CfgTextInput value={config.title || ''} onChange={(v) => set('title', v)} />
          </Field>
        )}

        {/* KPI Card */}
        {type === 'kpiCard' && (
          <>
            <Field label="Label">
              <CfgTextInput value={config.label || ''} onChange={(v) => set('label', v)} />
            </Field>
            <Field label="Value">
              <CfgTextInput value={String(config.value ?? '')} onChange={(v) => set('value', v)} />
            </Field>
            <Field label="Unit">
              <CfgTextInput value={config.unit || ''} onChange={(v) => set('unit', v)} />
            </Field>
            <Field label="Trend">
              <CfgSelect
                value={config.trend || 'flat'}
                options={[
                  { label: 'Up ▲', value: 'up' },
                  { label: 'Down ▼', value: 'down' },
                  { label: 'Flat ◆', value: 'flat' },
                ]}
                onChange={(v) => set('trend', v)}
              />
            </Field>
            <Field label="Trend Label">
              <CfgTextInput value={config.trendLabel || ''} onChange={(v) => set('trendLabel', v)} />
            </Field>
          </>
        )}

        {/* Device ID (shared by several types) */}
        {['sensorValueList', 'realTimeChart', 'healthRing', 'gauge', 'activeAlarms', 'statusText', 'frequencyChart'].includes(type) && (
          <Field label="Device ID">
            <CfgTextInput
              value={config.deviceId || ''}
              onChange={(v) => set('deviceId', v)}
              placeholder="device_abc123"
            />
          </Field>
        )}

        {/* Field selector */}
        {['realTimeChart', 'healthRing', 'gauge', 'statusText', 'frequencyChart'].includes(type) && (
          <Field label="Field">
            <CfgTextInput
              value={config.field || ''}
              onChange={(v) => set('field', v)}
              placeholder="temperature"
            />
          </Field>
        )}

        {/* Real-Time Chart extras */}
        {type === 'realTimeChart' && (
          <>
            <Field label="Chart Type">
              <CfgSelect
                value={config.chartType || 'line'}
                options={[
                  { label: 'Line', value: 'line' },
                  { label: 'Area', value: 'area' },
                ]}
                onChange={(v) => set('chartType', v)}
              />
            </Field>
            <Field label="Max Points">
              <CfgNumber value={config.maxPoints ?? 100} onChange={(v) => set('maxPoints', v)} />
            </Field>
          </>
        )}

        {/* Gauge extras */}
        {type === 'gauge' && (
          <>
            <Field label="Min">
              <CfgNumber value={config.min ?? 0} onChange={(v) => set('min', v)} />
            </Field>
            <Field label="Max">
              <CfgNumber value={config.max ?? 100} onChange={(v) => set('max', v)} />
            </Field>
            <Field label="Unit">
              <CfgTextInput value={config.unit || ''} onChange={(v) => set('unit', v)} />
            </Field>
          </>
        )}

        {/* Health Ring extras */}
        {type === 'healthRing' && (
          <Field label="Max Value">
            <CfgNumber value={config.max ?? 100} onChange={(v) => set('max', v)} />
          </Field>
        )}

        {/* Alert List extras */}
        {type === 'alertList' && (
          <Field label="Max Items">
            <CfgNumber value={config.maxItems ?? 5} onChange={(v) => set('maxItems', v)} />
          </Field>
        )}

        {/* Arch Diagram */}
        {type === 'archDiagram' && (
          <Field label="Show Lightbox">
            <CfgSelect
              value={config.showLightbox ? 'true' : 'false'}
              options={[
                { label: 'Yes', value: 'true' },
                { label: 'No', value: 'false' },
              ]}
              onChange={(v) => set('showLightbox', v === 'true')}
            />
          </Field>
        )}

        {/* JSON array fields */}
        {(type === 'keyValueTable' || type === 'confidenceBars') && (
          <Field label="Items (JSON array)">
            <CfgJsonTextarea value={config.items} onChange={(v) => set('items', v)} />
          </Field>
        )}

        {type === 'platformDiagram' && (
          <Field label="Layers (JSON array)">
            <CfgJsonTextarea value={config.layers} onChange={(v) => set('layers', v)} />
          </Field>
        )}

        {type === 'moduleStatusList' && (
          <Field label="Modules (JSON array)">
            <CfgJsonTextarea value={config.modules} onChange={(v) => set('modules', v)} />
          </Field>
        )}

        {type === 'agentChat' && (
          <div
            style={{
              fontFamily: 'var(--k-font-tech)',
              fontSize: 10,
              color: 'var(--k-text-dim)',
              letterSpacing: 1,
              padding: '8px 0',
              lineHeight: 1.7,
            }}
          >
            Agent chat messages are static in POC mode. Live backend connection not implemented.
          </div>
        )}

        {type === 'featureMatrix' && (
          <div
            style={{
              fontFamily: 'var(--k-font-tech)',
              fontSize: 10,
              color: 'var(--k-text-dim)',
              letterSpacing: 1,
              padding: '8px 0',
            }}
          >
            Feature data is generated dynamically. No config required.
          </div>
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

/* ── Reusable field primitives ── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--k-font-tech)',
          fontSize: 9,
          color: 'var(--k-text-dim)',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--k-border)',
  borderRadius: 2,
  color: 'var(--k-pale)',
  fontFamily: 'var(--k-font-tech)',
  fontSize: 11,
  padding: '5px 8px',
  outline: 'none',
  boxSizing: 'border-box',
};

function CfgTextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />;
}

function CfgNumber({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} style={inputStyle} />;
}

function CfgSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, background: 'var(--k-bg-card)' }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function CfgJsonTextarea({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [raw, setRaw] = useState(JSON.stringify(value, null, 2));
  const [hasError, setHasError] = useState(false);

  const handleChange = (text: string) => {
    setRaw(text);
    try {
      onChange(JSON.parse(text));
      setHasError(false);
    } catch {
      setHasError(true);
    }
  };

  return (
    <textarea
      value={raw}
      onChange={(e) => handleChange(e.target.value)}
      rows={6}
      style={{
        ...inputStyle,
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 10,
        resize: 'vertical',
        border: `1px solid ${hasError ? 'var(--k-red)' : 'var(--k-border)'}`,
      }}
    />
  );
}
