
import { useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
      console.log('No session token for subscription check');
      clearProfile();
      return;
    }
    
    try {
      console.log('Checking subscription status...');
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      console.log('Subscription response:', { data, error });
      
      if (error) throw error;
      
      setProfileState(prev => ({
        ...prev,
        subscribed: data.subscribed || false,
        subscriptionTier: data.subscription_tier || null,
        subscriptionEnd: data.subscription_end || null
      }));
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, [clearProfile]);

  const checkAdminStatus = useCallback(async (session: Session | null) => {
    if (!session?.access_token) {
      console.log('No session token for admin check');
      return;
    }
    
    try {
      console.log('Checking admin status...');
      const { data, error } = await supabase.functions.invoke('check-admin-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      console.log('Admin status response:', { data, error });
      
      if (error) throw error;
      
      setProfileState(prev => ({
        ...prev,
        isAdmin: data.isAdmin || false,
        adminRole: data.role || null,
        adminPermissions: data.permissions || []
      }));
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  }, []);

  const updateUserActivity = useCallback(async (userId: string) => {
    try {
      console.log('Updating user activity for:', userId);
      
      // Use the IP detection service instead of direct API calls
      const { ipDetectionService } = await import('@/services/ipDetection');
      const ip = await ipDetectionService.getCurrentIP();
      
      // Update user activity (IP can be null, which is fine)
      await supabase.rpc('update_user_activity', {
        user_id_param: userId,
        ip_address_param: ip
      });
      
      console.log('Updated user activity');
    } catch (error) {
      console.error('Error updating user activity:', error);
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
