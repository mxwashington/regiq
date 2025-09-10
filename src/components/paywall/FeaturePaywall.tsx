import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles, Smartphone, BarChart3, Building, Clock, ArrowRight } from 'lucide-react';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface FeaturePaywallProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'ai_assistant' | 'mobile_app' | 'advanced_analytics' | 'multi_facility' | 'unlimited_history' | 'advanced_filters';
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
    description: 'Stay connected with regulatory changes on-the-go with our mobile application',
    benefits: [
      'Push notifications for critical alerts',
      'Offline alert history access',
      'Mobile-optimized dashboard',
      'Quick alert actions and filtering'
    ]
  },
  advanced_analytics: {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Advanced Analytics',
    description: 'Comprehensive compliance insights with dashboards and reporting',
    benefits: [
      'Compliance maturity scoring',
      'Industry benchmarking data',
      'Cost analysis and ROI tracking',
      'Custom dashboard creation'
    ]
  },
  multi_facility: {
    icon: <Building className="w-6 h-6" />,
    title: 'Multi-Facility Monitoring',
    description: 'Monitor regulatory compliance across multiple facilities and locations',
    benefits: [
      'Up to 3 facilities with Starter',
      'Facility-specific alert filtering',
      'Consolidated compliance view',
      'Team collaboration features'
    ]
  },
  unlimited_history: {
    icon: <Clock className="w-6 h-6" />,
    title: 'Unlimited History',
    description: 'Access your complete regulatory alert history beyond 30 days',
    benefits: [
      'Full historical alert archive',
      'Advanced search and filtering',
      'Regulatory trend analysis',
      'Compliance audit trails'
    ]
  },
  advanced_filters: {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Advanced Filters',
    description: 'Powerful filtering options to find exactly what you need',
    benefits: [
      'Multi-criteria filtering',
      'Saved filter presets',
      'Boolean search operators',
      'Custom date ranges'
    ]
  }
};

export const FeaturePaywall: React.FC<FeaturePaywallProps> = ({
  isOpen,
  onClose,
  feature,
  context
}) => {
  const { upgradeToStarter, loading } = useSubscriptionUpgrade();
  const config = featureConfig[feature];

  const handleUpgrade = async () => {
    await upgradeToStarter();
    // Close modal after initiating upgrade
    onClose();
  };

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
                className="p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              {config.icon}
            </div>
            
            <CardTitle className="text-xl mb-2">
              Unlock {config.title}
            </CardTitle>
            
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-3 text-sm">What you'll get:</h4>
              <ul className="space-y-2">
                {config.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Starter Plan</h4>
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
              <div className="text-2xl font-bold mb-1">$99<span className="text-sm font-normal">/month</span></div>
              <p className="text-xs text-muted-foreground mb-3">
                Includes AI insights, mobile access, multi-facility, and unlimited history
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleUpgrade}
                disabled={loading}
                size="lg"
                className="w-full group"
              >
                {loading ? 'Processing...' : (
                  <>
                    Upgrade to Starter
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="w-full text-sm"
              >
                Maybe later
              </Button>
            </div>

            {context && (
              <div className="text-xs text-center text-muted-foreground bg-muted/30 rounded p-2">
                <strong>Pro tip:</strong> {context}
              </div>
            )}

            <div className="text-xs text-center text-muted-foreground">
              7-day free trial • Cancel anytime • No setup fees
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};