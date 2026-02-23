'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { apiClient } from '@/lib/api-client';
import { useState, useEffect, useCallback, use } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Edit2, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeviceForm } from '@/components/DeviceForm';
import CreateWorkflowModal from '@/components/workflow/CreateWorkflowModal';
import type { Application, Workflow as WorkflowType } from '@repo/types';
import type { Device } from '@/lib/types';
import { ulid } from 'ulid';

interface ApplicationDetailPageProps {
  params: Promise<{
    applicationId: string;
  }>;
}

function formatDate(dateString: string | Date): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface DashboardItem {
  _id: string;
  dashboardId: string;
  name: string;
  description?: string;
  blocks: Array<{ id: string }>;
  updatedAt: string;
}

function ApplicationDetailContent({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'devices' | 'workflows' | 'dashboards'>('devices');
  const [isDeviceFormOpen, setIsDeviceFormOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isCreateDashboardOpen, setIsCreateDashboardOpen] = useState(false);

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
      }
    };
    fetchWorkflows();
  }, [applicationId]);

  // Fetch dashboards
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const response = await apiClient.get<any>('/dashboards');
        const allDashboards = response.data || [];
        // Filter by applicationId
        const filtered = allDashboards.filter((d: DashboardItem) => (d as any).applicationId === applicationId);
        setDashboards(filtered);
      } catch (error) {
        console.error('Failed to fetch dashboards:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboards();
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

  const handleDashboardSuccess = () => {
    setIsCreateDashboardOpen(false);
    // Refresh dashboards list
    const fetchDashboards = async () => {
      try {
        const response = await apiClient.get<any>('/dashboards');
        const allDashboards = response.data || [];
        const filtered = allDashboards.filter((d: DashboardItem) => (d as any).applicationId === applicationId);
        setDashboards(filtered);
      } catch (error) {
        console.error('Failed to refresh dashboards:', error);
      }
    };
    fetchDashboards();
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

        {/* POC Setup Guide Banner */}
        {!loading && (devices.length === 0 || workflows.length === 0 || dashboards.length === 0) && (
          <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">POC Setup Guide</h3>
            <div className="space-y-2">
              {[
                { done: devices.length > 0, label: 'Create a device and configure its field schema (Attributes tab)' },
                { done: devices.length > 0, label: `Run: pnpm run simulate -- --deviceId <device-id> --interval 2s`, mono: true },
                { done: workflows.length > 0, label: 'Create a workflow from the "Device State Processor" template' },
                { done: dashboards.length > 0, label: 'Create a dashboard and add Gauge/Chart blocks for your device' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step.done ? 'bg-green-500 text-white' : 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200'}`}>
                    {step.done ? '✓' : i + 1}
                  </span>
                  <span className={`text-sm text-blue-800 dark:text-blue-300 ${step.mono ? 'font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded text-xs' : ''}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setIsCreateDashboardOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create Dashboard
              </button>
            </div>
            {dashboards.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400">No dashboards in this application</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Blocks</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Updated</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboards.map((dashboard) => (
                      <tr
                        key={dashboard.dashboardId}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 font-medium">
                          <Link
                            href={`/dashboards/${dashboard.dashboardId}`}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {dashboard.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {dashboard.blocks?.length || 0} blocks
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(dashboard.updatedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboards/${dashboard.dashboardId}`}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Link>
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

        {/* Create Dashboard Modal */}
        {isCreateDashboardOpen && (
          <CreateDashboardModalComponent
            applicationId={applicationId}
            onClose={() => setIsCreateDashboardOpen(false)}
            onSuccess={handleDashboardSuccess}
          />
        )}
      </div>
    </div>
  );
}

function CreateDashboardModalComponent({
  applicationId,
  onClose,
  onSuccess,
}: {
  applicationId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Dashboard name is required');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/dashboards', {
        dashboardId: ulid(),
        organizationId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        name: name.trim(),
        description: description.trim() || undefined,
        applicationId,
        blocks: [],
        layouts: {},
      });
      toast.success('Dashboard created successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900 dark:text-white shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Create Dashboard</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="e.g., Production Metrics"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { applicationId } = use(params);
  return (
    <ProtectedRoute>
      <ApplicationDetailContent applicationId={applicationId} />
    </ProtectedRoute>
  );
}
