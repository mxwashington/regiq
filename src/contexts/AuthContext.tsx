import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  adminRole: string | null;
  adminPermissions: string[];
  loading: boolean;
  isHealthy: boolean;
  lastError: string | null;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  checkAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a simple auth error boundary component
class AuthErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    logger.error('AuthErrorBoundary caught error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('AuthProvider error details:', { error: error.message, stack: error.stack, componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Authentication Error</h2>
            <p className="text-sm text-muted-foreground">Please refresh the page or try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      <AuthProviderInner>{children}</AuthProviderInner>
    </AuthErrorBoundary>
  );
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  logger.info('AuthProviderInner rendering...');
  
  // Basic state management without complex hooks initially
  const [state, setState] = useState({
    user: null as User | null,
    session: null as Session | null,
    loading: true,
    isHealthy: true,
    lastError: null as string | null,
    isAdmin: false,
    adminRole: null as string | null,
    adminPermissions: [] as string[],
    subscribed: false,
    subscriptionTier: null as string | null,
    subscriptionEnd: null as string | null,
  });

  // Enhanced sign in with magic link
  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      logger.info('Sending magic link to:', email);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        logger.error('Magic link error:', error);
        return { error };
      }

      logger.info('Magic link sent successfully');
      return { error: null };
    } catch (error) {
      logger.error('Magic link error:', error);
      return { error };
    }
  }, []);

  // Enhanced sign out with proper cleanup
  const signOut = useCallback(async () => {
    try {
      logger.info('Signing out user...');
      await supabase.auth.signOut();
      setState(prev => ({
        ...prev,
        user: null,
        session: null,
        isAdmin: false,
        adminRole: null,
        adminPermissions: [],
        subscribed: false,
        subscriptionTier: null,
        subscriptionEnd: null,
      }));
    } catch (error) {
      logger.error('Error during sign out:', error);
    }
  }, []);

  const checkAdminStatus = useCallback(async (userId?: string) => {
    const userIdToUse = userId || state.session?.user?.id;
    if (!userIdToUse) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_admin, admin_permissions')
        .eq('user_id', userIdToUse)
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        isAdmin: data?.is_admin || false,
        adminRole: data?.role || null,
        adminPermissions: data?.admin_permissions || []
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isAdmin: false,
        adminRole: null,
        adminPermissions: []
      }));
    }
  }, []); // Remove dependency to break the loop

  const checkSubscription = useCallback(async (userId?: string) => {
    const userIdToUse = userId || state.session?.user?.id;
    if (!userIdToUse) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id') // Only select basic columns that exist
        .eq('user_id', userIdToUse)
        .single();

      if (error) throw error;

      // For now, assume trial status until schema is fixed
      setState(prev => ({
        ...prev,
        subscribed: false,
        subscriptionTier: 'trial',
        subscriptionEnd: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        subscribed: false,
        subscriptionTier: null,
        subscriptionEnd: null
      }));
    }
  }, []);

  const updateUserActivity = useCallback(async (userId: string) => {
    try {
      logger.info('Updating user activity for:', userId);
      
      await supabase.rpc('update_user_activity', {
        user_id_param: userId,
        ip_address_param: null
      });
      
      logger.info('Updated user activity');
    } catch (error) {
      logger.error('Error updating user activity:', error);
    }
  }, []);

  // Handle auth state changes - CRITICAL: No async calls inside callback
  useEffect(() => {
    logger.info('=== AUTH CONTEXT INITIALIZATION ===');
    let mounted = true;
    
    // Force loading to false after timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setState(prev => ({
          ...prev,
          loading: false,
          isHealthy: true,
          lastError: 'Authentication timeout - session initialized as guest'
        }));
      }
    }, 8000);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      logger.info('Auth state change:', { event, hasSession: !!session });
      
      clearTimeout(timeoutId); // Clear timeout since we got a response
      
      // Only synchronous state updates in the callback
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
        isHealthy: true,
        lastError: null,
        // Clear user data on sign out
        isAdmin: !session ? false : prev.isAdmin,
        adminRole: !session ? null : prev.adminRole,
        adminPermissions: !session ? [] : prev.adminPermissions,
        subscribed: !session ? false : prev.subscribed,
        subscriptionTier: !session ? null : prev.subscriptionTier,
        subscriptionEnd: !session ? null : prev.subscriptionEnd,
      }));
    });

    // Get initial session with better error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        
        clearTimeout(timeoutId); // Clear timeout since we got a response
        
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
          isHealthy: !error,
          lastError: error?.message || null
        }));
      } catch (err) {
        logger.error('Auth initialization failed:', err);
        if (mounted) {
          clearTimeout(timeoutId);
          setState(prev => ({
            ...prev,
            loading: false,
            isHealthy: false,
            lastError: 'Authentication initialization failed'
          }));
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Separate effect for async operations when session changes
  useEffect(() => {
    if (state.session?.user?.id && !state.loading) {
      // Defer async operations to prevent deadlock
      const timeoutId = setTimeout(() => {
        const userId = state.session.user.id;
        checkAdminStatus(userId);
        checkSubscription(userId);
        updateUserActivity(userId);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [state.session?.user?.id, state.loading, checkAdminStatus, checkSubscription, updateUserActivity]);

  const value: AuthContextType = {
    user: state.user,
    session: state.session,
    isAdmin: state.isAdmin,
    adminRole: state.adminRole,
    adminPermissions: state.adminPermissions,
    loading: state.loading,
    isHealthy: state.isHealthy,
    lastError: state.lastError,
    signInWithMagicLink,
    signOut,
    checkAdminStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}