import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const PricingSection: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier: planId }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 99,
      annualPrice: 79,
      desc: 'Perfect for small teams monitoring a single facility',
      cta: 'Start Free Trial',
      to: '/pricing?plan=starter',
      features: [
        '1 facility',
        'Up to 3 users',
        '5 supplier watches',
        '200 AI queries/month',
        '6-month history',
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      monthlyPrice: 399,
      annualPrice: 319,
      desc: 'Ideal for growing compliance teams',
      cta: 'Start Free Trial',
      to: '/pricing?plan=professional',
      mostPopular: true,
      features: [
        'Up to 3 facilities',
        'Up to 10 users',
        '25 supplier watches',
        '1,000 AI queries/month',
        '12-month history',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyPrice: 999,
      annualPrice: 799,
      desc: 'Unlimited scale, SSO, API + webhooks, SLA',
      cta: 'Contact Sales',
      to: '/pricing?plan=enterprise',
      features: [
        'Unlimited facilities/users',
        'Unlimited suppliers/queries',
        'Full API + webhooks',
        'SSO integration',
        '99.9% uptime SLA',
      ],
    },
  ];

  return (
    <section id="pricing" className="py-8 md:py-12 px-4 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold hyphens-none break-words">Simple, Transparent Pricing</h2>
          <div className="flex flex-col items-center gap-4 mt-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">• Save 195 hours annually on regulatory searches</p>
              <p className="text-sm text-muted-foreground">• Reduce compliance costs by $40,000+ per year</p>
              <p className="text-sm text-muted-foreground">• ROI in 30 days or money back</p>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <span className={`text-sm ${!isAnnual ? 'font-semibold' : 'text-muted-foreground'}`}>Monthly</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAnnual ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${isAnnual ? 'font-semibold' : 'text-muted-foreground'}`}>
                Annual <span className="text-primary">(Save 20%)</span>
              </span>
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className={`relative border-2 ${p.mostPopular ? 'border-primary shadow-lg scale-105' : 'border-primary/20'}`}>
              <CardHeader className="text-center">
                {p.mostPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">MOST POPULAR</Badge>
                  </div>
                )}
                <CardTitle className="text-2xl">{p.name}</CardTitle>
                <CardDescription>{p.desc}</CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="flex items-end justify-center gap-2">
                  <span className="text-4xl font-bold">${isAnnual ? p.annualPrice : p.monthlyPrice}</span>
                  <span className="text-muted-foreground mb-1">/month</span>
                </div>
                {isAnnual && (
                  <div className="text-sm text-primary font-medium">
                    Save ${(p.monthlyPrice - p.annualPrice) * 12}/year
                  </div>
                )}
                <ul className="text-sm text-muted-foreground grid gap-2 max-w-sm mx-auto">
                  {p.features.map((f, idx) => (
                    <li key={idx}>• {f}</li>
                  ))}
                </ul>
                <Button 
                  size="lg" 
                  variant={p.mostPopular ? "default" : "secondary"}
                  onClick={() => handleSubscribe(p.id)}
                  disabled={loading === p.id}
                >
                  {loading === p.id ? "Starting..." : p.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">7-day free trial • Cancel before trial ends to avoid charges</p>
      </div>
    </section>
  );
};

export default PricingSection;
