
import { useState, useEffect, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SessionState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isHealthy: boolean;
  lastError: string | null;
}

export const useSessionManager = () => {
  const [state, setState] = useState<SessionState>({
    user: null,
    session: null,
    loading: true,
    isHealthy: true,
    lastError: null
  });

  const updateSessionState = useCallback((session: Session | null, error?: string) => {
    setState(prev => ({
      ...prev,
      session,
      user: session?.user ?? null,
      loading: false,
      isHealthy: !error,
      lastError: error || null
    }));
  }, []);

  const handleAuthStateChange = useCallback((event: AuthChangeEvent, session: Session | null) => {
    console.log('Auth state change:', {
      event,
      hasSession: !!session,
      userId: session?.user?.id,
      sessionExpires: session?.expires_at,
      timestamp: new Date().toISOString()
    });

    // Handle token refresh errors
    if (event === 'TOKEN_REFRESHED' && !session) {
      console.error('Token refresh failed - session is null');
      updateSessionState(null, 'Token refresh failed');
      return;
    }

    // Handle sign out
    if (event === 'SIGNED_OUT') {
      console.log('User signed out');
      updateSessionState(null);
      return;
    }

    // Update session state
    updateSessionState(session);
  }, [updateSessionState]);

  const signOut = useCallback(async () => {
    try {
      console.log('Signing out user...');
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  }, []);

  useEffect(() => {
    console.log('=== SESSION MANAGER INITIALIZATION ===');
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting initial session:', error);
        updateSessionState(null, error.message);
      } else {
        console.log('Initial session check:', {
          hasSession: !!session,
          userId: session?.user?.id,
          sessionExpires: session?.expires_at
        });
        updateSessionState(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [handleAuthStateChange, updateSessionState]);

  return {
    ...state,
    signOut
  };
};
