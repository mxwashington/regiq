import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { usePWA } from '@/hooks/usePWA';
import { useToast } from '@/hooks/use-toast';
import { 
  Smartphone, 
  Bell, 
  Wifi, 
  WifiOff, 
  Download, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Settings,
  Zap
} from 'lucide-react';

export const PWASettings: React.FC = () => {
  const { 
    isInstalled, 
    isInstallable, 
    isOffline, 
    updateAvailable,
    updateApp,
    enableNotifications,
    sendTestNotification
  } = usePWA();
  const { toast } = useToast();

  const handleEnableNotifications = async () => {
    const enabled = await enableNotifications();
    if (enabled) {
      // Send a test notification to confirm it's working
      setTimeout(() => {
        sendTestNotification();
      }, 1000);
    }
  };

  const handleUpdateApp = async () => {
    try {
      await updateApp();
      toast({
        title: 'App Updated',
        description: 'RegIQ has been updated to the latest version.',
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update the app. Please refresh manually.',
        variant: 'destructive'
      });
    }
  };

  const getInstallationStatus = () => {
    if (isInstalled) {
      return { icon: CheckCircle, text: 'Installed', color: 'text-green-600' };
    } else if (isInstallable) {
      return { icon: Download, text: 'Available', color: 'text-blue-600' };
    } else {
      return { icon: XCircle, text: 'Not Available', color: 'text-gray-600' };
    }
  };

  const getNotificationStatus = () => {
    if (!('Notification' in window)) {
      return { text: 'Not Supported', color: 'text-gray-600' };
    }
    
    switch (Notification.permission) {
      case 'granted':
        return { text: 'Enabled', color: 'text-green-600' };
      case 'denied':
        return { text: 'Blocked', color: 'text-red-600' };
      default:
        return { text: 'Not Requested', color: 'text-yellow-600' };
    }
  };

  const installStatus = getInstallationStatus();
  const notificationStatus = getNotificationStatus();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Smartphone className="h-6 w-6" />
          PWA Settings
        </h2>
        <p className="text-muted-foreground">
          Manage Progressive Web App features and mobile capabilities
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Installation</p>
                <p className={`font-semibold ${installStatus.color}`}>
                  {installStatus.text}
                </p>
              </div>
              <installStatus.icon className={`h-6 w-6 ${installStatus.color}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notifications</p>
                <p className={`font-semibold ${notificationStatus.color}`}>
                  {notificationStatus.text}
                </p>
              </div>
              <Bell className={`h-6 w-6 ${notificationStatus.color}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connection</p>
                <p className={`font-semibold ${isOffline ? 'text-red-600' : 'text-green-600'}`}>
                  {isOffline ? 'Offline' : 'Online'}
                </p>
              </div>
              {isOffline ? (
                <WifiOff className="h-6 w-6 text-red-600" />
              ) : (
                <Wifi className="h-6 w-6 text-green-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Updates</p>
                <p className={`font-semibold ${updateAvailable ? 'text-blue-600' : 'text-green-600'}`}>
                  {updateAvailable ? 'Available' : 'Current'}
                </p>
              </div>
              <RefreshCw className={`h-6 w-6 ${updateAvailable ? 'text-blue-600' : 'text-green-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Installation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            App Installation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Install RegIQ as an App</h4>
              <p className="text-sm text-muted-foreground">
                Add RegIQ to your home screen for faster access and offline capabilities
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isInstalled ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Installed
                </Badge>
              ) : isInstallable ? (
                <Button 
                  onClick={() => window.dispatchEvent(new CustomEvent('pwa-install-requested'))}
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install
                </Button>
              ) : (
                <Badge variant="secondary">Not Available</Badge>
              )}
            </div>
          </div>

          {isInstalled && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  RegIQ is installed and ready to use offline
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Regulatory Alert Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Get instant notifications for critical regulatory updates and recalls
              </p>
            </div>
            <div className="flex items-center gap-2">
              {Notification.permission === 'granted' ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Enabled
                </Badge>
              ) : (
                <Button 
                  onClick={handleEnableNotifications}
                  size="sm"
                  disabled={!('Notification' in window)}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Enable
                </Button>
              )}
            </div>
          </div>

          {Notification.permission === 'granted' && (
            <div className="space-y-2">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Push notifications are enabled
                    </span>
                  </div>
                  <Button 
                    onClick={sendTestNotification}
                    variant="outline" 
                    size="sm"
                  >
                    Test
                  </Button>
                </div>
              </div>
            </div>
          )}

          {Notification.permission === 'denied' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                  Notifications are blocked. Please enable them in your browser settings.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Card */}
      {updateAvailable && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="h-5 w-5" />
              App Update Available
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">New Version Available</h4>
                <p className="text-sm text-muted-foreground">
                  A new version of RegIQ is ready to install with improvements and bug fixes
                </p>
              </div>
              <Button onClick={handleUpdateApp}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Offline Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <h4 className="font-medium">Cached Alerts</h4>
                <p className="text-sm text-muted-foreground">View recently accessed regulatory alerts offline</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <h4 className="font-medium">Search Cache</h4>
                <p className="text-sm text-muted-foreground">Access cached search results when offline</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <h4 className="font-medium">Background Sync</h4>
                <p className="text-sm text-muted-foreground">Sync offline actions when connection is restored</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};