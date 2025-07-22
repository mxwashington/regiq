import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle, Search, Database } from 'lucide-react';
import { triggerDataRefresh } from '@/lib/data-refresh';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function DataRefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Clear cache first
      const { error: cacheError } = await supabase
        .from('search_cache')
        .delete()
        .neq('id', ''); // Delete all cache entries

      if (cacheError) {
        console.error('Cache clear error:', cacheError);
      }

      // Clear localStorage cache
      Object.keys(localStorage).forEach(key => {
        if (key.includes('alerts') || key.includes('cache') || key.includes('regiq')) {
          localStorage.removeItem(key);
        }
      });

      const result = await triggerDataRefresh();
      
      if (result?.success) {
        setLastRefresh(new Date().toLocaleTimeString());
        
        toast({
          title: "Data Refresh Complete",
          description: `Data pipeline completed successfully. Found ${result.totalAlertsProcessed || 0} new alerts. Cache cleared.`,
        });

        // Force page reload to ensure fresh data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
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

  const handleEnhanceSources = async () => {
    setIsEnhancing(true);
    try {
      toast({
        title: "Source Enhancement Started",
        description: "Finding better sources for alerts...",
      });

      const { data, error } = await supabase.functions.invoke('alert-source-finder');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Source Enhancement Complete",
        description: data.message || `Enhanced ${data.updated || 0} alerts with better sources`,
      });

      // Refresh alerts to show updated sources
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Source enhancement error:', error);
      toast({
        title: "Enhancement Error",
        description: "Failed to enhance sources. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleClearCacheOnly = async () => {
    try {
      // Clear database cache
      const { error: cacheError } = await supabase
        .from('search_cache')
        .delete()
        .neq('id', '');

      // Clear browser cache
      Object.keys(localStorage).forEach(key => {
        if (key.includes('alerts') || key.includes('cache') || key.includes('regiq')) {
          localStorage.removeItem(key);
        }
      });

      toast({
        title: "Cache Cleared",
        description: "All cache cleared. Page will reload to show fresh data.",
      });

      // Force reload
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (error) {
      console.error('Cache clear error:', error);
      toast({
        title: "Error",
        description: "Failed to clear cache",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
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
      
      <Button
        onClick={handleEnhanceSources}
        disabled={isEnhancing}
        size="sm"
        variant="ghost"
        className="flex items-center gap-2"
        title="Find better source URLs for alerts"
      >
        <Search className={`h-4 w-4 ${isEnhancing ? 'animate-pulse' : ''}`} />
        {isEnhancing ? 'Enhancing...' : 'Find Sources'}
      </Button>

      <Button
        onClick={handleClearCacheOnly}
        size="sm"
        variant="ghost"
        className="flex items-center gap-2"
        title="Clear cache and reload page"
      >
        <Database className="h-4 w-4" />
        Clear Cache
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