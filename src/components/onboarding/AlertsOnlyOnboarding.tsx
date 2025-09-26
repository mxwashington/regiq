import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Building, Bell, Mail, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface FacilityData {
  name: string;
  address: string;
  facilityType: string;
}

interface PreferencesData {
  agencies: string[];
  categories: string[];
  emailFrequency: string;
}

const steps: OnboardingStep[] = [
  {
    step: 1,
    title: 'Payment & Plan',
    description: 'Secure your Essential Alerts subscription',
    icon: <CreditCard className="w-5 h-5" />
  },
  {
    step: 2,
    title: 'Facility Setup',
    description: 'Add your primary facility to monitor',
    icon: <Building className="w-5 h-5" />
  },
  {
    step: 3,
    title: 'Alert Preferences',
    description: 'Customize what alerts you want to receive',
    icon: <Bell className="w-5 h-5" />
  },
  {
    step: 4,
    title: 'Welcome!',
    description: 'You\'re all set to receive regulatory alerts',
    icon: <CheckCircle className="w-5 h-5" />
  }
];

export const AlertsOnlyOnboarding: React.FC = () => {
  const { user } = useAuth();
  const { upgradeToCustomPlan, loading: upgradeLoading } = useSubscriptionUpgrade();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [facilityData, setFacilityData] = useState<FacilityData>({
    name: '',
    address: '',
    facilityType: 'food_processing'
  });

  const [preferencesData, setPreferencesData] = useState<PreferencesData>({
    agencies: ['FDA', 'USDA'],
    categories: ['Critical', 'High', 'Medium'],
    emailFrequency: 'realtime'
  });

  const handlePayment = async () => {
    await upgradeToCustomPlan({ targetPlan: 'alerts_only' });
  };

  const handleFacilitySubmit = async () => {
    if (!user?.id || !facilityData.name.trim()) {
      toast.error('Please fill in the facility name');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('facilities')
        .insert({
          organization_user_id: user.id,
          name: facilityData.name,
          address: facilityData.address || null,
          facility_type: facilityData.facilityType,
          created_by: user.id
        });

      if (error) {
        throw error;
      }

      setCurrentStep(3);
      toast.success('Facility added successfully');
    } catch (error) {
      logger.error('Error adding facility:', error);
      toast.error('Failed to add facility');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('alert_preferences')
        .upsert({
          user_id: user.id,
          agencies: preferencesData.agencies,
          categories: preferencesData.categories,
          email_frequency: preferencesData.emailFrequency,
          delay_non_critical: true,
          max_daily_alerts: 50
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      setCurrentStep(4);
      toast.success('Preferences saved successfully');
    } catch (error) {
      logger.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    window.location.href = '/dashboard';
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <Badge className="mb-4">Essential Alerts Onboarding</Badge>
          <h1 className="text-3xl font-bold mb-2">Welcome to RegIQ</h1>
          <p className="text-muted-foreground">
            Let's get you set up to receive regulatory alerts in under 2 minutes
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step) => (
              <div key={step.step} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                  ${currentStep >= step.step 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-muted-foreground text-muted-foreground'
                  }
                `}>
                  {currentStep > step.step ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-semibold">{step.step}</span>
                  )}
                </div>
                {step.step < steps.length && (
                  <div className={`
                    w-16 h-px ml-2 
                    ${currentStep > step.step ? 'bg-primary' : 'bg-muted-foreground/30'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-2">
              {steps[currentStep - 1].icon}
            </div>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {steps[currentStep - 1].description}
            </p>
          </CardHeader>

          <CardContent>
            {currentStep === 1 && (
              <div className="text-center space-y-4">
                <div className="bg-muted/50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-2">Essential Alerts</h3>
                  <div className="text-3xl font-bold mb-2">$10<span className="text-lg font-normal">/month</span></div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Real-time critical alerts</li>
                    <li>✓ 1 facility monitoring</li>
                    <li>✓ 50 alerts/day</li>
                    <li>✓ Email delivery</li>
                    <li>✓ 30-day history</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={handlePayment} 
                  disabled={upgradeLoading}
                  size="lg" 
                  className="w-full"
                >
                  {upgradeLoading ? 'Processing...' : 'Subscribe to Essential Alerts'}
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  No trial period • Secure payment via Stripe • Cancel anytime
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="facilityName">Facility Name *</Label>
                  <Input
                    id="facilityName"
                    value={facilityData.name}
                    onChange={(e) => setFacilityData({...facilityData, name: e.target.value})}
                    placeholder="e.g., Main Processing Plant"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address (Optional)</Label>
                  <Input
                    id="address"
                    value={facilityData.address}
                    onChange={(e) => setFacilityData({...facilityData, address: e.target.value})}
                    placeholder="e.g., 123 Industrial Blvd, City, State"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="facilityType">Facility Type</Label>
                  <select
                    id="facilityType"
                    value={facilityData.facilityType}
                    onChange={(e) => setFacilityData({...facilityData, facilityType: e.target.value})}
                    className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                  >
                    <option value="food_processing">Food Processing</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="packaging">Packaging</option>
                    <option value="distribution">Distribution</option>
                    <option value="restaurant">Restaurant/Foodservice</option>
                    <option value="retail">Retail</option>
                  </select>
                </div>

                <Button 
                  onClick={handleFacilitySubmit} 
                  disabled={loading || !facilityData.name.trim()}
                  className="w-full"
                >
                  {loading ? 'Adding Facility...' : 'Continue'}
                </Button>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold">Regulatory Agencies</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select which agencies you want to monitor
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {['FDA', 'USDA', 'EPA', 'CDC'].map((agency) => (
                      <div key={agency} className="flex items-center space-x-2">
                        <Checkbox
                          id={agency}
                          checked={preferencesData.agencies.includes(agency)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPreferencesData({
                                ...preferencesData,
                                agencies: [...preferencesData.agencies, agency]
                              });
                            } else {
                              setPreferencesData({
                                ...preferencesData,
                                agencies: preferencesData.agencies.filter(a => a !== agency)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={agency}>{agency}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold">Alert Categories</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose alert urgency levels to receive
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {['Critical', 'High', 'Medium', 'Low'].map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={preferencesData.categories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPreferencesData({
                                ...preferencesData,
                                categories: [...preferencesData.categories, category]
                              });
                            } else {
                              setPreferencesData({
                                ...preferencesData,
                                categories: preferencesData.categories.filter(c => c !== category)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={category}>{category}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm font-medium">Email Delivery</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Critical alerts: Immediate delivery<br />
                    Non-critical alerts: 24-hour delay (Essential Alerts feature)
                  </p>
                </div>

                <Button 
                  onClick={handlePreferencesSubmit} 
                  disabled={loading || preferencesData.agencies.length === 0}
                  className="w-full"
                >
                  {loading ? 'Saving Preferences...' : 'Complete Setup'}
                </Button>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                
                <h3 className="text-xl font-semibold">You're All Set!</h3>
                <p className="text-muted-foreground">
                  Your Essential Alerts subscription is active. You'll receive regulatory 
                  alerts via email within 24 hours.
                </p>
                
                <div className="bg-blue-50 rounded-lg p-4 text-sm">
                  <p className="font-medium text-blue-900 mb-2">What happens next?</p>
                  <ul className="text-blue-800 space-y-1 text-left">
                    <li>✓ Critical alerts arrive immediately</li>
                    <li>✓ Other alerts arrive within 24 hours</li>
                    <li>✓ Up to 50 alerts per day</li>
                    <li>✓ 30-day history available in dashboard</li>
                  </ul>
                </div>

                <Button onClick={handleComplete} size="lg" className="w-full">
                  Go to Dashboard
                </Button>

                <p className="text-xs text-muted-foreground">
                  Ready for AI insights and mobile access? 
                  <button className="text-primary hover:underline ml-1">
                    Upgrade to Starter
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};