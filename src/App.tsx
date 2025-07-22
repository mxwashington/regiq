import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AIAccessProvider } from "@/components/AIAccessProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoProvider } from "@/contexts/DemoContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { UpdateNotification } from "@/components/UpdateNotification";
import { usePWA } from "@/hooks/usePWA";
import { useCacheBuster } from "@/hooks/useCacheBuster";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardErrorBoundary } from "@/components/DashboardErrorBoundary";

// Lazy load pages for better performance
const Debug = React.lazy(() => import("./pages/Debug"));
const Landing = React.lazy(() => import("./pages/Landing"));
const UserDashboard = React.lazy(() => import("./pages/UserDashboard"));
const Auth = React.lazy(() => import("./pages/Auth"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const SearchPage = React.lazy(() => import("./pages/SearchPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const LegalFramework = React.lazy(() => import("./components/LegalFramework").then(m => ({ default: m.LegalFramework })));
const UnifiedAuth = React.lazy(() => import("./components/UnifiedAuth"));
const ResetPassword = React.lazy(() => import("./components/ResetPassword"));
const AuthGuard = React.lazy(() => import("./hooks/useAuthGuard").then(m => ({ default: m.AdminProtectedRoute })));
const RegIQFeedPage = React.lazy(() => import("./pages/RegIQFeedPage"));
const AgencyPage = React.lazy(() => import("./pages/AgencyPage"));
const AllAlertsPage = React.lazy(() => import("./pages/AllAlertsPage"));
const FoodSafetyPage = React.lazy(() => import("./pages/FoodSafetyPage"));
const MobileNavigation = React.lazy(() => import("./components/MobileNavigation"));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 1; // Reduced retry attempts for faster loading
      },
      retryDelay: attemptIndex => Math.min(300 * 2 ** attemptIndex, 3000), // Faster retries
      staleTime: 5 * 60 * 1000, // 5 minutes - shorter cache for fresher data
      gcTime: 15 * 60 * 1000, // 15 minutes cache
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
  
  // Initialize cache busting with optimized settings
  useCacheBuster({
    checkInterval: 15 * 60 * 1000, // Check every 15 minutes (reduced frequency)
    clearStaleDataInterval: 24 * 60 * 60 * 1000, // Clear stale data daily
    enableAutoRefresh: false // Don't auto-refresh, let user choose
  });
  
  return (
    <>
      <Toaster />
      <Sonner />
      <UpdateNotification />
      <PWAInstallPrompt />
      <AIAccessProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<UnifiedAuth />} />
              <Route path="/login" element={<UnifiedAuth />} />
              <Route path="/signup" element={<UnifiedAuth />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Main user pages */}
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/search" element={<SearchPage />} />
              
              {/* SEO-optimized alert pages */}
              <Route path="/alerts" element={<AllAlertsPage />} />
              <Route path="/alerts/:agency" element={<AgencyPage />} />
              
              {/* Industry-specific pages */}
              <Route path="/food-safety" element={<FoodSafetyPage />} />
              <Route path="/pharma-compliance" element={<FoodSafetyPage />} />
              <Route path="/agricultural-alerts" element={<FoodSafetyPage />} />
              
              {/* Admin routes */}
              <Route path="/admin/*" element={
                <AuthGuard>
                  <AdminDashboard />
                </AuthGuard>
              } />
              
              {/* Other pages */}
              <Route path="/legal" element={<LegalFramework />} />
              <Route path="/debug" element={<Debug />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MobileNavigation />
          </Suspense>
        </BrowserRouter>
      </AIAccessProvider>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DemoProvider>
            <TooltipProvider>
              <PWAApp />
            </TooltipProvider>
          </DemoProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
