import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    console.error('AuthErrorBoundary caught error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AuthProvider error details:', error, errorInfo);
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
            <h2 className="text-lg font-semibold mb-2">Authentication Initializing...</h2>
            <p className="text-sm text-muted-foreground">Please wait while we set up your session.</p>
          </div>
        </div>
      }
    >
      <AuthProviderInner>{children}</AuthProviderInner>
    </AuthErrorBoundary>
  );
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  console.log('AuthProviderInner rendering...');
  
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
      console.log('Sending magic link to:', email);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Magic link error:', error);
        return { error };
      }

      console.log('Magic link sent successfully');
      return { error: null };
    } catch (error) {
      console.error('Magic link error:', error);
      return { error };
    }
  }, []);

  // Enhanced sign out with proper cleanup
  const signOut = useCallback(async () => {
    try {
      console.log('Signing out user...');
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
      console.error('Error during sign out:', error);
    }
  }, []);

  const checkAdminStatus = useCallback(async () => {
    if (!state.session?.access_token) {
      return;
    }
    
    try {
      console.log('Checking admin status...');
      const { data, error } = await supabase.functions.invoke('check-admin-status', {
        headers: {
          Authorization: `Bearer ${state.session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      setState(prev => ({
        ...prev,
        isAdmin: data.isAdmin || false,
        adminRole: data.role || null,
        adminPermissions: data.permissions || []
      }));
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  }, [state.session?.access_token]);

  const checkSubscription = useCallback(async () => {
    if (!state.session?.access_token) {
      return;
    }
    
    try {
      console.log('Checking subscription status...');
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${state.session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      setState(prev => ({
        ...prev,
        subscribed: data.subscribed || false,
        subscriptionTier: data.subscription_tier || null,
        subscriptionEnd: data.subscription_end || null
      }));
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, [state.session?.access_token]);

  const updateUserActivity = useCallback(async (userId: string) => {
    try {
      console.log('Updating user activity for:', userId);
      
      await supabase.rpc('update_user_activity', {
        user_id_param: userId,
        ip_address_param: null
      });
      
      console.log('Updated user activity');
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }, []);

  // Handle auth state changes
  useEffect(() => {
    console.log('=== AUTH CONTEXT INITIALIZATION ===');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', { event, hasSession: !!session });
      
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
        isHealthy: true,
        lastError: null
      }));

      if (session?.user) {
        // Check additional user data
        setTimeout(() => {
          checkAdminStatus();
          checkSubscription();
          updateUserActivity(session.user.id);
        }, 100);
      } else {
        // Clear user data on sign out
        setState(prev => ({
          ...prev,
          isAdmin: false,
          adminRole: null,
          adminPermissions: [],
          subscribed: false,
          subscriptionTier: null,
          subscriptionEnd: null,
        }));
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting initial session:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          isHealthy: false,
          lastError: error.message
        }));
      } else {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
          isHealthy: true,
          lastError: null
        }));

        if (session?.user) {
          checkAdminStatus();
          checkSubscription();
          updateUserActivity(session.user.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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