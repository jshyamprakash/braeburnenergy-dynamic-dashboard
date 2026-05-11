'use client';

import { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useDeleteDevice } from '@/lib/hooks/useDevices';
import { DeviceForm } from '@/components/device/DeviceForm';
import { toast } from 'sonner';
import type { Device } from '@repo/types';

interface DevicesTabProps {
  applicationId: string;
  devices: Device[];
  onRefresh: () => Promise<void>;
}

export function DevicesTab({ applicationId, devices, onRefresh }: DevicesTabProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);
  const deleteDevice = useDeleteDevice();

  const handleDelete = useCallback(
    async (deviceId: string) => {
      try {
        await deleteDevice.mutateAsync(deviceId);
        toast.success('Device deleted');
        setDeletingDeviceId(null);
        await onRefresh();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete device');
      }
    },
    [deleteDevice, onRefresh]
  );

  const handleFormSuccess = useCallback(async () => {
    setIsFormOpen(false);
    setEditingDevice(null);
    await onRefresh();
  }, [onRefresh]);

  function formatDate(dateString: string | Date): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function isDeviceOnline(device: Device): boolean {
    if (!device.lastSeenAt) return false;
    const now = Date.now();
    const lastSeenMs = new Date(device.lastSeenAt).getTime();
    const offlineThresholdMs = 5 * 60 * 1000; // 5 minutes (ADR-041)
    return now - lastSeenMs < offlineThresholdMs;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Device
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-slate-200 dark:border-slate-700">
          <p className="text-gray-600 dark:text-slate-400">No devices in this application</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Attributes</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr
                  key={device.deviceId}
                  className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/devices/${device.deviceId}`}
                      className="text-indigo-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {device.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {isDeviceOnline(device) ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400"></span>
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-slate-300 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-gray-600 dark:bg-gray-400"></span>
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                    {device.attributes ? Object.keys(device.attributes).length : 0} fields
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                    {formatDate(device.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingDevice(device);
                          setIsFormOpen(true);
                        }}
                        className="text-indigo-600 hover:text-blue-700 dark:text-blue-400"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingDeviceId(device.deviceId)}
                        className="text-rose-600 hover:text-red-700 dark:text-red-400"
                        title="Delete"
                      >
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

      {/* Form Modal */}
      <DeviceForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDevice(null);
        }}
        device={editingDevice}
        applicationId={applicationId}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deletingDeviceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-slate-900 dark:text-white shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-rose-600">Delete Device</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              Are you sure? All device states and derived data will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingDeviceId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingDeviceId)}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
