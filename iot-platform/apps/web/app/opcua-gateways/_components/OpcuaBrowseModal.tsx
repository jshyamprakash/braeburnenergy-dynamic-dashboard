'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { OpcuaBrowseNode, OpcuaNodeClass } from '@repo/types';
import { useBrowseNodes } from '@/lib/hooks/useOpcuaGateways';
import { BrowseNodeItem } from './BrowseNodeItem';
import { Loader2 } from 'lucide-react';

interface OpcuaBrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatewayId: string;
  onConfirm: (nodes: OpcuaBrowseNode[]) => void;
}

interface TreeNode extends OpcuaBrowseNode {
  _displayPath?: string;
}

export function OpcuaBrowseModal({
  isOpen,
  onClose,
  gatewayId,
  onConfirm,
}: OpcuaBrowseModalProps) {
  const browseNodes = useBrowseNodes();

  const [rootNodes, setRootNodes] = useState<TreeNode[]>([]);
  const [childrenCache, setChildrenCache] = useState<Map<string, TreeNode[]>>(new Map());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null);

  // Fetch root nodes on mount
  useEffect(() => {
    if (!isOpen || !gatewayId) return;

    const fetchRoot = async () => {
      setIsInitialLoading(true);
      try {
        const result = await browseNodes.mutateAsync({
          gatewayId,
          nodeId: 'RootFolder',
        });
        setRootNodes(result.nodes as TreeNode[]);
      } catch (error) {
        console.error('Failed to browse root:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchRoot();
    // Reset state when modal opens
    setChildrenCache(new Map());
    setExpandedNodes(new Set());
    setSelectedNodes(new Set());
  }, [isOpen, gatewayId, browseNodes]);

  const handleExpand = async (node: OpcuaBrowseNode) => {
    const nodeId = node.nodeId;
    const isCurrentlyExpanded = expandedNodes.has(nodeId);

    if (isCurrentlyExpanded) {
      // Collapse
      setExpandedNodes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    } else {
      // Expand — fetch children if not cached
      if (!childrenCache.has(nodeId)) {
        setExpandingNodeId(nodeId);
        try {
          const result = await browseNodes.mutateAsync({
            gatewayId,
            nodeId,
          });
          setChildrenCache((prev) => new Map(prev).set(nodeId, result.nodes as TreeNode[]));
        } catch (error) {
          console.error(`Failed to browse node ${nodeId}:`, error);
        } finally {
          setExpandingNodeId(null);
        }
      }

      setExpandedNodes((prev) => new Set(prev).add(nodeId));
    }
  };

  const handleSelect = (node: OpcuaBrowseNode, selected: boolean) => {
    setSelectedNodes((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(node.nodeId);
      } else {
        newSet.delete(node.nodeId);
      }
      return newSet;
    });
  };

  // Flatten tree for rendering
  const flattenedNodes: { node: TreeNode; depth: number }[] = [];
  const addNodeAndChildren = (nodes: TreeNode[], depth: number) => {
    for (const node of nodes) {
      flattenedNodes.push({ node, depth });
      if (expandedNodes.has(node.nodeId) && childrenCache.has(node.nodeId)) {
        const children = childrenCache.get(node.nodeId) || [];
        addNodeAndChildren(children, depth + 1);
      }
    }
  };
  addNodeAndChildren(rootNodes, 0);

  const handleConfirm = () => {
    const selected = flattenedNodes
      .filter(({ node }) => selectedNodes.has(node.nodeId))
      .map(({ node }) => node as OpcuaBrowseNode);
    onConfirm(selected);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Browse OPC-UA Server" size="lg">
      <div className="space-y-4">
        {/* Tree view */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 overflow-y-auto max-h-96 p-2">
          {isInitialLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : rootNodes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
              No nodes found. Check connection settings.
            </p>
          ) : (
            <div className="space-y-0.5">
              {flattenedNodes.map(({ node, depth }) => (
                <BrowseNodeItem
                  key={node.nodeId}
                  node={node}
                  depth={depth}
                  isExpanded={expandedNodes.has(node.nodeId)}
                  isSelected={selectedNodes.has(node.nodeId)}
                  isLoading={expandingNodeId === node.nodeId}
                  onExpand={handleExpand}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Selection count */}
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {selectedNodes.size} node{selectedNodes.size !== 1 ? 's' : ''} selected
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedNodes.size === 0 || browseNodes.isPending}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {browseNodes.isPending ? 'Loading...' : `Add ${selectedNodes.size} Mapping${selectedNodes.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
