import React from "react";
import { Helmet } from "react-helmet-async";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { AdminDashboard as AdminDashboardComponent } from "@/components/AdminDashboard";
import { FDAAnalyticsDashboard } from "@/components/FDAAnalyticsDashboard";
import { SourceLinkManager } from "@/components/SourceLinkManager";
import { AdminNavigation } from "@/components/AdminNavigation";

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

          <AdminNavigation />

          <main className="mt-6">
            <Routes>
              <Route index element={<AdminDashboardComponent />} />
              <Route path="dashboard" element={<AdminDashboardComponent />} />
              <Route path="analytics" element={<FDAAnalyticsDashboard />} />
              <Route path="source-links" element={<SourceLinkManager />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
      </section>
    </>
  );
};

export default AdminDashboard;
