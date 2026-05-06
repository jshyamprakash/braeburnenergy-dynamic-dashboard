'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

export type WorkspaceMap = Record<string, Record<string, unknown>>;

/**
 * Subscribe to workflow:workspace:update events for a given workflowId.
 *
 * Returns workspace namespaced by nodeId:
 *   workspace['node_abc123'] = { cd_pressure_rms: 1.23, cd_pressure_mean: 1.10 }
 *
 * Mirrors the useDeviceStateUpdates pattern in useWebSocket.ts.
 */
export function useWorkflowWorkspace(workflowId: string | null): { workspace: WorkspaceMap } {
  const [workspace, setWorkspace] = useState<WorkspaceMap>({});
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected || !workflowId) return;

    socket.emit('subscribe:workflow', workflowId);

    const handler = (msg: { workflowId: string; workspace: WorkspaceMap }) => {
      if (msg.workflowId !== workflowId) return;
      setWorkspace(prev => {
        const updated = { ...prev };
        for (const [nodeId, fields] of Object.entries(msg.workspace)) {
          updated[nodeId] = { ...(prev[nodeId] ?? {}), ...fields };
        }
        return updated;
      });
    };

    socket.on('workflow:workspace:update', handler);

    return () => {
      socket.emit('unsubscribe:workflow', workflowId);
      socket.off('workflow:workspace:update', handler);
    };
  }, [socket, isConnected, workflowId]);

  return { workspace };
}
