import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CreditCard, RefreshCw } from 'lucide-react';
import { openExternalUrl } from '@/lib/domain';

export function SubscriptionStatus() {
  const { 
    subscribed, 
    subscriptionTier, 
    subscriptionEnd, 
    session, 
    refreshSubscription 
  } = useAuth();
  const { toast } = useToast();

  const handleManageSubscription = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.url) {
        openExternalUrl(data.url);
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshSubscription = async () => {
    await refreshSubscription();
    toast({
      title: "Subscription refreshed",
      description: "Your subscription status has been updated.",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTierDisplayName = () => {
    if (!subscriptionTier) return 'Free';
    return subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Subscription Status</span>
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Plan:</span>
          <Badge variant={subscribed ? "default" : "secondary"}>
            {getTierDisplayName()}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={subscribed ? "default" : "secondary"}>
            {subscribed ? "Active" : "Free Tier"}
          </Badge>
        </div>
        
        {subscribed && subscriptionEnd && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Next Billing:</span>
            <div className="flex items-center space-x-1 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(subscriptionEnd)}</span>
            </div>
          </div>
        )}
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshSubscription}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
          
          {subscribed && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManageSubscription}
              className="flex items-center space-x-1"
            >
              <CreditCard className="w-4 h-4" />
              <span>Manage</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}