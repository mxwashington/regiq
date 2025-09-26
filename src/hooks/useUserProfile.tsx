
import { useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
interface UserProfileState {
  subscribed: boolean;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  isAdmin: boolean;
  adminRole: string | null;
  adminPermissions: string[];
}

export const useUserProfile = () => {
  const [profileState, setProfileState] = useState<UserProfileState>({
    subscribed: false,
    subscriptionTier: null,
    subscriptionEnd: null,
    isAdmin: false,
    adminRole: null,
    adminPermissions: []
  });

  const clearProfile = useCallback(() => {
    setProfileState({
      subscribed: false,
      subscriptionTier: null,
      subscriptionEnd: null,
      isAdmin: false,
      adminRole: null,
      adminPermissions: []
    });
  }, []);

  const checkSubscription = useCallback(async (session: Session | null) => {
    if (!session?.access_token) {
      logger.info('No session token for subscription check');
      clearProfile();
      return;
    }
    
    try {
      logger.info('Checking subscription status...');
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      logger.info('Subscription response:', { data, error });
      
      if (error) throw error;
      
      setProfileState(prev => ({
        ...prev,
        subscribed: data.subscribed || false,
        subscriptionTier: data.subscription_tier || null,
        subscriptionEnd: data.subscription_end || null
      }));
    } catch (error) {
      logger.error('Error checking subscription:', error);
    }
  }, [clearProfile]);

  const checkAdminStatus = useCallback(async (session: Session | null) => {
    if (!session?.access_token) {
      logger.info('No session token for admin check');
      return;
    }
    
    try {
      logger.info('Checking admin status...');
      const { data, error } = await supabase.functions.invoke('check-admin-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      logger.info('Admin status response:', { data, error });
      
      if (error) throw error;
      
      setProfileState(prev => ({
        ...prev,
        isAdmin: data.isAdmin || false,
        adminRole: data.role || null,
        adminPermissions: data.permissions || []
      }));
    } catch (error) {
      logger.error('Error checking admin status:', error);
    }
  }, []);

  const updateUserActivity = useCallback(async (userId: string) => {
    try {
      logger.info('Updating user activity for:', userId);
      
      // Use the IP detection service instead of direct API calls
      const { ipDetectionService } = await import('@/services/ipDetection');
      const ip = await ipDetectionService.getCurrentIP();
      
      // Update user activity (IP can be null, which is fine)
      await supabase.rpc('update_user_activity', {
        user_id_param: userId,
        ip_address_param: ip
      });
      
      logger.info('Updated user activity');
    } catch (error) {
      logger.error('Error updating user activity:', error);
    }
  }, []);

  return {
    ...profileState,
    checkSubscription,
    checkAdminStatus,
    updateUserActivity,
    clearProfile
  };
};
