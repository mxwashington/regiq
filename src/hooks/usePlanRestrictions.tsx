import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';

interface UsageResult {
  allowed: boolean;
  current_usage: number;
  limit: number;
  message: string;
  upgrade_required?: boolean;
}

interface PlanLimits {
  queries_per_month: number;
  alerts_per_day: number;
  saved_searches: number;
  api_access: boolean;
  advanced_filters: boolean;
  bulk_export: boolean;
  custom_notifications: boolean;
  priority_support: boolean;
}

export const usePlanRestrictions = () => {
  const { user } = useAuth();
  const { subscribed, subscriptionTier } = useUserProfile();
  const [loading, setLoading] = useState(false);

  const getPlanLimits = useCallback((): PlanLimits => {
    // Basic plan (restricted $99/mo equivalent)
    const basicLimits: PlanLimits = {
      queries_per_month: 50,
      alerts_per_day: 10,
      saved_searches: 5,
      api_access: false,
      advanced_filters: false,
      bulk_export: false,
      custom_notifications: false,
      priority_support: false
    };

    // Premium plan
    const premiumLimits: PlanLimits = {
      queries_per_month: 500,
      alerts_per_day: 100,
      saved_searches: 50,
      api_access: true,
      advanced_filters: true,
      bulk_export: true,
      custom_notifications: true,
      priority_support: true
    };

    // Enterprise plan (unlimited)
    const enterpriseLimits: PlanLimits = {
      queries_per_month: -1, // unlimited
      alerts_per_day: -1,
      saved_searches: -1,
      api_access: true,
      advanced_filters: true,
      bulk_export: true,
      custom_notifications: true,
      priority_support: true
    };

    if (subscribed) {
      if (subscriptionTier === 'Enterprise') return enterpriseLimits;
      if (subscriptionTier === 'Premium') return premiumLimits;
    }

    return basicLimits;
  }, [subscribed, subscriptionTier]);

  const checkUsageLimit = useCallback(async (usageType: string): Promise<UsageResult | null> => {
    if (!user) return null;

    try {
      setLoading(true);
      const limits = getPlanLimits();
      
      let currentLimit = 0;
      let periodStart = new Date();
      let periodType = 'month';

      // Determine limit and period based on usage type
      switch (usageType) {
        case 'queries':
          currentLimit = limits.queries_per_month;
          periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
          periodType = 'month';
          break;
        case 'alerts':
          currentLimit = limits.alerts_per_day;
          periodStart = new Date();
          periodStart.setHours(0, 0, 0, 0);
          periodType = 'day';
          break;
        case 'saved_searches':
          currentLimit = limits.saved_searches;
          periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
          periodType = 'month';
          break;
        default:
          throw new Error(`Invalid usage type: ${usageType}`);
      }

      // Get current usage
      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('usage_count')
        .eq('user_id', user.id)
        .eq('usage_type', usageType)
        .gte('period_start', periodStart.toISOString())
        .maybeSingle();

      if (usageError) throw usageError;

      const currentUsage = usageData?.usage_count || 0;

      // Check if limit exceeded (unlimited if -1)
      if (currentLimit > 0 && currentUsage >= currentLimit) {
        const result: UsageResult = {
          allowed: false,
          current_usage: currentUsage,
          limit: currentLimit,
          message: `You have reached your ${usageType} limit for this ${periodType}. Upgrade your plan to continue.`,
          upgrade_required: true
        };

        toast.error(result.message, {
          action: {
            label: 'Upgrade Plan',
            onClick: () => window.open('/pricing', '_blank')
          },
          duration: 6000
        });

        return result;
      }

      // Increment usage
      const nextPeriodStart = periodType === 'day' 
        ? new Date(periodStart.getTime() + 24 * 60 * 60 * 1000)
        : new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1);

      await supabase
        .from('usage_tracking')
        .upsert({
          user_id: user.id,
          usage_type: usageType,
          usage_count: currentUsage + 1,
          period_start: periodStart.toISOString(),
          period_end: nextPeriodStart.toISOString()
        }, {
          onConflict: 'user_id,usage_type,period_start'
        });

      return {
        allowed: true,
        current_usage: currentUsage + 1,
        limit: currentLimit,
        message: 'Usage recorded successfully'
      };
    } catch (error) {
      console.error('Error checking usage limit:', error);
      toast.error('Failed to check usage limits');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, getPlanLimits]);

  const checkFeatureAccess = useCallback((featureName: string): boolean => {
    const limits = getPlanLimits();
    return (limits as any)[featureName] === true;
  }, [getPlanLimits]);

  const getCurrentUsage = useCallback(async (usageType: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('usage_tracking')
        .select('usage_count, period_start, period_end')
        .eq('user_id', user.id)
        .eq('usage_type', usageType)
        .gte('period_end', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error getting current usage:', error);
      return null;
    }
  }, [user]);

  return {
    checkUsageLimit,
    checkFeatureAccess,
    getCurrentUsage,
    getPlanLimits,
    loading
  };
};