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

// Admin Route Protection Component
export const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useAuthGuard(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};