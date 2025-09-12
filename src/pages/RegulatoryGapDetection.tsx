import React from 'react';
import { RegulatoryGapDashboard } from '@/components/RegulatoryGapDashboard';
import { SEOHead } from '@/components/SEO/SEOHead';

const RegulatoryGapDetection: React.FC = () => {
  return (
    <>
      <SEOHead 
        title="Regulatory Gap Detection - RegIQ"
        description="AI-powered detection of regulatory process failures and compliance gaps in food industry oversight. Identify import reinspection bypasses and systemic regulatory breakdowns."
        keywords="regulatory gaps, process failures, import compliance, food safety oversight, FDA reinspection, regulatory breakdown detection"
      />
      <div className="container mx-auto px-4 py-8">
        <RegulatoryGapDashboard />
      </div>
    </>
  );
};

export default RegulatoryGapDetection;