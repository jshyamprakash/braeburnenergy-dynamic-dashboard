'use client';

import { DashboardBuilder } from '@/components/dashboard/DashboardBuilder';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface DashboardDetailPageProps {
  params: {
    dashboardId: string;
  };
}

export default function DashboardDetailPage({ params }: DashboardDetailPageProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl flex items-center gap-4">
            <Link
              href="/dashboards"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Back to dashboards"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Editor</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                ID: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{params.dashboardId}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Builder */}
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <DashboardBuilder dashboardId={params.dashboardId} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
