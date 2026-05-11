'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch } from '@/lib/store';
import { updateKosmosWidgetConfig } from '@/lib/store/slices/dashboardSlice';
import type { KosmosWidget, DataFlowLayerConfig, DataFlowBlockConfig } from './types';
import { PALETTE_ENTRIES } from './types';
import { useDevices, useDevice } from '@/lib/hooks/useDevices';
import { useAllWorkflows, useWorkflowDetail } from '@/lib/hooks/useWorkflows';

interface WidgetConfigPanelProps {
  pageId: string;
  widget: KosmosWidget;
  applicationId?: string;
  onClose: () => void;
  onConfigChange?: () => void;
  onRemove?: () => void;
}

// Widget types: device selector + single field selector (fieldName)
const CHART_WIDGET_TYPES = new Set([
  'overviewRealtimeChart',
  'combustionDlPressureSignal',
  'combustionDlAnomalyTrend',
  'combustionDlFeatureMatrix',
]);

// Widget types: device selector + TWO field selectors (freqField, ampField)
const FFT_WIDGET_TYPES = new Set([
  'combustionDlFrequencySpectrum',
]);

// Widget types: device selector only (field names are fixed / multiple)
const BE_AGENT_DEVICE_WIDGETS = new Set([
  'overviewBeAgentStatus',
  'combustionDlPhysicsMetrics',
  'combustionDlPrecursorClassification',
  'combustionDlClassifierOutputs',
  'combustionDlFrameworkPipeline',
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

// Default field names per widget type — auto-saved when a device is first selected
const WIDGET_DEFAULT_FIELDS: Record<string, { fieldName?: string; freqField?: string; ampField?: string }> = {
  combustionDlPressureSignal:  { fieldName: 'cd_pressure' },
  combustionDlAnomalyTrend:    { fieldName: 'anomaly_score' },
  combustionDlFeatureMatrix:   { fieldName: 'feature_cells' },
  combustionDlFrequencySpectrum: { freqField: 'fft_freqs', ampField: 'fft_amps' },
  overviewAnomalyMetric:       { fieldName: 'anomaly_score' },
  overviewLoadMetric:          { fieldName: 'load' },
  overviewEgtMetric:           { fieldName: 'egt' },
};

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
export function WidgetConfigPanel({ pageId, widget, applicationId, onClose, onConfigChange, onRemove }: WidgetConfigPanelProps) {
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
  const needsDevice = CHART_WIDGET_TYPES.has(type) || FFT_WIDGET_TYPES.has(type) || BE_AGENT_DEVICE_WIDGETS.has(type) || METRIC_WIDGET_TYPES.has(type) || BESENSE_WIDGET_TYPES.has(type);
  const { data: selectedDevice } = useDevice(selectedDeviceId && needsDevice ? selectedDeviceId : '');
  const deviceAttributes = selectedDevice?.attributes ? Object.keys(selectedDevice.attributes) : [];

  // Workspace data source state
  const dataSource = (widget.config?.dataSource as 'device' | 'workspace') || 'device';
  const [workspaceNodes, setWorkspaceNodes] = useState<Array<{ id: string; label: string; mappings: Array<{ to: string }> }>>([]);

  const { data: workflows = [] } = useAllWorkflows({ enabled: dataSource === 'workspace' });

  const wfId = widget.config?.workflowId as string | undefined;
  const { data: workflowDetail } = useWorkflowDetail(dataSource === 'workspace' ? wfId : undefined);

  // Derive setWorkspace output nodes from fetched workflow detail
  useEffect(() => {
    if (!workflowDetail || dataSource !== 'workspace') { setWorkspaceNodes([]); return; }
    const wfNodes: any[] = workflowDetail.nodes ?? [];
    setWorkspaceNodes(
      wfNodes
        .filter((n: any) => n.type === 'action:setWorkspace')
        .map((n: any) => ({
          id: n.id,
          label: n.data?.config?.label || n.data?.label || n.id,
          mappings: n.data?.config?.mappings ?? [],
        }))
    );
  }, [workflowDetail, dataSource]);

  // Derive field options from selected output node's mappings
  const selectedOutputNodeId = widget.config?.outputNodeId as string | undefined;
  const workspaceFieldOptions: string[] = (() => {
    if (dataSource !== 'workspace' || !selectedOutputNodeId) return [];
    const node = workspaceNodes.find(n => n.id === selectedOutputNodeId);
    return (node?.mappings ?? []).map(m => m.to).filter(Boolean);
  })();

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
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 320,
        zIndex: 20,
        background: 'var(--k-bg-panel)',
        borderLeft: '1px solid var(--k-border-bright)',
        display: 'flex',
        flexDirection: 'column',
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
          <>
          {/* ── DATA SOURCE section — shown for all device-binding widget types ── */}
          {(CHART_WIDGET_TYPES.has(type) || FFT_WIDGET_TYPES.has(type) || BE_AGENT_DEVICE_WIDGETS.has(type) || METRIC_WIDGET_TYPES.has(type) || BESENSE_WIDGET_TYPES.has(type)) && (
            <div style={{ marginBottom: 10 }}>
              {/* Section header */}
              <div style={{
                fontFamily: 'var(--k-font-tech)',
                fontSize: 9,
                color: 'var(--k-green)',
                letterSpacing: 2,
                textTransform: 'uppercase',
                borderBottom: '1px solid var(--k-green)',
                paddingBottom: 4,
                marginBottom: 8,
              }}>
                ◈ Data Source
              </div>

              {/* Data mode toggle: Device | Workspace */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={keyLabelStyle}>Mode</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['device', 'workspace'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => saveField('dataSource', mode)}
                      style={{
                        padding: '2px 8px',
                        fontSize: 9,
                        fontFamily: 'var(--k-font-tech)',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        border: '1px solid var(--k-green)',
                        borderRadius: 2,
                        background: dataSource === mode ? 'var(--k-green)' : 'transparent',
                        color: dataSource === mode ? 'var(--k-bg)' : 'var(--k-green)',
                        cursor: 'pointer',
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Device mode: device selector + field pickers */}
              {dataSource === 'device' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <div style={keyLabelStyle}>Device</div>
                <select
                  value={(widget.config?.deviceId as string) || ''}
                  onChange={(e) => {
                    const newDeviceId = e.target.value;
                    const defaults = WIDGET_DEFAULT_FIELDS[type] ?? {};
                    const patch: Record<string, unknown> = { ...widget.config, deviceId: newDeviceId };
                    for (const [k, v] of Object.entries(defaults)) {
                      if (!patch[k]) patch[k] = v;
                    }
                    dispatch(updateKosmosWidgetConfig({ pageId, widgetId: widget.id, config: patch }));
                  }}
                  style={{ ...inputStyle as React.CSSProperties, flex: 1 }}
                >
                  <option value="">— select device —</option>
                  {devices.length === 0 && (
                    <option disabled value="">No devices in this application</option>
                  )}
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>
              )}

              {/* Workspace mode: workflow → output node → field */}
              {dataSource === 'workspace' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Workflow selector */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={keyLabelStyle}>Workflow</div>
                    <select
                      value={(widget.config?.workflowId as string) || ''}
                      onChange={(e) => {
                        dispatch(updateKosmosWidgetConfig({ pageId, widgetId: widget.id, config: { ...widget.config, workflowId: e.target.value, outputNodeId: '', fieldName: '' } }));
                      }}
                      style={{ ...inputStyle as React.CSSProperties, flex: 1 }}
                    >
                      <option value="">— select workflow —</option>
                      {workflows.map(wf => (
                        <option key={wf.workflowId} value={wf.workflowId}>{wf.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Output node selector */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={keyLabelStyle}>Output</div>
                    <select
                      value={(widget.config?.outputNodeId as string) || ''}
                      onChange={(e) => {
                        dispatch(updateKosmosWidgetConfig({ pageId, widgetId: widget.id, config: { ...widget.config, outputNodeId: e.target.value, fieldName: '' } }));
                      }}
                      style={{ ...inputStyle as React.CSSProperties, flex: 1 }}
                      disabled={!widget.config?.workflowId}
                    >
                      <option value="">— select output node —</option>
                      {workspaceNodes.length === 0 && widget.config?.workflowId && (
                        <option disabled value="">No Set Workspace nodes found</option>
                      )}
                      {workspaceNodes.map(n => (
                        <option key={n.id} value={n.id}>{n.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Field selector */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={keyLabelStyle}>Field</div>
                    {workspaceFieldOptions.length > 0 ? (
                      <select
                        value={(widget.config?.fieldName as string) || ''}
                        onChange={(e) => saveField('fieldName', e.target.value)}
                        style={{ ...inputStyle as React.CSSProperties, flex: 1 }}
                      >
                        <option value="">— select field —</option>
                        {workspaceFieldOptions.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={selectedOutputNodeId ? 'Type field name' : 'Select output node first'}
                        value={(widget.config?.fieldName as string) || ''}
                        onChange={(e) => saveField('fieldName', e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                        disabled={!selectedOutputNodeId}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Single field selector — chart / metric widgets (device mode only) */}
              {dataSource === 'device' && (CHART_WIDGET_TYPES.has(type) || METRIC_WIDGET_TYPES.has(type)) && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={keyLabelStyle}>Field</div>
                  {deviceAttributes.length > 0 ? (
                    <select
                      value={(widget.config?.fieldName as string) || ''}
                      onChange={(e) => saveField('fieldName', e.target.value)}
                      style={{ ...inputStyle as React.CSSProperties, flex: 1 }}
                    >
                      <option value="">— select field —</option>
                      {deviceAttributes.map((attr) => (
                        <option key={attr} value={attr}>{attr}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder={selectedDeviceId ? 'No attributes defined' : 'Select device first'}
                      value={(widget.config?.fieldName as string) || ''}
                      onChange={(e) => saveField('fieldName', e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                      disabled={!selectedDeviceId}
                    />
                  )}
                </div>
              )}

              {/* Two-field selector — FFT / XY chart widgets (device mode only) */}
              {dataSource === 'device' && FFT_WIDGET_TYPES.has(type) && (() => {
                const attrOptions = deviceAttributes.length > 0 ? deviceAttributes : [];
                const mkSelect = (configKey: string, label: string, placeholder: string) => (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <div style={keyLabelStyle}>{label}</div>
                    {attrOptions.length > 0 ? (
                      <select
                        value={(widget.config?.[configKey] as string) || ''}
                        onChange={(e) => saveField(configKey, e.target.value)}
                        style={{ ...inputStyle as React.CSSProperties, flex: 1 }}
                      >
                        <option value="">— select field —</option>
                        {attrOptions.map((attr) => (
                          <option key={attr} value={attr}>{attr}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={selectedDeviceId ? placeholder : 'Select device first'}
                        value={(widget.config?.[configKey] as string) || ''}
                        onChange={(e) => saveField(configKey, e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                        disabled={!selectedDeviceId}
                      />
                    )}
                  </div>
                );
                return (
                  <>
                    {mkSelect('freqField', 'X (freq)', 'No attributes defined')}
                    {mkSelect('ampField', 'Y (amp)', 'No attributes defined')}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── Generic config fields (skip deviceId / fieldName / freqField / ampField — handled above) ── */}
          {Object.entries(displayConfig).map(([key, value]) => {
            const isDeviceField = key === 'deviceId' || key === 'fieldName';
            const isFftField = (key === 'freqField' || key === 'ampField') && FFT_WIDGET_TYPES.has(type);
            const isHandled = CHART_WIDGET_TYPES.has(type) || FFT_WIDGET_TYPES.has(type) || BE_AGENT_DEVICE_WIDGETS.has(type) || METRIC_WIDGET_TYPES.has(type) || BESENSE_WIDGET_TYPES.has(type);
            if ((isDeviceField || isFftField) && isHandled) return null;
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
                        <option key={device.deviceId} value={device.deviceId}>
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
          })}
          </>
        )}
      </div>

      {/* Remove widget */}
      {onRemove && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--k-border)' }}>
          <button
            onClick={() => { onRemove(); onClose(); }}
            style={{
              width: '100%',
              padding: '6px 0',
              background: 'rgba(255,58,58,0.08)',
              border: '1px solid rgba(255,58,58,0.35)',
              borderRadius: 2,
              color: 'var(--k-red)',
              cursor: 'pointer',
              fontFamily: 'var(--k-font-tech)',
              fontSize: 10,
              letterSpacing: 1,
            }}
          >
            REMOVE WIDGET
          </button>
        </div>
      )}

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
