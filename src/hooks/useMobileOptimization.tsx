import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
interface MobileOptimizationConfig {
  enablePullToRefresh?: boolean;
  enableTouchFeedback?: boolean;
  enableMobileDebug?: boolean;
}

interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
  screenSize: {
    width: number;
    height: number;
  };
  isOnline: boolean;
  touchSupported: boolean;
}

export const useMobileOptimization = (config: MobileOptimizationConfig = {}) => {
  const {
    enablePullToRefresh = true,
    enableTouchFeedback = true,
    enableMobileDebug = false
  } = config;

  const { toast } = useToast();
  const [mobileState, setMobileState] = useState<MobileState>({
    isMobile: false,
    isTablet: false,
    orientation: 'portrait',
    screenSize: { width: 0, height: 0 },
    isOnline: navigator.onLine,
    touchSupported: 'ontouchstart' in window
  });

  // Update mobile state
  const updateMobileState = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const orientation = width > height ? 'landscape' : 'portrait';

    setMobileState(prev => ({
      ...prev,
      isMobile,
      isTablet,
      orientation,
      screenSize: { width, height }
    }));

    if (enableMobileDebug) {
      logger.info('Mobile state updated:', {
        isMobile,
        isTablet,
        orientation,
        screenSize: { width, height },
        userAgent: navigator.userAgent
      });
    }
  }, [enableMobileDebug]);

  // Handle network status changes
  const handleOnline = useCallback(() => {
    setMobileState(prev => ({ ...prev, isOnline: true }));
    if (mobileState.isMobile) {
      toast({
        title: 'Back Online',
        description: 'Connection restored. Syncing latest data...',
        duration: 3000
      });
    }
  }, [mobileState.isMobile, toast]);

  const handleOffline = useCallback(() => {
    setMobileState(prev => ({ ...prev, isOnline: false }));
    if (mobileState.isMobile) {
      toast({
        title: 'Offline Mode',
        description: 'You can still view cached regulatory alerts.',
        variant: 'destructive',
        duration: 5000
      });
    }
  }, [mobileState.isMobile, toast]);

  // Pull to refresh functionality
  const usePullToRefresh = useCallback((onRefresh: () => void) => {
    useEffect(() => {
      if (!enablePullToRefresh || !mobileState.isMobile) return;

      let startY = 0;
      let currentY = 0;
      let isRefreshing = false;
      let pullDistance = 0;

      const handleTouchStart = (e: TouchEvent) => {
        startY = e.touches[0].clientY;
      };

      const handleTouchMove = (e: TouchEvent) => {
        currentY = e.touches[0].clientY;
        pullDistance = currentY - startY;

        // Only trigger if at top of page and pulling down
        if (pullDistance > 100 && window.scrollY === 0 && !isRefreshing) {
          isRefreshing = true;
          
          // Haptic feedback if available
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }
          
          toast({
            title: 'Refreshing...',
            description: 'Fetching latest regulatory alerts',
            duration: 2000
          });
          
          onRefresh();
          setTimeout(() => { isRefreshing = false; }, 2000);
        }
      };

      const handleTouchEnd = () => {
        startY = 0;
        currentY = 0;
        pullDistance = 0;
      };

      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }, [onRefresh, enablePullToRefresh, mobileState.isMobile, toast]);
  }, [enablePullToRefresh, mobileState.isMobile, toast]);

  // Touch feedback enhancement
  const addTouchFeedback = useCallback((element: HTMLElement) => {
    if (!enableTouchFeedback || !mobileState.touchSupported) return;

    const handleTouchStart = () => {
      element.style.transform = 'scale(0.98)';
      element.style.opacity = '0.8';
      
      if ('vibrate' in navigator) {
        navigator.vibrate(10); // Very light haptic feedback
      }
    };

    const handleTouchEnd = () => {
      element.style.transform = 'scale(1)';
      element.style.opacity = '1';
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enableTouchFeedback, mobileState.touchSupported]);

  // Mobile-optimized error handling
  const handleMobileError = useCallback((error: Error) => {
    let message = 'Something went wrong';
    let description = 'Pull down to refresh and try again';

    if (error.message.includes('network') || error.message.includes('fetch')) {
      message = 'Connection Error';
      description = 'Check your internet connection and try again';
    } else if (error.message.includes('timeout')) {
      message = 'Request Timed Out';
      description = 'The request took too long. Please try again';
    }

    toast({
      title: message,
      description: description,
      variant: 'destructive',
      duration: 5000
    });
  }, [toast]);

  // Setup effects
  useEffect(() => {
    updateMobileState();

    const handleResize = () => updateMobileState();
    const handleOrientationChange = () => {
      setTimeout(updateMobileState, 100); // Delay to get accurate dimensions
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateMobileState, handleOnline, handleOffline]);

  return {
    ...mobileState,
    usePullToRefresh,
    addTouchFeedback,
    handleMobileError,
    
    // Helper functions
    isMobileDevice: () => mobileState.isMobile,
    isTabletDevice: () => mobileState.isTablet,
    isPortrait: () => mobileState.orientation === 'portrait',
    isLandscape: () => mobileState.orientation === 'landscape',
    
    // Mobile-specific utilities
    preventZoom: () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    },
    
    allowZoom: () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
      }
    }
  };
};