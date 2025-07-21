import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Lazy load pages for better performance
const RegIQFeedPage = React.lazy(() => import("./pages/RegIQFeedPage"));
const Landing = React.lazy(() => import("./pages/Landing"));
const UnifiedAuth = React.lazy(() => import("./components/UnifiedAuth"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// Create query client outside component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for now
      refetchOnWindowFocus: false,
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

// Bare minimum app to test if React works
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<RegIQFeedPage />} />
          <Route path="/dashboard" element={<RegIQFeedPage />} />
          <Route path="/auth" element={<UnifiedAuth />} />
          <Route path="/login" element={<UnifiedAuth />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;