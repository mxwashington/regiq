import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { triggerDataRefresh } from '@/lib/data-refresh';
import { useToast } from '@/hooks/use-toast';

export function DataRefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const { toast } = useToast();

  // Auto-refresh on component mount to get latest data
  useEffect(() => {
    handleRefresh();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      const result = await triggerDataRefresh();
      
      if (result.success) {
        setLastRefresh(new Date().toLocaleTimeString());
        
        toast({
          title: "Data Refresh Complete",
          description: `Updated data from all regulatory sources. Found ${result.totalAlertsProcessed || 0} new alerts.`,
          variant: "default",
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }

    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh data",
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