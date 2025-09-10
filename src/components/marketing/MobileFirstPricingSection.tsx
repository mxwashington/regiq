import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Zap, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';
import { cn } from '@/lib/utils';

interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualSavings: number;
  description: string;
  features: {
    name: string;
    included: boolean;
  }[];
  cta: string;
  popular?: boolean;
  highlight?: boolean;
}

export const MobileFirstPricingSection: React.FC = () => {
  const { user } = useAuth();
  const { upgradeToCustomPlan, loading } = useSubscriptionUpgrade();
  const [isAnnual, setIsAnnual] = useState(false);

  const tiers: PricingTier[] = [
    {
      id: 'alerts_only',
      name: 'Essential Alerts',
      monthlyPrice: 10,
      annualPrice: 100,
      annualSavings: 20,
      description: 'Real-time regulatory alerts for one facility',
      highlight: true,
      features: [
        { name: '1 Facility', included: true },
        { name: 'Email Alerts', included: true },
        { name: 'Basic Categories (Critical/High/Medium/Low)', included: true },
        { name: '30-day History', included: true },
        { name: '50 Alerts/day', included: true },
        { name: 'Critical Alerts (Real-time)', included: true },
        { name: 'AI Assistant', included: false },
        { name: 'Mobile App', included: false },
      ],
      cta: 'Start Essential Alerts',
    },
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 99,
      annualPrice: 990,
      annualSavings: 198,
      description: 'AI-powered regulatory intelligence',
      popular: true,
      features: [
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
      monthlyPrice: 399,
      annualPrice: 3990,
      annualSavings: 798,
      description: 'Advanced analytics and compliance tools',
      features: [
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
      monthlyPrice: 999,
      annualPrice: 9990,
      annualSavings: 1998,
      description: 'Full platform with API access',
      features: [
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
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12 px-4 pt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Choose Your Plan
          </h1>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Start with essential alerts or unlock the full power of regulatory intelligence
          </p>
        </div>

        {/* iOS-Style Toggle Switch */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
          <div className="flex items-center gap-4">
            <span className={cn(
              "text-base font-medium transition-colors duration-300",
              !isAnnual ? "text-foreground" : "text-muted-foreground"
            )}>
              Monthly
            </span>
            
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-16 h-8 bg-muted border border-border rounded-full transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover:shadow-md"
              style={{ minHeight: '44px', minWidth: '64px' }}
            >
              <div 
                className={cn(
                  "absolute top-0.5 w-7 h-7 bg-primary rounded-full shadow-md transition-all duration-300 ease-out",
                  isAnnual ? "translate-x-8" : "translate-x-0.5"
                )}
              />
            </button>
            
            <span className={cn(
              "text-base font-medium transition-colors duration-300",
              isAnnual ? "text-foreground" : "text-muted-foreground"
            )}>
              Annual
            </span>
          </div>
          
          {/* Animated Badge */}
          <div className={cn(
            "transition-all duration-500 ease-out",
            isAnnual ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
          )}>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
              2 months free
            </Badge>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mt-16">
          {tiers.map((tier, index) => (
            <Card 
              key={tier.id}
              className={cn(
                "relative transition-all duration-500 ease-out hover:shadow-xl group",
                "animate-fade-in pt-6",
                tier.popular && "md:scale-105 lg:scale-110 shadow-lg ring-2 ring-primary/20",
                tier.highlight && "border-orange-200 bg-gradient-to-br from-orange-50/50 to-background",
                "hover:scale-[1.02] active:scale-95 touch-none"
              )}
              style={{ 
                animationDelay: `${index * 150}ms`,
                animationFillMode: 'both'
              }}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1.5 shadow-md">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              {/* New Badge */}
              {tier.highlight && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge variant="outline" className="bg-orange-100 border-orange-300 text-orange-700 px-4 py-1.5 shadow-md">
                    <Zap className="w-3 h-3 mr-1" />
                    New
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4 pt-12">
                <CardTitle className="text-xl lg:text-2xl font-bold mb-3">
                  {tier.name}
                </CardTitle>
                
                {/* Pricing Display */}
                <div className="mb-3">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl lg:text-4xl font-bold text-foreground">
                      ${isAnnual ? tier.annualPrice : tier.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground text-base">
                      /{isAnnual ? 'year' : 'month'}
                    </span>
                  </div>
                  
                  {/* Savings Display */}
                  {isAnnual && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <span className="line-through">
                        ${tier.monthlyPrice * 12}
                      </span>
                      <span className="text-primary font-medium ml-2">
                        Save ${tier.annualSavings}
                      </span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tier.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features List */}
                <ul className="space-y-3">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/60 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={cn(
                        "leading-relaxed",
                        feature.included ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={loading}
                  className={cn(
                    "w-full py-3 font-medium transition-all duration-200",
                    "hover:shadow-md active:scale-95",
                    tier.popular 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" 
                      : "border border-border hover:bg-muted"
                  )}
                  variant={tier.popular ? "default" : "outline"}
                >
                  {loading ? 'Processing...' : tier.cta}
                </Button>

                {/* Additional Info */}
                {tier.id === 'alerts_only' && (
                  <div className="text-xs text-center text-muted-foreground pt-2">
                    No trial period • Start immediately
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Text */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>All plans include 24/7 email support • Cancel anytime • No setup fees</p>
        </div>
      </div>
    </section>
  );
};