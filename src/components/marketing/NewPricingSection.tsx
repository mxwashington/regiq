import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, ArrowRight, TrendingUp, Shield, Users, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';
import { cn } from '@/lib/utils';

interface PricingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  popular?: boolean;
  features: string[];
  cta: string;
}

export const NewPricingSection: React.FC = () => {
  const { user } = useAuth();
  const { upgradeToCustomPlan, loading } = useSubscriptionUpgrade();
  const [isAnnual, setIsAnnual] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // TODO: Teams tier requires organizations table and pooled usage tracking
  // See TEAMS_INFRASTRUCTURE.md for full requirements
  // Teams tier is hidden from production until backend infrastructure is built
  
  const plans: PricingPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 0,
      annualPrice: 0,
      description: 'Perfect for individual users getting started with compliance',
      features: [
        'Real-time regulatory alerts (FDA, USDA, EPA, CDC)',
        'Email and mobile notifications',
        'Basic filtering and search functionality',
        'Mobile-responsive dashboard',
        '5 AI alert summaries per month (powered by Perplexity)',
        'Save up to 10 alerts',
        'Source verification and linking',
        'Single user account',
        'Community support',
      ],
      cta: 'Get Started Free',
    },
    {
      id: 'growth',
      name: 'Growth',
      monthlyPrice: 29,
      annualPrice: 278, // 20% off: $29 × 12 × 0.8
      description: 'Ideal for individual compliance professionals and consultants',
      features: [
        'Everything in Starter, plus:',
        '100 AI alert summaries per month',
        '20 AI-powered searches per month with Perplexity',
        'Unlimited passive monitoring and alerts',
        'Conversational AI chatbot for compliance questions',
        'Save unlimited alerts',
        'Export alerts to PDF/CSV (up to 50 per month)',
        'Advanced alert filtering and prioritization',
        'Single user account',
        'Email support (48-hour response time)',
      ],
      cta: 'Get Started',
    },
    {
      id: 'professional',
      name: 'Professional',
      monthlyPrice: 199,
      annualPrice: 1910, // 20% off: $199 × 12 × 0.8
      description: 'Enterprise-ready for power users with premium support',
      popular: true,
      features: [
        'Everything in Growth, plus:',
        '1,000 AI alert summaries per month',
        '500 AI-powered searches per month',
        'Advanced multi-source search capabilities',
        'Compliance calendar',
        'Analytics dashboard',
        'Priority alert delivery (5-minute vs 15-minute delay)',
        'Custom alert notifications and grouping',
        'Bulk alert management and actions',
        'Unlimited exports to PDF/CSV',
        'API access (5,000 calls per month)',
        'Advanced user activity monitoring',
        'Single user account',
        'Priority email support (24-hour response time)',
        'Phone support during business hours',
      ],
      cta: 'Get Started',
    },
    // Teams tier hidden until backend infrastructure is ready
    // Requires: organizations table, pooled usage tracking, per-seat billing
    // {
    //   id: 'teams',
    //   name: 'Teams',
    //   monthlyPrice: 147,
    //   annualPrice: 1410,
    //   description: 'For compliance teams managing multiple sites or departments',
    //   features: [
    //     'Everything in Professional, plus:',
    //     '3+ user accounts (billed per seat)',
    //     '5,000 AI summaries per month (shared team pool)',
    //     '2,500 AI searches per month (shared team pool)',
    //     'Shared watchlists and saved alerts',
    //     'Team activity dashboard',
    //     'Centralized billing and admin controls',
    //     'Role-based permissions (owner/admin/member)',
    //     'Priority support for entire team',
    //     'Dedicated account manager (10+ seats)',
    //   ],
    //   cta: 'Contact Sales',
    // },
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      setIsRedirecting(true);
      // Show brief loading message before redirect
      setTimeout(() => {
        window.location.href = '/auth?redirect=/pricing';
      }, 800);
      return;
    }

    setIsRedirecting(true);
    await upgradeToCustomPlan({ 
      targetPlan: planId,
      annual: isAnnual 
    });
    setIsRedirecting(false);
  };

  const calculateSavings = (monthlyPrice: number, annualPrice: number) => {
    const totalMonthly = monthlyPrice * 12;
    return totalMonthly - annualPrice;
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-background via-background to-muted/10 overflow-visible">
      <div className="max-w-7xl mx-auto overflow-visible">
        {/* Hero Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
            Choose Your <span className="text-primary">RegIQ</span> Plan
          </h1>
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Individual plans for compliance professionals. Start free, upgrade as you grow.
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Additional AI summaries and searches available. Overage charges capped at next tier price.
          </p>
          
          {/* ROI Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="flex items-center gap-3 justify-center p-4 bg-card rounded-lg border">
              <TrendingUp className="w-6 h-6 text-green-500" />
              <div className="text-left">
                <div className="font-semibold">$40K+ Saved</div>
                <div className="text-sm text-muted-foreground">Per year typically</div>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-center p-4 bg-card rounded-lg border">
              <Shield className="w-6 h-6 text-blue-500" />
              <div className="text-left">
                <div className="font-semibold">90% Faster</div>
                <div className="text-sm text-muted-foreground">Regulatory searches</div>
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
              Save 20% with annual billing
            </Badge>
          )}
        </div>

        {/* Pricing Cards - Grid adjusts for 3 tiers (Teams hidden) */}
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 mt-20 overflow-visible">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={cn(
                "relative transition-all duration-300 hover:shadow-xl",
                plan.popular && "ring-2 ring-primary shadow-xl scale-105 lg:scale-110"
              )}
            >
              {plan.popular && (
                <div 
                  className="absolute z-[20] left-1/2 transform -translate-x-1/2"
                  style={{ top: '-2px' }}
                >
                  <div 
                    className="px-6 py-2 text-white font-semibold uppercase text-xs rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                      letterSpacing: '1.2px',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '8px 24px',
                      borderRadius: '20px',
                      boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    MOST POPULAR
                  </div>
                </div>
              )}

              {plan.id === 'teams' && (
                <div 
                  className="absolute z-[20] left-1/2 transform -translate-x-1/2"
                  style={{ top: '-2px' }}
                >
                  <div 
                    className="px-6 py-2 text-white font-semibold uppercase text-xs rounded-full flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      letterSpacing: '1.2px',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '8px 24px',
                      borderRadius: '20px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    NEW!
                  </div>
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
                  
                  {plan.id === 'teams' && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      3 users minimum at $49/seat{isAnnual ? '/month' : ''}
                    </div>
                  )}
                  
                  {isAnnual && plan.monthlyPrice > 0 && (
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
                <p className="text-xs font-medium text-primary">
                  {plan.id === 'starter' && 'No credit card required'}
                  {plan.id === 'growth' && 'Cancel anytime'}
                  {plan.id === 'professional' && 'Cancel anytime'}
                  {plan.id === 'teams' && 'Starting at 3 users'}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className={cn(
                        feature.startsWith('Everything in') || feature.startsWith('Everything from') ? "font-medium text-primary" : "text-foreground"
                      )}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Clarifying text for paid plans */}
                {plan.monthlyPrice > 0 && (
                  <p className="text-xs text-center text-muted-foreground mb-2">
                    Click to create your account and complete payment. Billing starts immediately.
                  </p>
                )}

                {/* CTA Button */}
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading || isRedirecting}
                  className={cn(
                    "w-full py-6 text-base font-semibold transition-all duration-200",
                    "group hover:shadow-lg",
                    plan.popular 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "border-2 hover:border-primary hover:bg-primary/5"
                  )}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {isRedirecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Taking you to secure checkout...
                    </span>
                  ) : loading ? 'Processing...' : (
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

        {/* Pricing Note - Teams tier hidden */}
        {/* 
        <div className="text-center mt-12 mb-8">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            <strong>Need more seats?</strong> Teams pricing scales at $49/seat (monthly) or $39/seat (annual). 
            Contact us for volume discounts on 20+ users.
          </p>
        </div>
        */}

        {/* Trust Signals */}
        <div className="text-center mt-16 space-y-4">
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Start free, no credit card
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
              Free tier available
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