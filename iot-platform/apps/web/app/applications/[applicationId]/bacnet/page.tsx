'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  useBacnetGateways,
  useCreateBacnetGateway,
  useUpdateBacnetGateway,
  useDeleteBacnetGateway,
  useStartBacnetGateway,
  useStopBacnetGateway,
  useTestBacnetConnection,
} from '@/lib/hooks/useBacnetGateways';
import type { Application, BacnetGateway, CreateBacnetGatewayInput } from '@repo/types';
import { BacnetGatewayTable } from '@/app/bacnet-gateways/_components/BacnetGatewayTable';
import { BacnetGatewayModal } from '@/app/bacnet-gateways/_components/BacnetGatewayModal';
import { BacnetGatewayDetailPanel } from '@/app/bacnet-gateways/_components/BacnetGatewayDetailPanel';

interface Props { params: Promise<{ applicationId: string }> }

export default function ApplicationBacnetPage({ params }: Props) {
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

  const { data, isLoading } = useBacnetGateways({ applicationId });
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
    if (editing) { await update.mutateAsync(data); toast.success('Gateway updated'); }
    else { await create.mutateAsync({ ...data, applicationId }); toast.success('Gateway created'); }
    setIsModalOpen(false); setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await del.mutateAsync(id); toast.success('Deleted'); setDeletingId(null);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><p className="text-slate-400 dark:text-slate-500">Loading…</p></div>;

  return (
    <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">{application?.name}</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">BACnet Gateway</h1>
          </div>
          <button onClick={() => { setEditing(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" /> Add Gateway
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
        ) : (
          <BacnetGatewayTable
            gateways={gateways}
            onEdit={(gw) => { setEditing(gw); setIsModalOpen(true); }}
            onDelete={setDeletingId}
            onStart={async (gw) => { try { await start.mutateAsync(gw.id); toast.success('Started'); } catch (e: any) { toast.error(e.message); } }}
            onStop={async (gw) => { try { await stop.mutateAsync(gw.id); toast.success('Stopped'); } catch (e: any) { toast.error(e.message); } }}
            onTest={async (gw) => { try { await test.mutateAsync(gw.id); toast.success('Connected'); } catch (e: any) { toast.error(e.message); } }}
            onDetail={(gw) => setDetailId(gw.id)}
          />
        )}

        <BacnetGatewayModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditing(null); }}
          onSubmit={handleSubmit} gateway={editing} applicationId={applicationId}
          isLoading={create.isPending || update.isPending} />

        {detail && <BacnetGatewayDetailPanel gateway={detail} onClose={() => setDetailId(null)}
          onStart={async (gw) => { try { await start.mutateAsync(gw.id); } catch {} }}
          onStop={async (gw) => { try { await stop.mutateAsync(gw.id); } catch {} }}
          onTest={async (gw) => { try { await test.mutateAsync(gw.id); } catch {} }}
          isStarting={start.isPending} isStopping={stop.isPending} isTesting={test.isPending} />}

        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 p-6 shadow-[var(--shadow-modal)] border border-slate-200 dark:border-slate-700">
              <h2 className="mb-2 text-base font-semibold text-rose-600">Delete Gateway</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This will stop polling and remove the configuration.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={() => handleDelete(deletingId)} disabled={del.isPending} className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors">{del.isPending ? 'Deleting…' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
