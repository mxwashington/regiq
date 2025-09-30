import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Crown, CheckCircle } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export const TrialStatusIndicator: React.FC = () => {
  const { isTrialExpired, daysRemaining, subscriptionStatus, loading } = useTrialStatus();
  const { isAdmin } = useAdminAuth();

  // Show admin status in trial indicator
  if (isAdmin) {
    return (
      <Badge className="bg-purple-100 text-purple-800 border-purple-300">
        <Crown className="h-3 w-3 mr-1" />
        Admin Access
      </Badge>
    );
  }

  if (loading) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  if (subscriptionStatus === 'active' || subscriptionStatus === 'paid') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-300">
        <Crown className="h-3 w-3 mr-1" />
        Premium Active
      </Badge>
    );
  }

  // Free tier users - don't show confusing trial messaging
  return (
    <Badge className="bg-blue-100 text-blue-800 border-blue-300">
      <CheckCircle className="h-3 w-3 mr-1" />
      Starter Plan
    </Badge>
  );
};