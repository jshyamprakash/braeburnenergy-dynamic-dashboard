'use client';

import { OpcuaBrowseNode, OpcuaNodeClass } from '@repo/types';
import { ChevronRight, Folder, Variable, Loader2 } from 'lucide-react';

interface BrowseNodeItemProps {
  node: OpcuaBrowseNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isLoading: boolean;
  onExpand: (node: OpcuaBrowseNode) => void;
  onSelect: (node: OpcuaBrowseNode, selected: boolean) => void;
}

export function BrowseNodeItem({
  node,
  depth,
  isExpanded,
  isSelected,
  isLoading,
  onExpand,
  onSelect,
}: BrowseNodeItemProps) {
  const isObject = node.nodeClass === OpcuaNodeClass.Object;
  const isVariable = node.nodeClass === OpcuaNodeClass.Variable;
  const isExpandable = isObject || (node.hasChildren ?? false);

  return (
    <div className="flex items-center gap-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
      {/* Expand button */}
      {isExpandable ? (
        <button
          onClick={() => onExpand(node)}
          className="p-1 hover:bg-slate-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          ) : (
            <ChevronRight
              className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          )}
        </button>
      ) : (
        <div className="w-6" />
      )}

      {/* Icon */}
      {isObject ? (
        <Folder className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
      ) : (
        <Variable className="h-4 w-4 text-indigo-600 dark:text-blue-400 flex-shrink-0" />
      )}

      {/* Checkbox (Variables only) */}
      {isVariable && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(node, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer flex-shrink-0"
          title="Select this node"
        />
      )}

      {/* Name */}
      <span className="text-sm text-gray-700 dark:text-slate-300 truncate flex-1">
        {node.displayName || node.browseName}
      </span>

      {/* Node ID (small) */}
      <span className="text-xs text-slate-500 dark:text-slate-500 font-mono ml-2 flex-shrink-0">
        {node.nodeId}
      </span>
    </div>
  );
}
