import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles, Smartphone, BarChart3, Building, Clock, ArrowRight, Search } from 'lucide-react';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface FeaturePaywallProps {
  isOpen?: boolean;
  onClose?: () => void;
  feature: 'ai_assistant' | 'mobile_app' | 'advanced_analytics' | 'multi_facility' | 'unlimited_history' | 'advanced_filters' | 'search_queries';
  context?: string;
}

const featureConfig = {
  ai_assistant: {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'AI Assistant',
    description: 'Get instant answers to complex regulatory questions with AI-powered intelligence',
    benefits: [
      'Natural language regulatory Q&A',
      'Smart alert summaries and analysis',
      'Compliance impact scoring',
      'Regulatory trend insights'
    ]
  },
  mobile_app: {
    icon: <Smartphone className="w-6 h-6" />,
    title: 'Mobile App',
    description: 'Stay connected to regulatory updates wherever you go',
    benefits: [
      'Push notifications for critical alerts',
      'Offline access to recent alerts',
      'Mobile-optimized interface',
      'Quick search and filtering'
    ]
  },
  advanced_analytics: {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Advanced Analytics',
    description: 'Deep insights into regulatory trends and compliance patterns',
    benefits: [
      'Customizable compliance dashboards',
      'Trend analysis and forecasting',
      'Risk assessment metrics',
      'Automated compliance reporting'
    ]
  },
  multi_facility: {
    icon: <Building className="w-6 h-6" />,
    title: 'Multi-Facility Management',
    description: 'Manage regulatory compliance across multiple locations',
    benefits: [
      'Location-specific alert filtering',
      'Facility-based user management',
      'Regional compliance tracking',
      'Consolidated reporting'
    ]
  },
  unlimited_history: {
    icon: <Clock className="w-6 h-6" />,
    title: 'Unlimited History',
    description: 'Access your complete regulatory alert archive',
    benefits: [
      'Full historical alert archive',
      'Advanced search across all alerts',
      'Export historical data',
      'Custom date ranges'
    ]
  },
  advanced_filters: {
    icon: <Search className="w-6 h-6" />,
    title: 'Advanced Filters',
    description: 'Powerful filtering and search capabilities',
    benefits: [
      'Complex filter combinations',
      'Saved search presets',
      'Regex pattern matching',
      'Custom date ranges'
    ]
  },
  search_queries: {
    icon: <Search className="w-6 h-6" />,
    title: 'Search Queries',
    description: 'Powerful regulatory database search with AI-enhanced results',
    benefits: [
      'Search FDA, USDA, EPA databases',
      'AI-powered search suggestions',
      'Real-time regulatory intelligence',
      'Professional search tools'
    ]
  }
};

export const FeaturePaywall: React.FC<FeaturePaywallProps> = ({
  isOpen = true,
  onClose,
  feature,
  context
}) => {
  const { upgradeToStarter, loading } = useSubscriptionUpgrade();
  const config = featureConfig[feature];

  const handleUpgrade = async () => {
    await upgradeToStarter();
    // Close modal after initiating upgrade (if onClose is provided)
    if (onClose) onClose();
  };

  // If no onClose provided, render as standalone component
  if (!onClose) {
    return (
      <Card className="max-w-md mx-auto border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
        <CardHeader className="text-center pb-4">
          <Badge variant="outline" className="bg-orange-100 border-orange-300 text-orange-800 mb-4">
            Essential Alerts
          </Badge>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="text-orange-600">
              {config.icon}
            </div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {config.title} Required
            </CardTitle>
          </div>
          {context && (
            <p className="text-sm text-gray-600 mb-4">
              {context}
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3 mb-6">
            {config.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="text-orange-500 mt-0.5">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
          <Button 
            onClick={handleUpgrade} 
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? 'Processing...' : 'Upgrade to Essential Alerts'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <Card className="border-0 shadow-none">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-between items-start mb-4">
              <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
                Essential Alerts
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="text-orange-600">
                {config.icon}
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {config.title} Required
              </CardTitle>
            </div>
            {context && (
              <p className="text-sm text-gray-600 mb-4">
                {context}
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 mb-6">
              {config.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="text-orange-500 mt-0.5">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
            <Button 
              onClick={handleUpgrade} 
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? 'Processing...' : 'Upgrade to Essential Alerts'}
            </Button>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};