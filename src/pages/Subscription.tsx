import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Subscription() {
  const { subscriptionTier } = useAuth();
  const navigate = useNavigate();

  const pricingPlans = [
    {
      tier: 'starter' as const,
      price: '$49',
      features: [
        'Up to 10 regulatory sources',
        'Basic AI summaries',
        'Email alerts',
        'Search and filter',
        'Export to PDF',
        'Community support'
      ],
    },
    {
      tier: 'professional' as const,
      price: '$149',
      features: [
        'Up to 50 regulatory sources',
        'Advanced AI insights',
        'Real-time notifications',
        'Custom filters',
        'API access',
        'Priority support',
        'Team collaboration (5 users)',
        'Advanced analytics'
      ],
      isPopular: true,
    },
    {
      tier: 'enterprise' as const,
      price: '$499',
      features: [
        'Unlimited regulatory sources',
        'Custom AI models',
        'White-label solution',
        'Dedicated account manager',
        'SLA guarantee',
        'SSO integration',
        'Unlimited users',
        'Custom integrations',
        'On-premise deployment'
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get the regulatory intelligence you need to stay compliant and competitive
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8 mb-12">
          <div className="lg:col-span-1">
            <SubscriptionStatus />
          </div>
          
          <div className="lg:col-span-3">
            <div className="grid md:grid-cols-3 gap-6">
              {pricingPlans.map((plan) => (
                <SubscriptionCard
                  key={plan.tier}
                  tier={plan.tier}
                  price={plan.price}
                  features={plan.features}
                  isPopular={plan.isPopular}
                  isCurrentPlan={subscriptionTier === plan.tier}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>All plans include a 14-day free trial. Cancel anytime.</p>
          <p className="mt-2">
            Questions? Contact us at{' '}
            <a href="mailto:support@regiq.com" className="text-primary hover:underline">
              support@regiq.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}