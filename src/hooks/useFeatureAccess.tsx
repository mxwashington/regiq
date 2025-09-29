import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useUserProfile } from '@/hooks/useUserProfile';

export const useFeatureAccess = () => {
  const { currentPlan, limits, isFeatureEnabled } = usePlanLimits();
  const { subscribed } = useUserProfile();

  const hasFeature = (feature: string): boolean => {
    switch (feature) {
      case 'aiAssistant':
        return true; // All tiers have AI (with different limits)
      
      case 'aiSearch':
        return ['growth', 'professional', 'teams'].includes(currentPlan);
      
      case 'phoneSupport':
        return ['professional', 'teams'].includes(currentPlan);
      
      case 'apiAccess':
        return ['professional', 'teams'].includes(currentPlan);
      
      case 'advancedAnalytics':
        return ['professional', 'teams'].includes(currentPlan);
      
      case 'complianceCalendar':
        return ['professional', 'teams'].includes(currentPlan);
      
      case 'exports':
        return ['growth', 'professional', 'teams'].includes(currentPlan);
      
      case 'unlimitedSaves':
        return ['growth', 'professional', 'teams'].includes(currentPlan);
      
      case 'priorityAlerts':
        return ['professional', 'teams'].includes(currentPlan);
      
      // TODO: Teams tier features require organizations table and role-based permissions
      // See TEAMS_INFRASTRUCTURE.md Section 4 for full requirements
      case 'teamCollaboration':
        return currentPlan === 'teams'; // Currently non-functional - backend not implemented
      
      case 'sharedWatchlists':
        return currentPlan === 'teams'; // Currently non-functional - backend not implemented
      
      case 'teamDashboard':
        return currentPlan === 'teams'; // Currently non-functional - backend not implemented
      
      case 'roleBasedPermissions':
        return currentPlan === 'teams'; // Currently non-functional - backend not implemented
      
      default:
        return false;
    }
  };

  const getRequiredPlan = (feature: string): 'starter' | 'growth' | 'professional' | 'teams' => {
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
      
      case 'teamCollaboration':
      case 'sharedWatchlists':
      case 'teamDashboard':
      case 'roleBasedPermissions':
        return 'teams';
      
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