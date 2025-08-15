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
      price: 99,
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
      price: 299,
      desc: 'Ideal for growing compliance teams (most popular)',
      cta: 'Start Free Trial',
      to: '/pricing?plan=professional',
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
      price: 799,
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
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground">Plans that scale with your compliance needs</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className={`border-2 ${p.id === 'professional' ? 'border-primary/40' : 'border-primary/20'}`}>
              <CardHeader className="text-center">
                {p.id === 'professional' && (
                  <div className="mb-2 flex justify-center">
                    <Badge variant="secondary">Most Popular</Badge>
                  </div>
                )}
                <CardTitle className="text-2xl">{p.name}</CardTitle>
                <CardDescription>{p.desc}</CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="flex items-end justify-center gap-2">
                  <span className="text-4xl font-bold">${p.price}</span>
                  <span className="text-muted-foreground mb-1">/month</span>
                </div>
                <ul className="text-sm text-muted-foreground grid gap-2 max-w-sm mx-auto">
                  {p.features.map((f, idx) => (
                    <li key={idx}>• {f}</li>
                  ))}
                </ul>
                <Button 
                  size="lg" 
                  onClick={() => handleSubscribe(p.id)}
                  disabled={loading === p.id}
                >
                  {loading === p.id ? "Starting..." : p.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">14-day free trial on Starter and Professional. Cancel anytime.</p>
      </div>
    </section>
  );
};

export default PricingSection;
