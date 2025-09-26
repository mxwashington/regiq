// EMERGENCY FALLBACK AUTH CONTEXT - For diagnosing auth failures
import React, { createContext, useContext, useEffect, useState } from 'react';
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

// Minimal, no-crash auth provider
export function EmergencyAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Basic auth state listener without complex logic
    const initAuth = async () => {
      try {
        console.log('EmergencyAuthProvider: Initializing auth...');

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('EmergencyAuthProvider: Auth error:', error);
          setError(error.message);
        } else {
          console.log('EmergencyAuthProvider: Session loaded:', !!session);
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('EmergencyAuthProvider: Catch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown auth error');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Simple auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('EmergencyAuthProvider: Auth state change:', event, !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email: string) => {
    try {
      console.log('EmergencyAuthProvider: Sending magic link to:', email);
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      return { error };
    } catch (error) {
      console.error('EmergencyAuthProvider: Magic link error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('EmergencyAuthProvider: Signing out...');
      await supabase.auth.signOut();
    } catch (error) {
      console.error('EmergencyAuthProvider: Sign out error:', error);
    }
  };

  const checkAdminStatus = async () => {
    // Minimal admin check
    console.log('EmergencyAuthProvider: Admin check not implemented in emergency mode');
  };

  const value: AuthContextType = {
    user,
    session,
    isAdmin: false,
    adminRole: null,
    adminPermissions: [],
    loading,
    isHealthy: !error,
    lastError: error,
    signInWithMagicLink,
    signOut,
    checkAdminStatus,
  };

  // Show error UI if there's an error
  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2 text-red-600">Authentication System Error</h2>
          <p className="text-sm text-muted-foreground mb-4">Emergency Mode Active</p>
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}