import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

import { logger } from '@/lib/logger';
// Generate session ID that persists during browser session
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Device detection utility
const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  let deviceType = 'Desktop';
  let browser = 'Unknown';
  let os = 'Unknown';

  // Device type detection
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    deviceType = 'Mobile';
  }

  // Browser detection
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // OS detection
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  return { deviceType, browser, os };
};

export const useAnalytics = () => {
  const location = useLocation();
  const sessionStartTime = useRef<Date>(new Date());
  const pageStartTime = useRef<Date>(new Date());
  const sessionId = useRef<string>(getSessionId());

  // Track page view
  const trackPageView = useCallback(async (pagePath?: string, pageTitle?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const loadTime = Date.now() - pageStartTime.current.getTime();
      
      logger.info('Tracking page view:', { 
        path: pagePath || location.pathname, 
        userId: user?.id,
        sessionId: sessionId.current 
      });
      
      const { error } = await supabase.from('page_views').insert({
        user_id: user?.id || null,
        page_path: pagePath || location.pathname,
        page_title: pageTitle || document.title,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        session_id: sessionId.current,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        load_time_ms: loadTime
      });
      
      if (error) {
        logger.error('Page view insert error:', error);
      } else {
        logger.info('Page view tracked successfully');
      }
    } catch (error) {
      logger.error('Failed to track page view:', error);
    }
  }, [location.pathname]);

  // Track user interaction
  const trackInteraction = useCallback(async (
    interactionType: string,
    elementId?: string,
    elementType?: string,
    additionalData?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('user_interactions').insert({
        user_id: user?.id || null,
        session_id: sessionId.current,
        interaction_type: interactionType,
        element_id: elementId,
        element_type: elementType,
        page_path: location.pathname,
        interaction_data: additionalData || {}
      });
    } catch (error) {
      logger.error('Failed to track interaction:', error);
    }
  }, [location.pathname]);

  // Track alert interaction
  const trackAlertInteraction = useCallback(async (
    alertId: string,
    interactionType: 'view' | 'save' | 'dismiss' | 'click' | 'share',
    additionalData?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.id) return; // Only track for authenticated users
      
      await supabase.from('alert_interactions').insert({
        user_id: user.id,
        alert_id: alertId,
        interaction_type: interactionType,
        interaction_data: additionalData || {}
      });
    } catch (error) {
      logger.error('Failed to track alert interaction:', error);
    }
  }, []);

  // Track search
  const trackSearch = useCallback(async (
    query: string,
    searchType: string,
    resultsCount: number,
    filtersApplied?: Record<string, any>,
    searchDuration?: number
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('search_analytics').insert({
        user_id: user?.id || null,
        search_query: query,
        search_type: searchType,
        results_count: resultsCount,
        search_duration_ms: searchDuration,
        filters_applied: filtersApplied || {}
      });
    } catch (error) {
      logger.error('Failed to track search:', error);
    }
  }, []);

  // Initialize or update session
  const initializeSession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const deviceInfo = getDeviceInfo();
      
      logger.info('Initializing analytics session:', { 
        sessionId: sessionId.current, 
        userId: user?.id,
        deviceInfo 
      });
      
      // Try to update existing session or create new one
      const { error } = await supabase.from('user_sessions').upsert({
        user_id: user?.id || null,
        session_id: sessionId.current,
        start_time: sessionStartTime.current.toISOString(),
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        operating_system: deviceInfo.os,
        pages_visited: 1
      }, {
        onConflict: 'session_id'
      });
      
      if (error) {
        logger.error('Session upsert error:', error);
      } else {
        logger.info('Session initialized successfully');
      }
    } catch (error) {
      logger.error('Failed to initialize session:', error);
    }
  }, []);

  // Update session on page change
  const updateSession = useCallback(async () => {
    try {
      // Get current session to increment pages_visited
      const { data: currentSession } = await supabase
        .from('user_sessions')
        .select('pages_visited')
        .eq('session_id', sessionId.current)
        .single();

      await supabase
        .from('user_sessions')
        .update({
          pages_visited: (currentSession?.pages_visited || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId.current);
    } catch (error) {
      logger.error('Failed to update session:', error);
    }
  }, []);

  // End session on page unload
  const endSession = useCallback(async () => {
    try {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - sessionStartTime.current.getTime()) / 1000);
      
      await supabase
        .from('user_sessions')
        .update({
          end_time: endTime.toISOString(),
          duration_seconds: duration
        })
        .eq('session_id', sessionId.current);
    } catch (error) {
      logger.error('Failed to end session:', error);
    }
  }, []);

  // Auto-track page views on route change
  useEffect(() => {
    pageStartTime.current = new Date();
    trackPageView();
    updateSession();
  }, [location.pathname, trackPageView, updateSession]);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();

    // End session on page unload
    const handleBeforeUnload = () => {
      endSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession();
    };
  }, [initializeSession, endSession]);

  return {
    trackPageView,
    trackInteraction,
    trackAlertInteraction,
    trackSearch,
    sessionId: sessionId.current
  };
};