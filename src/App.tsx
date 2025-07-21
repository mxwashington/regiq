import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Lazy load pages for better performance
const RegIQFeedPage = React.lazy(() => import("./pages/RegIQFeedPage"));
const Landing = React.lazy(() => import("./pages/Landing"));
const UnifiedAuth = React.lazy(() => import("./components/UnifiedAuth"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const SearchPage = React.lazy(() => import("./pages/SearchPage"));
const Debug = React.lazy(() => import("./pages/Debug"));

// Create query client outside component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for now
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  }
});

// Simple loading component
const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

// Gradually adding back functionality
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<RegIQFeedPage />} />
            <Route path="/dashboard" element={<RegIQFeedPage />} />
            <Route path="/auth" element={<UnifiedAuth />} />
            <Route path="/login" element={<UnifiedAuth />} />
            <Route path="/signup" element={<UnifiedAuth />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/debug" element={<Debug />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;