
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useMagicLinkAuth } from '@/hooks/useMagicLinkAuth';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Wait for React to fully initialize before using hooks
  useEffect(() => {
    setIsInitialized(true);
  }, []);
  
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const sessionManager = useSessionManager();
  const userProfile = useUserProfile();
  const { signInWithMagicLink } = useMagicLinkAuth();

  // Enhanced sign out with proper cleanup
  const signOut = async () => {
    console.log('Signing out user...');
    await sessionManager.signOut();
    userProfile.clearProfile();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  const checkAdminStatus = async () => {
    if (sessionManager.session) {
      await userProfile.checkAdminStatus(sessionManager.session);
    }
  };

  // Handle session changes and update profile data
  useEffect(() => {
    if (sessionManager.session?.user) {
      console.log('Session established, updating profile data...');
      // Use timeout to prevent blocking auth state changes
      setTimeout(() => {
        if (sessionManager.session?.user) {
          userProfile.checkAdminStatus(sessionManager.session);
          userProfile.updateUserActivity(sessionManager.session.user.id);
        }
      }, 0);
    } else {
      console.log('No session, clearing profile data...');
      userProfile.clearProfile();
    }
  }, [sessionManager.session?.user?.id]); // Only depend on user ID to prevent multiple calls

  // Session health monitoring
  useEffect(() => {
    if (!sessionManager.isHealthy && sessionManager.lastError) {
      console.error('Session health issue detected:', sessionManager.lastError);
      
      // Show user-friendly error for session issues
      if (sessionManager.lastError.includes('refresh') || sessionManager.lastError.includes('token')) {
        toast({
          title: "Session expired",
          description: "Please sign in again to continue.",
          variant: "destructive",
        });
      }
    }
  }, [sessionManager.isHealthy, sessionManager.lastError, toast]);

  const value = {
    user: sessionManager.user,
    session: sessionManager.session,
    isAdmin: userProfile.isAdmin,
    adminRole: userProfile.adminRole,
    adminPermissions: userProfile.adminPermissions,
    loading: sessionManager.loading,
    isHealthy: sessionManager.isHealthy,
    lastError: sessionManager.lastError,
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
