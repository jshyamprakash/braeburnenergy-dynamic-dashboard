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
import { Plus, Edit2, Trash2, Mail, Webhook, Bell } from 'lucide-react';

const channelTypeIcon: Record<string, React.ReactNode> = {
  email:   <Mail className="w-3.5 h-3.5" />,
  webhook: <Webhook className="w-3.5 h-3.5" />,
  'in-app': <Bell className="w-3.5 h-3.5" />,
};

const channelTypeBadge: Record<string, string> = {
  email:   'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  webhook: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'in-app':'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
          <p className="mt-4 text-slate-500 dark:text-slate-400">
            Only Admin or SuperAdmin users can access this page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alarm Management</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Configure notification channels and escalation policies
            </p>
          </div>
        </div>

        {/* Pill Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1 w-fit">
          {([
            { key: 'channels', label: 'Notification Channels' },
            { key: 'policies', label: 'Escalation Policies' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                activeTab === key
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              {label}
            </button>
          ))}
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Channel
              </button>
            </div>

            {channelsLoading ? (
              <div className="text-center py-12">
                <p className="text-slate-400 dark:text-slate-500">Loading channels...</p>
              </div>
            ) : !channels || channels.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">No notification channels created</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {channels.map((channel) => (
                      <tr key={channel.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{channel.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${channelTypeBadge[channel.type] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {channelTypeIcon[channel.type]}
                            {channel.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${channel.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${channel.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {channel.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingChannel(channel); setIsChannelModalOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteChannel(channel.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Policy
              </button>
            </div>

            {policiesLoading ? (
              <div className="text-center py-12">
                <p className="text-slate-400 dark:text-slate-500">Loading policies...</p>
              </div>
            ) : !policies || policies.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">No escalation policies created</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Scope</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tiers</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {policies.map((policy) => (
                      <tr key={policy.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{policy.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {policy.alarmRuleId ? 'Specific Rule' : 'Organization-wide'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                            {policy.tiers?.length || 0} tier{policy.tiers?.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${policy.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${policy.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {policy.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingPolicy(policy); setIsPolicyModalOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeletePolicy(policy.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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
  );
}
