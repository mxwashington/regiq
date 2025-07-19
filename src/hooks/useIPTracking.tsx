import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface IPInfo {
  ip: string;
  isTrusted: boolean;
  sessionExtended: boolean;
}

export const useIPTracking = () => {
  const [ipInfo, setIPInfo] = useState<IPInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, session } = useAuth();

  // Get user's IP address
  const getCurrentIP = async (): Promise<string | null> => {
    try {
      // Try multiple IP services for reliability
      const ipServices = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/',
        'https://httpbin.org/ip'
      ];

      for (const service of ipServices) {
        try {
          const response = await fetch(service);
          const data = await response.json();
          return data.ip || data.origin || null;
        } catch (error) {
          console.warn(`IP service ${service} failed:`, error);
          continue;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get IP address:', error);
      return null;
    }
  };

  // Update user activity and IP tracking
  const updateUserActivity = async (ipAddress?: string) => {
    if (!user || !session) return;

    try {
      const currentIP = ipAddress || await getCurrentIP();
      if (!currentIP) return;

      // Call the database function to update activity
      const { error } = await supabase.rpc('update_user_activity', {
        user_id_param: user.id,
        ip_address_param: currentIP
      });

      if (error) {
        console.error('Failed to update user activity:', error);
        return;
      }

      // Check if session should be extended
      const { data: shouldExtend, error: checkError } = await supabase.rpc('should_extend_session', {
        user_id_param: user.id,
        current_ip: currentIP
      });

      if (checkError) {
        console.error('Failed to check session extension:', checkError);
        return;
      }

      setIPInfo({
        ip: currentIP,
        isTrusted: shouldExtend || false,
        sessionExtended: shouldExtend || false
      });

      // If session should be extended, refresh the auth token
      if (shouldExtend) {
        await supabase.auth.refreshSession();
      }

    } catch (error) {
      console.error('Error in updateUserActivity:', error);
    } finally {
      setLoading(false);
    }
  };

  // Track IP on authentication state changes
  useEffect(() => {
    if (user && session) {
      updateUserActivity();
      
      // Set up periodic activity updates (every 5 minutes)
      const interval = setInterval(() => {
        updateUserActivity();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    } else {
      setLoading(false);
      setIPInfo(null);
    }
  }, [user, session]);

  // Track activity on page interactions
  useEffect(() => {
    const trackActivity = () => {
      if (user && session) {
        updateUserActivity();
      }
    };

    // Track mouse movements, clicks, and keyboard activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    let activityTimeout: NodeJS.Timeout;

    const handleActivity = () => {
      // Debounce activity tracking to avoid too many calls
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(trackActivity, 30000); // Track after 30s of activity
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimeout(activityTimeout);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [user, session]);

  return {
    ipInfo,
    loading,
    updateUserActivity,
    getCurrentIP
  };
};