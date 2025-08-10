import React from "react";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Link } from "react-router-dom";

export type PlanName = 'starter' | 'professional' | 'enterprise';

interface PlanGatingProps {
  requiredPlan: PlanName;
  feature?: string;
  children: React.ReactNode;
}

const planOrder: Record<PlanName, number> = {
  starter: 1,
  professional: 2,
  enterprise: 3,
};

const mapSubscriberTierToLevel = (tier: string | null): number => {
  if (!tier) return 0;
  const t = tier.toLowerCase();
  if (t.includes('enterprise')) return 3;
  if (t.includes('premium') || t.includes('professional')) return 2;
  if (t.includes('basic') || t.includes('starter')) return 1;
  return 0;
};

export const PlanGating: React.FC<PlanGatingProps> = ({ requiredPlan, feature, children }) => {
  const { subscriptionTier } = useUserProfile();
  const userLevel = mapSubscriberTierToLevel(subscriptionTier);
  const requiredLevel = planOrder[requiredPlan];

  if (userLevel >= requiredLevel) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Button asChild>
          <Link to={`/pricing?upgrade=${requiredPlan}`}>
            Upgrade to {requiredPlan} {feature ? `for ${feature}` : ''}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default PlanGating;
