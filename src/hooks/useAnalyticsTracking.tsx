import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TrackingEvent {
  event_type: string;
  event_data: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

interface UseAnalyticsTrackingReturn {
  track: (eventType: string, eventData?: Record<string, any>) => void;
  trackPageView: (page: string) => void;
  trackPricingView: () => void;
  trackAlertsOnlyStarted: () => void;
  trackAlertDelivered: (alertId: string) => void;
  trackAlertOpened: (alertId: string) => void;
  trackPaywallViewed: (feature: string) => void;
  trackUpgradeClicked: (fromPlan: string, toPlan: string) => void;
  trackUpgradedToStarter: () => void;
  trackDowngradedToAlerts: (fromPlan: string) => void;
  trackChurnedAlertsOnly: () => void;
}

export const useAnalyticsTracking = (): UseAnalyticsTrackingReturn => {
  const { user } = useAuth();
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    // Generate session ID on mount
    sessionRef.current = crypto.randomUUID();
  }, []);

  const track = async (eventType: string, eventData: Record<string, any> = {}) => {
    try {
      const event: TrackingEvent = {
        event_type: eventType,
        event_data: {
          ...eventData,
          timestamp: Date.now(),
          session_id: sessionRef.current,
          user_id: user?.id || null,
          url: window.location.href,
          referrer: document.referrer || null,
        },
        user_agent: navigator.userAgent,
      };

      const { error } = await supabase
        .from('audit_events')
        .insert([{
          user_id: user?.id || null,
          event_type: eventType,
          event_data: event.event_data,
          user_agent: event.user_agent
        }]);

      if (error) {
        console.error('Analytics tracking error:', error);
      }
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  };

  const trackPageView = (page: string) => {
    track('page_view', { page });
  };

  const trackPricingView = () => {
    track('pricing_viewed', {
      page: 'pricing',
      plans_shown: ['starter', 'growth', 'professional']
    });
  };

  const trackAlertsOnlyStarted = () => {
    track('alerts_only_started', {
      plan: 'alerts_only',
      source: 'pricing_page'
    });
  };

  const trackAlertDelivered = (alertId: string) => {
    track('alert_delivered', {
      alert_id: alertId,
      delivery_method: 'email'
    });
  };

  const trackAlertOpened = (alertId: string) => {
    track('alert_opened', {
      alert_id: alertId,
      open_method: 'email_click'
    });
  };

  const trackPaywallViewed = (feature: string) => {
    track('paywall_viewed', {
      feature,
      current_plan: 'alerts_only',
      upgrade_target: 'starter'
    });
  };

  const trackUpgradeClicked = (fromPlan: string, toPlan: string) => {
    track('upgrade_clicked', {
      from_plan: fromPlan,
      to_plan: toPlan,
      cta_location: 'paywall'
    });
  };

  const trackUpgradedToStarter = () => {
    track('upgraded_to_starter', {
      from_plan: 'alerts_only',
      to_plan: 'starter',
      upgrade_success: true
    });
  };

  const trackDowngradedToAlerts = (fromPlan: string) => {
    track('downgraded_to_alerts', {
      from_plan: fromPlan,
      to_plan: 'alerts_only',
      downgrade_reason: 'cost_optimization'
    });
  };

  const trackChurnedAlertsOnly = () => {
    track('churned_alerts_only', {
      plan: 'alerts_only',
      churn_reason: 'cancelled_subscription'
    });
  };

  return {
    track,
    trackPageView,
    trackPricingView,
    trackAlertsOnlyStarted,
    trackAlertDelivered,
    trackAlertOpened,
    trackPaywallViewed,
    trackUpgradeClicked,
    trackUpgradedToStarter,
    trackDowngradedToAlerts,
    trackChurnedAlertsOnly,
  };
};