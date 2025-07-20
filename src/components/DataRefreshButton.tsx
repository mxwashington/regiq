import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { triggerDataRefresh } from '@/lib/data-refresh';
import { useToast } from '@/hooks/use-toast';

export function DataRefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const { toast } = useToast();

  // Remove auto-refresh on mount to prevent conflicts with cron job

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      const result = await triggerDataRefresh();
      
      if (result?.success) {
        setLastRefresh(new Date().toLocaleTimeString());
        
        toast({
          title: "Data Refresh Complete",
          description: `Data pipeline completed successfully. Found ${result.totalAlertsProcessed || 0} new alerts.`,
        });
      } else {
        console.error('Data refresh failed:', result);
        toast({
          title: "Refresh Failed", 
          description: result?.error || "Failed to refresh data from sources",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh Error",
        description: "Unable to connect to data pipeline",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing}
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
      </Button>
      
      {lastRefresh && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <CheckCircle className="h-3 w-3 text-green-500" />
          Last updated: {lastRefresh}
        </div>
      )}
    </div>
  );
}