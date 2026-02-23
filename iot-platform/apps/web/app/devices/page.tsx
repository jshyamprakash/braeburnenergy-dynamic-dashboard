'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useDevices, useDeleteDevice } from '@/lib/hooks/useDevices';
import { DeviceForm } from '@/components/DeviceForm';
import { apiClient } from '@/lib/api-client';
import type { Device } from '@/lib/types';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { openDeviceForm, closeDeviceForm, selectDeviceFormModal } from '@/lib/store/slices/uiSlice';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DevicesPage() {
  const { data, isLoading, error, refetch } = useDevices({ limit: 50 });
  const deleteDevice = useDeleteDevice();
  const [applicationCount, setApplicationCount] = useState<number | null>(null);

  const dispatch = useAppDispatch();
  const deviceFormModal = useAppSelector(selectDeviceFormModal);

  // Check if any applications exist
  useEffect(() => {
    const checkApplications = async () => {
      try {
        const response = await apiClient.get<any>('/applications?limit=1&offset=0');
        setApplicationCount((response as any).pagination?.total || 0);
      } catch (error) {
        // Silently fail - if applications API is not available, show banner anyway
        setApplicationCount(0);
      }
    };
    checkApplications();
  }, []);

  const handleCreateClick = () => {
    dispatch(openDeviceForm({ type: 'create' }));
  };

  const handleEditClick = (device: Device) => {
    dispatch(openDeviceForm({ type: 'edit', data: device }));
  };

  const handleDeleteClick = async (device: Device) => {
    if (confirm(`Are you sure you want to delete "${device.name}"?`)) {
      try {
        await deleteDevice.mutateAsync(device.deviceId);
      } catch (error) {
        alert('Failed to delete device. Please try again.');
      }
    }
  };

  const handleFormSuccess = () => {
    refetch();
  };

  return (
    <ProtectedRoute>
      {isLoading ? (
        <div className="bg-white shadow sm:rounded-lg p-6">
          <p className="text-gray-500">Loading devices...</p>
        </div>
      ) : error ? (
        <div className="bg-white shadow sm:rounded-lg p-6">
          <p className="text-red-600">Error: {error.message}</p>
          <p className="text-sm text-gray-500 mt-2">
            Make sure the API server is running on http://localhost:3001
          </p>
        </div>
      ) : (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Add Device
          </button>
        </div>

        {/* No Applications Banner */}
        {applicationCount === 0 && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  No applications exist yet
                </h3>
                <p className="mt-2 text-sm text-blue-700">
                  Applications are required to scope devices, workflows, and dashboards.{' '}
                  <Link href="/applications" className="font-semibold underline hover:text-blue-600">
                    Create an application first
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {data && data.devices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tags
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.devices.map((device) => (
                      <tr key={device.deviceId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          <Link
                            href={`/devices/${device.deviceId}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {device.deviceId}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {device.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(device.tags || {}).map(([key, value]) => (
                              <span
                                key={key}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                              >
                                {value ? `${key}: ${value}` : key}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(device.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditClick(device)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(device)}
                            className="text-red-600 hover:text-red-900"
                            disabled={deleteDevice.isPending}
                          >
                            {deleteDevice.isPending ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No devices</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first device.
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleCreateClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    + Create Device
                  </button>
                </div>
              </div>
            )}

            {data && data.pagination && (
              <div className="mt-4 text-sm text-gray-500">
                Showing {data.devices.length} of {data.pagination.total} devices
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Device Form Modal */}
      <DeviceForm
        isOpen={deviceFormModal.isOpen}
        onClose={() => dispatch(closeDeviceForm())}
        device={deviceFormModal.data}
        onSuccess={handleFormSuccess}
      />
    </>
      )}
    </ProtectedRoute>
  );
}
