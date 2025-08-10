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

  const handleStartTrial = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoading('premium');
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
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
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Everything you need for regulatory monitoring",
      features: [
        "Unlimited AI searches",
        "Real-time FDA, USDA, EPA alerts",
        "Mobile-optimized dashboard",
        "Advanced filtering & personalization",
        "Priority email alerts",
        "Export to PDF/Excel",
        "Custom keyword tracking",
        "30-day alert history",
        "Email support"
      ],
      buttonText: "Get Started Free",
      popular: true,
      tier: "free",
      badge: "Everything Free!"
    },
    {
      name: "Professional",
      price: "$49",
      period: "per month",
      description: "Advanced features for QA teams (Currently FREE!)",
      features: [
        "Everything in Free plan",
        "All features currently included at no cost",
        "Advanced analytics (coming soon)",
        "Team collaboration tools (coming soon)",
        "Priority feature requests",
        "Phone support (coming soon)"
      ],
      buttonText: "Coming Soon",
      popular: false,
      tier: "professional",
      badge: "Future Paid Plan",
      disabled: true
    },
    {
      name: "Enterprise",
      price: "$149",
      period: "per month",
      description: "For organizations needing API access",
      features: [
        "Everything in Free plan",
        "API access for integrations",
        "Custom reporting & analytics",
        "Unlimited team members",
        "90-day alert history",
        "Dedicated account manager",
        "SSO integration",
        "Priority feature requests",
        "24/7 phone support"
      ],
      buttonText: "Contact Sales",
      popular: false,
      tier: "enterprise",
      badge: "API Access Only"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pricing - RegIQ | Regulatory Intelligence Plans</title>
        <meta name="description" content="Start a 14-day free trial of RegIQ Premium. Compare Free vs Premium and Enterprise API access." />
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
            <span className="text-primary">RegIQ Premium</span> — 14-day Free Trial
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Enterprise-grade regulatory intelligence for QA teams. $799/month after trial.
          </p>
          <div className="flex items-center justify-center gap-4 mb-8">
            <Button size="lg" onClick={handleStartTrial} disabled={loading === 'premium'}>
              {loading === 'premium' ? 'Starting trial...' : 'Start Free Trial ($799/mo)'}
            </Button>
            {user && (
              <>
                <Button size="lg" variant="outline" onClick={handleManageBilling}>
                  Manage Billing
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/onboarding">Start Onboarding</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards (simplified to Premium) */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <Card className="relative border-primary shadow-lg">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl">RegIQ Premium</CardTitle>
              <div className="mb-2">
                <span className="text-4xl font-bold">$799</span>
                <span className="text-muted-foreground ml-2">/month</span>
              </div>
              <CardDescription className="text-base">
                14-day free trial. Cancel anytime in the portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {["Real-time FDA/USDA/EPA alerts","AI summaries & advanced filtering","Mobile dashboard","CSV/PDF export","Priority email digests","Admin & team controls (roadmap)"].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <Button className="w-full" size="lg" onClick={handleStartTrial} disabled={loading === 'premium'}>
                  {loading === 'premium' ? 'Starting trial...' : 'Start 14-day Free Trial'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-12 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-4">Free vs Premium</h2>
          <p className="text-center text-muted-foreground mb-8">Compare the core Free plan with Premium ($799/month).</p>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border rounded-lg">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-4 text-left">Feature</th>
                  <th className="border border-border p-4 text-center">Free</th>
                  <th className="border border-border p-4 text-center bg-primary/5">Premium ($799/mo)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-background">
                  <td className="border border-border p-4 font-medium">FDA/USDA/EPA alerts</td>
                  <td className="border border-border p-4 text-center">✓</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✓</td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4 font-medium">AI summaries + urgency scoring</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✓</td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-border p-4 font-medium">Supplier watch (25 suppliers)</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✓</td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4 font-medium">Daily email digest</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✓</td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-border p-4 font-medium">Mobile dashboard</td>
                  <td className="border border-border p-4 text-center">✓</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✓</td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4 font-medium">CSV/PDF export</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">✓</td>
                </tr>
                <tr className="bg-background">
                  <td className="border border-border p-4 font-medium">Team controls (Coming soon)</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center bg-primary/5 font-semibold">Coming soon</td>
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
                a: "Yes. Try Premium free for 14 days. Cancel anytime in the portal."
              },
              {
                q: "What's included in the Free plan?",
                a: "Core monitoring: FDA/USDA/EPA alerts and a mobile dashboard."
              },
              {
                q: "What's included in Premium ($799/month)?",
                a: "AI summaries with urgency scoring, supplier watch (25 suppliers), daily email digests, CSV/PDF export, and more."
              },
              {
                q: "Do you have API access?",
                a: "Yes. Enterprise includes API access with custom limits and SSO options."
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Manage or cancel your subscription from the billing portal at any time."
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

      {/* API Access (Enterprise) */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">API Access (Enterprise)</CardTitle>
              <CardDescription>Secure JSON API for integrating FDA/USDA/EPA alerts into your systems.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-2">
                <div className="font-medium">Base URL</div>
                <pre className="rounded-md border bg-muted p-3 overflow-x-auto"><code>https://piyikxxgoekawboitrzz.supabase.co/functions/v1/public-api</code></pre>
              </div>
              <div className="grid gap-2">
                <div className="font-medium">Endpoints</div>
                <pre className="rounded-md border bg-muted p-3 overflow-x-auto"><code>GET /alerts?limit=25&source=FDA,USDA&since=7
GET /alerts/:id
GET /search?q=recall&limit=25</code></pre>
              </div>
              <div className="grid gap-2">
                <div className="font-medium">Authentication</div>
                <pre className="rounded-md border bg-muted p-3 overflow-x-auto"><code>x-api-key: YOUR_ENTERPRISE_API_KEY</code></pre>
                <p className="text-muted-foreground">API access is included with Enterprise. Keys are organization‑scoped with rate limits.</p>
              </div>
              <div>
                <Button asChild size="sm"><Link to="/contact">Contact Sales</Link></Button>
              </div>
            </CardContent>
          </Card>
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