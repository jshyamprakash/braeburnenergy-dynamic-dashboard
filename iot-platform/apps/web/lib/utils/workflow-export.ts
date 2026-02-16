/**
 * Workflow Export/Import Utilities
 *
 * Handles JSON serialization and file I/O for workflow workflows
 */

import { ulid } from 'ulid';
import type { Node, Edge } from 'reactflow';

/**
 * Workflow JSON export format
 */
export interface WorkflowExportData {
  workflowId?: string;
  name: string;
  description?: string;
  tags: string[];
  nodes: Node[];
  edges: Edge[];
  isEnabled: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  version: number;
  exportedAt: string;
  exportedFrom: string; // App version/identifier
}

/**
 * Export workflow to JSON file
 * @param workflow - Workflow data to export
 * @param filename - Optional custom filename (auto-generated if not provided)
 */
export function exportWorkflowToJSON(
  workflow: {
    name: string;
    description?: string;
    tags: string[];
    nodes: Node[];
    edges: Edge[];
    isEnabled: boolean;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    version: number;
    workflowId?: string;
  },
  filename?: string
): void {
  const exportData: WorkflowExportData = {
    ...workflow,
    exportedAt: new Date().toISOString(),
    exportedFrom: 'IoT Platform v1.0',
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download =
    filename ||
    `workflow-${workflow.name.toLowerCase().replace(/\s+/g, '-')}-${new Date()
      .toISOString()
      .split('T')[0]}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Import workflow from JSON file
 * Returns promise that resolves with workflow data or rejects with error
 */
export function importWorkflowFromFile(file: File): Promise<WorkflowExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const jsonData = JSON.parse(content);

        // Validate structure
        validateImportedWorkflow(jsonData);

        // Regenerate workflowId to prevent collisions
        const processedData: WorkflowExportData = {
          ...jsonData,
          workflowId: ulid(), // Generate new ULID
        };

        resolve(processedData);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error('Failed to parse workflow file')
        );
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Validate imported workflow structure
 * Throws detailed error if validation fails
 */
export function validateImportedWorkflow(data: unknown): void {
  // Basic structure validation
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid workflow file: must be a JSON object');
  }

  const obj = data as Record<string, unknown>;

  // Required fields
  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    throw new Error('Workflow name is required and must be a non-empty string');
  }

  if (!Array.isArray(obj.nodes)) {
    throw new Error('Workflow nodes must be an array');
  }

  if (obj.nodes.length === 0) {
    throw new Error('Workflow must have at least one node');
  }

  if (!Array.isArray(obj.edges)) {
    throw new Error('Workflow edges must be an array');
  }

  // Optional fields with defaults
  if (obj.tags && !Array.isArray(obj.tags)) {
    throw new Error('Tags must be an array');
  }

  if (obj.priority && !['HIGH', 'MEDIUM', 'LOW'].includes(obj.priority as string)) {
    throw new Error('Invalid priority: must be HIGH, MEDIUM, or LOW');
  }

  if (obj.version && typeof obj.version !== 'number') {
    throw new Error('Version must be a number');
  }

  // Validate node structure
  validateNodes(obj.nodes as unknown[]);

  // Validate edge references
  validateEdges(obj.nodes as Node[], obj.edges as unknown[]);
}

/**
 * Validate node array
 */
function validateNodes(nodes: unknown[]): void {
  nodes.forEach((node, index) => {
    if (!node || typeof node !== 'object') {
      throw new Error(`Invalid node at index ${index}: must be an object`);
    }

    const n = node as Record<string, unknown>;

    if (typeof n.id !== 'string' || !n.id) {
      throw new Error(`Node at index ${index} has invalid id`);
    }

    if (typeof n.type !== 'string' || !n.type) {
      throw new Error(`Node at index ${index} has invalid type`);
    }

    if (!n.position || typeof n.position !== 'object') {
      throw new Error(`Node at index ${index} has invalid position`);
    }

    const pos = n.position as Record<string, unknown>;
    if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      throw new Error(`Node at index ${index} has invalid position coordinates`);
    }
  });
}

/**
 * Validate edges reference existing nodes
 */
function validateEdges(nodes: Node[], edges: unknown[]): void {
  const nodeIds = new Set(nodes.map((n) => n.id));

  edges.forEach((edge, index) => {
    if (!edge || typeof edge !== 'object') {
      throw new Error(`Invalid edge at index ${index}: must be an object`);
    }

    const e = edge as Record<string, unknown>;

    if (typeof e.id !== 'string' || !e.id) {
      throw new Error(`Edge at index ${index} has invalid id`);
    }

    if (typeof e.source !== 'string' || !e.source) {
      throw new Error(`Edge at index ${index} has invalid source`);
    }

    if (typeof e.target !== 'string' || !e.target) {
      throw new Error(`Edge at index ${index} has invalid target`);
    }

    if (!nodeIds.has(e.source as string)) {
      throw new Error(
        `Edge at index ${index} references unknown source node: ${e.source}`
      );
    }

    if (!nodeIds.has(e.target as string)) {
      throw new Error(
        `Edge at index ${index} references unknown target node: ${e.target}`
      );
    }
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
