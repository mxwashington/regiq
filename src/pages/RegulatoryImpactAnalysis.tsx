import React from 'react';
import { RegulatoryImpactAnalysis as RegulatoryImpactAnalysisComponent } from '@/components/RegulatoryImpactAnalysis';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { FeaturePaywall } from '@/components/paywall/FeaturePaywall';

export default function RegulatoryImpactAnalysis() {
  const { checkFeatureAccess } = usePlanRestrictions();

  if (!checkFeatureAccess('regulatory_impact_analysis')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <FeaturePaywall
          feature="regulatory_impact_analysis"
          context="Advanced regulatory impact analysis with AI-powered insights requires a Professional plan."
        />
      </div>
    );
  }

  return <RegulatoryImpactAnalysisComponent />;
}