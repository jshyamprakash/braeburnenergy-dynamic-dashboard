'use client';

import { useCallback } from 'react';
import { ulid } from 'ulid';
import { useAppDispatch } from '@/lib/store';
import { addNode } from '@/lib/store/slices/workflowSlice';

/**
 * Node Palette Component
 *
 * Sidebar palette showing available node types for drag-and-drop.
 * Users can drag nodes from the palette onto the canvas.
 */

interface NodeTypeConfig {
  type: string;
  category: 'trigger' | 'condition' | 'action' | 'transform' | 'data' | 'logic';
  /** React Flow node type to render — new categories reuse existing visual components */
  visualType: 'trigger' | 'condition' | 'action' | 'transform';
  label: string;
  description: string;
  icon: string;
  defaultConfig: Record<string, any>;
}

const NODE_TYPES: NodeTypeConfig[] = [
  // Triggers
  {
    type: 'trigger:manual',
    category: 'trigger',
    visualType: 'trigger',
    label: 'Manual Trigger',
    description: 'Start workflow manually via API or UI',
    icon: '▶️',
    defaultConfig: {},
  },
  {
    type: 'trigger:deviceStateChange',
    category: 'trigger',
    visualType: 'trigger',
    label: 'Device State',
    description: 'Trigger when device state changes',
    icon: '📊',
    defaultConfig: { deviceId: '', field: '' },
  },
  {
    type: 'trigger:scheduled',
    category: 'trigger',
    visualType: 'trigger',
    label: 'Scheduled',
    description: 'Run on a cron schedule',
    icon: '⏰',
    defaultConfig: { cronExpression: '0 0 * * *' },
  },
  {
    type: 'trigger:alarmTriggered',
    category: 'trigger',
    visualType: 'trigger',
    label: 'Alarm',
    description: 'Trigger when alarm fires',
    icon: '🔔',
    defaultConfig: {},
  },

  // Conditions
  {
    type: 'condition:comparison',
    category: 'condition',
    visualType: 'condition',
    label: 'Comparison',
    description: 'Compare field to value (>, <, ==, etc.)',
    icon: '⚖️',
    defaultConfig: { field: '', operator: '>', value: 0 },
  },
  {
    type: 'condition:threshold',
    category: 'condition',
    visualType: 'condition',
    label: 'Threshold',
    description: 'Check if value is within range',
    icon: '📏',
    defaultConfig: { field: '', min: 0, max: 100 },
  },
  {
    type: 'condition:ifElse',
    category: 'condition',
    visualType: 'condition',
    label: 'If/Else',
    description: 'Evaluate expression',
    icon: '🔀',
    defaultConfig: { expression: '' },
  },
  // NOTE: condition:deviceStatus removed from palette (ADR-017 — stub node, no real implementation)
  // Backend enum entry retained for backwards compatibility with stored workflows.

  // Actions
  {
    type: 'action:sendNotification',
    category: 'action',
    visualType: 'action',
    label: 'Send Notification',
    description: 'Send email, SMS, or webhook',
    icon: '📧',
    defaultConfig: { message: '', channels: ['websocket'] },
  },
  {
    type: 'action:updateDevice',
    category: 'action',
    visualType: 'action',
    label: 'Update Device',
    description: 'Update device attributes',
    icon: '🔧',
    defaultConfig: { deviceId: '', updates: {} },
  },
  {
    type: 'action:createAlarm',
    category: 'action',
    visualType: 'action',
    label: 'Create Alarm',
    description: 'Trigger an alarm',
    icon: '🚨',
    defaultConfig: { deviceId: '', field: '', priority: 'MEDIUM' },
  },
  {
    type: 'action:callWebhook',
    category: 'action',
    visualType: 'action',
    label: 'Call Webhook',
    description: 'HTTP POST/GET to external URL',
    icon: '🌐',
    defaultConfig: { url: '', method: 'POST' },
  },
  {
    type: 'action:logMessage',
    category: 'action',
    visualType: 'action',
    label: 'Log Message',
    description: 'Log to console',
    icon: '📝',
    defaultConfig: { message: '', level: 'info' },
  },
  {
    type: 'action:writeDeviceState',
    category: 'action',
    visualType: 'action',
    label: 'Write Device State',
    description: 'Write structured data back to the triggering DeviceState',
    icon: '💾',
    defaultConfig: { mappings: [] },
  },

  // Transformations
  {
    type: 'transform:mathOperation',
    category: 'transform',
    visualType: 'transform',
    label: 'Math',
    description: 'Arithmetic operations (+, -, *, /)',
    icon: '🔢',
    defaultConfig: { field: '', operation: 'add', value: 0 },
  },
  {
    type: 'transform:stringOperation',
    category: 'transform',
    visualType: 'transform',
    label: 'String',
    description: 'String manipulation',
    icon: '📄',
    defaultConfig: { field: '', operation: 'uppercase' },
  },
  {
    type: 'transform:aggregation',
    category: 'transform',
    visualType: 'transform',
    label: 'Aggregation',
    description: 'Sum, average, min, max',
    icon: '📊',
    defaultConfig: { field: '', operation: 'sum' },
  },

  // Data (ADR-017 — renders as ActionNode visual, blue)
  {
    type: 'data:modbusRead',
    category: 'data',
    visualType: 'action',
    label: 'Modbus Read',
    description: 'Read register from Modbus gateway',
    icon: '📡',
    defaultConfig: { gatewayId: '', registerName: '', outputField: 'modbusData' },
  },
  {
    type: 'data:modbusWrite',
    category: 'data',
    visualType: 'action',
    label: 'Modbus Write',
    description: 'Write registers to Modbus gateway',
    icon: '✍️',
    defaultConfig: { gatewayId: '', startAddress: 0, values: [0] },
  },
  {
    type: 'data:queryDeviceStates',
    category: 'data',
    visualType: 'action',
    label: 'Query States',
    description: 'Fetch historical device state data',
    icon: '🗄️',
    defaultConfig: { deviceId: '', startTime: '', endTime: '', limit: 100, outputField: 'deviceStates' },
  },

  // Logic (ADR-017 — renders as TransformNode visual, purple)
  {
    type: 'logic:function',
    category: 'logic',
    visualType: 'transform',
    label: 'Function',
    description: 'Run custom JavaScript (sandboxed)',
    icon: '⚙️',
    defaultConfig: { code: '// result.value = data.value * 2;', outputField: 'computed' },
  },
];

export default function NodePalette() {
  const dispatch = useAppDispatch();

  const handleAddNode = useCallback(
    (nodeType: NodeTypeConfig) => {
      const nodeId = ulid();
      const newNode = {
        id: nodeId,
        type: nodeType.visualType, // Use visual component type (not semantic category)
        position: { x: 250, y: 200 }, // Default position (center-ish)
        data: {
          label: nodeType.label,
          description: nodeType.description,
          nodeType: nodeType.type, // Store semantic type for engine
          config: nodeType.defaultConfig,
        },
      };

      dispatch(addNode(newNode));
    },
    [dispatch]
  );

  const renderCategory = (category: string, nodes: NodeTypeConfig[]) => {
    const categoryNodes = nodes.filter(n => n.category === category);
    if (categoryNodes.length === 0) return null;

    const categoryColors: Record<string, string> = {
      trigger: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
      condition: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
      action: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
      transform: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
      data: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700',
      logic: 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700',
    };

    return (
      <div key={category} className="mb-4">
        <h3 className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-2">
          {category === 'data' ? 'Data' : category === 'logic' ? 'Logic' : `${category}s`}
        </h3>
        <div className="space-y-1">
          {categoryNodes.map(node => (
            <button
              key={node.type}
              onClick={() => handleAddNode(node)}
              className={`
                w-full text-left px-2 py-1.5 rounded-md border transition-all duration-150
                ${categoryColors[node.category] ?? categoryColors['action']}
                hover:shadow-sm hover:scale-[1.02] active:scale-95
              `}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-none">{node.icon}</span>
                <span className="font-medium text-xs text-gray-900 dark:text-gray-100 truncate">
                  {node.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-52 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-3">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
          Node Palette
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Click to add nodes to canvas
        </p>
      </div>

      {renderCategory('trigger', NODE_TYPES)}
      {renderCategory('condition', NODE_TYPES)}
      {renderCategory('action', NODE_TYPES)}
      {renderCategory('transform', NODE_TYPES)}
      {renderCategory('data', NODE_TYPES)}
      {renderCategory('logic', NODE_TYPES)}
    </div>
  );
}
