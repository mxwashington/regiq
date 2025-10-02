import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from './useAdminAuth';

import { logger } from '@/lib/logger';
interface TrialStatus {
  isTrialExpired: boolean;
  daysRemaining: number;
  trialEndsAt: string | null;
  subscriptionStatus: string;
  loading: boolean;
}

export const useTrialStatus = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    isTrialExpired: false,
    daysRemaining: 7,
    trialEndsAt: null,
    subscriptionStatus: 'trial',
    loading: true
  });

  const checkTrialStatus = async () => {
    if (!user) {
      setTrialStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      // Get user profile with subscription info
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Users are either free (limited features) or paid (full features)
      const status = profile?.subscription_status || 'free';
      const isPaid = status === 'active' || status === 'paid';
      const isFree = status === 'free';
      
      setTrialStatus({
        // Free and paid users are both "active" - feature gates handle limitations
        isTrialExpired: false, // No one is expired - free tier is valid
        daysRemaining: -1, // No expiration - free tier is permanent
        trialEndsAt: null, // No trials exist
        subscriptionStatus: isAdmin ? 'admin' : status,
        loading: false
      });
    } catch (error) {
      logger.error('Error checking trial status:', error);
      setTrialStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Removed startTrial - no trials exist in RegIQ

  useEffect(() => {
    checkTrialStatus();
  }, [user, isAdmin]);

  return {
    ...trialStatus,
    checkTrialStatus,
    refreshStatus: checkTrialStatus
  };
};