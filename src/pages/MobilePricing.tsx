import React from 'react';
import { NewPricingSection } from '@/components/marketing/NewPricingSection';
import { SEOHead } from '@/components/SEO/SEOHead';

const MobilePricing = () => {
  return (
    <>
      <SEOHead 
        title="RegIQ Mobile Pricing - Enterprise Compliance Starting at $149/month"
        description="Mobile-optimized pricing for RegIQ regulatory intelligence platform. Start your 7-day free trial with all features included. No credit card required."
        keywords="RegIQ mobile pricing, compliance software mobile, regulatory alerts mobile app"
        canonical="https://regiq.com/mobile-pricing"
      />
      <div className="container mx-auto py-8">
        <NewPricingSection />
      </div>
    </>
  );
};

export default MobilePricing;