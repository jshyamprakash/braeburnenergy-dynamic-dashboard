'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  useEnipGateways,
  useCreateEnipGateway,
  useUpdateEnipGateway,
  useDeleteEnipGateway,
  useStartEnipGateway,
  useStopEnipGateway,
  useTestEnipConnection,
} from '@/lib/hooks/useEnipGateways';
import type { Application, EnipGateway, CreateEnipGatewayInput } from '@repo/types';
import { EnipGatewayTable } from '@/app/enip-gateways/_components/EnipGatewayTable';
import { EnipGatewayModal } from '@/app/enip-gateways/_components/EnipGatewayModal';
import { EnipGatewayDetailPanel } from '@/app/enip-gateways/_components/EnipGatewayDetailPanel';

interface Props { params: Promise<{ applicationId: string }> }

export default function ApplicationEnipPage({ params }: Props) {
  const { applicationId } = use(params);
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<Application>(`/applications/${applicationId}`)
      .then((res) => setApplication(res.data))
      .catch(() => router.push('/applications'))
      .finally(() => setLoading(false));
  }, [applicationId, router]);

  const { data, isLoading } = useEnipGateways({ applicationId });
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
    if (editing) { await update.mutateAsync(data); toast.success('Gateway updated'); }
    else { await create.mutateAsync({ ...data, applicationId }); toast.success('Gateway created'); }
    setIsModalOpen(false); setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await del.mutateAsync(id); toast.success('Deleted'); setDeletingId(null);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center"><p className="text-gray-500">Loading…</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{application?.name}</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">EtherNet/IP Gateway</h1>
          </div>
          <button onClick={() => { setEditing(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">
            <Plus className="h-4 w-4" /> Add Gateway
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <EnipGatewayTable
            gateways={gateways}
            onEdit={(gw) => { setEditing(gw); setIsModalOpen(true); }}
            onDelete={setDeletingId}
            onStart={async (gw) => { try { await start.mutateAsync(gw.id); toast.success('Started'); } catch (e: any) { toast.error(e.message); } }}
            onStop={async (gw) => { try { await stop.mutateAsync(gw.id); toast.success('Stopped'); } catch (e: any) { toast.error(e.message); } }}
            onTest={async (gw) => { try { await test.mutateAsync(gw.id); toast.success('Connected'); } catch (e: any) { toast.error(e.message); } }}
            onDetail={(gw) => setDetailId(gw.id)}
          />
        )}

        <EnipGatewayModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditing(null); }}
          onSubmit={handleSubmit} gateway={editing} applicationId={applicationId}
          isLoading={create.isPending || update.isPending} />

        {detail && <EnipGatewayDetailPanel gateway={detail} onClose={() => setDetailId(null)}
          onStart={async (gw) => { try { await start.mutateAsync(gw.id); } catch {} }}
          onStop={async (gw) => { try { await stop.mutateAsync(gw.id); } catch {} }}
          onTest={async (gw) => { try { await test.mutateAsync(gw.id); } catch {} }}
          isStarting={start.isPending} isStopping={stop.isPending} isTesting={test.isPending} />}

        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-gray-900 shadow-xl">
              <h2 className="mb-2 text-xl font-bold text-red-600">Delete Gateway</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">This will stop polling and remove the configuration.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeletingId(null)} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 font-medium">Cancel</button>
                <button onClick={() => handleDelete(deletingId)} disabled={del.isPending} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 font-medium">{del.isPending ? 'Deleting…' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
