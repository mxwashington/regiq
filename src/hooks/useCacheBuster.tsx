import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CacheBusterConfig {
  checkInterval?: number; // in milliseconds
  clearStaleDataInterval?: number; // in milliseconds
  enableAutoRefresh?: boolean;
}

export const useCacheBuster = (config: CacheBusterConfig = {}) => {
  const {
    checkInterval = 5 * 60 * 1000, // 5 minutes
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
      
      // Add cache busting parameters to current URL
      const url = new URL(window.location.href);
      url.searchParams.set('_cb', Date.now().toString());
      
      // Force reload with cache bypass
      window.location.href = url.toString();
    } catch (error) {
      console.error('Cache buster: Force refresh failed:', error);
      // Fallback to normal reload
      window.location.reload();
    }
  }, [clearStaleData]);

  const checkForUpdates = useCallback(async () => {
    try {
      // Check service worker version
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          const { version } = event.data;
          const storedVersion = localStorage.getItem('app-version');
          
          if (storedVersion && storedVersion !== version) {
            if (enableAutoRefresh) {
              forceRefresh();
            } else {
              toast({
                title: 'Update Available',
                description: 'A new version is available. Refresh to update.',
                duration: 10000
              });
            }
          }
          
          localStorage.setItem('app-version', version);
        };
        
        navigator.serviceWorker.controller.postMessage(
          { action: 'GET_VERSION' },
          [messageChannel.port2]
        );
      }

      // Check server version
      const response = await fetch('/cache-version', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const storedVersion = localStorage.getItem('app-version');
        
        if (storedVersion && storedVersion !== data.version) {
          if (enableAutoRefresh) {
            forceRefresh();
          }
        }
        
        localStorage.setItem('app-version', data.version);
      }
    } catch (error) {
      console.log('Cache buster: Update check failed:', error);
    }
  }, [enableAutoRefresh, forceRefresh, toast]);

  useEffect(() => {
    // Initial setup
    clearStaleData();
    
    // Check for updates immediately and periodically
    checkForUpdates();
    const updateInterval = setInterval(checkForUpdates, checkInterval);
    
    // Clear stale data periodically
    const dataInterval = setInterval(clearStaleData, clearStaleDataInterval);
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    };
    
    // Handle focus events
    const handleFocus = () => {
      checkForUpdates();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(updateInterval);
      clearInterval(dataInterval);
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