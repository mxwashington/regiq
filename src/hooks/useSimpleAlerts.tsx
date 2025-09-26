import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fallbackAlerts } from '@/lib/debug-utils';

import { logger } from '@/lib/logger';
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

interface UseSimpleAlertsReturn {
  alerts: SimpleAlert[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  retryCount: number;
  retryLoad: () => void;
  hasMore: boolean;
  loadMore: () => void;
}

export const useSimpleAlerts = (limit?: number): UseSimpleAlertsReturn => {
  const [alerts, setAlerts] = useState<SimpleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const { toast } = useToast();

  const loadAlertsWithRetry = async (maxRetries = 3) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[useSimpleAlerts] Attempt ${attempt + 1}/${maxRetries + 1} - Loading alerts...`, { limit });
        setLoading(true);
        setError(null);

        // Test basic connection first
        logger.info('[useSimpleAlerts] Testing database connection...');
        const { error: pingError } = await supabase
          .from('alerts')
          .select('count')
          .limit(0);

        if (pingError) {
          throw new Error(`Database connection failed: ${pingError.message}`);
        }

        logger.info('[useSimpleAlerts] Database connection successful, loading alerts...');

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
          logger.error('[useSimpleAlerts] Query failed:', fetchError);
          throw new Error(`Query failed: ${fetchError.message} (Code: ${fetchError.code})`);
        }

        if (!data) {
          throw new Error('No data returned from query');
        }

        logger.info('[useSimpleAlerts] Successfully loaded alerts:', { 
          count: data.length, 
          totalCount: count,
          limit,
          sampleTitles: data.slice(0, 3).map(a => a.title) 
        });
        
        setAlerts(data);
        setTotalCount(count || 0);
        setHasMore(limit ? data.length >= limit : false);
        setRetryCount(0);
        setLoading(false);
        return;

      } catch (err: any) {
        logger.error(`[useSimpleAlerts] Attempt ${attempt + 1} failed:`, err);
        
        if (attempt === maxRetries) {
          // All retries failed, use fallback
          logger.warn('[useSimpleAlerts] All retries failed, using fallback data');
          setError(err.message || 'Failed to load alerts');
          setAlerts(fallbackAlerts);
          setTotalCount(fallbackAlerts.length);
          setHasMore(false);
          setRetryCount(attempt + 1);
          setLoading(false);
          
          toast({
            title: 'Connection Issue',
            description: 'Using cached data. Click refresh to try again.',
            variant: 'destructive'
          });
        } else {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          logger.info(`[useSimpleAlerts] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  };

  useEffect(() => {
    loadAlertsWithRetry();
  }, [limit, toast]);

  // Load more for pagination
  const loadMore = async () => {
    if (!hasMore || loading) return;

    try {
      const lastAlert = alerts[alerts.length - 1];
      if (!lastAlert) return;

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
        `)
        .order('published_date', { ascending: false })
        .lt('published_date', lastAlert.published_date);

      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setAlerts(prev => [...prev, ...data]);
        setHasMore(limit ? data.length >= limit : false);
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      logger.error('[useSimpleAlerts] Load more failed:', err);
      toast({
        title: 'Error',
        description: 'Failed to load more alerts',
        variant: 'destructive'
      });
    }
  };

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
    retryLoad,
    hasMore,
    loadMore
  };
};