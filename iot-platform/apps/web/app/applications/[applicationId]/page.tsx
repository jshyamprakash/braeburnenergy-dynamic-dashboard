'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { apiClient } from '@/lib/api-client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Edit2, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeviceForm } from '@/components/DeviceForm';
import CreateWorkflowModal from '@/components/workflow/CreateWorkflowModal';
import type { Application, Workflow as WorkflowType } from '@repo/types';
import type { Device } from '@/lib/types';

interface ApplicationDetailPageProps {
  params: {
    applicationId: string;
  };
}

function formatDate(dateString: string | Date): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ApplicationDetailContent({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'devices' | 'workflows' | 'dashboards'>('devices');
  const [isDeviceFormOpen, setIsDeviceFormOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);

  // Fetch application
  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const response = await apiClient.get<Application>(`/applications/${applicationId}`);
        setApplication(response.data);
      } catch (error) {
        toast.error('Failed to load application');
        router.push('/applications');
      }
    };
    fetchApplication();
  }, [applicationId, router]);

  // Fetch devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await apiClient.get<any>('/devices?limit=100&offset=0');
        const allDevices = response.data || [];
        // Filter by applicationId
        const filtered = allDevices.filter((d: Device) => (d as any).applicationId === applicationId);
        setDevices(filtered);
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      }
    };
    fetchDevices();
  }, [applicationId]);

  // Fetch workflows
  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await apiClient.get<WorkflowType[]>('/workflows');
        const allWorkflows = response.data || [];
        // Filter by applicationId
        const filtered = allWorkflows.filter((w) => (w as any).applicationId === applicationId);
        setWorkflows(filtered);
      } catch (error) {
        console.error('Failed to fetch workflows:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflows();
  }, [applicationId]);

  const handleDeviceFormSuccess = () => {
    setIsDeviceFormOpen(false);
    // Refresh devices list
    const fetchDevices = async () => {
      try {
        const response = await apiClient.get<any>('/devices?limit=100&offset=0');
        const allDevices = response.data || [];
        const filtered = allDevices.filter((d: Device) => (d as any).applicationId === applicationId);
        setDevices(filtered);
      } catch (error) {
        console.error('Failed to refresh devices:', error);
      }
    };
    fetchDevices();
  };

  const handleWorkflowSuccess = () => {
    setIsWorkflowModalOpen(false);
    // Refresh workflows list
    const fetchWorkflows = async () => {
      try {
        const response = await apiClient.get<WorkflowType[]>('/workflows');
        const allWorkflows = response.data || [];
        const filtered = allWorkflows.filter((w) => (w as any).applicationId === applicationId);
        setWorkflows(filtered);
      } catch (error) {
        console.error('Failed to refresh workflows:', error);
      }
    };
    fetchWorkflows();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500 dark:text-gray-400">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-red-600 dark:text-red-400">Application not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/applications"
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Back to applications"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{application.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                {application.slug}
              </code>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  application.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}
              >
                {application.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('devices')}
              className={`px-1 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'devices'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Devices ({devices.length})
            </button>
            <button
              onClick={() => setActiveTab('workflows')}
              className={`px-1 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'workflows'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Workflows ({workflows.length})
            </button>
            <button
              onClick={() => setActiveTab('dashboards')}
              className={`px-1 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'dashboards'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Dashboards
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'devices' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setIsDeviceFormOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Device
              </button>
            </div>
            {devices.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400">No devices in this application</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Attributes</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device) => (
                      <tr
                        key={device.deviceId}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 font-medium">
                          <Link
                            href={`/devices/${device.deviceId}`}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {device.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {device.attributes ? Object.keys(device.attributes).length : 0} fields
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(device.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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

        {activeTab === 'workflows' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setIsWorkflowModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Workflow
              </button>
            </div>
            {workflows.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400">No workflows in this application</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((workflow) => (
                      <tr
                        key={workflow.workflowId}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 font-medium">
                          <Link
                            href={`/workflows/${workflow.workflowId}`}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {workflow.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-block px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
                            {workflow.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {workflow.isEnabled ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">Enabled</span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Disabled</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {workflow.createdAt ? formatDate(workflow.createdAt) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboards' && (
          <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
            <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Dashboard builder coming soon</p>
          </div>
        )}

        {/* Modals */}
        <DeviceForm
          isOpen={isDeviceFormOpen}
          onClose={() => setIsDeviceFormOpen(false)}
          applicationId={applicationId}
          onSuccess={handleDeviceFormSuccess}
        />

        <CreateWorkflowModal
          isOpen={isWorkflowModalOpen}
          mode="create"
          applicationId={applicationId}
          onClose={() => setIsWorkflowModalOpen(false)}
          onSuccess={handleWorkflowSuccess}
        />
      </div>
    </div>
  );
}

export default function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  return (
    <ProtectedRoute>
      <ApplicationDetailContent applicationId={params.applicationId} />
    </ProtectedRoute>
  );
}
