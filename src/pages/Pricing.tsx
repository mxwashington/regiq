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
      description: "Perfect for getting started with regulatory monitoring",
      features: [
        "5 AI searches per day",
        "Real-time FDA, USDA, EPA alerts",
        "Mobile-optimized dashboard",
        "Basic email notifications",
        "Community support"
      ],
      buttonText: "Get Started Free",
      popular: false,
      tier: "free"
    },
    {
      name: "Professional",
      price: "$49",
      period: "per month",
      description: "For food safety professionals and QA teams",
      features: [
        "Unlimited AI searches",
        "All regulatory agencies (FDA, USDA, EPA, CDC)",
        "Advanced filtering & personalization",
        "Priority email alerts",
        "Export to PDF/Excel",
        "Custom keyword tracking",
        "Phone & email support",
        "30-day alert history"
      ],
      buttonText: "Start Free Trial",
      popular: true,
      tier: "professional"
    },
    {
      name: "Enterprise",
      price: "$149",
      period: "per month",
      description: "For large organizations and regulatory teams",
      features: [
        "Everything in Professional",
        "Unlimited team members",
        "API access for integrations",
        "Custom reporting & analytics",
        "90-day alert history",
        "Dedicated account manager",
        "SSO integration",
        "Priority feature requests",
        "24/7 phone support"
      ],
      buttonText: "Contact Sales",
      popular: false,
      tier: "enterprise"
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
            Choose Your <span className="text-primary">RegIQ Plan</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start free and scale as you grow. All plans include real-time regulatory alerts and AI-powered search.
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-8">
            <Badge variant="secondary" className="text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              30-day money-back guarantee
            </Badge>
            <Badge variant="outline" className="text-sm">
              No setup fees
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
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Crown className="w-3 h-3 mr-1" />
                      Most Popular
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
                      <Button className="w-full" variant="outline" asChild>
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
                        onClick={() => handleUpgrade(plan.tier)}
                        disabled={loading === plan.tier}
                      >
                        {loading === plan.tier ? 'Processing...' : plan.buttonText}
                        <ArrowRight className="ml-2 h-4 w-4" />
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
          <h2 className="text-3xl font-bold text-center mb-8">Feature Comparison</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border rounded-lg">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-4 text-left">Features</th>
                  <th className="border border-border p-4 text-center">Free</th>
                  <th className="border border-border p-4 text-center bg-primary/5">Professional</th>
                  <th className="border border-border p-4 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "AI Searches per day", free: "5", pro: "Unlimited", enterprise: "Unlimited" },
                  { feature: "Real-time alerts", free: "✓", pro: "✓", enterprise: "✓" },
                  { feature: "Mobile dashboard", free: "✓", pro: "✓", enterprise: "✓" },
                  { feature: "Email notifications", free: "Basic", pro: "Priority", enterprise: "Priority" },
                  { feature: "Export (PDF/Excel)", free: "✗", pro: "✓", enterprise: "✓" },
                  { feature: "Custom keywords", free: "✗", pro: "✓", enterprise: "✓" },
                  { feature: "Alert history", free: "7 days", pro: "30 days", enterprise: "90 days" },
                  { feature: "API access", free: "✗", pro: "✗", enterprise: "✓" },
                  { feature: "Team members", free: "1", pro: "5", enterprise: "Unlimited" },
                  { feature: "Support", free: "Community", pro: "Email & Phone", enterprise: "24/7 Dedicated" }
                ].map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/50"}>
                    <td className="border border-border p-4 font-medium">{row.feature}</td>
                    <td className="border border-border p-4 text-center">{row.free}</td>
                    <td className="border border-border p-4 text-center bg-primary/5">{row.pro}</td>
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
                q: "Can I cancel my subscription anytime?",
                a: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your current billing period."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards (Visa, MasterCard, American Express) and bank transfers for Enterprise plans."
              },
              {
                q: "Is there a free trial for paid plans?",
                a: "Yes, Professional and Enterprise plans come with a 14-day free trial. No credit card required to start."
              },
              {
                q: "Do you offer discounts for annual billing?",
                a: "Yes, save 20% when you choose annual billing for Professional or Enterprise plans."
              },
              {
                q: "What agencies does RegIQ monitor?",
                a: "We monitor FDA, USDA, EPA, CDC, and other regulatory agencies for food safety, pharmaceutical, and agricultural alerts."
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
            Join hundreds of food safety professionals who trust RegIQ for regulatory intelligence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to={user ? "/dashboard" : "/auth"}>
                Start Free Today
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;