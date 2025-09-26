import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { useState, useEffect } from 'react';

export const usePlanRestrictions = () => {
  const { user, isAdmin } = useAuth();
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscription check with admin bypass
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        // Admin users get enterprise-level access
        if (isAdmin) {
          logger.info('User is admin, granting enterprise access');
          setSubscriptionTier('enterprise');
          setLoading(false);
          return;
        }

        if (!user?.id) {
          setSubscriptionTier('starter'); // Default for unauthenticated
          setLoading(false);
          return;
        }

        // Check basic profiles table (subscription columns don't exist)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          logger.error('Error fetching subscription:', error);
          setSubscriptionTier('starter'); // Fallback
        } else {
          // Default fallback since subscription columns don't exist
          setSubscriptionTier('starter');
          logger.info('Using default starter tier');
        }
      } catch (error) {
        logger.error('Error checking subscription:', error);
        setSubscriptionTier('starter'); // Safe fallback
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user, isAdmin]);

  const hasFeatureAccess = (featureName: string): boolean => {
    // Admin users have access to all features
    if (isAdmin) {
      logger.info(`Admin user accessing feature: ${featureName}`);
      return true;
    }

    const featureMatrix = {
      compliance_assistant: ['growth', 'professional', 'enterprise'],
      regulatory_impact_analysis: ['professional', 'enterprise'],
      supplier_risk_monitoring: ['professional', 'enterprise'],
      task_management: ['starter', 'growth', 'professional', 'enterprise'],
      compliance_calendar: ['starter', 'growth', 'professional', 'enterprise'],
      enhanced_analytics: ['professional', 'enterprise'],
      compliance_workflows: ['enterprise'],
      predictive_risk_modeling: ['enterprise'],
      api_access: ['enterprise'],
      custom_data_sources: ['enterprise'],
      ai_assistant: ['starter', 'growth', 'professional', 'enterprise'], // AI assistant for all tiers
      ai_queries: ['starter', 'growth', 'professional', 'enterprise'], // AI queries for all tiers
      advanced_filters: ['growth', 'professional', 'enterprise'] // Advanced filters from Growth tier
    };

    const allowedTiers = featureMatrix[featureName as keyof typeof featureMatrix] || [];
    return allowedTiers.includes(subscriptionTier || 'starter');
  };

  const getPlanLimits = () => {
    const limits = {
      starter: {
        ai_queries_per_month: 50,
        alert_history_days: 30,
        team_members: 1,
        data_sources: ['FDA', 'USDA'],
        exports_per_month: 5,
        queries_per_month: 50, // backward compatibility
        alerts_per_day: 10,
        saved_searches: 5,
        api_access: false,
        advanced_filters: false,
        bulk_export: false,
        custom_notifications: false,
        priority_support: false
      },
      growth: {
        ai_queries_per_month: 200,
        alert_history_days: 90,
        team_members: 3,
        data_sources: ['FDA', 'USDA', 'EPA'],
        exports_per_month: 25,
        queries_per_month: 200, // backward compatibility
        alerts_per_day: 50,
        saved_searches: 25,
        api_access: false,
        advanced_filters: true,
        bulk_export: false,
        custom_notifications: true,
        priority_support: true
      },
      professional: {
        ai_queries_per_month: -1, // unlimited
        alert_history_days: 365,
        team_members: 5,
        data_sources: ['FDA', 'USDA', 'EPA', 'CDC'],
        exports_per_month: -1, // unlimited
        queries_per_month: -1, // backward compatibility
        alerts_per_day: -1,
        saved_searches: -1,
        api_access: true,
        advanced_filters: true,
        bulk_export: true,
        custom_notifications: true,
        priority_support: true
      },
      enterprise: {
        ai_queries_per_month: -1, // unlimited  
        alert_history_days: -1, // unlimited
        team_members: -1, // unlimited
        data_sources: ['FDA', 'USDA', 'EPA', 'CDC', 'Custom'],
        exports_per_month: -1, // unlimited
        queries_per_month: -1, // backward compatibility
        alerts_per_day: -1,
        saved_searches: -1,
        api_access: true,
        advanced_filters: true,
        bulk_export: true,
        custom_notifications: true,
        priority_support: true
      }
    };

    return limits[subscriptionTier as keyof typeof limits] || limits.starter;
  };

  const checkFeatureAccess = (featureName: string): boolean => {
    return hasFeatureAccess(featureName);
  };

  const checkUsageLimit = (featureName: string, currentUsage: number = 0): { allowed: boolean; message?: string; current_usage?: number; limit?: number } => {
    // Admin users bypass all usage limits
    if (isAdmin) {
      logger.info(`Admin user bypassing usage limit for: ${featureName}`);
      return { allowed: true, current_usage: currentUsage, limit: -1 };
    }

    const limits = getPlanLimits();

    switch (featureName) {
      case 'ai_queries':
        const limit = limits.ai_queries_per_month;
        if (limit === -1) return { allowed: true, current_usage: currentUsage, limit: -1 };
        return {
          allowed: currentUsage < limit,
          current_usage: currentUsage,
          limit: limit,
          message: currentUsage >= limit ? `Monthly AI query limit (${limit}) reached. Upgrade for unlimited queries.` : undefined
        };
      case 'exports':
        const exportLimit = limits.exports_per_month;
        if (exportLimit === -1) return { allowed: true, current_usage: currentUsage, limit: -1 };
        return {
          allowed: currentUsage < exportLimit,
          current_usage: currentUsage,
          limit: exportLimit,
          message: currentUsage >= exportLimit ? `Monthly export limit (${exportLimit}) reached. Upgrade for unlimited exports.` : undefined
        };
      default:
        return { allowed: true, current_usage: currentUsage, limit: -1 };
    }
  };

  return {
    subscriptionTier,
    loading,
    hasFeatureAccess,
    checkFeatureAccess,
    checkUsageLimit,
    getPlanLimits
  };
};