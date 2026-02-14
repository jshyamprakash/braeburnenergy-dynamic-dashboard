'use client';

import type { ReactElement } from 'react';
import type { DashboardBlock } from './DashboardBuilder';

interface BlockPaletteProps {
  onAddBlock: (type: DashboardBlock['type']) => void;
  onClose: () => void;
}

/**
 * BlockPalette Component
 *
 * Sidebar showing available block types that can be added to the dashboard
 */
export function BlockPalette({ onAddBlock, onClose }: BlockPaletteProps) {
  const blockTypes: Array<{
    type: DashboardBlock['type'];
    name: string;
    description: string;
    icon: ReactElement;
  }> = [
    {
      type: 'gauge',
      name: 'Gauge',
      description: 'Display a single value with thresholds',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
        </svg>
      ),
    },
    {
      type: 'chart',
      name: 'Time-Series Chart',
      description: 'Visualize historical data over time',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      ),
    },
    {
      type: 'liveStream',
      name: 'Live Stream',
      description: 'Real-time data feed from devices',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Add Blocks
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Close palette"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 dark:text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Block Types */}
      <div className="p-4 space-y-3">
        {blockTypes.map((blockType) => (
          <button
            key={blockType.type}
            onClick={() => onAddBlock(blockType.type)}
            className="w-full p-4 text-left bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                {blockType.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {blockType.name}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {blockType.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          How to use:
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 mb-3">
          <li>• Click a block type to add it to your dashboard</li>
          <li>• Drag blocks to reposition them</li>
          <li>• Resize blocks by dragging corners or edges</li>
          <li>• Click the settings icon (⋮) to open block options</li>
          <li>• Select "Edit Settings" to configure properties</li>
          <li>• Select "Duplicate Block" to create a copy</li>
        </ul>
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          Keyboard shortcuts:
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <li>• <kbd className="px-1 bg-blue-100 dark:bg-blue-900/40 rounded">Delete</kbd> - Remove selected block</li>
          <li>• <kbd className="px-1 bg-blue-100 dark:bg-blue-900/40 rounded">Ctrl+D</kbd> - Duplicate selected block</li>
          <li>• <kbd className="px-1 bg-blue-100 dark:bg-blue-900/40 rounded">Esc</kbd> - Close config panel</li>
        </ul>
      </div>
    </div>
  );
}
