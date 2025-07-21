
import React, { Suspense, useState, useEffect } from 'react';
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

// Lazy load pages for better performance
const Debug = React.lazy(() => import("./pages/Debug"));
const Landing = React.lazy(() => import("./pages/Landing"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Auth = React.lazy(() => import("./pages/Auth"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const SearchPage = React.lazy(() => import("./pages/SearchPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const LegalFramework = React.lazy(() => import("./components/LegalFramework").then(m => ({ default: m.LegalFramework })));
const UnifiedAuth = React.lazy(() => import("./components/UnifiedAuth"));
const ResetPassword = React.lazy(() => import("./components/ResetPassword"));
const AuthGuard = React.lazy(() => import("./hooks/useAuthGuard").then(m => ({ default: m.AdminProtectedRoute })));

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

// Safe wrapper to ensure React is ready
const SafeTooltipProvider = ({ children }: { children: React.ReactNode }) => {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Ensure React is fully initialized
    const timer = setTimeout(() => setIsReady(true), 0);
    return () => clearTimeout(timer);
  }, []);
  
  if (!isReady) {
    return <>{children}</>;
  }
  
  try {
    return <TooltipProvider>{children}</TooltipProvider>;
  } catch (error) {
    console.error('TooltipProvider failed:', error);
    return <>{children}</>;
  }
};

// PWA-enabled App component
const PWAApp = () => {
  // Initialize PWA functionality
  usePWA();
  
  return (
    <>
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
              <AuthGuard>
                <AdminDashboard />
              </AuthGuard>
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

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Toast components must be rendered BEFORE any component that uses useToast */}
        <Toaster />
        <Sonner />
        <AuthProvider>
          <DemoProvider>
            <SafeTooltipProvider>
              <PWAApp />
            </SafeTooltipProvider>
          </DemoProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
