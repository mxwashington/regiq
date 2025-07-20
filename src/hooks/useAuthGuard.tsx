import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';
import { useAuth } from '@/contexts/AuthContext';

export const useAuthGuard = (requireAdmin = false) => {
  const { user } = useAuth();
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (requireAdmin && !isAdmin) {
      navigate('/dashboard');
      return;
    }
  }, [user, isAdmin, loading, requireAdmin, navigate]);

  return {
    isAuthenticated: !!user,
    isAdmin,
    loading
  };
};

// Protected Route Component with better error handling
export const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isHealthy } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while still loading
    if (loading) return;
    
    // If not healthy or no user, redirect to auth
    if (!isHealthy || !user) {
      console.log('Auth guard redirecting to auth:', { isHealthy, hasUser: !!user });
      navigate('/auth');
    }
  }, [user, loading, isHealthy, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isHealthy || !user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};