import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, ArrowRight, TrendingUp, Shield, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';
import { cn } from '@/lib/utils';

interface PricingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  target: string;
  userLimit: string;
  popular?: boolean;
  features: string[];
  cta: string;
}

export const NewPricingSection: React.FC = () => {
  const { user } = useAuth();
  const { upgradeToCustomPlan, loading } = useSubscriptionUpgrade();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans: PricingPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 179,
      annualPrice: 1908,
      description: 'Perfect for small businesses and single facility operations',
      target: 'Small businesses, single facility operations',
      userLimit: 'Up to 3 users',
      features: [
        'Real-time regulatory alerts (FDA, USDA, EPA)',
        'Basic filtering and search functionality',
        'Mobile-responsive dashboard',
        'AI alert summarization',
        'Single facility management',
        'Email notifications',
        'Slack integration',
        'Basic customer support (email only)',
      ],
      cta: 'Start Free Trial',
    },
    {
      id: 'growth',
      name: 'Growth',
      monthlyPrice: 349,
      annualPrice: 3718,
      description: 'Ideal for growing businesses and multi-location operations',
      target: 'Growing businesses, multi-location operations',
      userLimit: 'Up to 10 users with basic role permissions',
      popular: true,
      features: [
        'Everything from Starter Plan, plus:',
        'Multi-facility management (up to 5 locations)',
        'AI compliance assistant with chat interface',
        'Risk dashboard and analytics',
        'Task management with team collaboration',
        'HACCP integration capabilities',
        'Compliance calendar and deadline tracking',
        'Phone support during business hours',
        'Priority email support',
      ],
      cta: 'Start Free Trial',
    },
    {
      id: 'professional',
      name: 'Professional',
      monthlyPrice: 549,
      annualPrice: 5858,
      description: 'Enterprise-ready organizations with unlimited scale',
      target: 'Enterprise-ready organizations, unlimited scale',
      userLimit: 'Unlimited users and facilities',
      features: [
        'Everything from Growth Plan, plus:',
        'Unlimited facilities and locations',
        'Advanced AI features (impact analysis, regulatory gap detection)',
        'Custom integrations via webhooks and basic API access',
        'Advanced analytics and reporting suite',
        'Supplier risk monitoring',
        'White-label compliance reports with company branding',
        'Dedicated customer success manager',
        'Priority phone and email support',
        'Custom onboarding and training',
      ],
      cta: 'Start Free Trial',
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      window.location.href = '/auth?redirect=/pricing';
      return;
    }

    await upgradeToCustomPlan({ 
      targetPlan: planId,
      annual: isAnnual 
    });
  };

  const calculateSavings = (monthlyPrice: number, annualPrice: number) => {
    const totalMonthly = monthlyPrice * 12;
    return totalMonthly - annualPrice;
  };

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-background via-background to-muted/10">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
            Choose Your <span className="text-primary">RegIQ</span> Plan
          </h1>
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Transform regulatory compliance into competitive advantage with proven 8-23:1 ROI
          </p>
          
          {/* ROI Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="flex items-center gap-3 justify-center p-4 bg-card rounded-lg border">
              <TrendingUp className="w-6 h-6 text-green-500" />
              <div className="text-left">
                <div className="font-semibold">8-23:1 ROI</div>
                <div className="text-sm text-muted-foreground">Proven returns</div>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-center p-4 bg-card rounded-lg border">
              <Shield className="w-6 h-6 text-blue-500" />
              <div className="text-left">
                <div className="font-semibold">$40K+ Saved</div>
                <div className="text-sm text-muted-foreground">Annual compliance costs</div>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-center p-4 bg-card rounded-lg border">
              <Users className="w-6 h-6 text-purple-500" />
              <div className="text-left">
                <div className="font-semibold">195 Hours</div>
                <div className="text-sm text-muted-foreground">Saved annually</div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex flex-col items-center gap-6 mb-16">
          <div className="flex items-center gap-4 p-1 bg-muted rounded-full">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                !isAnnual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                isAnnual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
            </button>
          </div>
          
          {isAnnual && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 px-4 py-2">
              <Star className="w-4 h-4 mr-2" />
              Save 11% with annual billing
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={cn(
                "relative transition-all duration-300 hover:shadow-xl",
                plan.popular && "ring-2 ring-primary shadow-xl scale-105 lg:scale-110"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-6 py-2 text-sm font-semibold">
                    MOST POPULAR
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4 pt-8">
                <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                
                {/* Price Display */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-foreground">
                      ${isAnnual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground text-lg">/month</span>
                  </div>
                  
                  {isAnnual && (
                    <div className="mt-2 space-y-1">
                      <div className="text-lg font-semibold text-primary">
                        ${plan.annualPrice}/year
                      </div>
                      <div className="text-sm text-green-600">
                        Save ${calculateSavings(plan.monthlyPrice, plan.annualPrice)} annually
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="text-muted-foreground text-sm mb-2">{plan.description}</p>
                <div className="text-xs text-muted-foreground font-medium">{plan.userLimit}</div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className={cn(
                        feature.startsWith('Everything from') ? "font-medium text-primary" : "text-foreground"
                      )}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading}
                  className={cn(
                    "w-full py-6 text-base font-semibold transition-all duration-200",
                    "group hover:shadow-lg",
                    plan.popular 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "border-2 hover:border-primary hover:bg-primary/5"
                  )}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {loading ? 'Processing...' : (
                    <span className="flex items-center justify-center gap-2">
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Signals */}
        <div className="text-center mt-16 space-y-4">
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              No setup fees
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Money-back guarantee
            </div>
          </div>
          
          <p className="text-lg font-medium text-foreground max-w-2xl mx-auto">
            Join thousands of compliance professionals who trust RegIQ as essential infrastructure for regulatory intelligence
          </p>
        </div>
      </div>
    </section>
  );
};