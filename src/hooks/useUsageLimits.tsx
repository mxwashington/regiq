import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface UsageLimitResult {
  allowed: boolean;
  current_usage: number;
  limit: number;
  period_end: string;
  message: string;
}

interface UsageSummary {
  billing_period: {
    start: string;
    end: string;
  };
  usage: {
    ai_summaries: number;
    ai_searches: number;
    exports: number;
    api_calls: number;
    saved_alerts: number;
  };
}

const TIER_LIMITS = {
  starter: {
    ai_summaries: 5,
    ai_searches: 0,
    exports: 0,
    api_calls: 0,
    saved_alerts: 10
  },
  growth: {
    ai_summaries: 100,
    ai_searches: 20,
    exports: 50,
    api_calls: 0,
    saved_alerts: -1 // unlimited
  },
  professional: {
    ai_summaries: 1000,
    ai_searches: 500,
    exports: -1, // unlimited
    api_calls: 5000,
    saved_alerts: -1 // unlimited
  },
  teams: {
    ai_summaries: 5000, // pooled across team
    ai_searches: 2500, // pooled across team
    exports: -1, // unlimited
    api_calls: -1, // unlimited
    saved_alerts: -1 // unlimited
  }
};

export const useUsageLimits = () => {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);

  const getTierLimits = (tier: string) => {
    return TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.starter;
  };

  const checkAndLogUsage = async (
    usageType: 'ai_summary' | 'ai_search' | 'export' | 'api_call',
    userTier: 'starter' | 'growth' | 'professional'
  ): Promise<UsageLimitResult> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setChecking(true);
    try {
      const limits = getTierLimits(userTier);
      const limit = limits[`${usageType}s` as keyof typeof limits] as number;

      // If unlimited (limit = -1), allow immediately without logging
      if (limit === -1) {
        return {
          allowed: true,
          current_usage: 0,
          limit: -1,
          period_end: '',
          message: 'Unlimited usage'
        };
      }

      const { data, error } = await supabase.rpc('check_and_log_usage', {
        user_uuid: user.id,
        usage_type_param: usageType,
        limit_count: limit
      });

      if (error) {
        logger.error('Error checking usage limit:', error);
        throw error;
      }

      const result = data as unknown as UsageLimitResult;

      if (!result.allowed) {
        toast.error(result.message, {
          description: 'Upgrade your plan to continue',
          action: {
            label: 'Upgrade',
            onClick: () => window.location.href = '/pricing'
          }
        });
      } else if (result.current_usage >= result.limit * 0.8) {
        // Warning at 80% usage
        toast.warning(
          `You've used ${result.current_usage}/${result.limit} ${usageType}s this month`,
          {
            description: 'Consider upgrading before hitting your limit'
          }
        );
      }

      return result;
    } finally {
      setChecking(false);
    }
  };

  const getUsageSummary = async (): Promise<UsageSummary | null> => {
    if (!user?.id) {
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('get_usage_summary', {
        user_uuid: user.id
      });

      if (error) {
        logger.error('Error fetching usage summary:', error);
        throw error;
      }

      return data as unknown as UsageSummary;
    } catch (error) {
      logger.error('Error in getUsageSummary:', error);
      return null;
    }
  };

  return {
    checkAndLogUsage,
    getUsageSummary,
    getTierLimits,
    checking
  };
};
