
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildMagicLinkRedirectUrl } from '@/lib/domain';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  subscribed: boolean;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  isAdmin: boolean;
  adminRole: string | null;
  adminPermissions: string[];
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  checkAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkAdminStatus = async () => {
    if (!session?.access_token) {
      console.log('No session token for admin check');
      return;
    }
    
    try {
      console.log('Checking admin status...');
      const { data, error } = await supabase.functions.invoke('check-admin-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      console.log('Admin status response:', { data, error });
      
      if (error) throw error;
      
      setIsAdmin(data.isAdmin || false);
      setAdminRole(data.role || null);
      setAdminPermissions(data.permissions || []);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const refreshSubscription = async () => {
    if (!session?.access_token) {
      console.log('No session token for subscription check');
      return;
    }
    
    try {
      console.log('Checking subscription status...');
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      console.log('Subscription response:', { data, error });
      
      if (error) throw error;
      
      setSubscribed(data.subscribed || false);
      setSubscriptionTier(data.subscription_tier || null);
      setSubscriptionEnd(data.subscription_end || null);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  // Enhanced session management with IP tracking
  const extendSessionIfTrusted = async (userId: string) => {
    try {
      console.log('Attempting to extend session for user:', userId);
      
      // Get current IP
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();
      
      console.log('Current IP:', ip);
      
      // Check if session should be extended
      const { data: shouldExtend } = await supabase.rpc('should_extend_session', {
        user_id_param: userId,
        current_ip: ip
      });

      console.log('Should extend session:', shouldExtend);

      if (shouldExtend) {
        // Refresh session to extend it
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        console.log('Session refresh result:', { refreshData, refreshError });
        
        // Update user activity
        await supabase.rpc('update_user_activity', {
          user_id_param: userId,
          ip_address_param: ip
        });
        
        console.log('Updated user activity');
      }
    } catch (error) {
      console.error('Error extending session:', error);
    }
  };

  useEffect(() => {
    console.log('=== AUTH CONTEXT INITIALIZATION ===');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change event:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          sessionExpires: session?.expires_at,
          timestamp: new Date().toISOString()
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('User authenticated, deferring additional checks...');
          // Defer subscription and admin checks to avoid blocking auth state update
          setTimeout(() => {
            console.log('Running deferred checks...');
            refreshSubscription();
            checkAdminStatus();
            // Extend session if from trusted IP
            extendSessionIfTrusted(session.user.id);
          }, 0);
        } else {
          console.log('No user session, clearing state...');
          setSubscribed(false);
          setSubscriptionTier(null);
          setSubscriptionEnd(null);
          setIsAdmin(false);
          setAdminRole(null);
          setAdminPermissions([]);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting initial session:', error);
      }
      
      console.log('Initial session check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        sessionExpires: session?.expires_at
      });
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          refreshSubscription();
          checkAdminStatus();
          // Extend session if from trusted IP
          extendSessionIfTrusted(session.user.id);
        }, 0);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email: string) => {
    try {
      const redirectUrl = buildMagicLinkRedirectUrl();
      
      console.log('=== MAGIC LINK SIGN IN ===');
      console.log('Email:', email);
      console.log('Redirect URL:', redirectUrl);
      console.log('User Agent:', navigator.userAgent);
      console.log('Current URL:', window.location.href);
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            admin_request: email === 'marcus@fsqahelp.org'
          }
        }
      });
      
      console.log('Magic link request result:', { error });
      
      if (error) {
        console.error('=== MAGIC LINK ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error code:', error.status);
        console.error('Full error:', error);
        
        // Enhanced rate limiting detection
        const isRateLimit = error.message?.includes('rate limit') || 
                           error.message?.includes('429') ||
                           error.status === 429;
        
        if (isRateLimit) {
          console.error('Rate limit detected');
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
        console.log('Magic link sent successfully');
        toast({
          title: "Check your email",
          description: "We've sent you a magic link to sign in.",
        });
      }
      
      return { error };
    } catch (error: any) {
      console.error('=== UNEXPECTED MAGIC LINK ERROR ===');
      console.error('Error:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
      
      toast({
        title: "Magic link failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    console.log('Signing out user...');
    await supabase.auth.signOut();
    setSubscribed(false);
    setSubscriptionTier(null);
    setSubscriptionEnd(null);
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  const value = {
    user,
    session,
    subscribed,
    subscriptionTier,
    subscriptionEnd,
    isAdmin,
    adminRole,
    adminPermissions,
    loading,
    signInWithMagicLink,
    signOut,
    refreshSubscription,
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
