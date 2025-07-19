import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, rememberMe?: boolean) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer subscription and admin checks to avoid blocking auth state update
          setTimeout(() => {
            refreshSubscription();
            checkAdminStatus();
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          refreshSubscription();
          checkAdminStatus();
        }, 0);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      // Enhanced error handling with specific messages
      let errorMessage = error.message;
      if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link.';
      } else if (error.message.includes('too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a moment and try again.';
      }
      
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('regiq_remember_me', 'true');
      } else {
        localStorage.removeItem('regiq_remember_me');
      }
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    }
    
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          admin_request: email === 'marcus@fsqahelp.org'
        }
      }
    });
    
    if (error) {
      toast({
        title: "Magic link failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a magic link to sign in.",
      });
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, rememberMe: boolean = false) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          remember_me: rememberMe
        },
      },
    });
    
    if (error) {
      // Enhanced error handling with specific messages
      let errorMessage = error.message;
      if (error.message.includes('already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.message.includes('invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('password')) {
        errorMessage = 'Password must be at least 6 characters long.';
      }
      
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created successfully!",
        description: "You can now sign in to your account.",
      });
    }
    
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    
    if (error) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a link to reset your password.",
      });
    }
    
    return { error };
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
    signIn,
    signInWithMagicLink,
    signUp,
    resetPassword,
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