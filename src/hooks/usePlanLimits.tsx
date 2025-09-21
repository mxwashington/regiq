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
          users: 3,
          facilities: 1,
          monthlyAlerts: 500,
          aiQueries: 100,
          historyMonths: 6,
          hasAiAssistant: true,
          hasPhoneSupport: false,
          hasApiAccess: false,
          hasWhiteLabel: false,
          hasCustomIntegrations: false,
          hasDedicatedManager: false,
        };
      
      case 'growth':
        return {
          users: 10,
          facilities: 5,
          monthlyAlerts: 2000,
          aiQueries: 500,
          historyMonths: 12,
          hasAiAssistant: true,
          hasPhoneSupport: true,
          hasApiAccess: false,
          hasWhiteLabel: false,
          hasCustomIntegrations: false,
          hasDedicatedManager: false,
        };
      
      case 'professional':
        return {
          users: 999999, // Unlimited
          facilities: 999999, // Unlimited
          monthlyAlerts: 999999, // Unlimited
          aiQueries: 999999, // Unlimited
          historyMonths: 999999, // Unlimited
          hasAiAssistant: true,
          hasPhoneSupport: true,
          hasApiAccess: true,
          hasWhiteLabel: true,
          hasCustomIntegrations: true,
          hasDedicatedManager: true,
        };
      
      default:
        // Free tier or unknown
        return {
          users: 1,
          facilities: 1,
          monthlyAlerts: 50,
          aiQueries: 10,
          historyMonths: 1,
          hasAiAssistant: false,
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