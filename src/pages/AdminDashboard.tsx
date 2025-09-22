import React from "react";
import { Helmet } from "react-helmet-async";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { AdminDashboard as AdminDashboardComponent } from "@/components/AdminDashboard";
import { FDAAnalyticsDashboard } from "@/components/FDAAnalyticsDashboard";
import { SourceLinkManager } from "@/components/SourceLinkManager";
import { AdminNavigation } from "@/components/AdminNavigation";
import { AdminSecurityManager } from "@/components/AdminSecurityManager";
import { SecurityMonitoringDashboard } from "@/components/SecurityMonitoringDashboard";
import { SSOConfiguration } from "@/components/SSOConfiguration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAlertManager } from "@/components/AdminAlertManager";
import { UsageDashboard } from "@/components/UsageDashboard";
import { SecurityDashboardEnhanced } from "@/components/SecurityDashboardEnhanced";
// AdminAPIManager removed - using new regulatory system

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

  console.log('[AdminDashboard] Auth state:', { loading, isAuthenticated, isAdmin });

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
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="apis">APIs</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="sso">SSO</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics">
              <UsageDashboard />
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
              <div className="text-center py-8 text-muted-foreground">
                API Management has been replaced with the new Regulatory News system
              </div>
            </TabsContent>

            <TabsContent value="security">
              <SecurityDashboardEnhanced />
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
