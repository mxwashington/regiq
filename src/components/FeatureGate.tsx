import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Zap, ArrowRight } from 'lucide-react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  feature: string;
  requiredPlan: 'starter' | 'growth' | 'professional';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  requiredPlan,
  children,
  fallback,
  showUpgrade = true
}) => {
  const { currentPlan, limits } = usePlanLimits();
  const { upgradeToCustomPlan, loading } = useSubscriptionUpgrade();

  const planHierarchy = {
    free: 0,
    starter: 1,
    growth: 2,
    professional: 3
  };

  const currentPlanLevel = planHierarchy[currentPlan as keyof typeof planHierarchy] || 0;
  const requiredPlanLevel = planHierarchy[requiredPlan];

  // Check if user has access to this feature
  const hasAccess = currentPlanLevel >= requiredPlanLevel;

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  if (!showUpgrade) {
    return null;
  }

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'starter': return 'Starter';
      case 'growth': return 'Growth';
      case 'professional': return 'Professional';
      default: return 'Pro';
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'starter': return <Zap className="w-4 h-4" />;
      case 'growth': return <Crown className="w-4 h-4" />;
      case 'professional': return <Crown className="w-4 h-4" />;
      default: return <Lock className="w-4 h-4" />;
    }
  };

  const getPlanPrice = (plan: string) => {
    switch (plan) {
      case 'starter': return '$179/month';
      case 'growth': return '$349/month';
      case 'professional': return '$549/month';
      default: return 'Custom pricing';
    }
  };

  const getFeatureDescription = (featureName: string) => {
    const descriptions = {
      aiAssistant: 'Get AI-powered regulatory insights and compliance assistance',
      phoneSupport: 'Direct phone support during business hours',
      apiAccess: 'Programmatic access to regulatory data via REST API',
      whiteLabel: 'Custom-branded reports with your company logo',
      customIntegrations: 'Connect RegIQ with your existing compliance systems',
      dedicatedManager: 'Personal customer success manager for your account',
      multiFacility: 'Manage multiple facilities from one dashboard',
      advancedAnalytics: 'Deep insights into regulatory trends and compliance gaps'
    };
    return descriptions[featureName as keyof typeof descriptions] || 'Advanced compliance features';
  };

  const handleUpgrade = () => {
    upgradeToCustomPlan({ targetPlan: requiredPlan });
  };

  return (
    <div className="relative">
      {/* Blurred content overlay */}
      <div className="pointer-events-none opacity-50 blur-sm">
        {children}
      </div>
      
      {/* Upgrade prompt overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Card className="max-w-sm mx-4 border-2 border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-2">
              <div className={cn(
                "p-3 rounded-full",
                requiredPlan === 'starter' && "bg-blue-100 text-blue-600",
                requiredPlan === 'growth' && "bg-purple-100 text-purple-600", 
                requiredPlan === 'professional' && "bg-orange-100 text-orange-600"
              )}>
                {getPlanIcon(requiredPlan)}
              </div>
            </div>
            <Badge variant="outline" className="mb-2">
              {getPlanDisplayName(requiredPlan)} Feature
            </Badge>
            <CardTitle className="text-xl">{feature}</CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {getFeatureDescription(feature)}
            </p>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-semibold text-lg">{getPlanPrice(requiredPlan)}</div>
              <div className="text-sm text-muted-foreground">
                Upgrade to {getPlanDisplayName(requiredPlan)} plan
              </div>
            </div>
            
            <Button 
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full group"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  Upgrade Now
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              14-day free trial • Cancel anytime
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};