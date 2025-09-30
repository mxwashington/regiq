import React from "react";
import { Helmet } from "react-helmet-async";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { AdminDashboard as AdminDashboardComponent } from "@/components/AdminDashboard";
import { FDAAnalyticsDashboard } from "@/components/FDAAnalyticsDashboard";
import { SourceLinkManager } from "@/components/SourceLinkManager";
import { AdminNavigation } from "@/components/AdminNavigation";
import { AdminSecurityManager } from "@/components/AdminSecurityManager";
import { SSOConfiguration } from "@/components/SSOConfiguration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAlertManager } from "@/components/AdminAlertManager";
import { UsageDashboard } from "@/components/UsageDashboard";
import { AdminAPIManager } from "@/components/AdminAPIManager";
import { AdminDataManager } from "@/components/AdminDataManager";

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

          <Tabs defaultValue="analytics" className="space-y-6">
            <TabsList className="flex flex-col w-full h-auto md:grid md:grid-cols-8 md:h-10">
              <TabsTrigger value="analytics" className="w-full justify-start md:justify-center">Analytics</TabsTrigger>
              <TabsTrigger value="data" className="w-full justify-start md:justify-center">Data Sync</TabsTrigger>
              <TabsTrigger value="users" className="w-full justify-start md:justify-center">Users</TabsTrigger>
              <TabsTrigger value="alerts" className="w-full justify-start md:justify-center">Alerts</TabsTrigger>
              <TabsTrigger value="apis" className="w-full justify-start md:justify-center">APIs</TabsTrigger>
              <TabsTrigger value="security" className="w-full justify-start md:justify-center">Security</TabsTrigger>
              <TabsTrigger value="sso" className="w-full justify-start md:justify-center">SSO</TabsTrigger>
              <TabsTrigger value="settings" className="w-full justify-start md:justify-center">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics">
              <UsageDashboard />
            </TabsContent>

            <TabsContent value="data">
              <AdminDataManager />
            </TabsContent>

            <TabsContent value="users">
              <div className="text-center p-8">
                <h3 className="text-lg font-medium">User Management</h3>
                <p className="text-muted-foreground">Manage user accounts and permissions</p>
              </div>
            </TabsContent>

            <TabsContent value="alerts">
              <AdminAlertManager />
            </TabsContent>

            <TabsContent value="apis">
              <AdminAPIManager />
            </TabsContent>

            <TabsContent value="security">
              <AdminSecurityManager />
            </TabsContent>

            <TabsContent value="sso">
              <SSOConfiguration />
            </TabsContent>

            <TabsContent value="settings">
              <div className="text-center p-8">
                <h3 className="text-lg font-medium">System Settings</h3>
                <p className="text-muted-foreground">Configure global application settings</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </>
  );
};

export default AdminDashboard;
