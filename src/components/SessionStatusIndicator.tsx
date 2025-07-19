import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, WifiOff, Wifi } from 'lucide-react';
import { useIPTracking } from '@/hooks/useIPTracking';
import { useAuth } from '@/contexts/AuthContext';

export const SessionStatusIndicator = () => {
  const { user } = useAuth();
  const { ipInfo, loading } = useIPTracking();

  if (!user || loading) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge 
              variant={ipInfo?.isTrusted ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {ipInfo?.isTrusted ? (
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
            
            {ipInfo?.sessionExtended && (
              <Badge variant="outline" className="text-xs">
                Extended
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-medium mb-1">Session Status</div>
            {ipInfo ? (
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
              <div>Loading session info...</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};