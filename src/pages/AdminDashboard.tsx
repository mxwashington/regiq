import React from "react";
import { Helmet } from "react-helmet-async";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { AdminSecurityManager } from "@/components/AdminSecurityManager";
import { SSOConfiguration } from "@/components/SSOConfiguration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAlertManager } from "@/components/AdminAlertManager";
import { UsageDashboard } from "@/components/UsageDashboard";
import { UnifiedDataPipelineManager } from "@/components/admin/UnifiedDataPipelineManager";
import { DataSourcesManager } from "@/components/admin/DataSourcesManager";
import { ErrorLogsViewer } from "@/components/admin/ErrorLogsViewer";

import { logger } from '@/lib/logger';
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const { loading, isAuthenticated, isAdmin } = useAuthGuard(true); // require admin

  logger.info('[AdminDashboard] Auth state:', { loading, isAuthenticated, isAdmin });

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | RegIQ</title>
        <meta name="description" content="Admin dashboard for managing users, sources, and analytics in RegIQ." />
        <link rel="canonical" href={`${window.location.origin}/admin`} />
      </Helmet>

      <section className="py-6 md:py-8">
        <div className="container mx-auto max-w-7xl px-4">
          <header className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
          </header>

          <div className="flex flex-col md:flex-row gap-6">
            <Tabs defaultValue="fda-cdc" className="w-full" orientation="vertical">
              <TabsList className="flex flex-col w-full md:w-48 h-auto gap-1 p-2 sticky top-6">
              <TabsTrigger value="fda-cdc" className="w-full justify-start md:justify-center">FDA & CDC Pipeline</TabsTrigger>
              <TabsTrigger value="data-sync" className="w-full justify-start md:justify-center">All Data Sources</TabsTrigger>
              <TabsTrigger value="error-logs" className="w-full justify-start md:justify-center">Error Logs</TabsTrigger>
              <TabsTrigger value="analytics" className="w-full justify-start md:justify-center">Analytics</TabsTrigger>
              <TabsTrigger value="alerts" className="w-full justify-start md:justify-center">Alerts</TabsTrigger>
              <TabsTrigger value="security" className="w-full justify-start md:justify-center">Security</TabsTrigger>
              <TabsTrigger value="sso" className="w-full justify-start md:justify-center">SSO</TabsTrigger>
              <TabsTrigger value="settings" className="w-full justify-start">Settings</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-w-0">
              <TabsContent value="fda-cdc" className="mt-0">
                <DataSourcesManager />
              </TabsContent>

              <TabsContent value="data-sync" className="mt-0">
                <UnifiedDataPipelineManager />
              </TabsContent>

              <TabsContent value="error-logs" className="mt-0">
                <ErrorLogsViewer />
              </TabsContent>

              <TabsContent value="analytics" className="mt-0">
                <UsageDashboard />
              </TabsContent>

              <TabsContent value="alerts" className="mt-0">
                <AdminAlertManager />
              </TabsContent>

              <TabsContent value="security" className="mt-0">
                <AdminSecurityManager />
              </TabsContent>

              <TabsContent value="sso" className="mt-0">
                <SSOConfiguration />
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <div className="text-center p-8">
                  <h3 className="text-lg font-medium">System Settings</h3>
                  <p className="text-muted-foreground">Configure global application settings</p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminDashboard;
