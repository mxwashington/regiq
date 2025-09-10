import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Zap, Crown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from 'react-helmet-async';

const Pricing = () => {
  const { user } = useAuth();
  const navigate = (path: string) => { window.location.href = path; };
  const [loading, setLoading] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const handleStartTrial = async (tier: 'alerts_only' | 'starter' | 'professional' | 'enterprise') => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoading(tier);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier }
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start free trial. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (error) {
      console.error('Billing portal error:', error);
      toast.error('Could not open billing portal.');
    }
  };

  const plans = [
    {
      id: 'alerts_only',
      name: 'Essential Alerts',
      monthlyPrice: 10,
      annualPrice: 99,
      description: 'Real-time regulatory alerts for one facility',
      features: [
        '1 Facility',
        'Email Alerts',
        'Basic Categories (Critical/High/Medium/Low)',
        '30-day History',
        '50 Alerts/day',
        'Critical Alerts (Real-time)',
        'Email support'
      ],
      cta: 'Start Essential Alerts',
      popular: false
    },
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 99,
      annualPrice: 79,
      description: 'Perfect for small teams monitoring single facilities',
      features: [
        '3 Facilities',
        'Up to 3 users',
        '5 supplier watches',
        '200 AI queries/month',
        '6-month alert history',
        'Task Management System',
        'Compliance Calendar',
        'AI Assistant',
        'Mobile App',
        'PDF Export',
        'Email support',
        'Basic exports (10/month)'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      id: 'professional',
      name: 'Professional',
      monthlyPrice: 399,
      annualPrice: 319,
      description: 'Advanced analytics and compliance tools',
      features: [
        'Everything in Starter, plus:',
        'Unlimited Facilities',
        'Up to 10 users',
        '25 supplier watches',
        '1,000 AI queries/month',
        '12-month alert history',
        'Advanced Analytics',
        'Supplier Risk Monitoring',
        'Compliance Calendar',
        'Team Collaboration',
        'Regulatory Impact Analysis',
        'Email + chat support',
        'Unlimited exports',
        'Basic API access'
      ],
      cta: 'Go Professional',
      popular: false
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyPrice: 999,
      annualPrice: 799,
      description: 'Full platform with API access',
      features: [
        'Everything in Professional, plus:',
        'Unlimited facilities',
        'Unlimited users',
        'Unlimited supplier watches',
        'Unlimited AI queries',
        'Complete alert archive',
        'Full API Access',
        'White-label Options',
        'Dedicated Success Manager',
        'Custom SLAs',
        'Advanced Security',
        'SSO integration',
        'Phone + email + chat support',
        'Custom Reporting',
        'Regulatory Consulting'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pricing - RegIQ Plans: Starter, Professional, Enterprise</title>
        <meta name="description" content="Flexible pricing for compliance teams. Starter $99, Professional $399, Enterprise $999. 7-day free trial requires credit card." />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl">RegIQ</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link to="/search" className="text-muted-foreground hover:text-foreground transition-colors">Search</Link>
            {user ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Choose Your Plan
          </h1>
          <div className="space-y-4 mb-8">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">• Save 195 hours annually on regulatory searches</p>
              <p className="text-sm text-muted-foreground">• Reduce compliance costs by $40,000+ per year</p>
              <p className="text-sm text-muted-foreground">• ROI in 30 days or money back</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm ${!isAnnual ? 'font-semibold' : 'text-muted-foreground'}`}>Monthly</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAnnual ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-colors ${
                    isAnnual ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${isAnnual ? 'font-semibold' : 'text-muted-foreground'}`}>
                Annual <span className="text-primary">(Save 20%)</span>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mb-2">
            <Button size="lg" onClick={() => handleStartTrial('professional')}>
              Start Professional Trial
            </Button>
            {user && (
              <Button size="lg" variant="outline" onClick={handleManageBilling}>
                Manage Billing
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
<section className="pt-16 pb-8 px-4" id="pricing">
        <div className="container mx-auto max-w-6xl">
          {/* Mobile: Vertical stack, Desktop: Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mt-8">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative w-full max-w-sm mx-auto ${plan.popular ? 'border-primary shadow-lg md:scale-105' : 'border-border'}`}>
                <CardHeader className="text-center pb-4 pt-6 px-4">
                  <CardTitle className="text-xl lg:text-2xl">{plan.name}</CardTitle>
                  <div className="mb-2">
                    <span className="text-3xl lg:text-4xl font-bold">${isAnnual ? plan.annualPrice : plan.monthlyPrice}</span>
                    <span className="text-muted-foreground ml-2 text-sm">/month</span>
                  </div>
                  {isAnnual && (
                    <div className="text-xs lg:text-sm text-primary font-medium mb-2">
                      Save ${(plan.monthlyPrice - plan.annualPrice) * 12}/year
                    </div>
                  )}
                  <CardDescription className="text-sm lg:text-base">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 lg:space-y-4 px-4 pb-4">
                  <ul className="space-y-2 lg:space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 lg:gap-3">
                        <Check className="h-4 w-4 lg:h-5 lg:w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-xs lg:text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2">
                    {plan.id === 'enterprise' ? (
                      <Button className="w-full" size="sm" variant="secondary" asChild>
                        <Link to="/contact">Contact Sales</Link>
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        size="sm"
                        variant={plan.popular ? "default" : "secondary"}
                        onClick={() => handleStartTrial(plan.id as 'alerts_only' | 'starter' | 'professional')}
                        disabled={loading === plan.id}
                      >
                        {loading === plan.id ? 'Starting...' : plan.cta}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Plan Comparison */}
      <section className="py-12 px-4 bg-muted/20">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-4">Plan Comparison</h2>
          <p className="text-center text-muted-foreground mb-8">Compare features across all tiers</p>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border rounded-lg">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-4 text-left">Feature</th>
                  <th className="border border-border p-4 text-center">Essential ($10/mo)</th>
                  <th className="border border-border p-4 text-center bg-primary/5">Starter ($99/mo)</th>
                  <th className="border border-border p-4 text-center">Professional ($399/mo)</th>
                  <th className="border border-border p-4 text-center">Enterprise ($999/mo)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-background">
                  <td className="border border-border p-4 font-medium">Email Alerts</td>
                  <td className="border border-border p-4 text-center">✓</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✓</td>
                  <td className="border border-border p-4 text-center">✓</td>
                  <td className="border border-border p-4 text-center">✓</td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4 font-medium">Task Management</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✓</td>
                  <td className="border border-border p-4 text-center">✓</td>
                  <td className="border border-border p-4 text-center">✓</td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-border p-4 font-medium">AI Assistant</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✓</td>
                  <td className="border border-border p-4 text-center">✓</td>
                  <td className="border border-border p-4 text-center">✓</td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4 font-medium">Mobile App</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✓</td>
                  <td className="border border-border p-4 text-center">✓</td>
                  <td className="border border-border p-4 text-center">✓</td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-border p-4 font-medium">Advanced Analytics</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✗</td>
                  <td className="border border-border p-4 text-center">✓</td>
                  <td className="border border-border p-4 text-center">✓</td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4 font-medium">Supplier Risk Monitoring</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✗</td>
                  <td className="border border-border p-4 text-center">✓</td>
                  <td className="border border-border p-4 text-center">✓</td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-border p-4 font-medium">Facilities</td>
                  <td className="border border-border p-4 text-center">1</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">3</td>
                  <td className="border border-border p-4 text-center">Unlimited</td>
                  <td className="border border-border p-4 text-center">Unlimited</td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4 font-medium">Users</td>
                  <td className="border border-border p-4 text-center">1</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">Up to 3</td>
                  <td className="border border-border p-4 text-center">Up to 10</td>
                  <td className="border border-border p-4 text-center">Unlimited</td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-border p-4 font-medium">Alert history</td>
                  <td className="border border-border p-4 text-center">30 days</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">6 months</td>
                  <td className="border border-border p-4 text-center">12 months</td>
                  <td className="border border-border p-4 text-center">Complete archive</td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4 font-medium">Support</td>
                  <td className="border border-border p-4 text-center">Email</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">Email</td>
                  <td className="border border-border p-4 text-center">Email + chat</td>
                  <td className="border border-border p-4 text-center">Phone + email + chat</td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-border p-4 font-medium">API access</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✗</td>
                  <td className="border border-border p-4 text-center">Basic</td>
                  <td className="border border-border p-4 text-center">Full API + webhooks</td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4 font-medium">SSO integration</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✗</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            {[
              {
                q: "Do you offer a free trial?",
                a: "Yes. Try Starter or Professional free for 7 days. Essential Alerts ($10) starts immediately with no trial period. Credit card required for trial plans - cancel before trial ends to avoid charges."
              },
              {
                q: "What features are included in each plan?",
                a: "Essential ($10) includes basic email alerts. Starter ($99) adds Task Management, AI Assistant, and Mobile App. Professional ($399) adds Advanced Analytics and Supplier Risk Monitoring. Enterprise ($999) includes all features plus advanced workflows and API access."
              },
              {
                q: "Do you have API access?",
                a: "Professional includes basic API access. Enterprise includes full API + webhooks with custom limits and SSO options."
              },
              {
                q: "Can I upgrade or downgrade anytime?",
                a: "Yes. Change plans or cancel your subscription from the billing portal at any time."
              },
              {
                q: "Is there setup help available?",
                a: "Yes. All plans include email support. Professional adds chat support, and Enterprise includes phone support for faster assistance."
              }
            ].map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-12 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join hundreds of food safety professionals using RegIQ to stay audit‑ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to={user ? "/dashboard" : "/auth"}>
                Start Free Trial
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Contact Sales for API Access
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;