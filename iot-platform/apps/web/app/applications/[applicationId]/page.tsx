'use client';

import { apiClient } from '@/lib/api-client';
import { useState, useEffect, use } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Application, Workflow as WorkflowType, Device } from '@repo/types';
import { DevicesTab } from './_components/DevicesTab';
import { WorkflowsTab } from './_components/WorkflowsTab';
import { DashboardsTab } from './_components/DashboardsTab';
import { ModbusTab } from './_components/ModbusTab';

interface ApplicationDetailPageProps {
  params: Promise<{
    applicationId: string;
  }>;
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
  const [activeTab, setActiveTab] = useState<'devices' | 'workflows' | 'dashboards' | 'modbus'>('devices');

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

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await apiClient.get<any>(
          `/devices?limit=100&offset=0&applicationId=${applicationId}`
        );
        setDevices(response.data || []);
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      }
    };
    fetchDevices();
  }, [applicationId]);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await apiClient.get<WorkflowType[]>(
          `/workflows?applicationId=${applicationId}`
        );
        setWorkflows(response.data || []);
      } catch (error) {
        console.error('Failed to fetch workflows:', error);
      }
    };
    fetchWorkflows();
  }, [applicationId]);

  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const response = await apiClient.get<any>(`/dashboards?applicationId=${applicationId}`);
        setDashboards(response.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboards:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboards();
  }, [applicationId]);

  const refreshDevices = async () => {
    try {
      const response = await apiClient.get<any>(
        `/devices?limit=100&offset=0&applicationId=${applicationId}`
      );
      setDevices(response.data || []);
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    }
  };

  const refreshWorkflows = async () => {
    try {
      const response = await apiClient.get<WorkflowType[]>(
        `/workflows?applicationId=${applicationId}`
      );
      setWorkflows(response.data || []);
    } catch (error) {
      console.error('Failed to refresh workflows:', error);
    }
  };

  const refreshDashboards = async () => {
    try {
      const response = await apiClient.get<any>(`/dashboards?applicationId=${applicationId}`);
      setDashboards(response.data || []);
    } catch (error) {
      console.error('Failed to refresh dashboards:', error);
    }
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {application.name}
            </h1>
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
        {!loading &&
          (devices.length === 0 || workflows.length === 0 || dashboards.length === 0) && (
            <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
                POC Setup Guide
              </h3>
              <div className="space-y-2">
                {[
                  {
                    done: devices.length > 0,
                    label: 'Create a device and configure its field schema (Attributes tab)',
                  },
                  {
                    done: devices.length > 0,
                    label: `Run: pnpm run simulate -- --deviceId <device-id> --interval 2s`,
                    mono: true,
                  },
                  {
                    done: workflows.length > 0,
                    label: 'Create a workflow from the "Device State Processor" template',
                  },
                  {
                    done: dashboards.length > 0,
                    label: 'Create a dashboard and add Gauge/Chart blocks for your device',
                  },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        step.done
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200'
                      }`}
                    >
                      {step.done ? '✓' : i + 1}
                    </span>
                    <span
                      className={`text-sm text-blue-800 dark:text-blue-300 ${
                        step.mono
                          ? 'font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded text-xs'
                          : ''
                      }`}
                    >
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
              Dashboards ({dashboards.length})
            </button>
            <button
              onClick={() => setActiveTab('modbus')}
              className={`px-1 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'modbus'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Modbus
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'devices' && (
          <DevicesTab
            applicationId={applicationId}
            devices={devices}
            onRefresh={refreshDevices}
          />
        )}

        {activeTab === 'workflows' && (
          <WorkflowsTab
            applicationId={applicationId}
            workflows={workflows}
            deviceCount={devices.length}
            onRefresh={refreshWorkflows}
          />
        )}

        {activeTab === 'dashboards' && (
          <DashboardsTab
            applicationId={applicationId}
            dashboards={dashboards}
            deviceCount={devices.length}
            workflowCount={workflows.length}
            onRefresh={refreshDashboards}
          />
        )}

        {activeTab === 'modbus' && (
          <ModbusTab applicationId={applicationId} />
        )}
      </div>
    </div>
  );
}

export default function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { applicationId } = use(params);
  return <ApplicationDetailContent applicationId={applicationId} />;
}
