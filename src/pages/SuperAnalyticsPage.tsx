import React from 'react';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { FeaturePaywall } from '@/components/paywall/FeaturePaywall';
import { SuperEnhancedAnalyticsDashboard } from '@/components/stubs/MissingComponents';

const SuperAnalyticsPage: React.FC = () => {
  const { checkFeatureAccess } = usePlanRestrictions();

  if (!checkFeatureAccess('enhanced_analytics')) {
    return (
      <div className="container mx-auto py-8">
        <FeaturePaywall
          feature="advanced_analytics"
          context="Advanced analytics with custom dashboards, data export, and detailed insights require a Professional plan."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <SuperEnhancedAnalyticsDashboard />
    </div>
  );
};

export default SuperAnalyticsPage;