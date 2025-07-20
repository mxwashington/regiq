import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AdminNavigation } from '@/components/AdminNavigation';
import { FDAAnalyticsDashboard } from '@/components/FDAAnalyticsDashboard';
import { EnterpriseAdminDashboard } from '@/components/EnterpriseAdminDashboard';
import { DataRefreshButton } from '@/components/DataRefreshButton';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import Dashboard from './Dashboard';

const AdminDashboard = () => {
  const { loading: authLoading } = useAuthGuard(true);
  const navigate = useNavigate();

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
        <Route path="dashboard" element={
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/admin/user-view')}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View as User
                </Button>
                <DataRefreshButton />
              </div>
            </div>
            <EnterpriseAdminDashboard />
          </div>
        } />
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="user-view" element={
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">User Dashboard View</h1>
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Back to Admin
              </Button>
            </div>
            <Dashboard />
          </div>
        } />
        <Route path="user-management" element={<AdminNavigation />} />
        <Route path="analytics" element={<FDAAnalyticsDashboard />} />
        <Route path="settings" element={<AdminNavigation />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default AdminDashboard;