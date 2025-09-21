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
    "description": "Enterprise-grade regulatory intelligence and compliance monitoring for food, pharma, and agriculture industries",
    "offers": [
      {
        "@type": "Offer",
        "name": "Starter Plan",
        "price": "179",
        "priceCurrency": "USD",
        "description": "Real-time regulatory alerts for small businesses and single facility operations"
      },
      {
        "@type": "Offer", 
        "name": "Growth Plan",
        "price": "349",
        "priceCurrency": "USD",
        "description": "AI-powered regulatory intelligence for growing multi-location businesses"
      },
      {
        "@type": "Offer",
        "name": "Professional Plan", 
        "price": "549",
        "priceCurrency": "USD",
        "description": "Enterprise-ready unlimited scale with advanced AI and custom integrations"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="RegIQ Pricing: Starter $179, Growth $349, Professional $549 - Save 11% Annually"
        description="Transform regulatory compliance with RegIQ's proven ROI. Starter at $179/mo for small teams, Growth at $349/mo (Most Popular), Professional at $549/mo unlimited scale. Save 11% annually."
        keywords="RegIQ pricing, regulatory compliance software cost, FDA alerts subscription, USDA monitoring pricing, EPA regulatory intelligence, compliance software ROI"
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