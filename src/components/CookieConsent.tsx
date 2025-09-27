import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X, Settings, Shield, BarChart3, Megaphone, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/SafeAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean; 
  marketing: boolean;
  functional: boolean;
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
  });
  const { user } = useAuth();

  const checkCookieConsent = useCallback(async () => {
    // Check if user has already given consent
    const stored = localStorage.getItem('cookie-consent');
    if (stored) {
      const consent = JSON.parse(stored);
      setPreferences(consent);
      return;
    }

    // If user is logged in, check database
    if (user) {
      try {
        const { data, error } = await supabase
          .from('cookie_consents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          logger.error('Error loading cookie consent from database:', error);
          return;
        }

        if (data && data.expires_at > new Date().toISOString()) {
          const consent = {
            essential: data.essential,
            analytics: data.analytics,
            marketing: data.marketing,
            functional: data.functional,
          };
          setPreferences(consent);
          localStorage.setItem('cookie-consent', JSON.stringify(consent));
          return;
        }
      } catch (err) {
        logger.error('Error loading cookie consent:', err);
      }
    }

    // Show banner if no consent found
    setShowBanner(true);
  }, [user]);

  useEffect(() => {
    checkCookieConsent();
  }, [checkCookieConsent]);

  // Generate a visitor ID for non-authenticated users
  const generateVisitorId = () => {
    let visitorId = localStorage.getItem('regiq-visitor-id');
    if (!visitorId) {
      visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('regiq-visitor-id', visitorId);
    }
    return visitorId;
  };

  const saveToDatabase = async (consent: CookiePreferences) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cookie_consents')
        .insert({
          user_id: user.id,
          essential: consent.essential,
          analytics: consent.analytics,
          marketing: consent.marketing,
          functional: consent.functional,
          visitor_id: null,
          ip_address: null,
          user_agent: navigator.userAgent,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        });

      if (error) {
        logger.error('Error saving cookie consent to database:', error);
      }
    } catch (err) {
      logger.error('Error saving cookie consent:', err);
    }
  };

  const saveToLocalStorage = (consent: CookiePreferences) => {
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
  };

  const handleAcceptAll = async () => {
    const consent: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    };

    setPreferences(consent);
    saveToLocalStorage(consent);
    await saveToDatabase(consent);
    setShowBanner(false);
  };

  const handleAcceptEssential = async () => {
    const consent: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
    };

    setPreferences(consent);
    saveToLocalStorage(consent);
    await saveToDatabase(consent);
    setShowBanner(false);
  };

  const handleSaveCustom = async () => {
    saveToLocalStorage(preferences);
    await saveToDatabase(preferences);
    setShowBanner(false);
    setShowCustomDialog(false);
  };

  const handlePreferenceChange = (key: keyof CookiePreferences, value: boolean) => {
    if (key === 'essential') return; // Essential cookies cannot be disabled
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 p-4">
        <Card className="max-w-6xl mx-auto">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      We value your privacy
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We use cookies to enhance your experience, analyze usage, and improve our regulatory intelligence platform. 
                      Essential cookies are required for core functionality.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 min-w-fit">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomDialog(true)}
                  className="whitespace-nowrap"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Customize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAcceptEssential}
                  className="whitespace-nowrap"
                >
                  Essential Only
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="whitespace-nowrap"
                >
                  Accept All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Choose which cookies you'd like to accept. Essential cookies are required for the site to function properly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies */}
            <div className="flex items-start justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3 flex-1">
                <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">Essential Cookies</h4>
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Necessary for the website to function properly. These include authentication, security, and basic functionality.
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.essential}
                disabled
                className="mt-1"
              />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-3 flex-1">
                <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Analytics Cookies</h4>
                  <p className="text-sm text-muted-foreground">
                    Help us understand how visitors interact with our regulatory intelligence platform by collecting anonymous usage data.
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
                className="mt-1"
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-3 flex-1">
                <Megaphone className="h-5 w-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Marketing Cookies</h4>
                  <p className="text-sm text-muted-foreground">
                    Used to deliver relevant regulatory updates and track the effectiveness of our compliance communications.
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                className="mt-1"
              />
            </div>

            {/* Functional Cookies */}
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-3 flex-1">
                <Wrench className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Functional Cookies</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable enhanced features like saved preferences, personalized dashboards, and improved user experience.
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.functional}
                onCheckedChange={(checked) => handlePreferenceChange('functional', checked)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustom}>
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}