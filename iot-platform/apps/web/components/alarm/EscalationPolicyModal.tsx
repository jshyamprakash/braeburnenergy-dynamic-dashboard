'use client';

import { useState, useEffect } from 'react';
import type { EscalationPolicy, NotificationChannel, CreateEscalationPolicyBody, UpdateEscalationPolicyBody, EscalationPolicyTier, AlarmPrioritySeverity } from '@repo/types';
import { useNotificationChannels } from '@/lib/hooks/useAlarmNotifications';
import { toast } from 'sonner';
import { X, Plus, Trash2 } from 'lucide-react';

interface EscalationPolicyModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  policy?: EscalationPolicy;
  onClose: () => void;
  onSubmit: (body: CreateEscalationPolicyBody | UpdateEscalationPolicyBody) => Promise<void>;
  isLoading?: boolean;
}

const SEVERITY_OPTIONS: AlarmPrioritySeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export function EscalationPolicyModal({
  isOpen,
  mode,
  policy,
  onClose,
  onSubmit,
  isLoading = false,
}: EscalationPolicyModalProps) {
  const { data: channels } = useNotificationChannels();

  const [formData, setFormData] = useState({
    name: '',
    alarmRuleId: '',
    isActive: true,
    tiers: [] as EscalationPolicyTier[],
  });

  useEffect(() => {
    if (mode === 'edit' && policy) {
      setFormData({
        name: policy.name,
        alarmRuleId: policy.alarmRuleId || '',
        isActive: policy.isActive,
        tiers: policy.tiers || [],
      });
    } else {
      setFormData({
        name: '',
        alarmRuleId: '',
        isActive: true,
        tiers: [{ delayMinutes: 5, channelIds: [], minimumSeverity: 'HIGH' }],
      });
    }
  }, [mode, policy, isOpen]);

  const handleAddTier = () => {
    setFormData({
      ...formData,
      tiers: [
        ...formData.tiers,
        {
          delayMinutes: formData.tiers[formData.tiers.length - 1]?.delayMinutes || 5 + 5,
          channelIds: [],
          minimumSeverity: 'HIGH',
        },
      ],
    });
  };

  const handleRemoveTier = (index: number) => {
    setFormData({
      ...formData,
      tiers: formData.tiers.filter((_, i) => i !== index),
    });
  };

  const handleUpdateTier = (index: number, updates: Partial<EscalationPolicyTier>) => {
    const newTiers = [...formData.tiers];
    newTiers[index] = { ...newTiers[index], ...updates };
    setFormData({ ...formData, tiers: newTiers });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.tiers.length === 0) {
      toast.error('At least one tier is required');
      return;
    }

    try {
      const body: any = {
        name: formData.name,
        isActive: formData.isActive,
        tiers: formData.tiers,
      };
      if (formData.alarmRuleId) body.alarmRuleId = formData.alarmRuleId;

      await onSubmit(body);
      toast.success(mode === 'create' ? 'Policy created' : 'Policy updated');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save policy');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl my-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Create Escalation Policy' : 'Edit Escalation Policy'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Policy Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Alarm Rule (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Alarm Rule (optional)
            </label>
            <select
              value={formData.alarmRuleId}
              onChange={(e) => setFormData({ ...formData, alarmRuleId: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            >
              <option value="">-- All Alarms (Organization-wide) --</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to apply this policy to all alarms
            </p>
          </div>

          {/* Tiers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Escalation Tiers
              </label>
              <button
                type="button"
                onClick={handleAddTier}
                className="flex items-center gap-1 text-sm px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                Add Tier
              </button>
            </div>

            <div className="space-y-4">
              {formData.tiers.map((tier, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Tier {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Delay Minutes */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Delay (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={tier.delayMinutes}
                        onChange={(e) =>
                          handleUpdateTier(index, { delayMinutes: parseInt(e.target.value) || 1 })
                        }
                        className="w-full mt-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>

                    {/* Minimum Severity */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Min. Severity
                      </label>
                      <select
                        value={tier.minimumSeverity}
                        onChange={(e) =>
                          handleUpdateTier(index, {
                            minimumSeverity: e.target.value as AlarmPrioritySeverity,
                          })
                        }
                        className="w-full mt-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                      >
                        {SEVERITY_OPTIONS.map((sev) => (
                          <option key={sev} value={sev}>
                            {sev}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Channels */}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notification Channels
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {channels?.map((channel) => (
                        <label
                          key={channel.id}
                          className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={tier.channelIds.some((id: any) => id === channel.id)}
                            onChange={(e) => {
                              const newIds = e.target.checked
                                ? [...tier.channelIds, channel.id]
                                : tier.channelIds.filter((id: any) => id !== channel.id);
                              handleUpdateTier(index, { channelIds: newIds });
                            }}
                          />
                          {channel.name}
                        </label>
                      ))}
                    </div>
                    {!channels || channels.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        No notification channels created yet
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
