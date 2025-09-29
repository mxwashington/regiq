import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, CreditCard, Zap } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';

export const TrialBanner: React.FC = () => {
  const { isTrialExpired, daysRemaining, subscriptionStatus, loading } = useTrialStatus();
  const { upgradeToStarter, loading: upgradeLoading } = useSubscriptionUpgrade();

  if (loading || subscriptionStatus === 'active' || subscriptionStatus === 'paid') {
    return null;
  }

  if (isTrialExpired) {
    return (
      <Alert className="border-destructive bg-destructive/10">
        <CreditCard className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-destructive font-medium">
            Upgrade to access all RegIQ features.
          </span>
          <Button 
            size="sm" 
            onClick={upgradeToStarter}
            disabled={upgradeLoading}
            className="ml-4"
          >
            {upgradeLoading ? 'Processing...' : 'View Plans'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Remove trial countdown banners - we don't have trials anymore
  return null;
};