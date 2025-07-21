import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, Clock } from "lucide-react";

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export function ThirdShiftStatusIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Simulate connection status checking
    const checkConnection = () => {
      // In a real app, this would check actual connection to ThirdShift.AI
      const isOnline = navigator.onLine;
      const random = Math.random();
      
      if (!isOnline) {
        setStatus('disconnected');
      } else if (random > 0.1) { // 90% chance of being connected when online
        setStatus('connected');
        setLastUpdate(new Date());
      } else {
        setStatus('connecting');
      }
    };

    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    // Listen for online/offline events
    const handleOnline = () => setStatus('connected');
    const handleOffline = () => setStatus('disconnected');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: 'Connected',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
          tooltip: `ThirdShift.AI connected • Last update: ${lastUpdate.toLocaleTimeString()}`
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Offline',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
          tooltip: 'ThirdShift.AI disconnected • Check your internet connection'
        };
      case 'connecting':
        return {
          icon: <Clock className="h-3 w-3 animate-spin" />,
          text: 'Connecting',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          tooltip: 'Connecting to ThirdShift.AI...'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={config.variant}
            className={`flex items-center gap-1 cursor-help ${config.className}`}
          >
            {config.icon}
            <span className="text-xs font-medium">
              ThirdShift.AI {config.text}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}