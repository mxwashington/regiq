import React from 'react';
import { RegulatoryGapDashboard } from '@/components/RegulatoryGapDashboard';
import { SEOHead } from '@/components/SEO/SEOHead';
import { BackButton } from '@/components/BackButton';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { FeaturePaywall } from '@/components/paywall/FeaturePaywall';

const RegulatoryGapDetection: React.FC = () => {
  const { checkFeatureAccess } = usePlanRestrictions();

  if (!checkFeatureAccess('regulatory_impact_analysis')) {
    return (
      <>
        <SEOHead
          title="Regulatory Gap Detection - RegIQ"
          description="AI-powered detection of regulatory process failures and compliance gaps in food industry oversight. Identify import reinspection bypasses and systemic regulatory breakdowns."
          keywords="regulatory gaps, process failures, import compliance, food safety oversight, FDA reinspection, regulatory breakdown detection"
        />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-4">
            <BackButton fallback="/dashboard" />
          </div>

          <FeaturePaywall
            feature="regulatory_impact_analysis"
            context="AI-powered regulatory gap detection and compliance analysis require a Professional plan."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Regulatory Gap Detection - RegIQ"
        description="AI-powered detection of regulatory process failures and compliance gaps in food industry oversight. Identify import reinspection bypasses and systemic regulatory breakdowns."
        keywords="regulatory gaps, process failures, import compliance, food safety oversight, FDA reinspection, regulatory breakdown detection"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <BackButton fallback="/dashboard" />
        </div>
        <RegulatoryGapDashboard />
      </div>
    </>
  );
};

export default RegulatoryGapDetection;