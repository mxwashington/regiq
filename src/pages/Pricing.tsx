import React from 'react';
import { SEOHead } from '@/components/SEO/SEOHead';
import { SchemaMarkup } from '@/components/SEO/SchemaMarkup';
import { MobileFirstPricingSection } from '@/components/marketing/MobileFirstPricingSection';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Pricing = () => {
  const { user } = useAuth();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "RegIQ Regulatory Intelligence",
    "description": "Real-time regulatory alerts and compliance intelligence for food, pharma, and agriculture industries",
    "offers": [
      {
        "@type": "Offer",
        "name": "Essential Alerts",
        "price": "10",
        "priceCurrency": "USD",
        "description": "Real-time regulatory alerts for one facility"
      },
      {
        "@type": "Offer", 
        "name": "Starter",
        "price": "99",
        "priceCurrency": "USD",
        "description": "AI-powered regulatory intelligence"
      },
      {
        "@type": "Offer",
        "name": "Professional", 
        "price": "399",
        "priceCurrency": "USD",
        "description": "Advanced analytics and compliance tools"
      },
      {
        "@type": "Offer",
        "name": "Enterprise",
        "price": "999", 
        "priceCurrency": "USD",
        "description": "Full platform with API access"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Pricing - RegIQ Plans: Essential $10, Starter $99, Professional $399, Enterprise $999"
        description="Flexible RegIQ pricing starting at $10/month. Essential alerts, AI-powered intelligence, advanced analytics. 2 months free annually. Start today."
        keywords="RegIQ pricing, regulatory alerts cost, compliance software pricing, FDA alerts subscription, food safety software pricing"
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

      {/* Mobile-First Pricing Section */}
      <MobileFirstPricingSection />
    </div>
  );
};

export default Pricing;