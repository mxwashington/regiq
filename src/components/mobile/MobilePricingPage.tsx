import React, { useState, useEffect } from 'react';
import { Check, Clock, Battery, Signal, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  isCustom?: boolean;
}

export const MobilePricingPage: React.FC = () => {
  const { user } = useAuth();
  const { upgradeToCustomPlan, loading } = useSubscriptionUpgrade();
  const [isAnnual, setIsAnnual] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 149,
      annualPrice: 119,
      description: 'Perfect for small businesses and single facility operations',
      features: [
        'Real-time regulatory alerts (FDA, USDA, EPA)',
        'Basic filtering and search functionality',
        'Mobile-responsive dashboard',
        'AI alert summarization',
        'Single facility management',
        'Email notifications',
        'Slack integration',
        'Basic customer support (email only)',
      ],
    },
    {
      id: 'growth',
      name: 'Growth',
      monthlyPrice: 349,
      annualPrice: 279,
      description: 'Ideal for growing businesses and multi-location operations',
      isPopular: true,
      features: [
        'Everything from Starter Plan, plus:',
        'Multi-facility management (up to 5 locations)',
        'AI compliance assistant with chat interface',
        'Risk dashboard and analytics',
        'Task management with team collaboration',
        'HACCP integration capabilities',
        'Compliance calendar and deadline tracking',
        'Phone support during business hours',
        'Priority email support',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyPrice: 0,
      annualPrice: 0,
      description: 'Custom solutions for enterprise organizations',
      isCustom: true,
      features: [
        'Everything from Growth Plan, plus:',
        'Unlimited facilities and locations',
        'Advanced AI features (impact analysis, regulatory gap detection)',
        'Custom integrations via webhooks and API access',
        'Advanced analytics and reporting suite',
        'Supplier risk monitoring',
        'White-label compliance reports',
        'Dedicated customer success manager',
        'Priority phone and email support',
        'Custom onboarding and training',
      ],
    },
  ];

  const handleSubscribe = async (planId: string) => {
    console.log('CTA button clicked:', planId);
    
    if (!user) {
      window.location.href = '/auth?redirect=/pricing';
      return;
    }

    if (planId === 'enterprise') {
      // Handle enterprise contact logic
      return;
    }

    await upgradeToCustomPlan({ 
      targetPlan: planId,
      annual: isAnnual 
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="mobile-pricing-container">
      <style>{`
        .mobile-pricing-container {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
          width: 100%;
          height: 100vh;
          background: white;
          position: relative;
          overflow: hidden;
        }

        .status-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 44px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          z-index: 50;
          padding-top: env(safe-area-inset-top);
          border-bottom: 1px solid #E5E7EB;
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 80px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: space-around;
          z-index: 50;
          padding-bottom: env(safe-area-inset-bottom);
          border-top: 1px solid #E5E7EB;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #6B7280;
          font-size: 10px;
          font-weight: 500;
        }

        .nav-item.active {
          color: #4A90E2;
        }

        .main-content {
          padding-top: calc(44px + env(safe-area-inset-top));
          padding-bottom: calc(80px + env(safe-area-inset-bottom));
          height: 100vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          -webkit-tap-highlight-color: transparent;
        }

        .main-content::-webkit-scrollbar {
          display: none;
        }

        .hero-section {
          text-align: center;
          padding: 24px 16px;
        }

        .hero-title {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.5px;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .regiq-text {
          background: linear-gradient(135deg, #4A90E2 0%, #5B6FED 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 15px;
          color: #6B7280;
          font-weight: 400;
        }

        .trial-banner {
          margin: 0 16px 20px;
          padding: 14px;
          background: linear-gradient(135deg, #4A90E2 0%, #5B6FED 100%);
          border-radius: 14px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }

        .trial-main-text {
          font-size: 16px;
          font-weight: 700;
          color: white;
          margin-bottom: 2px;
        }

        .trial-sub-text {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
        }

        .value-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin: 0 16px 24px;
        }

        .value-card {
          background: #F9FAFB;
          padding: 12px 8px;
          border-radius: 10px;
          text-align: center;
        }

        .value-emoji {
          font-size: 20px;
          margin-bottom: 4px;
        }

        .value-number {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 2px;
        }

        .value-label {
          font-size: 10px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .billing-toggle-container {
          margin: 0 16px 24px;
          display: flex;
          justify-content: center;
        }

        .billing-toggle {
          background: #F3F4F6;
          border-radius: 10px;
          padding: 2px;
          display: flex;
          position: relative;
          width: 280px;
        }

        .billing-option {
          flex: 1;
          padding: 12px 16px;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          position: relative;
          z-index: 2;
          transition: color 0.2s ease;
        }

        .billing-option.active {
          color: #1a1a1a;
        }

        .billing-option.inactive {
          color: #6B7280;
        }

        .billing-indicator {
          position: absolute;
          top: 2px;
          left: 2px;
          width: calc(50% - 2px);
          height: calc(100% - 4px);
          background: white;
          border-radius: 8px;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .billing-indicator.annual {
          transform: translateX(100%);
        }

        .annual-badge {
          background: #10B981;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 8px;
          margin-left: 4px;
        }

        .pricing-cards {
          padding: 0 16px 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pricing-card {
          background: white;
          border: 2px solid #E5E7EB;
          border-radius: 16px;
          padding: 20px;
          position: relative;
          transition: all 0.2s ease;
        }

        .pricing-card.popular {
          border-color: #4A90E2;
          box-shadow: 0 8px 25px rgba(74, 144, 226, 0.15);
        }

        .popular-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #4A90E2 0%, #5B6FED 100%);
          color: white;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 6px 16px;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .plan-name {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .plan-price {
          text-align: right;
        }

        .price-symbol {
          font-size: 16px;
          color: #6B7280;
          vertical-align: top;
        }

        .price-amount {
          font-size: 32px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .price-period {
          font-size: 12px;
          color: #6B7280;
          display: block;
          margin-top: -4px;
        }

        .custom-price {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .plan-description {
          font-size: 13px;
          color: #6B7280;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .features-list {
          margin-bottom: 24px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 12px;
        }

        .feature-check {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #10B981;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .feature-text {
          font-size: 13px;
          color: #1a1a1a;
          line-height: 1.4;
        }

        .feature-text.highlight {
          font-weight: 600;
          color: #4A90E2;
        }

        .cta-button {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .cta-button:active {
          transform: scale(0.98);
        }

        .cta-button.primary {
          background: linear-gradient(135deg, #4A90E2 0%, #5B6FED 100%);
          color: white;
        }

        .cta-button.secondary {
          background: #F3F4F6;
          color: #1a1a1a;
        }

        .cta-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 428px) {
          .hero-title {
            font-size: 24px;
          }
          
          .value-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          
          .value-card {
            display: flex;
            align-items: center;
            gap: 12px;
            text-align: left;
            padding: 12px 16px;
          }
          
          .billing-toggle {
            width: 100%;
          }
        }
      `}</style>

      {/* Status Bar */}
      <div className="status-bar">
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>
          {formatTime(currentTime)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1a1a1a' }}>
          <Signal size={14} />
          <Wifi size={14} />
          <Battery size={14} />
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Hero Section */}
        <div className="hero-section">
          <h1 className="hero-title">
            Choose Your <span className="regiq-text">RegIQ</span> Plan
          </h1>
          <p className="hero-subtitle">
            Enterprise compliance that pays for itself in 30 days
          </p>
        </div>

        {/* Free Trial Banner */}
        <div className="trial-banner">
          <div className="trial-main-text">🎉 Start 7-Day Free Trial</div>
          <div className="trial-sub-text">All features included • No credit card required</div>
        </div>

        {/* Value Proposition Grid */}
        <div className="value-grid">
          <div className="value-card">
            <div className="value-emoji">💰</div>
            <div className="value-number">$40K+</div>
            <div className="value-label">SAVED/YEAR</div>
          </div>
          <div className="value-card">
            <div className="value-emoji">⏱️</div>
            <div className="value-number">195 hrs</div>
            <div className="value-label">TIME SAVED</div>
          </div>
          <div className="value-card">
            <div className="value-emoji">🏢</div>
            <div className="value-number">5</div>
            <div className="value-label">FACILITIES MAX</div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="billing-toggle-container">
          <div className="billing-toggle">
            <div 
              className={cn("billing-indicator", isAnnual && "annual")}
            />
            <div 
              className={cn("billing-option", !isAnnual ? "active" : "inactive")}
              onClick={() => setIsAnnual(false)}
            >
              Monthly
            </div>
            <div 
              className={cn("billing-option", isAnnual ? "active" : "inactive")}
              onClick={() => setIsAnnual(true)}
            >
              Annual
              <span className="annual-badge">-20%</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="pricing-cards">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={cn("pricing-card", plan.isPopular && "popular")}
            >
              {plan.isPopular && (
                <div className="popular-badge">MOST POPULAR</div>
              )}

              <div className="card-header">
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price">
                  {plan.isCustom ? (
                    <div className="custom-price">Custom</div>
                  ) : (
                    <>
                      <span className="price-symbol">$</span>
                      <span className="price-amount">
                        {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span className="price-period">/month</span>
                    </>
                  )}
                </div>
              </div>

              <div className="plan-description">{plan.description}</div>

              <div className="features-list">
                {plan.features.map((feature, index) => (
                  <div key={index} className="feature-item">
                    <div className="feature-check">
                      <Check size={10} color="white" />
                    </div>
                    <div className={cn(
                      "feature-text",
                      feature.startsWith('Everything from') && "highlight"
                    )}>
                      {feature}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading}
                className={cn(
                  "cta-button",
                  plan.isPopular ? "primary" : "secondary"
                )}
              >
                {loading ? 'Processing...' : (
                  plan.isCustom ? 'Contact Sales' : 'Start Free Trial'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="nav-item">
          <Clock size={16} />
          <span>History</span>
        </div>
        <div className="nav-item">
          <div style={{ width: '16px', height: '16px', background: '#6B7280', borderRadius: '4px' }} />
          <span>Chat</span>
        </div>
        <div className="nav-item active">
          <div style={{ width: '16px', height: '16px', background: '#4A90E2', borderRadius: '4px' }} />
          <span>Preview</span>
        </div>
        <div className="nav-item">
          <div style={{ width: '16px', height: '16px', background: '#6B7280', borderRadius: '4px' }} />
          <span>Web</span>
        </div>
      </div>
    </div>
  );
};