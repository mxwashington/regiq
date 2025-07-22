
import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CacheBusterConfig {
  checkInterval?: number;
  clearStaleDataInterval?: number;
  enableAutoRefresh?: boolean;
}

export const useCacheBuster = (config: CacheBusterConfig = {}) => {
  const {
    checkInterval = 15 * 60 * 1000, // Increased to 15 minutes to reduce load
    clearStaleDataInterval = 24 * 60 * 60 * 1000, // 24 hours
    enableAutoRefresh = false
  } = config;
  
  const { toast } = useToast();

  const clearStaleData = useCallback(() => {
    const lastClear = localStorage.getItem('last-data-clear');
    const threshold = Date.now() - clearStaleDataInterval;
    
    if (!lastClear || parseInt(lastClear) < threshold) {
      try {
        // Clear session storage
        sessionStorage.clear();
        
        // Clear specific localStorage keys that might cause caching issues
        const staleKeys = [
          'cached-alerts',
          'user-preferences',
          'search-history',
          'filter-state',
          'dashboard-state'
        ];
        
        staleKeys.forEach(key => {
          localStorage.removeItem(key);
        });
        
        localStorage.setItem('last-data-clear', Date.now().toString());
        
        console.log('Cache buster: Cleared stale data');
      } catch (error) {
        console.error('Cache buster: Error clearing stale data:', error);
      }
    }
  }, [clearStaleDataInterval]);

  const forceRefresh = useCallback(async () => {
    try {
      // Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear stale data
      clearStaleData();
      
      // Force reload with cache bypass
      window.location.reload();
    } catch (error) {
      console.error('Cache buster: Force refresh failed:', error);
      // Fallback to normal reload
      window.location.reload();
    }
  }, [clearStaleData]);

  const checkForUpdates = useCallback(async () => {
    try {
      // Only check service worker version - avoid API calls to non-existent endpoints
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          const { version } = event.data;
          const storedVersion = localStorage.getItem('app-version');
          
          if (storedVersion && storedVersion !== version) {
            if (enableAutoRefresh) {
              forceRefresh();
            }
          }
          
          localStorage.setItem('app-version', version);
        };
        
        navigator.serviceWorker.controller.postMessage(
          { action: 'GET_VERSION' },
          [messageChannel.port2]
        );
      }
    } catch (error) {
      // Don't log this as it's expected when the endpoint doesn't exist
      console.log('Cache buster: Service worker check skipped');
    }
  }, [enableAutoRefresh, forceRefresh]);

  useEffect(() => {
    // Initial setup
    clearStaleData();
    
    // Only run periodic checks if service worker is available
    let updateInterval: NodeJS.Timeout | null = null;
    let dataInterval: NodeJS.Timeout | null = null;
    
    if ('serviceWorker' in navigator) {
      // Check for updates less frequently
      checkForUpdates();
      updateInterval = setInterval(checkForUpdates, checkInterval);
    }
    
    // Clear stale data periodically
    dataInterval = setInterval(clearStaleData, clearStaleDataInterval);
    
    // Handle page visibility changes (reduced frequency)
    let visibilityTimeout: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (!document.hidden && 'serviceWorker' in navigator) {
        // Debounce visibility change checks
        if (visibilityTimeout) clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(checkForUpdates, 1000);
      }
    };
    
    // Handle focus events (reduced frequency)
    let focusTimeout: NodeJS.Timeout | null = null;
    const handleFocus = () => {
      if ('serviceWorker' in navigator) {
        // Debounce focus checks
        if (focusTimeout) clearTimeout(focusTimeout);
        focusTimeout = setTimeout(checkForUpdates, 2000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      if (updateInterval) clearInterval(updateInterval);
      if (dataInterval) clearInterval(dataInterval);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
      if (focusTimeout) clearTimeout(focusTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkForUpdates, clearStaleData, checkInterval, clearStaleDataInterval]);

  return {
    clearStaleData,
    forceRefresh,
    checkForUpdates
  };
};
