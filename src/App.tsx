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
import { useAnalytics } from "@/hooks/useAnalytics";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardErrorBoundary } from "@/components/DashboardErrorBoundary";

// Lazy load pages for better performance with error boundaries
const Debug = React.lazy(() => import("./pages/Debug").catch(() => ({ default: () => <div>Debug unavailable</div> })));
const Landing = React.lazy(() => import("./pages/Landing").catch(() => ({ default: () => <div>Landing unavailable</div> })));
const UserDashboard = React.lazy(() => import("./pages/UserDashboard").catch(() => ({ default: () => <div>Dashboard unavailable</div> })));
const Auth = React.lazy(() => import("./pages/Auth").catch(() => ({ default: () => <div>Auth unavailable</div> })));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback").catch(() => ({ default: () => <div>Callback unavailable</div> })));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard").catch(() => ({ default: () => <div>Admin unavailable</div> })));
const SearchPage = React.lazy(() => import("./pages/SearchPage").catch(() => ({ default: () => <div>Search unavailable</div> })));
const NotFound = React.lazy(() => import("./pages/NotFound").catch(() => ({ default: () => <div>Page not found</div> })));
const LegalFramework = React.lazy(() => import("./components/LegalFramework").then(m => ({ default: m.LegalFramework })).catch(() => ({ default: () => <div>Legal unavailable</div> })));
const UnifiedAuth = React.lazy(() => import("./components/UnifiedAuth").catch(() => ({ default: () => <div>Auth component unavailable</div> })));
const ResetPassword = React.lazy(() => import("./components/ResetPassword").catch(() => ({ default: () => <div>Reset unavailable</div> })));
const AuthGuard = React.lazy(() => import("./hooks/useAuthGuard").then(m => ({ default: m.AdminProtectedRoute })).catch(() => ({ default: ({ children }: any) => children })));
const RegIQFeedPage = React.lazy(() => import("./pages/RegIQFeedPage").catch(() => ({ default: () => <div>RegIQ Feed unavailable</div> })));
const AgencyPage = React.lazy(() => import("./pages/AgencyPage").catch(() => ({ default: () => <div>Agency page unavailable</div> })));
const AllAlertsPage = React.lazy(() => import("./pages/AllAlertsPage").catch(() => ({ default: () => <div>Alerts unavailable</div> })));
const FoodSafetyPage = React.lazy(() => import("./pages/FoodSafetyPage").catch(() => ({ default: () => <div>Food Safety unavailable</div> })));
const RiskPredictorPage = React.lazy(() => import("./pages/RiskPredictorPage").catch(() => ({ default: () => <div>Risk Predictor unavailable</div> })));
const RiskDashboardPage = React.lazy(() => import("./pages/RiskDashboardPage").catch(() => ({ default: () => <div>Risk Dashboard unavailable</div> })));
const Pricing = React.lazy(() => import("./pages/Pricing").catch(() => ({ default: () => <div>Pricing unavailable</div> })));
const Account = React.lazy(() => import("./pages/Account").catch(() => ({ default: () => <div>Account unavailable</div> })));
const MobileNavigation = React.lazy(() => import("./components/MobileNavigation").catch(() => ({ default: () => null })));


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

// Ensure analytics runs within Router context
const AnalyticsInitializer = () => {
  useAnalytics();
  return null;
};

// PWA-enabled App component
const PWAApp = () => {
  // Initialize PWA functionality
  usePWA();
  
  // Analytics initialized inside Router context via AnalyticsInitializer
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
            <AnalyticsInitializer />
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
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/account" element={<Account />} />
              
              {/* SEO-optimized alert pages */}
              <Route path="/alerts" element={<AllAlertsPage />} />
              <Route path="/alerts/:agency" element={<AgencyPage />} />
              
              {/* Industry-specific pages */}
              <Route path="/food-safety" element={<FoodSafetyPage />} />
              <Route path="/pharma-compliance" element={<FoodSafetyPage />} />
              <Route path="/agricultural-alerts" element={<FoodSafetyPage />} />
              
              {/* Risk Intelligence pages */}
              <Route path="/risk-predictor" element={<RiskPredictorPage />} />
              <Route path="/risk-dashboard" element={<RiskDashboardPage />} />
              
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
