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
            Your trial has expired. Upgrade now to continue using RegIQ.
          </span>
          <Button 
            size="sm" 
            onClick={upgradeToStarter}
            disabled={upgradeLoading}
            className="ml-4"
          >
            {upgradeLoading ? 'Processing...' : 'Upgrade Now'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (daysRemaining <= 3) {
    return (
      <Alert className="border-warning bg-warning/10">
        <Clock className="h-4 w-4 text-warning" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-warning font-medium">
            {daysRemaining === 0 
              ? 'Your trial expires today!' 
              : `Your trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
            }
          </span>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={upgradeToStarter}
            disabled={upgradeLoading}
            className="ml-4"
          >
            <Zap className="h-3 w-3 mr-1" />
            {upgradeLoading ? 'Processing...' : 'Upgrade'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <Alert className="border-primary bg-primary/5">
        <Zap className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>{daysRemaining} days left</strong> in your free trial. Upgrade to unlock premium features.
          </span>
          <Button 
            size="sm" 
            variant="outline"
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

  return null;
};