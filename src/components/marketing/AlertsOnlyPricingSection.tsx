import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';
import { cn } from '@/lib/utils';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  description: string;
  features: {
    name: string;
    included: boolean;
    tooltip?: string;
  }[];
  cta: string;
  popular?: boolean;
  highlight?: boolean;
}

export const AlertsOnlyPricingSection: React.FC = () => {
  const { user } = useAuth();
  const { upgradeToCustomPlan, loading } = useSubscriptionUpgrade();
  const [isAnnual, setIsAnnual] = useState(false);

  const tiers: PricingTier[] = [
    {
      id: 'alerts_only',
      name: 'Essential Alerts',
      price: 10,
      annualPrice: 100,
      description: 'Real-time regulatory alerts for one facility',
      highlight: true,
      features: [
        { name: '1 User', included: true },
        { name: '1 Facility', included: true },
        { name: 'Email Alerts', included: true },
        { name: 'Basic Categories (Critical/High/Medium/Low)', included: true },
        { name: '30-day History', included: true },
        { name: '50 Alerts/day', included: true },
        { name: 'Critical Alerts (Real-time)', included: true },
        { name: 'AI Assistant', included: false, tooltip: 'Upgrade to Starter for AI-powered insights' },
        { name: 'Mobile App', included: false, tooltip: 'Available with Starter plan' },
        { name: 'Advanced Analytics', included: false, tooltip: 'Professional plan feature' },
        { name: 'Multi-facility', included: false, tooltip: 'Upgrade to Starter for multiple facilities' },
        { name: 'API Access', included: false, tooltip: 'Enterprise feature' },
      ],
      cta: 'Start Essential Alerts',
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 99,
      annualPrice: 990,
      description: 'AI-powered regulatory intelligence',
      popular: true,
      features: [
        { name: '3 Users', included: true },
        { name: '3 Facilities', included: true },
        { name: 'Email + Mobile Alerts', included: true },
        { name: 'All Categories + Advanced Filters', included: true },
        { name: 'Unlimited History', included: true },
        { name: '200 Alerts/day', included: true },
        { name: 'Real-time All Alerts', included: true },
        { name: 'AI Assistant', included: true },
        { name: 'Mobile App', included: true },
        { name: 'PDF Export', included: true },
        { name: 'Multi-facility', included: true },
        { name: 'API Access', included: false },
      ],
      cta: 'Most Popular',
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 399,
      annualPrice: 3990,
      description: 'Advanced analytics and compliance tools',
      features: [
        { name: '10 Users', included: true },
        { name: 'Unlimited Facilities', included: true },
        { name: 'All Starter Features', included: true },
        { name: 'Advanced Analytics', included: true },
        { name: 'Supplier Risk Monitoring', included: true },
        { name: 'Compliance Calendar', included: true },
        { name: 'Team Collaboration', included: true },
        { name: 'Priority Support', included: true },
        { name: 'Custom Integrations', included: true },
        { name: 'API Access (Limited)', included: true },
        { name: 'Regulatory Impact Analysis', included: true },
        { name: 'Full API Access', included: false },
      ],
      cta: 'Go Professional',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 999,
      annualPrice: 9990,
      description: 'Full platform with API access',
      features: [
        { name: 'Unlimited Users', included: true },
        { name: 'Everything in Professional', included: true },
        { name: 'Full API Access', included: true },
        { name: 'White-label Options', included: true },
        { name: 'Dedicated Success Manager', included: true },
        { name: 'Custom SLAs', included: true },
        { name: 'Advanced Security', included: true },
        { name: 'SSO Integration', included: true },
        { name: 'Custom Reporting', included: true },
        { name: 'Regulatory Consulting', included: true },
        { name: 'Training & Onboarding', included: true },
        { name: 'Priority Feature Requests', included: true },
      ],
      cta: 'Contact Sales',
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      window.location.href = '/auth?redirect=/pricing';
      return;
    }

    if (planId === 'enterprise') {
      window.open('mailto:sales@regiq.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    await upgradeToCustomPlan({ 
      targetPlan: planId,
      annual: isAnnual 
    });
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Start with essential alerts or unlock the full power of regulatory intelligence
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={cn("text-sm", !isAnnual && "font-semibold")}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-12 h-6 bg-muted rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <div className={cn(
                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                isAnnual ? "translate-x-6" : "translate-x-0.5"
              )} />
            </button>
            <span className={cn("text-sm", isAnnual && "font-semibold")}>
              Annual <Badge variant="secondary" className="ml-1">2 months free</Badge>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <Card 
              key={tier.id} 
              className={cn(
                "relative",
                tier.popular && "ring-2 ring-primary shadow-lg scale-105",
                tier.highlight && "border-orange-200 bg-orange-50/50"
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge variant="outline" className="bg-orange-100 border-orange-300 text-orange-700 px-3 py-1">
                    <Zap className="w-3 h-3 mr-1" />
                    New
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl mb-2">{tier.name}</CardTitle>
                <div className="mb-2">
                  <span className="text-3xl font-bold">
                    ${isAnnual ? tier.annualPrice : tier.price}
                  </span>
                  <span className="text-muted-foreground">
                    /{isAnnual ? 'year' : 'month'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      )}
                      <span className={cn(
                        feature.included ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={loading}
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                >
                  {loading ? 'Processing...' : tier.cta}
                </Button>

                {tier.id === 'alerts_only' && (
                  <div className="text-xs text-center text-muted-foreground mt-2">
                    No trial period • Start immediately
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>All plans include 24/7 email support • Cancel anytime • No setup fees</p>
        </div>
      </div>
    </section>
  );
};