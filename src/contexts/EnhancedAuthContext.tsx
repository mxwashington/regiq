
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildMagicLinkRedirectUrl } from '@/lib/domain';

interface AuthState {
  user: User | null;
  session: Session | null;
  subscribed: boolean;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  isAdmin: boolean;
  adminRole: string | null;
  adminPermissions: string[];
  loading: boolean;
  error: string | null;
  retryCount: number;
}

interface AuthContextType extends AuthState {
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  checkAdminStatus: () => Promise<void>;
  clearError: () => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  session: null,
  subscribed: false,
  subscriptionTier: null,
  subscriptionEnd: null,
  isAdmin: false,
  adminRole: null,
  adminPermissions: [],
  loading: true,
  error: null,
  retryCount: 0
};

export function EnhancedAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const { toast } = useToast();

  const setError = useCallback((error: string) => {
    console.error('Auth Error:', error);
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const checkAdminStatus = useCallback(async () => {
    if (!state.session?.access_token) {
      console.log('No session token for admin check');
      return;
    }
    
    try {
      console.log('Checking admin status...', { userId: state.user?.id });
      const { data, error } = await supabase.functions.invoke('check-admin-status', {
        headers: {
          Authorization: `Bearer ${state.session.access_token}`,
        },
      });
      
      if (error) {
        console.error('Admin status check failed:', error);
        return;
      }
      
      setState(prev => ({
        ...prev,
        isAdmin: data?.isAdmin || false,
        adminRole: data?.role || null,
        adminPermissions: data?.permissions || []
      }));
      
      console.log('Admin status updated:', {
        isAdmin: data?.isAdmin,
        role: data?.role,
        permissions: data?.permissions
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  }, [state.session, state.user]);

  const refreshSubscription = useCallback(async () => {
    if (!state.session?.access_token) {
      console.log('No session token for subscription check');
      return;
    }
    
    try {
      console.log('Checking subscription status...', { userId: state.user?.id });
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${state.session.access_token}`,
        },
      });
      
      if (error) {
        console.error('Subscription check failed:', error);
        return;
      }
      
      setState(prev => ({
        ...prev,
        subscribed: data?.subscribed || false,
        subscriptionTier: data?.subscription_tier || null,
        subscriptionEnd: data?.subscription_end || null
      }));
      
      console.log('Subscription status updated:', {
        subscribed: data?.subscribed,
        tier: data?.subscription_tier,
        end: data?.subscription_end
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, [state.session, state.user]);

  const extendSessionIfTrusted = useCallback(async (userId: string) => {
    try {
      console.log('Attempting to extend session for user:', userId);
      
      // Use the IP detection service instead of direct API calls
      const { ipDetectionService } = await import('@/services/ipDetection');
      const ip = await ipDetectionService.getCurrentIP();
      
      if (!ip) {
        console.warn('Could not detect IP for session extension');
        return;
      }
      
      const { data: shouldExtend } = await supabase.rpc('should_extend_session', {
        user_id_param: userId,
        current_ip: ip
      });

      if (shouldExtend) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError) {
          await supabase.rpc('update_user_activity', {
            user_id_param: userId,
            ip_address_param: ip
          });
          console.log('Session extended successfully');
        }
      }
    } catch (error) {
      console.error('Error extending session:', error);
    }
  }, []);

  const retry = useCallback(() => {
    setState(prev => ({
      ...initialState,
      retryCount: prev.retryCount + 1,
      loading: true
    }));
  }, []);

  useEffect(() => {
    let mounted = true;
    console.log('=== ENHANCED AUTH CONTEXT INITIALIZATION ===');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change event:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          timestamp: new Date().toISOString()
        });
        
        // Update state immediately
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
          error: null
        }));
        
        if (session?.user) {
          console.log('User authenticated, running checks...');
          // Use setTimeout to prevent blocking the auth state update
          setTimeout(() => {
            if (mounted) {
              refreshSubscription();
              checkAdminStatus();
              extendSessionIfTrusted(session.user.id);
            }
          }, 100);
        } else {
          console.log('No session, clearing profile data...');
          setState(prev => ({
            ...prev,
            subscribed: false,
            subscriptionTier: null,
            subscriptionEnd: null,
            isAdmin: false,
            adminRole: null,
            adminPermissions: []
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('Error getting initial session:', error);
        setError(`Failed to load session: ${error.message}`);
        return;
      }
      
      console.log('Initial session check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      });
      
      // Only update if this is the initial load and we have a session
      if (session) {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false
        }));
        
        setTimeout(() => {
          if (mounted) {
            refreshSubscription();
            checkAdminStatus();
            extendSessionIfTrusted(session.user.id);
          }
        }, 100);
      } else {
        setState(prev => ({
          ...prev,
          loading: false
        }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [state.retryCount]); // Re-run when retrying

  const signInWithMagicLink = async (email: string) => {
    try {
      clearError();
      const redirectUrl = buildMagicLinkRedirectUrl();
      
      console.log('=== MAGIC LINK SIGN IN ===', {
        email,
        redirectUrl,
        timestamp: new Date().toISOString()
      });
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            admin_request: email === 'marcus@regiq.org'
          }
        }
      });
      
      if (error) {
        const isRateLimit = error.message?.includes('rate limit') || 
                           error.message?.includes('429') ||
                           error.status === 429;
        
        if (isRateLimit) {
          toast({
            title: "Rate limit exceeded",
            description: "Please wait a moment before requesting another magic link.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Magic link failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a magic link to sign in.",
        });
      }
      
      return { error };
    } catch (error: any) {
      console.error('=== UNEXPECTED MAGIC LINK ERROR ===', error);
      
      toast({
        title: "Magic link failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      await supabase.auth.signOut();
      
      setState(prev => ({
        ...prev,
        subscribed: false,
        subscriptionTier: null,
        subscriptionEnd: null,
        isAdmin: false,
        adminRole: null,
        adminPermissions: []
      }));
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    signInWithMagicLink,
    signOut,
    refreshSubscription,
    checkAdminStatus,
    clearError,
    retry
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useEnhancedAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
}
