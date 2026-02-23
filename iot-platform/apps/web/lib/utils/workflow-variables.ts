/**
 * Workflow Variable Utilities
 *
 * Extract and compute available variables for expression binding.
 */

/**
 * Get all variables available for a node based on upstream nodes
 * Returns { variableName: description } map
 */
export function getAvailableVariables(
  nodeId: string,
  nodes: any[],
  edges: any[]
): Record<string, string> {
  const variables: Record<string, string> = {};

  // Always include trigger output
  variables['trigger'] = 'Trigger node data';

  // Find all upstream nodes (nodes that connect to this node)
  const upstreamNodeIds = findUpstreamNodes(nodeId, nodes, edges);

  // Extract variable names from upstream nodes
  for (const upNodeId of upstreamNodeIds) {
    const upNode = nodes.find(n => n.id === upNodeId);
    if (upNode) {
      const nodeLabel = upNode.data.label || upNodeId;
      variables[upNodeId] = `Output from ${nodeLabel}`;
    }
  }

  // User-defined variables (from action:updateVariable nodes)
  for (const node of nodes) {
    if (node.data.nodeType === 'action:updateVariable') {
      const varName = node.data.config?.variableName;
      if (varName) {
        variables[`variables.${varName}`] = `User variable: ${varName}`;
      }
    }
  }

  return variables;
}

/**
 * Find all upstream nodes (nodes that can be reached by traversing edges backward)
 */
function findUpstreamNodes(nodeId: string, nodes: any[], edges: any[]): string[] {
  const visited = new Set<string>();
  const queue: string[] = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Find edges that end at this node (predecessors)
    const incomingEdges = edges.filter(e => e.target === currentId);

    for (const edge of incomingEdges) {
      if (!visited.has(edge.source)) {
        queue.push(edge.source);
      }
    }
  }

  // Remove the query node itself
  visited.delete(nodeId);
  return Array.from(visited);
}

/**
 * Get available field paths for a specific variable
 * Returns suggestions like "trigger.temperature", "nodeA.result", etc.
 */
export function getVariableFieldSuggestions(
  variableName: string,
  nodeId: string,
  nodes: any[],
  edges: any[]
): string[] {
  const suggestions: string[] = [];

  if (variableName === 'trigger') {
    // Trigger outputs - get from schema or defaults
    suggestions.push('trigger.data', 'trigger.timestamp', 'trigger.type');
  } else if (variableName.startsWith('variables.')) {
    // User variables are scalars, no deep paths
    suggestions.push(variableName);
  } else {
    // Node outputs - suggest common fields
    suggestions.push(`${variableName}.data`, `${variableName}.result`, `${variableName}.output`);
  }

  return suggestions;
}

/**
 * Format variable for display in dropdown
 */
export function formatVariableLabel(name: string, description: string): string {
  return `{{${name}}} - ${description}`;
}
