'use client';

import { useEffect, useRef, useState } from 'react';
import { getAvailableVariables, formatVariableLabel } from '@/lib/utils/workflow-variables';

interface VariablePickerProps {
  nodeId: string;
  nodes: any[];
  edges: any[];
  onSelect: (variable: string) => void;
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
}

/**
 * VariablePicker - Dropdown for selecting variables to insert into expressions
 * Shows available variables from upstream nodes and user-defined variables
 */
export default function VariablePicker({
  nodeId,
  nodes,
  edges,
  onSelect,
  isOpen,
  onClose,
  position = { x: 0, y: 0 },
}: VariablePickerProps) {
  const [filter, setFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableVars = getAvailableVariables(nodeId, nodes, edges);
  const filteredVars = Object.entries(availableVars)
    .filter(([name]) => name.toLowerCase().includes(filter.toLowerCase()))
    .slice(0, 8); // Show max 8 suggestions

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 min-w-[250px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Filter input */}
      <input
        type="text"
        placeholder="Search variables..."
        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 text-sm border-b border-gray-200 dark:border-gray-600 focus:outline-none"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        autoFocus
      />

      {/* Variable list */}
      <div className="max-h-[280px] overflow-y-auto">
        {filteredVars.length > 0 ? (
          filteredVars.map(([name, description]) => (
            <button
              key={name}
              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              onClick={() => {
                onSelect(`{{${name}}}`);
                onClose();
              }}
            >
              <div className="font-mono text-blue-600 dark:text-blue-400">{`{{${name}}}`}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>
            </button>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            No variables available
          </div>
        )}
      </div>
    </div>
  );
}
