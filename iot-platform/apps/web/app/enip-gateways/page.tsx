'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useEnipGateways,
  useCreateEnipGateway,
  useUpdateEnipGateway,
  useDeleteEnipGateway,
  useStartEnipGateway,
  useStopEnipGateway,
  useTestEnipConnection,
} from '@/lib/hooks/useEnipGateways';
import type { EnipGateway, CreateEnipGatewayInput } from '@repo/types';
import { EnipGatewayTable } from './_components/EnipGatewayTable';
import { EnipGatewayModal } from './_components/EnipGatewayModal';
import { EnipGatewayDetailPanel } from './_components/EnipGatewayDetailPanel';

export default function EnipGatewaysPage() {
  const { data, isLoading } = useEnipGateways();
  const gateways = data?.gateways || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<EnipGateway | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? (gateways.find((g) => g.id === detailId) ?? null) : null;

  const create = useCreateEnipGateway();
  const update = useUpdateEnipGateway(editing?.id || '');
  const del = useDeleteEnipGateway();
  const start = useStartEnipGateway();
  const stop = useStopEnipGateway();
  const test = useTestEnipConnection();

  const handleSubmit = async (data: CreateEnipGatewayInput) => {
    if (editing) {
      await update.mutateAsync(data);
      toast.success('Gateway updated');
    } else {
      await create.mutateAsync(data);
      toast.success('Gateway created');
    }
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await del.mutateAsync(id);
    toast.success('Gateway deleted');
    setDeletingId(null);
  };

  const handleStart = async (gw: EnipGateway) => {
    try { await start.mutateAsync(gw.id); toast.success('Polling started'); }
    catch (e: any) { toast.error(e.message || 'Failed to start'); }
  };

  const handleStop = async (gw: EnipGateway) => {
    try { await stop.mutateAsync(gw.id); toast.success('Polling stopped'); }
    catch (e: any) { toast.error(e.message || 'Failed to stop'); }
  };

  const handleTest = async (gw: EnipGateway) => {
    try { await test.mutateAsync(gw.id); toast.success('Connection successful'); }
    catch (e: any) { toast.error(e.message || 'Connection failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">EtherNet/IP Gateways</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage EtherNet/IP (CIP) connections to Allen-Bradley / Rockwell PLCs
          </p>
        </div>
        <button onClick={() => { setEditing(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">
          <Plus className="h-4 w-4" /> Add Gateway
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <EnipGatewayTable
          gateways={gateways}
          onEdit={(gw) => { setEditing(gw); setIsModalOpen(true); }}
          onDelete={setDeletingId}
          onStart={handleStart}
          onStop={handleStop}
          onTest={handleTest}
          onDetail={(gw) => setDetailId(gw.id)}
        />
      )}

      <EnipGatewayModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        gateway={editing}
        isLoading={create.isPending || update.isPending}
      />

      {detail && (
        <EnipGatewayDetailPanel
          gateway={detail}
          onClose={() => setDetailId(null)}
          onStart={handleStart}
          onStop={handleStop}
          onTest={handleTest}
          isStarting={start.isPending}
          isStopping={stop.isPending}
          isTesting={test.isPending}
        />
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-gray-900 shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-red-600">Delete Gateway</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will stop polling and remove the gateway configuration.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 font-medium">
                Cancel
              </button>
              <button onClick={() => handleDelete(deletingId)} disabled={del.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 font-medium">
                {del.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
