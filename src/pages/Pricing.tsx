import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Zap, Crown, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from 'react-helmet-async';

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        <meta name="description" content="Choose the right RegIQ plan for your regulatory monitoring needs. Free plan available with 5 daily searches, or upgrade to Professional for unlimited access." />
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
              <Button size="lg" variant="outline" onClick={handleManageBilling}>
                Manage Billing
              </Button>
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
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">Current Features & Future Plans</h2>
          <p className="text-center text-muted-foreground mb-8">All features below are currently available for free. API access requires Enterprise plan.</p>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border rounded-lg">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-4 text-left">Features</th>
                  <th className="border border-border p-4 text-center bg-primary/5">Free (Current)</th>
                  <th className="border border-border p-4 text-center">Professional (Future)</th>
                  <th className="border border-border p-4 text-center">Enterprise (API Only)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "AI Searches per day", free: "Unlimited", pro: "Unlimited", enterprise: "Unlimited" },
                  { feature: "Real-time alerts", free: "✓", pro: "✓", enterprise: "✓" },
                  { feature: "Mobile dashboard", free: "✓", pro: "✓", enterprise: "✓" },
                  { feature: "Email notifications", free: "✓", pro: "✓", enterprise: "✓" },
                  { feature: "Export (PDF/Excel)", free: "✓", pro: "✓", enterprise: "✓" },
                  { feature: "Custom keywords", free: "✓", pro: "✓", enterprise: "✓" },
                  { feature: "Alert history", free: "30 days", pro: "30 days", enterprise: "90 days" },
                  { feature: "API access", free: "✗", pro: "✗", enterprise: "✓" },
                  { feature: "Team members", free: "Personal use", pro: "Coming soon", enterprise: "Unlimited" },
                  { feature: "Support", free: "Email", pro: "Priority email", enterprise: "24/7 Dedicated" }
                ].map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/50"}>
                    <td className="border border-border p-4 font-medium">{row.feature}</td>
                    <td className="border border-border p-4 text-center bg-primary/5 font-semibold">{row.free}</td>
                    <td className="border border-border p-4 text-center text-muted-foreground">{row.pro}</td>
                    <td className="border border-border p-4 text-center">{row.enterprise}</td>
                  </tr>
                ))}
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
                q: "Why is everything free right now?",
                a: "We're building our community and want to provide maximum value while we develop new features. Only API access for enterprise integrations requires payment."
              },
              {
                q: "Will free features stay free forever?",
                a: "We're committed to keeping core regulatory monitoring features accessible. When we introduce paid plans, existing users will have generous grandfathering options."
              },
              {
                q: "What does API access include?",
                a: "Enterprise API access allows you to integrate RegIQ data into your own systems, pull alerts programmatically, and build custom applications on top of our regulatory data."
              },
              {
                q: "When will paid features be introduced?",
                a: "We're focused on perfecting the free experience first. Paid features will likely include advanced analytics, team collaboration tools, and premium integrations."
              },
              {
                q: "How do I get API access?",
                a: "Contact our sales team to discuss your API needs. We'll work with you to create a custom solution for your organization."
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
            Join hundreds of food safety professionals using RegIQ for free regulatory intelligence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to={user ? "/dashboard" : "/auth"}>
                Start Using RegIQ Free
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