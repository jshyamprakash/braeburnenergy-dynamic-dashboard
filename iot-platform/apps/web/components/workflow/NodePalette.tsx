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
  category: 'trigger' | 'condition' | 'action' | 'transform';
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
    label: 'Manual Trigger',
    description: 'Start workflow manually via API or UI',
    icon: '▶️',
    defaultConfig: {},
  },
  {
    type: 'trigger:deviceStateChange',
    category: 'trigger',
    label: 'Device State',
    description: 'Trigger when device state changes',
    icon: '📊',
    defaultConfig: { deviceId: '', field: '' },
  },
  {
    type: 'trigger:scheduled',
    category: 'trigger',
    label: 'Scheduled',
    description: 'Run on a cron schedule',
    icon: '⏰',
    defaultConfig: { cronExpression: '0 0 * * *' },
  },
  {
    type: 'trigger:alarmTriggered',
    category: 'trigger',
    label: 'Alarm',
    description: 'Trigger when alarm fires',
    icon: '🔔',
    defaultConfig: {},
  },

  // Conditions
  {
    type: 'condition:comparison',
    category: 'condition',
    label: 'Comparison',
    description: 'Compare field to value (>, <, ==, etc.)',
    icon: '⚖️',
    defaultConfig: { field: '', operator: '>', value: 0 },
  },
  {
    type: 'condition:threshold',
    category: 'condition',
    label: 'Threshold',
    description: 'Check if value is within range',
    icon: '📏',
    defaultConfig: { field: '', min: 0, max: 100 },
  },
  {
    type: 'condition:ifElse',
    category: 'condition',
    label: 'If/Else',
    description: 'Evaluate expression',
    icon: '🔀',
    defaultConfig: { expression: '' },
  },

  // Actions
  {
    type: 'action:sendNotification',
    category: 'action',
    label: 'Send Notification',
    description: 'Send email, SMS, or webhook',
    icon: '📧',
    defaultConfig: { message: '', channels: ['websocket'] },
  },
  {
    type: 'action:updateDevice',
    category: 'action',
    label: 'Update Device',
    description: 'Update device attributes',
    icon: '🔧',
    defaultConfig: { deviceId: '', updates: {} },
  },
  {
    type: 'action:createAlarm',
    category: 'action',
    label: 'Create Alarm',
    description: 'Trigger an alarm',
    icon: '🚨',
    defaultConfig: { deviceId: '', field: '', priority: 'MEDIUM' },
  },
  {
    type: 'action:callWebhook',
    category: 'action',
    label: 'Call Webhook',
    description: 'HTTP POST/GET to external URL',
    icon: '🌐',
    defaultConfig: { url: '', method: 'POST' },
  },
  {
    type: 'action:logMessage',
    category: 'action',
    label: 'Log Message',
    description: 'Log to console',
    icon: '📝',
    defaultConfig: { message: '', level: 'info' },
  },

  // Transformations
  {
    type: 'transform:mathOperation',
    category: 'transform',
    label: 'Math',
    description: 'Arithmetic operations (+, -, *, /)',
    icon: '🔢',
    defaultConfig: { field: '', operation: 'add', value: 0 },
  },
  {
    type: 'transform:stringOperation',
    category: 'transform',
    label: 'String',
    description: 'String manipulation',
    icon: '📄',
    defaultConfig: { field: '', operation: 'uppercase' },
  },
  {
    type: 'transform:aggregation',
    category: 'transform',
    label: 'Aggregation',
    description: 'Sum, average, min, max',
    icon: '📊',
    defaultConfig: { field: '', operation: 'sum' },
  },
];

export default function NodePalette() {
  const dispatch = useAppDispatch();

  const handleAddNode = useCallback(
    (nodeType: NodeTypeConfig) => {
      const nodeId = ulid();
      const newNode = {
        id: nodeId,
        type: nodeType.category,
        position: { x: 250, y: 200 }, // Default position (center-ish)
        data: {
          label: nodeType.label,
          description: nodeType.description,
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

    const categoryColors = {
      trigger: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
      condition: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
      action: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
      transform: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
    };

    return (
      <div key={category} className="mb-4">
        <h3 className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-2">
          {category}s
        </h3>
        <div className="space-y-2">
          {categoryNodes.map(node => (
            <button
              key={node.type}
              onClick={() => handleAddNode(node)}
              className={`
                w-full text-left p-3 rounded-lg border-2 transition-all duration-200
                ${categoryColors[node.category as keyof typeof categoryColors]}
                hover:shadow-md hover:scale-105 active:scale-95
              `}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{node.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {node.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {node.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
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
    </div>
  );
}
