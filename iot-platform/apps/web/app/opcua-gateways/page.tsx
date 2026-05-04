'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAppSelector } from '@/lib/store';
import {
  useGateways,
  useCreateGateway,
  useUpdateGateway,
  useDeleteGateway,
  useStartGateway,
  useStopGateway,
  useTestConnection,
} from '@/lib/hooks/useOpcuaGateways';
import type { OpcuaGateway, CreateOpcuaGatewayInput } from '@repo/types';
import { OpcuaGatewayTable } from './_components/OpcuaGatewayTable';
import { OpcuaGatewayModal } from './_components/OpcuaGatewayModal';
import { OpcuaGatewayDetailPanel } from './_components/OpcuaGatewayDetailPanel';

export default function OpcuaGatewaysPage() {
  const user = useAppSelector((state) => state.auth.user);
  const { data: gatewayData, isLoading: isLoadingGateways } = useGateways();
  const gateways = gatewayData?.gateways || [];
  const pagination = gatewayData?.pagination;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<OpcuaGateway | null>(null);
  const [deletingGatewayId, setDeletingGatewayId] = useState<string | null>(null);
  const [detailGatewayId, setDetailGatewayId] = useState<string | null>(null);

  // Always derive from the live list so the panel reflects post-stop/start state
  const detailGateway = detailGatewayId
    ? (gateways.find((g) => g.id === detailGatewayId) ?? null)
    : null;

  const createGateway = useCreateGateway();
  const updateGateway = useUpdateGateway(editingGateway?.id || '');
  const deleteGateway = useDeleteGateway();
  const startGateway = useStartGateway();
  const stopGateway = useStopGateway();
  const testConnection = useTestConnection();

  const handleCreateClick = () => {
    setEditingGateway(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (gateway: OpcuaGateway) => {
    setEditingGateway(gateway);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: CreateOpcuaGatewayInput) => {
    try {
      if (editingGateway) {
        await updateGateway.mutateAsync(data);
        toast.success('Gateway updated');
      } else {
        await createGateway.mutateAsync(data);
        toast.success('Gateway created');
      }
      setIsModalOpen(false);
      setEditingGateway(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save gateway');
    }
  };

  const handleDelete = async (gatewayId: string) => {
    try {
      await deleteGateway.mutateAsync(gatewayId);
      toast.success('Gateway deleted');
      setDeletingGatewayId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete gateway');
    }
  };

  const handleStart = async (gateway: OpcuaGateway) => {
    try {
      if (!gateway.id) {
        toast.error('Invalid gateway ID');
        return;
      }
      await startGateway.mutateAsync(gateway.id);
      toast.success('Gateway started');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start gateway');
    }
  };

  const handleStop = async (gateway: OpcuaGateway) => {
    try {
      if (!gateway.id) {
        toast.error('Invalid gateway ID');
        return;
      }
      await stopGateway.mutateAsync(gateway.id);
      toast.success('Gateway stopped');
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop gateway');
    }
  };

  const handleTest = async (gateway: OpcuaGateway) => {
    try {
      const gatewayId = gateway.id;
      if (!gatewayId) {
        toast.error('Invalid gateway ID');
        return;
      }
      await testConnection.mutateAsync(gatewayId);
      toast.success('Connection successful');
    } catch (error: any) {
      toast.error(error.message || 'Connection test failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            OPC-UA Gateways
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
            Manage OPC-UA connections to industrial devices
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Gateway
        </button>
      </div>

      {/* Table */}
      {isLoadingGateways ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <OpcuaGatewayTable
          gateways={gateways}
          onEdit={handleEditClick}
          onDelete={(id) => setDeletingGatewayId(id)}
          onStart={handleStart}
          onStop={handleStop}
          onTest={handleTest}
          onDetail={(g) => setDetailGatewayId(g.id)}
          isTesting={testConnection.isPending}
          testingGatewayId={null}
        />
      )}

      {/* Create/Edit Modal */}
      <OpcuaGatewayModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGateway(null);
        }}
        onSubmit={handleModalSubmit}
        gateway={editingGateway}
        isLoading={createGateway.isPending || updateGateway.isPending}
      />

      {/* Detail Panel */}
      {detailGateway && (
        <OpcuaGatewayDetailPanel
          gateway={detailGateway}
          onClose={() => setDetailGatewayId(null)}
          onStart={handleStart}
          onStop={handleStop}
          onTest={handleTest}
          isStarting={startGateway.isPending}
          isStopping={stopGateway.isPending}
          isTesting={testConnection.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingGatewayId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 p-6 shadow-[var(--shadow-modal)] border border-slate-200 dark:border-slate-700">
            <h2 className="mb-2 text-base font-semibold text-rose-600">
              Delete Gateway
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Are you sure? This will deactivate the gateway and remove its configuration.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingGatewayId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingGatewayId)}
                disabled={deleteGateway.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {deleteGateway.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
