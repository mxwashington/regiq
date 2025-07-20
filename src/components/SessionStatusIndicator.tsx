
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Wifi, AlertTriangle } from 'lucide-react';
import { useIPTracking } from '@/hooks/useIPTracking';
import { useAuth } from '@/contexts/AuthContext';
import { SessionHealthMonitor } from './SessionHealthMonitor';
import { IPServiceErrorBoundary } from './IPServiceErrorBoundary';

export const SessionStatusIndicator = () => {
  const { user, isHealthy } = useAuth();
  const { ipInfo, loading, error } = useIPTracking();

  if (!user) return null;

  return (
    <IPServiceErrorBoundary>
      <div className="flex items-center gap-2">
        <SessionHealthMonitor />
        
        {isHealthy && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={error ? "destructive" : ipInfo?.isTrusted ? "default" : "secondary"}
                    className="flex items-center gap-1 cursor-help"
                  >
                    {error ? (
                      <>
                        <AlertTriangle className="h-3 w-3" />
                        IP Service Error
                      </>
                    ) : loading ? (
                      <>
                        <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        Loading...
                      </>
                    ) : ipInfo?.isTrusted ? (
                      <>
                        <Shield className="h-3 w-3" />
                        Trusted Session
                      </>
                    ) : (
                      <>
                        <Wifi className="h-3 w-3" />
                        Active Session
                      </>
                    )}
                  </Badge>
                  
                  {ipInfo?.sessionExtended && !error && (
                    <Badge variant="outline" className="text-xs">
                      Extended
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <div className="font-medium">Session Status</div>
                  {error ? (
                    <>
                      <div className="text-destructive">IP service unavailable</div>
                      <div className="text-xs text-muted-foreground">
                        Session tracking continues without IP detection
                      </div>
                    </>
                  ) : loading ? (
                    <div>Loading session information...</div>
                  ) : ipInfo ? (
                    <>
                      <div>IP: {ipInfo.ip}</div>
                      <div>Status: {ipInfo.isTrusted ? 'Trusted device' : 'Active session'}</div>
                      {ipInfo.sessionExtended && (
                        <div className="text-green-600">Extended for 30 days</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        IP tracking helps maintain your session across visits
                      </div>
                    </>
                  ) : (
                    <div>Session active without IP tracking</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </IPServiceErrorBoundary>
  );
};
