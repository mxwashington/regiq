
import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoProvider } from "@/contexts/DemoContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { usePWA } from "@/hooks/usePWA";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardErrorBoundary } from "@/components/DashboardErrorBoundary";
// Lazy load pages for better performance with mobile-optimized imports
const Debug = React.lazy(() => import("./pages/Debug"));
const Landing = React.lazy(() => import("./pages/Landing"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Auth = React.lazy(() => import("./pages/Auth"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const SearchPage = React.lazy(() => import("./pages/SearchPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// Import components directly to avoid complex module transformations that fail on mobile
import { LegalFramework } from "@/components/LegalFramework";
import UnifiedAuth from "@/components/UnifiedAuth";
import ResetPassword from "@/components/ResetPassword";
import { AdminProtectedRoute } from "@/hooks/useAuthGuard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 2; // Reduced retry attempts
      },
      retryDelay: attemptIndex => Math.min(500 * 2 ** attemptIndex, 5000), // Faster retries
      staleTime: 10 * 60 * 1000, // 10 minutes - longer cache
      gcTime: 30 * 60 * 1000, // 30 minutes cache
    },
    mutations: {
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1; // Reduced retry attempts
      }
    }
  },
});

// Enhanced loading component with error fallback
const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// PWA-enabled App component
const PWAApp = () => {
  // Initialize PWA functionality
  usePWA();
  
  return (
    <>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<UnifiedAuth />} />
            <Route path="/login" element={<UnifiedAuth />} />
            <Route path="/signup" element={<UnifiedAuth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/admin/*" element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            } />
            <Route path="/legal" element={<LegalFramework />} />
            <Route path="/debug" element={<Debug />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <AuthProvider>
          <DemoProvider>
            <PWAApp />
          </DemoProvider>
        </AuthProvider>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
