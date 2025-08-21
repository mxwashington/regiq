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
import { SecurityProvider } from "@/components/SecurityProvider";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

import { usePWA } from "@/hooks/usePWA";
import { useCacheBuster } from "@/hooks/useCacheBuster";
import { useAnalytics } from "@/hooks/useAnalytics";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

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
const Suppliers = React.lazy(() => import("./pages/Suppliers").catch(() => ({ default: () => <div>Suppliers unavailable</div> })));

const Onboarding = React.lazy(() => import("./pages/Onboarding").catch(() => ({ default: () => <div>Onboarding unavailable</div> })));
const AdminAnalytics = React.lazy(() => import("./pages/AdminAnalytics").catch(() => ({ default: () => <div>Admin Analytics unavailable</div> })));
const PaymentSuccess = React.lazy(() => import("./pages/PaymentSuccess").catch(() => ({ default: () => <div>Success page unavailable</div> })));
const PaymentCanceled = React.lazy(() => import("./pages/PaymentCanceled").catch(() => ({ default: () => <div>Cancel page unavailable</div> })));
const Help = React.lazy(() => import("./pages/Help").catch(() => ({ default: () => <div>Help unavailable</div> })));
const ApiDocs = React.lazy(() => import("./pages/ApiDocs").catch(() => ({ default: () => <div>API Docs unavailable</div> })));


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
      
      <PWAInstallPrompt />
      <AIAccessProvider>
        <BrowserRouter>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              
              <div className="flex-1 flex flex-col">
                {/* Mobile header with sidebar trigger */}
                <header className="flex md:hidden items-center h-12 px-4 border-b bg-background">
                  <SidebarTrigger className="mr-4" />
                  <h1 className="font-semibold">RegIQ</h1>
                </header>
                
                <main className="flex-1">
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
              <Route path="/dashboard" element={<AuthGuard><UserDashboard /></AuthGuard>} />
              <Route path="/search" element={<AuthGuard><SearchPage /></AuthGuard>} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/account" element={<Account />} />
              <Route path="/suppliers" element={<AuthGuard><Suppliers /></AuthGuard>} />
              <Route path="/onboarding" element={<Onboarding />} />
               <Route path="/payment-success" element={<PaymentSuccess />} />
               <Route path="/payment-canceled" element={<PaymentCanceled />} />
               <Route path="/help" element={<Help />} />
               <Route path="/api-docs" element={<AuthGuard><ApiDocs /></AuthGuard>} />
              
              {/* SEO-optimized alert pages */}
              <Route path="/alerts" element={<AuthGuard><AllAlertsPage /></AuthGuard>} />
              <Route path="/alerts/:agency" element={<AuthGuard><AgencyPage /></AuthGuard>} />
              
              {/* Industry-specific pages */}
              <Route path="/food-safety" element={<FoodSafetyPage />} />
              <Route path="/pharma-compliance" element={<FoodSafetyPage />} />
              <Route path="/agricultural-alerts" element={<FoodSafetyPage />} />
              
              {/* Risk Intelligence pages */}
              <Route path="/risk-predictor" element={<AuthGuard><RiskPredictorPage /></AuthGuard>} />
              <Route path="/risk-dashboard" element={<AuthGuard><RiskDashboardPage /></AuthGuard>} />
              
              {/* Admin routes */}
              <Route path="/admin/*" element={
                <AuthGuard>
                  <AdminDashboard />
                </AuthGuard>
              } />
              <Route path="/admin/analytics" element={
                <AuthGuard>
                  <AdminAnalytics />
                </AuthGuard>
              } />
              
              {/* Other pages */}
              <Route path="/legal" element={<LegalFramework />} />
              <Route path="/debug" element={<Debug />} />
              <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </main>
              </div>
            </div>
            
          </SidebarProvider>
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
          <SecurityProvider>
            <DemoProvider>
              <TooltipProvider>
                <PWAApp />
              </TooltipProvider>
            </DemoProvider>
          </SecurityProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
