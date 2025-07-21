import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ipDetectionService } from '@/services/ipDetection';

interface IPInfo {
  ip: string;
  isTrusted: boolean;
  sessionExtended: boolean;
}

export const useIPTracking = () => {
  const [ipInfo, setIPInfo] = useState<IPInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();

  // Update user activity with proper error handling
  const updateUserActivity = useCallback(async (ipAddress?: string) => {
    if (!user || !session) return;

    try {
      let currentIP = ipAddress;
      
      if (!currentIP) {
        // Use the IP detection service with circuit breaker
        currentIP = await ipDetectionService.getCurrentIP();
      }

      // Continue with user activity update even if IP detection fails
      const { error: activityError } = await supabase.rpc('update_user_activity', {
        user_id_param: user.id,
        ip_address_param: currentIP // This can be null, which is fine
      });

      if (activityError) {
        console.warn('Failed to update user activity:', activityError);
        return;
      }

      // Check if session should be extended (only if we have an IP)
      if (currentIP) {
        const { data: shouldExtend } = await supabase.rpc('should_extend_session', {
          user_id_param: user.id,
          current_ip: currentIP
        });

        // Update trusted IP list if needed
        const { data: profile } = await supabase
          .from('profiles')
          .select('trusted_ips')
          .eq('user_id', user.id)
          .single();

        const trustedIPs = profile?.trusted_ips || [];
        const isTrusted = trustedIPs.includes(currentIP);

        setIPInfo({
          ip: currentIP,
          isTrusted,
          sessionExtended: shouldExtend || false
        });

        // If session should be extended, refresh the auth token
        if (shouldExtend) {
          await supabase.auth.refreshSession();
        }
      } else {
        // Set minimal info when IP detection fails
        setIPInfo({
          ip: 'Unknown',
          isTrusted: false,
          sessionExtended: false
        });
      }

      setError(null);
    } catch (error) {
      console.error('Error in user activity tracking:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      
      // Set fallback state
      setIPInfo({
        ip: 'Detection failed',
        isTrusted: false,
        sessionExtended: false
      });
    }
  }, [user, session]);

  // Initialize IP tracking on component mount and user change
  useEffect(() => {
    if (!user || !session) {
      setLoading(false);
      setIPInfo(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Add a small delay to prevent immediate requests on mount
    const timer = setTimeout(() => {
      updateUserActivity().finally(() => setLoading(false));
    }, 1000);

    return () => clearTimeout(timer);
  }, [user?.id, session?.access_token]); // Only depend on user ID and session token

  // Periodic activity updates with throttling
  useEffect(() => {
    if (!user || !session) return;

    // Set up periodic activity updates (every 10 minutes instead of 5)
    const interval = setInterval(() => {
      updateUserActivity();
    }, 10 * 60 * 1000); // Reduced frequency

    return () => clearInterval(interval);
  }, [user?.id, session?.access_token]); // Only depend on user ID and session token

  // Track activity on page interactions with heavy throttling
  useEffect(() => {
    if (!user || !session) return;

    let activityTimeout: NodeJS.Timeout;
    let lastActivity = 0;
    const ACTIVITY_THROTTLE = 5 * 60 * 1000; // 5 minutes minimum between activity updates

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity < ACTIVITY_THROTTLE) {
        return; // Throttle activity updates
      }

      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        lastActivity = Date.now();
        updateUserActivity();
      }, 30000); // Track after 30s of activity
    };

    // Reduced event tracking to prevent excessive calls
    const events = ['mousedown', 'keydown'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimeout(activityTimeout);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [user?.id, session?.access_token]); // Only depend on user ID and session token

  // Manual refresh function with throttling
  const refresh = useCallback(async () => {
    if (loading) return; // Prevent concurrent refreshes
    
    setLoading(true);
    await updateUserActivity();
    setLoading(false);
  }, [loading, updateUserActivity]);

  // Get service status for debugging
  const getServiceStatus = useCallback(() => {
    return ipDetectionService.getStatus();
  }, []);

  // Clear cache function
  const clearCache = useCallback(() => {
    ipDetectionService.clearCache();
    setIPInfo(null);
    setError(null);
  }, []);

  return {
    ipInfo,
    loading,
    error,
    updateUserActivity,
    refresh,
    getServiceStatus,
    clearCache
  };
};