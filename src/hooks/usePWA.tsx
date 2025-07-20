import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
}

export const usePWA = () => {
  const [pwaState, setPWAState] = useState<PWAState>({
    isInstalled: false,
    isInstallable: false,
    isOffline: !navigator.onLine,
    updateAvailable: false
  });
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Register service worker
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          setRegistration(registration);
          
          console.log('PWA: Service worker registered successfully');
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setPWAState(prev => ({ ...prev, updateAvailable: true }));
                  toast({
                    title: 'App Update Available',
                    description: 'A new version of RegIQ is available. Refresh to update.',
                    duration: 10000
                  });
                }
              });
            }
          });

          // Listen for controller change (new SW activated)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
          });

        } catch (error) {
          console.error('PWA: Service worker registration failed:', error);
        }
      }
    };

    registerSW();

    // Check installation status
    const checkInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isWebApp = (window.navigator as any).standalone === true;
      
      setPWAState(prev => ({
        ...prev,
        isInstalled: isStandalone || isWebApp
      }));
    };

    // Handle network status
    const handleOnline = () => {
      setPWAState(prev => ({ ...prev, isOffline: false }));
      toast({
        title: 'Back Online',
        description: 'Connection restored. Syncing latest regulatory data...',
      });
    };

    const handleOffline = () => {
      setPWAState(prev => ({ ...prev, isOffline: true }));
      toast({
        title: 'Offline Mode',
        description: 'You can still view cached alerts and data.',
        variant: 'destructive'
      });
    };

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setPWAState(prev => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      setPWAState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        isInstallable: false 
      }));
    };

    checkInstallation();

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const updateApp = async () => {
    if (registration) {
      const newWorker = registration.waiting;
      if (newWorker) {
        newWorker.postMessage({ action: 'SKIP_WAITING' });
      }
    }
  };

  const enableNotifications = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notifications Not Supported',
        description: 'Your browser does not support push notifications.',
        variant: 'destructive'
      });
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      toast({
        title: 'Notifications Blocked',
        description: 'Please enable notifications in your browser settings.',
        variant: 'destructive'
      });
      return false;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      toast({
        title: 'Notifications Enabled',
        description: 'You\'ll receive alerts for critical regulatory updates.',
      });
      return true;
    } else {
      toast({
        title: 'Notifications Disabled',
        description: 'You won\'t receive push notifications for alerts.',
        variant: 'destructive'
      });
      return false;
    }
  };

  const sendTestNotification = () => {
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification('RegIQ Test Alert', {
          body: 'This is a test notification from RegIQ. Notifications are working correctly!',
          icon: '/lovable-uploads/869131e3-58af-4f2a-8695-33e9e20d5b45.png',
          badge: '/lovable-uploads/869131e3-58af-4f2a-8695-33e9e20d5b45.png',
          data: { url: '/dashboard' },
          tag: 'test-notification'
        });
      });
    }
  };

  return {
    ...pwaState,
    updateApp,
    enableNotifications,
    sendTestNotification
  };
};