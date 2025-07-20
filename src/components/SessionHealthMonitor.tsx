
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export const SessionHealthMonitor = () => {
  const { isHealthy, lastError, session, loading } = useAuth();

  if (loading || !session) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isHealthy ? "default" : "destructive"}
            className="flex items-center gap-1 text-xs"
          >
            {isHealthy ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Session OK
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3" />
                Session Issue
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm max-w-xs">
            {isHealthy ? (
              <div>
                <div className="font-medium text-green-600 mb-1">Session Healthy</div>
                <div className="text-xs text-muted-foreground">
                  Authentication is working properly
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium text-red-600 mb-1">Session Problem</div>
                {lastError && (
                  <div className="text-xs text-muted-foreground">
                    {lastError}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  You may need to sign in again
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
