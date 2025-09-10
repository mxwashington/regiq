import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Zap, CheckCircle } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';

interface TrialGateProps {
  children: React.ReactNode;
  feature?: string;
}

export const TrialGate: React.FC<TrialGateProps> = ({ 
  children, 
  feature = "this feature" 
}) => {
  const { isTrialExpired, daysRemaining, subscriptionStatus, loading } = useTrialStatus();
  const { upgradeToStarter, loading: upgradeLoading } = useSubscriptionUpgrade();

  // Allow access if not expired or has paid subscription
  if (loading || !isTrialExpired || subscriptionStatus === 'active' || subscriptionStatus === 'paid') {
    return <>{children}</>;
  }

  // Show upgrade prompt if trial expired
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            Trial Expired
            <Badge variant="destructive">Action Required</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Your 7-day free trial has ended. Upgrade to RegIQ Starter to continue accessing {feature} and all premium features.
          </p>
          
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              RegIQ Starter - $9/month
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Unlimited regulatory alerts
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Advanced search & filters
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Supplier risk monitoring
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Email notifications & digests
              </li>
            </ul>
          </div>

          <Button 
            onClick={upgradeToStarter}
            disabled={upgradeLoading}
            className="w-full"
            size="lg"
          >
            {upgradeLoading ? 'Processing...' : 'Upgrade to Starter'}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Cancel anytime • 30-day money-back guarantee
          </p>
        </CardContent>
      </Card>
    </div>
  );
};