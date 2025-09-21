import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building, TrendingUp, ArrowUp } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';
import { cn } from '@/lib/utils';

interface UsageMetric {
  label: string;
  current: number;
  limit: number;
  icon: React.ReactNode;
  warningThreshold: number;
}

export const PlanUsageIndicator: React.FC = () => {
  const { subscriptionTier, subscribed } = useUserProfile();
  const { upgradeToCustomPlan, loading } = useSubscriptionUpgrade();

  // Mock usage data - replace with actual usage hooks
  const currentPlan = subscriptionTier || 'starter';
  
  const planLimits = {
    starter: { users: 3, facilities: 1, alerts: 500 },
    growth: { users: 10, facilities: 5, alerts: 2000 },
    professional: { users: 999, facilities: 999, alerts: 9999 }
  };

  const currentUsage = {
    users: 2,
    facilities: 1,
    alerts: 145
  };

  const limits = planLimits[currentPlan as keyof typeof planLimits] || planLimits.starter;

  const metrics: UsageMetric[] = [
    {
      label: 'Active Users',
      current: currentUsage.users,
      limit: limits.users,
      icon: <Users className="w-4 h-4" />,
      warningThreshold: 0.8
    },
    {
      label: 'Facilities',
      current: currentUsage.facilities,
      limit: limits.facilities,
      icon: <Building className="w-4 h-4" />,
      warningThreshold: 0.8
    },
    {
      label: 'Monthly Alerts',
      current: currentUsage.alerts,
      limit: limits.alerts,
      icon: <TrendingUp className="w-4 h-4" />,
      warningThreshold: 0.9
    }
  ];

  const getProgressColor = (usage: number, limit: number, warningThreshold: number) => {
    const percentage = usage / limit;
    if (percentage >= 1) return 'bg-destructive';
    if (percentage >= warningThreshold) return 'bg-orange-500';
    return 'bg-primary';
  };

  const shouldShowUpgrade = metrics.some(metric => 
    metric.current / metric.limit >= metric.warningThreshold
  );

  const handleUpgrade = () => {
    const nextPlan = currentPlan === 'starter' ? 'growth' : 'professional';
    upgradeToCustomPlan({ targetPlan: nextPlan });
  };

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'starter': return 'Starter';
      case 'growth': return 'Growth';
      case 'professional': return 'Professional';
      default: return 'Starter';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Current Plan & Usage</CardTitle>
          <Badge variant="secondary" className="capitalize">
            {getPlanDisplayName(currentPlan)} Plan
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Usage Metrics */}
        <div className="space-y-4">
          {metrics.map((metric) => {
            const percentage = (metric.current / metric.limit) * 100;
            const isAtLimit = metric.current >= metric.limit;
            const isNearLimit = percentage >= (metric.warningThreshold * 100);
            
            return (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {metric.icon}
                    <span className="font-medium">{metric.label}</span>
                  </div>
                  <span className={cn(
                    "font-mono",
                    isAtLimit && "text-destructive",
                    isNearLimit && !isAtLimit && "text-orange-600"
                  )}>
                    {metric.current}/{metric.limit === 999 ? '∞' : metric.limit}
                  </span>
                </div>
                <Progress 
                  value={Math.min(percentage, 100)} 
                  className="h-2"
                />
                {isAtLimit && (
                  <p className="text-xs text-destructive font-medium">
                    Limit reached - upgrade to add more {metric.label.toLowerCase()}
                  </p>
                )}
                {isNearLimit && !isAtLimit && (
                  <p className="text-xs text-orange-600">
                    Approaching limit - consider upgrading soon
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Upgrade Prompt */}
        {shouldShowUpgrade && currentPlan !== 'professional' && (
          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <ArrowUp className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">Upgrade Recommended</span>
            </div>
            <p className="text-sm text-orange-700 mb-3">
              You're approaching your plan limits. Upgrade now to avoid interruptions.
            </p>
            <Button 
              onClick={handleUpgrade}
              disabled={loading}
              size="sm" 
              className="w-full"
            >
              {loading ? 'Processing...' : `Upgrade to ${getPlanDisplayName(currentPlan === 'starter' ? 'growth' : 'professional')}`}
            </Button>
          </div>
        )}

        {/* Plan Features Summary */}
        <div className="pt-4 border-t">
          <h4 className="font-medium text-sm mb-3">Your Plan Includes:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>• Real-time alerts</div>
            <div>• Mobile dashboard</div>
            {currentPlan !== 'starter' && <div>• AI assistant</div>}
            {currentPlan !== 'starter' && <div>• Multi-facility</div>}
            {currentPlan === 'professional' && <div>• API access</div>}
            {currentPlan === 'professional' && <div>• White-label reports</div>}
          </div>
        </div>

        {/* Billing Info */}
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">
            Next billing date: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};