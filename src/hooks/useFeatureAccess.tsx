import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useUserProfile } from '@/hooks/useUserProfile';

export const useFeatureAccess = () => {
  const { currentPlan, limits, isFeatureEnabled } = usePlanLimits();
  const { subscribed } = useUserProfile();

  const hasFeature = (feature: string): boolean => {
    if (!subscribed) return false;

    switch (feature) {
      case 'aiAssistant':
        return currentPlan !== 'free';
      
      case 'phoneSupport':
        return ['growth', 'professional'].includes(currentPlan);
      
      case 'apiAccess':
        return currentPlan === 'professional';
      
      case 'whiteLabel':
        return currentPlan === 'professional';
      
      case 'customIntegrations':
        return currentPlan === 'professional';
      
      case 'dedicatedManager':
        return currentPlan === 'professional';
      
      case 'multiFacility':
        return currentPlan !== 'free';
      
      case 'advancedAnalytics':
        return ['growth', 'professional'].includes(currentPlan);
      
      case 'complianceCalendar':
        return ['starter', 'growth', 'professional'].includes(currentPlan);
      
      case 'taskManagement':
        return ['starter', 'growth', 'professional'].includes(currentPlan);
      
      case 'supplierRisk':
        return currentPlan === 'professional';
      
      case 'haccp':
        return ['growth', 'professional'].includes(currentPlan);
      
      default:
        return false;
    }
  };

  const getRequiredPlan = (feature: string): 'starter' | 'growth' | 'professional' => {
    switch (feature) {
      case 'aiAssistant':
      case 'multiFacility':
      case 'complianceCalendar':
      case 'taskManagement':
        return 'starter';
      
      case 'phoneSupport':
      case 'advancedAnalytics':
      case 'haccp':
        return 'growth';
      
      case 'apiAccess':
      case 'whiteLabel':
      case 'customIntegrations':
      case 'dedicatedManager':
      case 'supplierRisk':
        return 'professional';
      
      default:
        return 'starter';
    }
  };

  const checkUsageLimit = (type: 'users' | 'facilities' | 'aiQueries', current: number): {
    allowed: boolean;
    percentage: number;
    limit: number;
    isUnlimited: boolean;
  } => {
    const limit = limits[type === 'aiQueries' ? 'aiQueries' : type];
    const isUnlimited = limit >= 999999;
    
    return {
      allowed: isUnlimited || current < limit,
      percentage: isUnlimited ? 0 : Math.min((current / limit) * 100, 100),
      limit: isUnlimited ? Infinity : limit,
      isUnlimited
    };
  };

  return {
    hasFeature,
    getRequiredPlan,
    checkUsageLimit,
    currentPlan,
    limits,
    subscribed
  };
};