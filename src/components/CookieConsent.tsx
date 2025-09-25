import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Cookie, Settings, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
  });
  const { user } = useAuth();

  useEffect(() => {
    checkCookieConsent();
  }, [user]);

  const checkCookieConsent = async () => {
    // Check if user has already given consent
    const stored = localStorage.getItem('cookie-consent');
    if (stored) {
      const consent = JSON.parse(stored);
      setPreferences(consent);
      return;
    }

    // Check database for logged-in users
    if (user) {
      try {
        const { data, error } = await supabase
          .from('cookie_consents')
          .select('essential, analytics, marketing, functional')
          .eq('user_id', user.id)
          .order('consent_date', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const consent = data[0];
          setPreferences(consent);
          localStorage.setItem('cookie-consent', JSON.stringify(consent));
          return;
        }
      } catch (error) {
        logger.error('Error checking cookie consent', error, 'CookieConsent');
      }
    }

    // Show banner if no consent found
    setShowBanner(true);
  };

  // Generate a visitor ID for non-authenticated users
  const generateVisitorId = () => {
    let visitorId = localStorage.getItem('regiq-visitor-id');
    if (!visitorId) {
      visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('regiq-visitor-id', visitorId);
    }
    return visitorId;
  };

  const saveConsent = async (accepted: boolean, customPreferences?: CookiePreferences) => {
    const finalPreferences = customPreferences || {
      essential: true,
      analytics: accepted,
      marketing: accepted,
      functional: accepted,
    };

    setPreferences(finalPreferences);
    localStorage.setItem('cookie-consent', JSON.stringify(finalPreferences));

    // Save to database
    try {
      const visitorId = !user ? generateVisitorId() : null;
      
      const consent = {
        user_id: user?.id || null,
        visitor_id: visitorId,
        essential: finalPreferences.essential,
        analytics: finalPreferences.analytics,
        marketing: finalPreferences.marketing,
        functional: finalPreferences.functional,
        user_agent: navigator.userAgent
      };

      const { error } = await supabase.from('cookie_consents').insert(consent);
    } catch (error) {
      logger.error('Error saving cookie consent', error, 'CookieConsent');
    }

    setShowBanner(false);
    setShowSettings(false);
  };

  const handleAcceptAll = () => {
    saveConsent(true);
  };

  const handleRejectAll = () => {
    saveConsent(false);
  };

  const handleSaveCustom = () => {
    const hasAccepted = preferences.analytics || preferences.marketing || preferences.functional;
    saveConsent(hasAccepted, preferences);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cookie className="h-5 w-5" />
            Cookie Preferences
          </CardTitle>
          <CardDescription>
            We use cookies to enhance your experience and analyze site usage. 
            You can customize your preferences or accept all cookies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button 
              onClick={handleAcceptAll}
              className="flex-1"
            >
              Accept All
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRejectAll}
              className="flex-1"
            >
              Reject All
            </Button>
            <Button 
              variant="ghost"
              onClick={() => setShowSettings(true)}
              size="icon"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Cookie Settings
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. Essential cookies are required for the site to function.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Essential Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="essential" className="text-base font-medium">
                  Essential Cookies
                </Label>
                <Switch
                  id="essential"
                  checked={preferences.essential}
                  disabled
                />
              </div>
              <p className="text-sm text-muted-foreground">
                These cookies are necessary for the website to function and cannot be switched off.
                They are usually set in response to actions made by you such as setting your privacy preferences or logging in.
              </p>
            </div>

            {/* Analytics Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="analytics" className="text-base font-medium">
                  Analytics Cookies
                </Label>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, analytics: checked }))
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                These cookies help us understand how visitors interact with our website by collecting information anonymously.
                This helps us improve our services.
              </p>
            </div>

            {/* Marketing Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="marketing" className="text-base font-medium">
                  Marketing Cookies
                </Label>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, marketing: checked }))
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                These cookies are used to deliver relevant advertisements and marketing communications.
                They track your activity across websites.
              </p>
            </div>

            {/* Functional Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="functional" className="text-base font-medium">
                  Functional Cookies
                </Label>
                <Switch
                  id="functional"
                  checked={preferences.functional}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, functional: checked }))
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                These cookies enable enhanced functionality and personalization.
                They may be set by us or by third party providers whose services we have added to our pages.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
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