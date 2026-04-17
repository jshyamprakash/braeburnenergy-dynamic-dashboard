'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store';
import {
  useNotificationChannels,
  useCreateNotificationChannel,
  useUpdateNotificationChannel,
  useDeleteNotificationChannel,
  useEscalationPolicies,
  useCreateEscalationPolicy,
  useUpdateEscalationPolicy,
  useDeleteEscalationPolicy,
} from '@/lib/hooks/useAlarmNotifications';
import { NotificationChannelModal } from '@/components/alarm/NotificationChannelModal';
import { EscalationPolicyModal } from '@/components/alarm/EscalationPolicyModal';
import type { NotificationChannel, EscalationPolicy } from '@repo/types';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function AlarmManagementPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [activeTab, setActiveTab] = useState<'channels' | 'policies'>('channels');

  // Notification Channels
  const { data: channels, isLoading: channelsLoading } = useNotificationChannels();
  const createChannelMutation = useCreateNotificationChannel();
  const updateChannelMutation = useUpdateNotificationChannel();
  const deleteChannelMutation = useDeleteNotificationChannel();

  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);

  const handleCreateChannel = async (body: any) => {
    await createChannelMutation.mutateAsync(body);
  };

  const handleUpdateChannel = async (body: any) => {
    if (!editingChannel) return;
    await updateChannelMutation.mutateAsync({
      id: editingChannel.id,
      body,
    });
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('Delete this notification channel?')) return;
    try {
      await deleteChannelMutation.mutateAsync(id);
      toast.success('Channel deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete channel');
    }
  };

  // Escalation Policies
  const { data: policies, isLoading: policiesLoading } = useEscalationPolicies();
  const createPolicyMutation = useCreateEscalationPolicy();
  const updatePolicyMutation = useUpdateEscalationPolicy();
  const deletePolicyMutation = useDeleteEscalationPolicy();

  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<EscalationPolicy | null>(null);

  const handleCreatePolicy = async (body: any) => {
    await createPolicyMutation.mutateAsync(body);
  };

  const handleUpdatePolicy = async (body: any) => {
    if (!editingPolicy) return;
    await updatePolicyMutation.mutateAsync({
      id: editingPolicy.id,
      body,
    });
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Delete this escalation policy?')) return;
    try {
      await deletePolicyMutation.mutateAsync(id);
      toast.success('Policy deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete policy');
    }
  };

  // Admin check
  if (user?.role !== 'Admin' && user?.role !== 'SuperAdmin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Only Admin or SuperAdmin users can access this page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Alarm Management</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure notification channels and escalation policies
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('channels')}
              className={`py-3 px-4 font-medium border-b-2 -mb-px ${
                activeTab === 'channels'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              Notification Channels
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`py-3 px-4 font-medium border-b-2 -mb-px ${
                activeTab === 'policies'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              Escalation Policies
            </button>
          </div>
        </div>

        {/* Notification Channels Tab */}
        {activeTab === 'channels' && (
          <div>
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => {
                  setEditingChannel(null);
                  setIsChannelModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Channel
              </button>
            </div>

            {channelsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Loading channels...</p>
              </div>
            ) : !channels || channels.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400">No notification channels created</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((channel) => (
                      <tr
                        key={channel.id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {channel.name}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {channel.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {channel.isActive ? (
                            <span className="text-green-600 dark:text-green-400">Active</span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Inactive</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setEditingChannel(channel);
                              setIsChannelModalOpen(true);
                            }}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteChannel(channel.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Escalation Policies Tab */}
        {activeTab === 'policies' && (
          <div>
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => {
                  setEditingPolicy(null);
                  setIsPolicyModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Policy
              </button>
            </div>

            {policiesLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Loading policies...</p>
              </div>
            ) : !policies || policies.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400">No escalation policies created</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Alarm Rule</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Tiers</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((policy) => (
                      <tr
                        key={policy.id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {policy.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {policy.alarmRuleId ? 'Specific Rule' : 'Organization-wide'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {policy.tiers?.length || 0} tier{policy.tiers?.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {policy.isActive ? (
                            <span className="text-green-600 dark:text-green-400">Active</span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Inactive</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setEditingPolicy(policy);
                              setIsPolicyModalOpen(true);
                            }}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(policy.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <NotificationChannelModal
          isOpen={isChannelModalOpen}
          mode={editingChannel ? 'edit' : 'create'}
          channel={editingChannel || undefined}
          onClose={() => {
            setIsChannelModalOpen(false);
            setEditingChannel(null);
          }}
          onSubmit={editingChannel ? handleUpdateChannel : handleCreateChannel}
          isLoading={createChannelMutation.isPending || updateChannelMutation.isPending}
        />

        <EscalationPolicyModal
          isOpen={isPolicyModalOpen}
          mode={editingPolicy ? 'edit' : 'create'}
          policy={editingPolicy || undefined}
          onClose={() => {
            setIsPolicyModalOpen(false);
            setEditingPolicy(null);
          }}
          onSubmit={editingPolicy ? handleUpdatePolicy : handleCreatePolicy}
          isLoading={createPolicyMutation.isPending || updatePolicyMutation.isPending}
        />
      </div>
    </div>
  );
}
