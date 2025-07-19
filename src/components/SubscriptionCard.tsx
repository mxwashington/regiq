import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { openExternalUrl } from '@/lib/domain';

interface SubscriptionCardProps {
  tier: 'starter' | 'professional' | 'enterprise';
  price: string;
  features: string[];
  isPopular?: boolean;
  isCurrentPlan?: boolean;
}

export function SubscriptionCard({ 
  tier, 
  price, 
  features, 
  isPopular = false, 
  isCurrentPlan = false 
}: SubscriptionCardProps) {
  const { session, subscribed } = useAuth();
  const { toast } = useToast();

  const handleSubscribe = async () => {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe to a plan.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.url) {
        openExternalUrl(data.url);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Subscription failed",
        description: "There was an error creating your subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTierDisplayName = () => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const getButtonText = () => {
    if (isCurrentPlan) return 'Current Plan';
    if (subscribed) return 'Switch Plan';
    return 'Get Started';
  };

  return (
    <Card className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : ''} ${isCurrentPlan ? 'border-green-500 bg-green-50/50' : ''}`}>
      {isPopular && (
        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
          <Star className="w-3 h-3 mr-1" />
          Most Popular
        </Badge>
      )}
      {isCurrentPlan && (
        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-500">
          Current Plan
        </Badge>
      )}
      
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold">{getTierDisplayName()}</CardTitle>
        <CardDescription className="text-3xl font-bold text-primary">
          {price}
          <span className="text-sm font-normal text-muted-foreground">/month</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        
        <Button 
          className="w-full" 
          onClick={handleSubscribe}
          disabled={isCurrentPlan}
          variant={isCurrentPlan ? "outline" : "default"}
        >
          {getButtonText()}
        </Button>
      </CardContent>
    </Card>
  );
}