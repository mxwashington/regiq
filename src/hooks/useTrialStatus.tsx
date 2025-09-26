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
      // Get user profile with trial info
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('trial_starts_at, trial_ends_at, subscription_status')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Call the database function to get days remaining
      const { data: daysData, error: daysError } = await supabase
        .rpc('get_trial_days_remaining', { user_uuid: user.id });

      if (daysError) throw daysError;

      // Call the database function to check if trial is expired
      const { data: expiredData, error: expiredError } = await supabase
        .rpc('is_trial_expired', { user_uuid: user.id });

      if (expiredError) throw expiredError;

      setTrialStatus({
        isTrialExpired: isAdmin ? false : (expiredData || false), // Admins never have expired trials
        daysRemaining: isAdmin ? -1 : (daysData || 0), // -1 indicates unlimited for admins
        trialEndsAt: profile?.trial_ends_at || null,
        subscriptionStatus: isAdmin ? 'admin' : (profile?.subscription_status || 'trial'),
        loading: false
      });
    } catch (error) {
      logger.error('Error checking trial status:', error);
      setTrialStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const startTrial = async () => {
    if (!user) return;

    try {
      const trialStartsAt = new Date();
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialStartsAt.getDate() + 7); // 7-day trial

      const { error } = await supabase
        .from('profiles')
        .update({
          trial_starts_at: trialStartsAt.toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
          subscription_status: 'trial'
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh status
      await checkTrialStatus();
    } catch (error) {
      logger.error('Error starting trial:', error);
    }
  };

  useEffect(() => {
    checkTrialStatus();
  }, [user, isAdmin]);

  return {
    ...trialStatus,
    checkTrialStatus,
    startTrial,
    refreshStatus: checkTrialStatus
  };
};