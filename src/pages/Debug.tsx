import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bug } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IPServiceDebugPanel } from '@/components/IPServiceDebugPanel';
import { useAuth } from '@/contexts/AuthContext';

const Debug = () => {
  const { user } = useAuth();

  // Only show debug panel in development or for admin users
  const isDevelopment = import.meta.env.DEV;
  
  if (!isDevelopment && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Panel
            </CardTitle>
            <CardDescription>
              This page is only available in development mode or for authenticated users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Bug className="h-8 w-8" />
                Debug Panel
              </h1>
              <p className="text-muted-foreground">
                Monitor and debug application services
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Badge variant={isDevelopment ? "default" : "secondary"}>
              {isDevelopment ? "Development Mode" : "Production Mode"}
            </Badge>
            {user && (
              <Badge variant="outline">
                Authenticated User
              </Badge>
            )}
          </div>
        </div>

        {/* Debug Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* IP Service Debug */}
          <div>
            <h2 className="text-xl font-semibold mb-4">IP Detection Service</h2>
            <IPServiceDebugPanel />
          </div>

          {/* Additional Debug Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Environment:</span>
                  <Badge variant={isDevelopment ? "default" : "secondary"}>
                    {isDevelopment ? "Development" : "Production"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">User Agent:</span>
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {navigator.userAgent.split(' ')[0]}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Timestamp:</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date().toISOString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Local Storage:</span>
                  <Badge variant="outline">
                    {Object.keys(localStorage).length} items
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Network Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Connection:</span>
                  <Badge variant="outline">
                    {(navigator as any).connection?.effectiveType || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Online:</span>
                  <Badge variant={navigator.onLine ? "default" : "destructive"}>
                    {navigator.onLine ? "Online" : "Offline"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Language:</span>
                  <span className="text-sm">{navigator.language}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Performance Information */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Basic performance information about the current session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {performance.now().toFixed(0)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Page Load Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {(performance as any).memory?.usedJSHeapSize ? 
                      Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 'N/A'}
                    {(performance as any).memory?.usedJSHeapSize ? 'MB' : ''}
                  </div>
                  <div className="text-sm text-muted-foreground">Memory Usage</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {Object.keys(sessionStorage).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Session Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {document.querySelectorAll('*').length}
                  </div>
                  <div className="text-sm text-muted-foreground">DOM Elements</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Debug;