
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UpdateNotificationProps {
  onUpdate?: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onUpdate }) => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Only check service worker version - don't make API calls to non-existent endpoints
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const messageChannel = new MessageChannel();
          
          messageChannel.port1.onmessage = (event) => {
            const { version } = event.data;
            const storedVersion = localStorage.getItem('app-version');
            
            // Only show update notification if we have a stored version AND it's different
            // AND we haven't dismissed this version already
            const dismissedVersion = localStorage.getItem('dismissed-version');
            
            if (storedVersion && storedVersion !== version && dismissedVersion !== version) {
              setShowUpdate(true);
              setCurrentVersion(version);
            } else if (!storedVersion) {
              // First time - just store the version without showing notification
              localStorage.setItem('app-version', version);
            }
          };
          
          navigator.serviceWorker.controller.postMessage(
            { action: 'GET_VERSION' },
            [messageChannel.port2]
          );
        }
      } catch (error) {
        console.log('Service worker version check failed:', error);
      }
    };

    // Service worker message listener
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'NEW_VERSION') {
        const storedVersion = localStorage.getItem('app-version');
        const dismissedVersion = localStorage.getItem('dismissed-version');
        
        if (storedVersion && storedVersion !== event.data.version && dismissedVersion !== event.data.version) {
          setShowUpdate(true);
          setCurrentVersion(event.data.version);
        }
      } else if (event.data.type === 'CLEAR_STALE_DATA') {
        clearStaleData();
      }
    };

    // Check for visibility change (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    };

    // Initial check and less frequent periodic checks
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 10 * 60 * 1000); // Check every 10 minutes instead of 5

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const clearStaleData = () => {
    const lastClear = localStorage.getItem('last-data-clear');
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    if (!lastClear || parseInt(lastClear) < oneDayAgo) {
      // Clear potentially stale session data
      sessionStorage.clear();
      
      // Clear specific localStorage items that might cause issues
      const keysToRemove = ['cached-alerts', 'user-preferences', 'search-history'];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      localStorage.setItem('last-data-clear', Date.now().toString());
      
      console.log('Cleared stale session data');
    }
  };

  const handleRefresh = async () => {
    setIsUpdating(true);
    
    try {
      // Clear all caches first
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear session data
      clearStaleData();
      
      // Update app version
      localStorage.setItem('app-version', currentVersion);
      
      // Force hard reload
      if (onUpdate) {
        onUpdate();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Update failed:', error);
      toast({
        title: 'Update Failed',
        description: 'Please refresh manually to see the latest version.',
        variant: 'destructive'
      });
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    localStorage.setItem('app-version', currentVersion);
    localStorage.setItem('dismissed-version', currentVersion);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] p-4">
      <Alert className="bg-primary text-primary-foreground border-primary/20">
        <RefreshCw className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="flex-1">
            New version of RegIQ available! Update to see the latest regulatory alerts and improvements.
          </span>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isUpdating}
              className="bg-background text-foreground hover:bg-background/90"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Now'
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
