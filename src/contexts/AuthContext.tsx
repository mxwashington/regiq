
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
    if (!session?.access_token) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-admin-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      setIsAdmin(data.isAdmin || false);
      setAdminRole(data.role || null);
      setAdminPermissions(data.permissions || []);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const refreshSubscription = async () => {
    if (!session?.access_token) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
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
      // Get current IP
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();
      
      // Check if session should be extended
      const { data: shouldExtend } = await supabase.rpc('should_extend_session', {
        user_id_param: userId,
        current_ip: ip
      });

      if (shouldExtend) {
        // Refresh session to extend it
        await supabase.auth.refreshSession();
        
        // Update user activity
        await supabase.rpc('update_user_activity', {
          user_id_param: userId,
          ip_address_param: ip
        });
      }
    } catch (error) {
      console.error('Error extending session:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer subscription and admin checks to avoid blocking auth state update
          setTimeout(() => {
            refreshSubscription();
            checkAdminStatus();
            // Extend session if from trusted IP
            extendSessionIfTrusted(session.user.id);
          }, 0);
        } else {
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
        console.error('Error getting session:', error);
      }
      
      console.log('Initial session check:', session?.user?.email);
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
      console.log('Sending magic link to:', email);
      console.log('Redirect URL:', buildMagicLinkRedirectUrl());
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: buildMagicLinkRedirectUrl(),
          data: {
            admin_request: email === 'marcus@fsqahelp.org'
          }
        }
      });
      
      if (error) {
        console.error('Magic link error:', error);
        
        // Handle rate limiting specifically
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
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
      console.error('Unexpected error:', error);
      toast({
        title: "Magic link failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
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
