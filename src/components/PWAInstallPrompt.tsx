import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInWebAppChrome = window.matchMedia('(display-mode: standalone)').matches;
      
      setIsInstalled(isStandalone || isInWebAppiOS || isInWebAppChrome);
    };

    // Check if iOS
    const checkiOS = () => {
      const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(iOS);
    };

    checkInstalled();
    checkiOS();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install prompt after a delay (don't be too aggressive)
      setTimeout(() => {
        if (!isInstalled) {
          setShowPrompt(true);
        }
      }, 5000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      
      toast({
        title: 'RegIQ Installed!',
        description: 'You can now access RegIQ from your home screen.',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // For iOS, show manual install instructions
      if (isIOS) {
        setShowPrompt(true);
        return;
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
        toast({
          title: 'Installing RegIQ...',
          description: 'The app will be available on your home screen shortly.',
        });
      } else {
        console.log('PWA: User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('PWA: Error during installation:', error);
      toast({
        title: 'Installation Error',
        description: 'There was an issue installing the app. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed or user dismissed this session
  if (isInstalled || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  // iOS Manual Installation Instructions
  if (isIOS && showPrompt) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 shadow-lg border-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Install RegIQ</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={dismissPrompt}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Get faster access to regulatory alerts:
          </p>
          <ol className="text-sm space-y-1 mb-4">
            <li>1. Tap the share button in Safari</li>
            <li>2. Scroll down and tap "Add to Home Screen"</li>
            <li>3. Tap "Add" to install RegIQ</li>
          </ol>
          <Button variant="outline" size="sm" onClick={dismissPrompt} className="w-full">
            Got it
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Chrome/Android Installation Prompt
  if (showPrompt && (deferredPrompt || isIOS)) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 shadow-lg border-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Install RegIQ</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={dismissPrompt}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Install RegIQ for faster access to regulatory alerts and offline functionality.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleInstallClick} size="sm" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Install
            </Button>
            <Button variant="outline" onClick={dismissPrompt} size="sm">
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

// Mini install button for header/nav
export const PWAInstallButton: React.FC = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstallability = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebApp = (window.navigator as any).standalone === true;
      
      setIsInstalled(isStandalone || isInWebApp);
      setCanInstall(!isStandalone && !isInWebApp);
    };

    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    checkInstallability();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled || !canInstall) {
    return null;
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => {
        // Trigger the main install prompt
        window.dispatchEvent(new CustomEvent('pwa-install-requested'));
      }}
      className="hidden md:flex"
    >
      <Download className="h-4 w-4 mr-2" />
      Install App
    </Button>
  );
};