import React from 'react';
import { SEOHead } from '@/components/SEO/SEOHead';
import { RegulationsDashboard } from '@/components/regulations/RegulationsDashboard';
import { INDUSTRY_PRESETS } from '@/lib/regulations/types';

export default function RegulatorySearch() {
  return (
    <>
      <SEOHead 
        title="Regulatory Search - Regulations.gov Integration | RegIQ"
        description="Search and monitor FDA, EPA, USDA regulations in real-time. AI-powered regulatory intelligence for compliance professionals."
        keywords="regulations.gov search, FDA regulations, EPA rules, USDA compliance, regulatory monitoring, government regulations"
      />
      
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <RegulationsDashboard 
            industryFocus="FOOD_BEVERAGE" // Default to food & beverage focus
          />
        </div>
      </div>
    </>
  );
}