import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fallbackAlerts } from '@/lib/debug-utils';

interface SimpleAlert {
  id: string;
  title: string;
  summary: string;
  urgency: string;
  source: string;
  published_date: string;
  external_url?: string;
  isFallback?: boolean;
}

export const useSimpleAlerts = (limit?: number) => {
  const [alerts, setAlerts] = useState<SimpleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const loadAlertsWithRetry = async (maxRetries = 3) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[useSimpleAlerts] Attempt ${attempt + 1}/${maxRetries + 1} - Loading alerts...`, { limit });
        setLoading(true);
        setError(null);

        // Test basic connection first
        console.log('[useSimpleAlerts] Testing database connection...');
        const { error: pingError } = await supabase
          .from('alerts')
          .select('count')
          .limit(0);

        if (pingError) {
          throw new Error(`Database connection failed: ${pingError.message}`);
        }

        console.log('[useSimpleAlerts] Database connection successful, loading alerts...');

        // Build query
        let query = supabase
          .from('alerts')
          .select(`
            id,
            title,
            summary,
            urgency,
            source,
            published_date,
            external_url,
            dismissed_by
          `, { count: 'exact' })
          .order('published_date', { ascending: false });

        // Only apply limit if specified
        if (limit && limit > 0) {
          query = query.limit(limit);
        }

        const { data, error: fetchError, count } = await query;

        if (fetchError) {
          console.error('[useSimpleAlerts] Query failed:', fetchError);
          throw new Error(`Query failed: ${fetchError.message} (Code: ${fetchError.code})`);
        }

        if (!data) {
          throw new Error('No data returned from query');
        }

        console.log('[useSimpleAlerts] Successfully loaded alerts:', { 
          count: data.length, 
          totalCount: count,
          limit,
          sampleTitles: data.slice(0, 3).map(a => a.title) 
        });
        
        setAlerts(data);
        setTotalCount(count || 0);
        setRetryCount(0);
        return;

      } catch (err: any) {
        console.error(`[useSimpleAlerts] Attempt ${attempt + 1} failed:`, err);
        
        if (attempt === maxRetries) {
          // All retries failed, use fallback
          console.warn('[useSimpleAlerts] All retries failed, using fallback data');
          setError(err.message || 'Failed to load alerts');
          setAlerts(fallbackAlerts);
          setTotalCount(fallbackAlerts.length);
          setRetryCount(attempt + 1);
          
          toast({
            title: 'Connection Issue',
            description: 'Using cached data. Click refresh to try again.',
            variant: 'destructive'
          });
        } else {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`[useSimpleAlerts] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  };

  useEffect(() => {
    loadAlertsWithRetry();
  }, [limit, toast]);

  // Provide manual retry function
  const retryLoad = () => {
    loadAlertsWithRetry();
  };

  return { 
    alerts, 
    loading, 
    error, 
    totalCount, 
    retryCount,
    retryLoad 
  };
};