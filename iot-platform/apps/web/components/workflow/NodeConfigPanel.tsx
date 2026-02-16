'use client';

import { useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { updateNode, triggerAutoSave } from '@/lib/store/slices/workflowSlice';

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
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox';
  placeholder?: string;
  options?: Array<{ value: string | number; label: string }>;
  required?: boolean;
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
    { key: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'Device ID to monitor', required: true },
    { key: 'field', label: 'Field Name', type: 'text', placeholder: 'e.g., temperature', required: true },
  ],
  'trigger:scheduled': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Daily Report', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'cronExpression', label: 'Cron Expression', type: 'text', placeholder: '0 0 * * * (daily)', required: true },
  ],
  'trigger:alarmTriggered': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., On Alarm', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
  ],
  'condition:comparison': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Temp > 30', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'field', label: 'Field Name', type: 'text', placeholder: 'e.g., temperature', required: true },
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
    { key: 'field', label: 'Field Name', type: 'text', placeholder: 'e.g., temperature', required: true },
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
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Alert User', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'recipient', label: 'Recipient', type: 'text', placeholder: 'user@example.com', required: true },
    { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Email/notification body', required: true },
  ],
  'action:updateDeviceState': [
    { key: 'label', label: 'Node Label', type: 'text', placeholder: 'e.g., Update Device', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'Target device', required: true },
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
};

export default function NodeConfigPanel() {
  const dispatch = useAppDispatch();
  const { nodes, selectedNodeId } = useAppSelector(state => state.workflow);
  const [activeTab, setActiveTab] = useState<'config' | 'info'>('config');
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Get selected node
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);

  // Get schema for this node type
  const schema = useMemo(() => {
    if (!selectedNode || !selectedNode.type) return null;
    return NODE_CONFIG_SCHEMAS[selectedNode.type as keyof typeof NODE_CONFIG_SCHEMAS] || [];
  }, [selectedNode]);

  // Initialize form data when node changes
  useMemo(() => {
    if (selectedNode?.data) {
      setFormData(selectedNode.data);
    }
  }, [selectedNode?.id]);

  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Select a node to configure
        </p>
      </div>
    );
  }

  const handleFieldChange = (key: string, value: any) => {
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    dispatch(updateNode({ id: selectedNode.id, data: updated }));
    // Trigger auto-save with 1-second debounce
    dispatch(triggerAutoSave() as any);
  };

  const getFieldValue = (key: string): any => {
    return formData[key] ?? '';
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
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No configuration options for this node type.</p>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-4">
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
                X: {selectedNode.position.x.toFixed(0)}, Y: {selectedNode.position.y.toFixed(0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
