import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Crown, CheckCircle } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';

export const TrialStatusIndicator: React.FC = () => {
  const { isTrialExpired, daysRemaining, subscriptionStatus, loading } = useTrialStatus();

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

  if (isTrialExpired) {
    return (
      <Badge variant="destructive">
        <Clock className="h-3 w-3 mr-1" />
        Trial Expired
      </Badge>
    );
  }

  if (daysRemaining <= 3) {
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-300">
        <Clock className="h-3 w-3 mr-1" />
        {daysRemaining} days left
      </Badge>
    );
  }

  return (
    <Badge className="bg-blue-100 text-blue-800 border-blue-300">
      <CheckCircle className="h-3 w-3 mr-1" />
      {daysRemaining} day trial
    </Badge>
  );
};