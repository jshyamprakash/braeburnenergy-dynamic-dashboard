'use client';

import { DashboardBuilder } from '@/components/dashboard/DashboardBuilder';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DashboardBuilderPage() {
  return (
    <ProtectedRoute>
      <DashboardBuilder dashboardId="main" />
    </ProtectedRoute>
  );
}
