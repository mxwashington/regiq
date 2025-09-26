
import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
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
  
  const lastAuthStateChange = useRef<number>(0);
  const initializedRef = useRef<boolean>(false);

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
    // Debounce auth state changes to prevent loops
    const now = Date.now();
    if (now - lastAuthStateChange.current < 1000) {
      return; // Skip if called within 1 second
    }
    lastAuthStateChange.current = now;

    logger.info('Auth state change:', {
      event,
      hasSession: !!session,
      userId: session?.user?.id,
      timestamp: new Date().toISOString()
    });

    // Handle token refresh errors
    if (event === 'TOKEN_REFRESHED' && !session) {
      logger.error('Token refresh failed - session is null');
      updateSessionState(null, 'Token refresh failed');
      return;
    }

    // Handle sign out
    if (event === 'SIGNED_OUT') {
      logger.info('User signed out');
      updateSessionState(null);
      return;
    }

    // Only update state if session actually changed
    setState(prev => {
      const hasChanged = prev.session?.access_token !== session?.access_token ||
                        prev.session?.user?.id !== session?.user?.id;
      
      if (!hasChanged) {
        return prev; // No state change needed
      }

      return {
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
        isHealthy: true,
        lastError: null
      };
    });
  }, []);

  const signOut = useCallback(async () => {
    try {
      logger.info('Signing out user...');
      await supabase.auth.signOut();
    } catch (error) {
      logger.error('Error during sign out:', error);
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return; // Prevent re-initialization
    
    logger.info('=== SESSION MANAGER INITIALIZATION ===');
    initializedRef.current = true;
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error('Error getting initial session:', error);
        setState(prev => ({
          ...prev,
          session: null,
          user: null,
          loading: false,
          isHealthy: false,
          lastError: error.message
        }));
      } else {
        logger.info('Initial session check:', {
          hasSession: !!session,
          userId: session?.user?.id,
          sessionExpires: session?.expires_at
        });
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
          isHealthy: true,
          lastError: null
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array is intentional

  return {
    ...state,
    signOut
  };
};
