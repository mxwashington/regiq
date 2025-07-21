import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminRole: string | null;
  adminPermissions: string[];
  isHealthy: boolean;
  lastError: Error | null;
  signOut: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  checkAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [isHealthy, setIsHealthy] = useState(true);
  const [lastError, setLastError] = useState<Error | null>(null);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setAdminRole(null);
      setAdminPermissions([]);
      return;
    }

    try {
      // Check if user is admin
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('role, permissions')
        .eq('user_id', user.id)
        .single();

      if (error || !adminUser) {
        setIsAdmin(false);
        setAdminRole(null);
        setAdminPermissions([]);
      } else {
        setIsAdmin(true);
        setAdminRole(adminUser.role);
        setAdminPermissions(adminUser.permissions || []);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkAdminStatus();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkAdminStatus();
      } else {
        setIsAdmin(false);
        setAdminRole(null);
        setAdminPermissions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setAdminRole(null);
      setAdminPermissions([]);
    } catch (error) {
      console.error('Error signing out:', error);
      setLastError(error as Error);
      setIsHealthy(false);
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      
      if (error) {
        setLastError(error);
        setIsHealthy(false);
      }
      
      return { error };
    } catch (error) {
      setLastError(error as Error);
      setIsHealthy(false);
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      loading, 
      isAdmin,
      adminRole,
      adminPermissions,
      isHealthy,
      lastError,
      signOut,
      signInWithMagicLink,
      checkAdminStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};