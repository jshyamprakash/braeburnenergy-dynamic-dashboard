'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useBacnetGateways,
  useCreateBacnetGateway,
  useUpdateBacnetGateway,
  useDeleteBacnetGateway,
  useStartBacnetGateway,
  useStopBacnetGateway,
  useTestBacnetConnection,
} from '@/lib/hooks/useBacnetGateways';
import type { BacnetGateway, CreateBacnetGatewayInput } from '@repo/types';
import { BacnetGatewayTable } from './_components/BacnetGatewayTable';
import { BacnetGatewayModal } from './_components/BacnetGatewayModal';
import { BacnetGatewayDetailPanel } from './_components/BacnetGatewayDetailPanel';

export default function BacnetGatewaysPage() {
  const { data, isLoading } = useBacnetGateways();
  const gateways = data?.gateways || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<BacnetGateway | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? (gateways.find((g) => g.id === detailId) ?? null) : null;

  const create = useCreateBacnetGateway();
  const update = useUpdateBacnetGateway(editing?.id || '');
  const del = useDeleteBacnetGateway();
  const start = useStartBacnetGateway();
  const stop = useStopBacnetGateway();
  const test = useTestBacnetConnection();

  const handleSubmit = async (data: CreateBacnetGatewayInput) => {
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

  const handleStart = async (gw: BacnetGateway) => {
    try { await start.mutateAsync(gw.id); toast.success('Polling started'); }
    catch (e: any) { toast.error(e.message || 'Failed to start'); }
  };

  const handleStop = async (gw: BacnetGateway) => {
    try { await stop.mutateAsync(gw.id); toast.success('Polling stopped'); }
    catch (e: any) { toast.error(e.message || 'Failed to stop'); }
  };

  const handleTest = async (gw: BacnetGateway) => {
    try { await test.mutateAsync(gw.id); toast.success('Connection successful'); }
    catch (e: any) { toast.error(e.message || 'Connection failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">BACnet Gateways</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage BACnet/IP connections for building automation systems
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
        <BacnetGatewayTable
          gateways={gateways}
          onEdit={(gw) => { setEditing(gw); setIsModalOpen(true); }}
          onDelete={setDeletingId}
          onStart={handleStart}
          onStop={handleStop}
          onTest={handleTest}
          onDetail={(gw) => setDetailId(gw.id)}
        />
      )}

      <BacnetGatewayModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        gateway={editing}
        isLoading={create.isPending || update.isPending}
      />

      {detail && (
        <BacnetGatewayDetailPanel
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
