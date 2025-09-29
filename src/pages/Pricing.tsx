import React from 'react';
import { SEOHead } from '@/components/SEO/SEOHead';
import { SchemaMarkup } from '@/components/SEO/SchemaMarkup';
import { NewPricingSection } from '@/components/marketing/NewPricingSection';
import { PricingFAQ } from '@/components/marketing/PricingFAQ';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Pricing = () => {
  const { user } = useAuth();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "RegIQ Regulatory Intelligence Platform",
    "description": "AI-powered regulatory intelligence platform for food compliance monitoring",
    "offers": [
      {
        "@type": "Offer",
        "name": "Starter Plan",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free plan for individual users getting started with compliance"
      },
      {
        "@type": "Offer",
        "name": "Growth Plan",
        "price": "29",
        "priceCurrency": "USD",
        "description": "Ideal for individual compliance professionals and consultants"
      },
      {
        "@type": "Offer",
        "name": "Professional Plan", 
        "price": "199",
        "priceCurrency": "USD",
        "description": "Enterprise-ready for power users with premium support"
      },
      {
        "@type": "Offer",
        "name": "Teams Plan", 
        "price": "147",
        "priceCurrency": "USD",
        "description": "For compliance teams managing multiple sites (3-seat minimum at $49/seat)"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="RegIQ Pricing: Free Starter, Growth $29/mo, Professional $199/mo, Teams $49/seat"
        description="Individual compliance professional pricing. Start free with 5 AI summaries/month. Growth at $29/mo with 100 AI summaries. Professional at $199/mo. Teams from $147/mo (3-seat minimum)."
        keywords="RegIQ pricing, regulatory compliance software cost, FDA alerts subscription, USDA monitoring pricing, EPA regulatory intelligence, compliance software individual plans, team compliance software"
        canonical="https://regiq.com/pricing"
      />
      
      <SchemaMarkup type="webApplication" data={structuredData} />

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
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

      {/* Main Pricing Section */}
      <NewPricingSection />
      
      {/* FAQ Section */}
      <PricingFAQ />
    </div>
  );
};

export default Pricing;