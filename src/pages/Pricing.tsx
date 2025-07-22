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

  const handleUpgrade = async (tier: string) => {
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

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process. Please try again.');
    } finally {
      setLoading(null);
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
            <span className="text-primary">Everything Free</span> for Now!
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            We're keeping all RegIQ features free while we build our community. Only API access requires an Enterprise plan.
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-8">
            <Badge variant="secondary" className="text-sm bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              All features currently free!
            </Badge>
            <Badge variant="outline" className="text-sm">
              API access available
            </Badge>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''} ${plan.disabled ? 'opacity-75' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className={`px-4 py-1 ${
                      plan.popular ? 'bg-primary text-primary-foreground' : 
                      plan.disabled ? 'bg-muted text-muted-foreground' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {plan.badge === 'Everything Free!' && <Crown className="w-3 h-3 mr-1" />}
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">/{plan.period}</span>
                  </div>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4">
                    {plan.tier === 'free' ? (
                      <Button className="w-full" asChild>
                        <Link to={user ? "/dashboard" : "/auth"}>
                          {plan.buttonText}
                        </Link>
                      </Button>
                    ) : plan.tier === 'enterprise' ? (
                      <Button className="w-full" variant="outline">
                        {plan.buttonText}
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        variant="outline"
                        disabled={plan.disabled}
                      >
                        {plan.buttonText}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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