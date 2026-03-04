'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { updateNode, triggerAutoSave } from '@/lib/store/slices/workflowSlice';
import { apiClient } from '@/lib/api-client';
import { getAvailableVariables, getDeviceAttributeVariables } from '@/lib/utils/workflow-variables';
import { useDevices } from '@/lib/hooks/useDevices';
import VariablePicker from './VariablePicker';
import { CronPreview } from './CronPreview';
import { CRON_PRESETS, COMMON_TIMEZONES } from '@/lib/utils/cron';
import { apiConfig } from '@/lib/config';

/**
 * Node Configuration Panel
 *
 * Right sidebar for configuring selected node properties.
 * Displays dynamic form fields based on node type.
 * Changes mark workflow as dirty and trigger auto-save.
 */

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'device-field' | 'device-select' | 'mapping-list' | 'cron-expression' | 'timezone-select' | 'webhook-url';
  placeholder?: string;
  options?: Array<{ value: string | number; label: string }>;
  required?: boolean;
  note?: string;
}

// Node type to configuration schema mapping
const NODE_CONFIG_SCHEMAS: Record<string, FieldConfig[]> = {
  'trigger:manual': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Start Workflow', required: true },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What does this trigger do?' },
  ],
  'trigger:deviceStateChange': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Temperature Changed', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'deviceId', label: 'Device ID', type: 'device-select', placeholder: 'Select a device', required: true },
    { key: 'field', label: 'Workspace Path (optional)', type: 'text', placeholder: 'e.g. {{workspace.meter_Params.meter_data.frequency}}', note: 'Leave empty to trigger on any state change. Use {{workspace.x.y}} paths in downstream conditions/actions.' },
  ],
  'trigger:scheduled': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Daily Report', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'cronExpression', label: 'Schedule', type: 'cron-expression', required: true },
    { key: 'timezone', label: 'Timezone', type: 'timezone-select' },
  ],
  'trigger:webhook': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Receive External Event', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: '_webhookUrl', label: 'Webhook URL', type: 'webhook-url', note: 'POST JSON to this URL to trigger the workflow. Body is available via {{trigger.data.*}} in downstream nodes.' },
    { key: 'webhookSecret', label: 'Signing Secret (optional)', type: 'text', placeholder: 'Leave empty to accept all requests', note: 'If set, caller must include X-Hub-Signature-256: sha256=HMAC(secret, body) header.' },
  ],
  'trigger:alarmTriggered': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., On Alarm', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
  ],
  'condition:comparison': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Temp > 30', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'field', label: 'Field Name', type: 'device-field', placeholder: 'e.g., temperature', required: true },
    {
      key: 'operator',
      label: 'Operator',
      type: 'select',
      options: [
        { value: '>', label: 'Greater than (>)' },
        { value: '<', label: 'Less than (<)' },
        { value: '==', label: 'Equals (==)' },
        { value: '!=', label: 'Not equals (!=)' },
        { value: '>=', label: 'Greater or equal (>=)' },
        { value: '<=', label: 'Less or equal (<=)' },
      ],
      required: true,
    },
    { key: 'value', label: 'Value', type: 'number', placeholder: '0', required: true },
  ],
  'condition:threshold': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Normal Range', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'field', label: 'Field Name', type: 'device-field', placeholder: 'e.g., temperature', required: true },
    { key: 'min', label: 'Minimum', type: 'number', placeholder: '0', required: true },
    { key: 'max', label: 'Maximum', type: 'number', placeholder: '100', required: true },
  ],
  'condition:ifElse': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Check Status', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'expression', label: 'Expression', type: 'textarea', placeholder: 'e.g., data.temperature > 30', required: true },
  ],
  'condition:dataExists': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Data Available', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'path', label: 'Data Path', type: 'text', placeholder: 'e.g., data.sensor.temperature', required: true },
  ],
  'condition:scriptEvaluation': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Custom Logic', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'script', label: 'JavaScript Code', type: 'textarea', placeholder: 'return data.temperature > 30;', required: true },
  ],
  'action:sendNotification': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Send Alert', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g., High Temperature Alert', required: true, note: 'Supports {{variables}}' },
    { key: 'message', label: 'Message', type: 'textarea', placeholder: 'e.g., Temperature is {{workspace.temperature}}°C', required: true, note: 'Supports {{variables}} for dynamic content' },
    {
      key: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { value: 'INFO', label: 'Info' },
        { value: 'WARNING', label: 'Warning' },
        { value: 'CRITICAL', label: 'Critical' },
      ],
      required: true,
    },
  ],
  'action:updateDeviceState': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Update Device', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'deviceId', label: 'Device ID', type: 'device-select', placeholder: 'Select a device', required: true },
    { key: 'field', label: 'Field Name', type: 'text', placeholder: 'e.g., status', required: true },
    { key: 'value', label: 'New Value', type: 'text', placeholder: 'Value to set', required: true },
  ],
  'action:createAlarm': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Raise Alarm', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'severity', label: 'Severity', type: 'select', options: [
      { value: 'LOW', label: 'Low' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'HIGH', label: 'High' },
      { value: 'CRITICAL', label: 'Critical' },
    ], required: true },
    { key: 'message', label: 'Alarm Message', type: 'textarea', placeholder: 'Alarm description', required: true },
  ],
  'action:apiRequest': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Call API', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'url', label: 'API URL', type: 'text', placeholder: 'https://api.example.com/endpoint', required: true },
    { key: 'method', label: 'HTTP Method', type: 'select', options: [
      { value: 'GET', label: 'GET' },
      { value: 'POST', label: 'POST' },
      { value: 'PUT', label: 'PUT' },
      { value: 'DELETE', label: 'DELETE' },
    ], required: true },
  ],
  'action:debug': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'Debug', required: true },
    { key: 'messageTemplate', label: 'Message / Expression', type: 'textarea', placeholder: 'e.g., Temperature: {{workspace.temperature}} or leave empty to print all data', required: false },
    { key: 'level', label: 'Log Level', type: 'select', options: [
      { value: 'DEBUG', label: 'Debug' },
      { value: 'INFO', label: 'Info' },
      { value: 'WARN', label: 'Warning' },
      { value: 'ERROR', label: 'Error' },
    ] },
  ],
  'action:logEvent': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Log Event', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'message', label: 'Log Message', type: 'textarea', placeholder: 'Message to log', required: true },
    { key: 'level', label: 'Log Level', type: 'select', options: [
      { value: 'info', label: 'Info' },
      { value: 'warn', label: 'Warning' },
      { value: 'error', label: 'Error' },
    ], required: true },
  ],
  'action:writeDeviceState': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Structure Telemetry', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'deviceId', label: 'Target Device', type: 'device-select', required: true },
    { key: 'mappings', label: 'Field Mappings', type: 'mapping-list', required: true },
  ],
  'transform:mapData': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Transform Data', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'mapping', label: 'Field Mapping', type: 'textarea', placeholder: 'JSON mapping object', required: true },
  ],
  'transform:aggregateData': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Aggregate', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'operation', label: 'Operation', type: 'select', options: [
      { value: 'sum', label: 'Sum' },
      { value: 'avg', label: 'Average' },
      { value: 'min', label: 'Minimum' },
      { value: 'max', label: 'Maximum' },
      { value: 'count', label: 'Count' },
    ], required: true },
    { key: 'field', label: 'Field to Aggregate', type: 'text', placeholder: 'e.g., temperature', required: true },
  ],
  'transform:filterData': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Filter', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'predicate', label: 'Filter Expression', type: 'textarea', placeholder: 'e.g., item.temperature > 20', required: true },
  ],
  'transform:scriptTransform': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Custom Transform', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'script', label: 'JavaScript Code', type: 'textarea', placeholder: 'return { ...data, processed: true };', required: true },
  ],
  'data:modbusRead': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Read Pressure', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'gatewayId', label: 'Gateway ID', type: 'text', placeholder: 'Modbus gateway ID', required: true },
    { key: 'registerName', label: 'Register Name/Address', type: 'text', placeholder: 'e.g., 400001', required: true },
    { key: 'outputField', label: 'Output Field', type: 'text', placeholder: 'e.g., modbusData', required: false },
  ],
  'data:modbusWrite': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Write Setpoint', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'gatewayId', label: 'Gateway ID', type: 'text', placeholder: 'Modbus gateway ID', required: true },
    { key: 'startAddress', label: 'Start Address', type: 'number', placeholder: '0', required: true },
    { key: 'values', label: 'Values (JSON)', type: 'textarea', placeholder: '[0, 100, 200]', required: true },
  ],
  'data:queryDeviceStates': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Query Device Data', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'deviceId', label: 'Device ID', type: 'device-select', placeholder: 'Select a device', required: true },
    { key: 'startTime', label: 'Start Time (ISO 8601)', type: 'text', placeholder: '2024-01-01T00:00:00Z', required: false },
    { key: 'endTime', label: 'End Time (ISO 8601)', type: 'text', placeholder: '2024-12-31T23:59:59Z', required: false },
    { key: 'limit', label: 'Result Limit', type: 'number', placeholder: '100', required: false },
    { key: 'outputField', label: 'Output Field', type: 'text', placeholder: 'e.g., deviceStates', required: false },
  ],
  'logic:function': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Compute Value', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'code', label: 'JavaScript Code', type: 'textarea', placeholder: 'result.computed = data.temperature * 2;', required: true },
    { key: 'outputField', label: 'Output Field', type: 'text', placeholder: 'e.g., computed', required: false },
  ],
};

export default function NodeConfigPanel() {
  const dispatch = useAppDispatch();
  const { nodes, edges, selectedNodeId, applicationId, workflowId } = useAppSelector(state => state.workflow);
  const { data: devicesData } = useDevices({ applicationId: applicationId || undefined });
  const [activeTab, setActiveTab] = useState<'config' | 'info'>('config');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isVariablePickerOpen, setIsVariablePickerOpen] = useState(false);
  const [pickerField, setPickerField] = useState<string | null>(null);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [deviceAttributes, setDeviceAttributes] = useState<Record<string, string> | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const textFieldRefs = useRef<Record<string, HTMLElement | null>>({});

  type MappingRow = { key: string; expression: string };
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);

  // Extract devices array from useDevices response
  const devices = devicesData?.devices || [];

  // Get selected node
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);

  // Get schema for this node type
  // selectedNode.type is the visual component type ('trigger', 'action', etc.)
  // selectedNode.data.nodeType is the semantic workflow type ('trigger:manual', etc.)
  const schema = useMemo(() => {
    if (!selectedNode) return null;
    const semanticType = selectedNode.data?.nodeType ?? selectedNode.type;
    return NODE_CONFIG_SCHEMAS[semanticType as keyof typeof NODE_CONFIG_SCHEMAS] || [];
  }, [selectedNode]);

  // Initialize form data when node changes
  useMemo(() => {
    if (selectedNode?.data) {
      setFormData(selectedNode.data);
    }
  }, [selectedNode?.id]);

  // Reset mapping rows when selected node changes
  useEffect(() => {
    const rows: MappingRow[] = selectedNode?.data?.config?.mappings || [];
    setMappingRows(rows);
  }, [selectedNode?.id]);

  // Fetch device attributes from linked application (ADR-023)
  // For action:writeDeviceState, scope to the selected device only.
  // For other nodes, fetch all devices and merge attributes.
  useEffect(() => {
    if (!applicationId) {
      setDeviceAttributes(null);
      return;
    }

    const fetchDeviceAttributes = async () => {
      try {
        const semanticType = selectedNode?.data?.nodeType ?? selectedNode?.type;
        const selectedDeviceId = selectedNode?.data?.config?.deviceId;

        // If this is a writeDeviceState node with a device selected, fetch only that device
        if (semanticType === 'action:writeDeviceState' && selectedDeviceId) {
          const response = await apiClient.get<any>(`/devices/${selectedDeviceId}`);
          const device = response.data;
          if (device?.attributes) {
            setDeviceAttributes(device.attributes);
          } else {
            setDeviceAttributes(null);
          }
        } else if (semanticType === 'action:writeDeviceState') {
          // writeDeviceState with no device selected — show no suggestions
          setDeviceAttributes(null);
        } else {
          // For other node types, fetch all devices and merge attributes (fallback behavior)
          const response = await apiClient.get<any>(`/devices?limit=100&offset=0&applicationId=${applicationId}`);
          const devices = response.data || [];

          // Merge attributes from all devices in the application
          const mergedAttrs: Record<string, string> = {};
          devices.forEach((device: any) => {
            if (device.attributes) {
              Object.assign(mergedAttrs, device.attributes);
            }
          });

          setDeviceAttributes(Object.keys(mergedAttrs).length > 0 ? mergedAttrs : null);
        }
      } catch (error) {
        // Silently fail - devices may not be available
        setDeviceAttributes(null);
      }
    };

    fetchDeviceAttributes();
  }, [applicationId, selectedNode?.id, selectedNode?.data?.config?.deviceId, selectedNode?.data?.nodeType, selectedNode?.type]);

  if (!selectedNode) {
    return null;
  }

  const handleFieldChange = (key: string, value: any) => {
    // label and description are top-level node.data fields.
    // Everything else lives in node.data.config so toBackendNodes() picks it up.
    // The 'config' key is used by mapping-list handlers that pass the full config object.
    const isTopLevel = key === 'label' || key === 'description';
    const updated = isTopLevel
      ? { ...formData, [key]: value }
      : key === 'config'
        ? { ...formData, config: value }
        : { ...formData, config: { ...(formData.config || {}), [key]: value } };
    setFormData(updated);
    dispatch(updateNode({ id: selectedNode.id, data: updated }));
    // Trigger auto-save with 1-second debounce
    dispatch(triggerAutoSave() as any);

    // Detect {{ to open variable picker
    if (typeof value === 'string' && value.includes('{{') && !value.includes('}}')) {
      setPickerField(key);
      setIsVariablePickerOpen(true);
      // Position picker near the field
      const element = textFieldRefs.current[key];
      if (element) {
        const rect = element.getBoundingClientRect();
        setPickerPosition({ x: rect.left, y: rect.bottom + 8 });
      }
    }
  };

  const handleVariableSelect = (variable: string) => {
    if (!pickerField) return;
    const currentValue = formData[pickerField] || '';
    const newValue = currentValue + variable;
    handleFieldChange(pickerField, newValue);
    setIsVariablePickerOpen(false);
    // Move cursor to end of the inserted variable
    setTimeout(() => {
      const element = textFieldRefs.current[pickerField];
      if (element && 'selectionStart' in element) {
        element.focus();
        (element as any).selectionStart = (element as any).selectionEnd = newValue.length;
      }
    }, 0);
  };

  const getFieldValue = (key: string): any => {
    // label and description are top-level; everything else lives in config
    if (key === 'label' || key === 'description') {
      return formData[key] ?? '';
    }
    return formData.config?.[key] ?? '';
  };

  const addMappingRow = () => {
    const rows = [...mappingRows, { key: '', expression: '' }];
    setMappingRows(rows);
    handleFieldChange('config', { ...formData.config, mappings: rows });
  };

  const removeMappingRow = (i: number) => {
    const rows = mappingRows.filter((_, idx) => idx !== i);
    setMappingRows(rows);
    handleFieldChange('config', { ...formData.config, mappings: rows });
  };

  const updateMappingRow = (i: number, field: 'key' | 'expression', val: string) => {
    const rows = mappingRows.map((row, idx) => idx === i ? { ...row, [field]: val } : row);
    setMappingRows(rows);
    handleFieldChange('config', { ...formData.config, mappings: rows });
  };

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
          {selectedNode.data?.label || selectedNode.type}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {selectedNode.type}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
            activeTab === 'config'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Config
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
            activeTab === 'info'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Info
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'config' ? (
          <div className="p-6 space-y-4">
            {schema && schema.length > 0 ? (
              schema.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>

                  {field.type === 'text' && (
                    <input
                      ref={el => { if (el) textFieldRefs.current[field.key] = el; }}
                      type="text"
                      value={getFieldValue(field.key)}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={getFieldValue(field.key)}
                      onChange={e => handleFieldChange(field.key, e.target.valueAsNumber)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      ref={el => { if (el) textFieldRefs.current[field.key] = el; }}
                      value={getFieldValue(field.key)}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      value={getFieldValue(field.key)}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select an option...</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'checkbox' && (
                    <input
                      type="checkbox"
                      checked={getFieldValue(field.key) || false}
                      onChange={e => handleFieldChange(field.key, e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  {field.type === 'device-field' && (
                    <div className="relative">
                      <input
                        ref={el => { if (el) textFieldRefs.current[field.key] = el; }}
                        type="text"
                        value={getFieldValue(field.key)}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        list={`datalist-${field.key}`}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {deviceAttributes && (
                        <datalist id={`datalist-${field.key}`}>
                          {Object.keys(deviceAttributes).map(fieldName => (
                            <option key={fieldName} value={fieldName}>
                              {fieldName} ({deviceAttributes[fieldName]})
                            </option>
                          ))}
                        </datalist>
                      )}
                    </div>
                  )}

                  {field.type === 'device-select' && (
                    <select
                      value={getFieldValue(field.key) || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a device...</option>
                      {devices.map((device: any) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.name} ({device.deviceId.slice(-6)})
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'mapping-list' && (
                    <div className="space-y-2">
                      {/* Column headers */}
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
                        <span>Output <span className="text-gray-400 font-normal">(derived.*)</span></span>
                        <span>Input <span className="text-gray-400 font-normal">(workspace.*)</span></span>
                        <span />
                      </div>
                      {/* Rows */}
                      {mappingRows.map((row, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-center">
                          <input
                            type="text"
                            value={row.key}
                            onChange={e => updateMappingRow(i, 'key', e.target.value)}
                            placeholder="{{derived.freq}}"
                            list="datalist-mapping-keys"
                            className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={row.expression}
                            onChange={e => updateMappingRow(i, 'expression', e.target.value)}
                            placeholder="{{workspace.voltage}}"
                            className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => removeMappingRow(i)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove row"
                          >✕</button>
                        </div>
                      ))}
                      {/* Attribute datalist — suggest {{derived.attr}} format (ADR-037) */}
                      {deviceAttributes && (
                        <datalist id="datalist-mapping-keys">
                          {Object.keys(deviceAttributes).map(attr => (
                            <option key={attr} value={`{{derived.${attr}}}`} />
                          ))}
                        </datalist>
                      )}
                      {/* Add row button */}
                      <button
                        onClick={addMappingRow}
                        className="mt-1 w-full px-2 py-1.5 text-xs border border-dashed border-gray-300 dark:border-gray-600 rounded text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                      >
                        + Add Mapping
                      </button>
                    </div>
                  )}

                  {field.type === 'cron-expression' && (
                    <div>
                      <select
                        value={CRON_PRESETS.find(p => p.value === getFieldValue(field.key))?.value || 'custom'}
                        onChange={e => {
                          if (e.target.value !== 'custom') {
                            handleFieldChange(field.key, e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                      >
                        {CRON_PRESETS.map(preset => (
                          <option key={preset.value} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                        <option value="custom">Custom...</option>
                      </select>
                      <input
                        type="text"
                        value={getFieldValue(field.key)}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder || '0 0 * * *'}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <CronPreview expression={getFieldValue(field.key)} timezone={getFieldValue('timezone')} />
                    </div>
                  )}

                  {field.type === 'timezone-select' && (
                    <select
                      value={getFieldValue(field.key) || 'UTC'}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {COMMON_TIMEZONES.map(tz => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'webhook-url' && (
                    <div className="space-y-2">
                      {workflowId ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={`${apiConfig.baseUrl}/webhooks/${workflowId}`}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${apiConfig.baseUrl}/webhooks/${workflowId}`);
                              setCopiedField(field.key);
                              setTimeout(() => setCopiedField(null), 1500);
                            }}
                            className="px-2 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            {copiedField === field.key ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500">Save the workflow first to get a URL</p>
                      )}
                    </div>
                  )}

                  {field.note && (
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                      {field.note}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No configuration options for this node type.</p>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {selectedNode.data?.description && (
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Description</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-1.5 rounded leading-relaxed">
                  {selectedNode.data.description}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Node ID</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                {selectedNode.id}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Node Type</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                {selectedNode.type}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Position</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                X: {selectedNode.position?.x?.toFixed(0) ?? '—'}, Y: {selectedNode.position?.y?.toFixed(0) ?? '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Variable Picker */}
      <VariablePicker
        nodeId={selectedNode.id}
        nodes={nodes}
        edges={edges}
        deviceAttributes={deviceAttributes}
        isOpen={isVariablePickerOpen}
        onClose={() => setIsVariablePickerOpen(false)}
        onSelect={handleVariableSelect}
        position={pickerPosition}
      />
    </div>
  );
}
