import React from "react";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePlanRestrictions } from "@/hooks/usePlanRestrictions";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Link } from "react-router-dom";

export type PlanName = 'starter' | 'growth' | 'professional';

interface PlanGatingProps {
  requiredPlan: PlanName;
  feature?: string;
  children: React.ReactNode;
}

const planOrder: Record<PlanName, number> = {
  starter: 1,
  growth: 2,
  professional: 3,
};

const mapSubscriberTierToLevel = (tier: string | null, subscribed: boolean): number => {
  if (!subscribed) return 1; // Starter plan for non-subscribers
  if (!tier) return 1;
  const t = tier.toLowerCase();
  if (t.includes('professional')) return 3;
  if (t.includes('growth')) return 2;
  return 1; // Default to starter
};

export const PlanGating: React.FC<PlanGatingProps> = ({ requiredPlan, feature, children }) => {
  const { subscriptionTier, subscribed } = useUserProfile();
  const { checkFeatureAccess } = usePlanRestrictions();
  const { isAdmin } = useAdminAuth();
  const userLevel = mapSubscriberTierToLevel(subscriptionTier, subscribed);
  const requiredLevel = planOrder[requiredPlan];

  // Admins bypass all plan restrictions
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check specific feature access if feature is provided
  if (feature && !checkFeatureAccess(feature)) {
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
          <div className="text-center p-4">
            <p className="text-sm text-muted-foreground mb-3">
              {feature.replace('_', ' ')} requires a paid plan
            </p>
            <Button asChild>
              <Link to={`/pricing?upgrade=${requiredPlan}`}>
                Upgrade to {requiredPlan} plan
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (userLevel >= requiredLevel) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
        <div className="text-center p-4">
          <p className="text-sm text-muted-foreground mb-3">
            This feature requires a {requiredPlan} plan
          </p>
          <Button asChild>
            <Link to={`/pricing?upgrade=${requiredPlan}`}>
              Upgrade to {requiredPlan} plan
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanGating;
