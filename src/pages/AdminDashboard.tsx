import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AdminNavigation } from '@/components/AdminNavigation';
import { FDAAnalyticsDashboard } from '@/components/FDAAnalyticsDashboard';
import { EnterpriseAdminDashboard } from '@/components/EnterpriseAdminDashboard';
import { DataFreshnessIndicator } from '@/components/DataFreshnessIndicator';
import { AlertsCleanStatus } from '@/components/AlertsCleanStatus';

const AdminDashboard = () => {
  const { loading: authLoading } = useAuthGuard(true);

  if (authLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Routes>
        <Route index element={
          <div className="space-y-6">
            <AlertsCleanStatus />
            <DataFreshnessIndicator />
            <EnterpriseAdminDashboard />
          </div>
        } />
        <Route path="user-management" element={<AdminNavigation />} />
        <Route path="analytics" element={<FDAAnalyticsDashboard />} />
        <Route path="settings" element={<AdminNavigation />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
};

export default AdminDashboard;