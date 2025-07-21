import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoProvider } from "@/contexts/DemoContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { usePWA } from "@/hooks/usePWA";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardErrorBoundary } from "@/components/DashboardErrorBoundary";

// Lazy load pages for better performance
const Debug = React.lazy(() => import("./pages/Debug"));
const Landing = React.lazy(() => import("./pages/Landing"));
const Auth = React.lazy(() => import("./pages/Auth"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const SearchPage = React.lazy(() => import("./pages/SearchPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const LegalFramework = React.lazy(() => import("./components/LegalFramework").then(m => ({ default: m.LegalFramework })));
const UnifiedAuth = React.lazy(() => import("./components/UnifiedAuth"));
const ResetPassword = React.lazy(() => import("./components/ResetPassword"));
const AuthGuard = React.lazy(() => import("./hooks/useAuthGuard").then(m => ({ default: m.AdminProtectedRoute })));

// Main dashboard component (RegIQ Feed)
const RegIQFeedPage = React.lazy(() => import("./pages/RegIQFeedPage"));

// Optimized QueryClient with better performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Reduced retry attempts for better performance
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 5 * 60 * 1000, // 5 minutes - reasonable cache time
      gcTime: 15 * 60 * 1000, // 15 minutes garbage collection
      refetchOnWindowFocus: false, // Prevent excessive refetches
      refetchOnMount: 'always', // Always fetch fresh data on mount
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1;
      }
    }
  },
});

// Enhanced loading component
const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Loading RegIQ Dashboard...</p>
    </div>
  </div>
);

// Error fallback for route loading
const RouteErrorFallback = ({ error, retry }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="text-red-600 mb-4">
        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">Failed to load the page. Please try again.</p>
      <button 
        onClick={retry}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

// PWA-enabled App component
const PWAApp = () => {
  // Initialize PWA functionality
  usePWA();
  
  return (
    <>
      <ErrorBoundary fallback={RouteErrorFallback}>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Main dashboard routes - RegIQ Feed is now the primary dashboard */}
            <Route path="/" element={<RegIQFeedPage />} />
            <Route path="/dashboard" element={<RegIQFeedPage />} />
            
            {/* Legacy redirect - redirect /regiq to main dashboard */}
            <Route path="/regiq" element={<Navigate to="/dashboard" replace />} />
            
            {/* Authentication routes */}
            <Route path="/auth" element={<UnifiedAuth />} />
            <Route path="/login" element={<UnifiedAuth />} />
            <Route path="/signup" element={<UnifiedAuth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Feature routes */}
            <Route path="/search" element={<SearchPage />} />
            
            {/* Admin routes */}
            <Route path="/admin/*" element={
              <Suspense fallback={<PageLoadingFallback />}>
                <AuthGuard>
                  <AdminDashboard />
                </AuthGuard>
              </Suspense>
            } />
            
            {/* Utility routes */}
            <Route path="/legal" element={<LegalFramework />} />
            <Route path="/debug" element={<Debug />} />
            
            {/* Landing page for unauthenticated users */}
            <Route path="/landing" element={<Landing />} />
            
            {/* 404 fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
};

// Main App component with all providers
const App = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary fallback={RouteErrorFallback}>
            <AuthProvider>
              <DemoProvider>
                <BrowserRouter>
                  <Toaster />
                  <Sonner />
                  <PWAInstallPrompt />
                  <PWAApp />
                </BrowserRouter>
              </DemoProvider>
            </AuthProvider>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;