'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useMqttGateways,
  useCreateMqttGateway,
  useUpdateMqttGateway,
  useDeleteMqttGateway,
  useStartMqttGateway,
  useStopMqttGateway,
  useTestMqttConnection,
} from '@/lib/hooks/useMqttGateways';
import type { MqttGateway, CreateMqttGatewayInput } from '@repo/types';
import { MqttGatewayTable } from './_components/MqttGatewayTable';
import { MqttGatewayModal } from './_components/MqttGatewayModal';
import { MqttGatewayDetailPanel } from './_components/MqttGatewayDetailPanel';

export default function MqttGatewaysPage() {
  const { data: gatewayData, isLoading } = useMqttGateways();
  const gateways = gatewayData?.gateways || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<MqttGateway | null>(null);
  const [detailGatewayId, setDetailGatewayId] = useState<string | null>(null);

  const detailGateway = detailGatewayId
    ? gateways.find((g) => g.id === detailGatewayId) ?? null
    : null;

  const create = useCreateMqttGateway();
  const update = useUpdateMqttGateway(editingGateway?.id || '');
  const deleteMutation = useDeleteMqttGateway();
  const start = useStartMqttGateway();
  const stop = useStopMqttGateway();
  const test = useTestMqttConnection();

  const handleCreate = () => {
    setEditingGateway(null);
    setIsModalOpen(true);
  };

  const handleEdit = (gateway: MqttGateway) => {
    setEditingGateway(gateway);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: CreateMqttGatewayInput) => {
    try {
      if (editingGateway) {
        await update.mutateAsync(data);
        toast.success('Gateway updated');
      } else {
        await create.mutateAsync(data);
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
      await deleteMutation.mutateAsync(gatewayId);
      toast.success('Gateway deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete gateway');
    }
  };

  const handleStart = async (gateway: MqttGateway) => {
    try {
      if (!gateway.id) {
        toast.error('Invalid gateway ID');
        return;
      }
      await start.mutateAsync(gateway.id);
      toast.success('Connected');
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect');
    }
  };

  const handleStop = async (gateway: MqttGateway) => {
    try {
      if (!gateway.id) {
        toast.error('Invalid gateway ID');
        return;
      }
      await stop.mutateAsync(gateway.id);
      toast.success('Disconnected');
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect');
    }
  };

  const handleTest = async (gateway: MqttGateway) => {
    try {
      if (!gateway.id) {
        toast.error('Invalid gateway ID');
        return;
      }
      await test.mutateAsync(gateway.id);
      toast.success('Connection successful');
    } catch (error: any) {
      toast.error(error.message || 'Connection test failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">MQTT Gateways</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
            Manage MQTT broker connections and topic subscriptions
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Gateway
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <MqttGatewayTable
          gateways={gateways}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStart={handleStart}
          onStop={handleStop}
          onTest={handleTest}
          onDetail={(g) => setDetailGatewayId(g.id)}
          testingGatewayId={test.isPending ? editingGateway?.id || null : null}
        />
      )}

      <MqttGatewayModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGateway(null);
        }}
        onSubmit={handleSubmit}
        gateway={editingGateway}
        isLoading={create.isPending || update.isPending}
      />

      <MqttGatewayDetailPanel
        gateway={detailGateway}
        onClose={() => setDetailGatewayId(null)}
        onStart={handleStart}
        onStop={handleStop}
        onTest={handleTest}
        isStarting={start.isPending}
        isStopping={stop.isPending}
        isTesting={test.isPending}
      />
    </div>
  );
}
