import { useUserProfile } from '@/hooks/useUserProfile';

interface PlanLimits {
  users: number;
  facilities: number;
  monthlyAlerts: number;
  aiQueries: number;
  historyMonths: number;
  hasAiAssistant: boolean;
  hasPhoneSupport: boolean;
  hasApiAccess: boolean;
  hasWhiteLabel: boolean;
  hasCustomIntegrations: boolean;
  hasDedicatedManager: boolean;
}

export const usePlanLimits = () => {
  const { subscriptionTier, subscribed } = useUserProfile();

  const getPlanLimits = (plan: string): PlanLimits => {
    switch (plan) {
      case 'starter':
        return {
          users: 1,
          facilities: 1,
          monthlyAlerts: 999999, // Unlimited passive monitoring
          aiQueries: 5, // 5 AI summaries per month
          historyMonths: 1,
          hasAiAssistant: true, // Limited to 5 summaries
          hasPhoneSupport: false,
          hasApiAccess: false,
          hasWhiteLabel: false,
          hasCustomIntegrations: false,
          hasDedicatedManager: false,
        };
      
      case 'growth':
        return {
          users: 1,
          facilities: 1,
          monthlyAlerts: 999999, // Unlimited passive monitoring
          aiQueries: 100, // 100 AI summaries per month
          historyMonths: 3,
          hasAiAssistant: true, // 100 summaries + 20 searches
          hasPhoneSupport: false,
          hasApiAccess: false,
          hasWhiteLabel: false,
          hasCustomIntegrations: false,
          hasDedicatedManager: false,
        };
      
      case 'professional':
        return {
          users: 1,
          facilities: 1,
          monthlyAlerts: 999999, // Unlimited passive monitoring
          aiQueries: 1000, // 1000 AI summaries per month
          historyMonths: 12,
          hasAiAssistant: true, // 1000 summaries + 500 searches
          hasPhoneSupport: true, // Priority email + phone support
          hasApiAccess: true, // 5000 API calls per month
          hasWhiteLabel: false,
          hasCustomIntegrations: false,
          hasDedicatedManager: false,
        };
      
      case 'teams':
        return {
          users: 3, // Minimum 3 users
          facilities: 999999, // Unlimited facilities for teams
          monthlyAlerts: 999999, // Unlimited passive monitoring
          aiQueries: 5000, // 5000 AI summaries per month (pooled)
          historyMonths: 12,
          hasAiAssistant: true, // 5000 summaries + 2500 searches (pooled)
          hasPhoneSupport: true, // Priority support for entire team
          hasApiAccess: true, // Unlimited API calls
          hasWhiteLabel: false,
          hasCustomIntegrations: false,
          hasDedicatedManager: false, // Only for 10+ seats
        };
      
      default:
        // Free tier (same as starter)
        return {
          users: 1,
          facilities: 1,
          monthlyAlerts: 999999,
          aiQueries: 5,
          historyMonths: 1,
          hasAiAssistant: true, // Limited to 5 summaries
          hasPhoneSupport: false,
          hasApiAccess: false,
          hasWhiteLabel: false,
          hasCustomIntegrations: false,
          hasDedicatedManager: false,
        };
    }
  };

  const currentPlan = subscribed ? subscriptionTier || 'starter' : 'free';
  const limits = getPlanLimits(currentPlan);

  const checkLimit = (usage: number, limitType: keyof PlanLimits): boolean => {
    const limit = limits[limitType] as number;
    if (limit >= 999999) return true; // Unlimited
    return usage < limit;
  };

  const getUsagePercentage = (usage: number, limitType: keyof PlanLimits): number => {
    const limit = limits[limitType] as number;
    if (limit >= 999999) return 0; // Unlimited shows 0%
    return Math.min((usage / limit) * 100, 100);
  };

  const isFeatureEnabled = (feature: keyof PlanLimits): boolean => {
    return Boolean(limits[feature]);
  };

  const canAddUsers = (currentUsers: number): boolean => {
    return checkLimit(currentUsers, 'users');
  };

  const canAddFacilities = (currentFacilities: number): boolean => {
    return checkLimit(currentFacilities, 'facilities');
  };

  const canMakeAiQuery = (currentQueries: number): boolean => {
    return checkLimit(currentQueries, 'aiQueries');
  };

  return {
    limits,
    currentPlan,
    checkLimit,
    getUsagePercentage,
    isFeatureEnabled,
    canAddUsers,
    canAddFacilities,
    canMakeAiQuery,
  };
};