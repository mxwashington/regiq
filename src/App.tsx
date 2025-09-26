import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "@/contexts/AuthContext";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardErrorBoundary } from "@/components/DashboardErrorBoundary";

// Core pages only - lazy loaded with error boundaries
const Landing = React.lazy(() => import("./pages/Landing").catch(() => ({ default: () => <div>Landing unavailable</div> })));
const UserDashboard = React.lazy(() => import("./pages/UserDashboard").catch(() => ({ default: () => <div>Dashboard unavailable</div> })));
const Auth = React.lazy(() => import("./pages/Auth").catch(() => ({ default: () => <div>Auth unavailable</div> })));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback").catch(() => ({ default: () => <div>Callback unavailable</div> })));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard").catch(() => ({ default: () => <div>Admin unavailable</div> })));
const SearchPage = React.lazy(() => import("./pages/SearchPage").catch(() => ({ default: () => <div>Search unavailable</div> })));
const NotFound = React.lazy(() => import("./pages/NotFound").catch(() => ({ default: () => <div>Page not found</div> })));
const AllAlertsPage = React.lazy(() => import("./pages/AllAlertsPage").catch(() => ({ default: () => <div>Alerts unavailable</div> })));
const Account = React.lazy(() => import("./pages/Account").catch(() => ({ default: () => <div>Account unavailable</div> })));
const Pricing = React.lazy(() => import("./pages/Pricing").catch(() => ({ default: () => <div>Pricing unavailable</div> })));
const Help = React.lazy(() => import("./pages/Help").catch(() => ({ default: () => <div>Help unavailable</div> })));
const ApiDocs = React.lazy(() => import("./pages/ApiDocs").catch(() => ({ default: () => <div>API Docs unavailable</div> })));
const FoodSafetyPage = React.lazy(() => import("./pages/FoodSafetyPage").catch(() => ({ default: () => <div>Food Safety unavailable</div> })));
const PaymentSuccess = React.lazy(() => import("./pages/PaymentSuccess").catch(() => ({ default: () => <div>Success page unavailable</div> })));
const PaymentCanceled = React.lazy(() => import("./pages/PaymentCanceled").catch(() => ({ default: () => <div>Cancel page unavailable</div> })));
const CustomAlerts = React.lazy(() => import("./pages/CustomAlerts").catch(() => ({ default: () => <div>Custom Alerts unavailable</div> })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: attemptIndex => Math.min(300 * 2 ** attemptIndex, 3000),
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1;
      }
    }
  },
});

// Simple loading component
const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-2 text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <BrowserRouter>
              <AuthProvider>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <main className="flex-1">
                      <header className="border-b bg-background">
                        <div className="flex h-16 items-center px-4">
                          <SidebarTrigger />
                        </div>
                      </header>

                      <div className="flex-1">
                        <Suspense fallback={<PageLoadingFallback />}>
                          <DashboardErrorBoundary>
                            <Routes>
                              {/* Core Routes */}
                              <Route path="/" element={<Landing />} />
                              <Route path="/dashboard" element={<UserDashboard />} />
                              <Route path="/auth" element={<Auth />} />
                              <Route path="/auth/callback" element={<AuthCallback />} />
                              <Route path="/admin" element={<AdminDashboard />} />
                              <Route path="/search" element={<SearchPage />} />
                              <Route path="/alerts" element={<AllAlertsPage />} />
                              <Route path="/account" element={<Account />} />
                              <Route path="/pricing" element={<Pricing />} />
                              <Route path="/help" element={<Help />} />
                              <Route path="/api-docs" element={<ApiDocs />} />
                              <Route path="/food-safety" element={<FoodSafetyPage />} />
                              <Route path="/custom-alerts" element={<CustomAlerts />} />

                              {/* Payment Routes */}
                              <Route path="/payment/success" element={<PaymentSuccess />} />
                              <Route path="/payment/canceled" element={<PaymentCanceled />} />

                              {/* 404 */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </DashboardErrorBoundary>
                        </Suspense>
                      </div>
                    </main>
                  </div>
                </SidebarProvider>

                <Toaster />
                <Sonner />
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;