import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fallbackAlerts } from '@/lib/debug-utils';
import { AgencySource, sourceMatchesFilter } from '@/lib/source-mapping';
import { AlertFilters } from '@/hooks/useAlertFilters';
import { logger } from '@/lib/logger';
interface SimpleAlert {
  id: string;
  title: string;
  summary: string;
  urgency: string;
  source: string;
  agency?: string;
  published_date: string;
  external_url?: string;
  ai_summary?: string;
  urgency_score?: number;
  full_content?: string;
  dismissed_by?: string[];
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

export const useSimpleAlerts = (limit?: number, filters?: AlertFilters): UseSimpleAlertsReturn => {
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
        logger.info(`[useSimpleAlerts] Attempt ${attempt + 1}/${maxRetries + 1} - Loading alerts...`, { limit, filters });
        setLoading(true);
        setError(null);

        // Test basic connection first
        logger.info('[useSimpleAlerts] Testing database connection...');
        const { error: pingError } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true })
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
            agency,
            published_date,
            external_url,
            dismissed_by,
            ai_summary,
            urgency_score,
            full_content
          `, { count: 'exact' })
          .order('published_date', { ascending: false });

        // Apply filters if provided
        if (filters) {
          // Filter by sources - use proper agency-aware filtering
          if (filters.sources.length > 0 && filters.sources.length < 7) {
            // For client-side filtering, we'll fetch all alerts and filter them
            // This is necessary because we need both source and agency for proper categorization
          }

          // Filter by date range
          if (filters.sinceDays && filters.sinceDays > 0) {
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - filters.sinceDays);
            query = query.gte('published_date', sinceDate.toISOString());
          }

          // Filter by minimum severity (urgency_score)
          if (filters.minSeverity !== null && filters.minSeverity > 0) {
            query = query.gte('urgency_score', filters.minSeverity);
          }

          // Filter by search query (title and summary)
          if (filters.searchQuery && filters.searchQuery.trim()) {
            const searchTerm = filters.searchQuery.trim();
            query = query.or(`title.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`);
          }
        }

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
          filters,
          sampleTitles: data.slice(0, 3).map(a => a.title) 
        });
        
        // Apply client-side source filtering if needed
        let filteredData = data;
        if (filters && filters.sources.length > 0 && filters.sources.length < 7) {
          filteredData = data.filter(alert => 
            filters.sources.some(filterCategory => 
              sourceMatchesFilter(alert.source, filterCategory, alert.agency)
            )
          );
        }
        
        setAlerts(filteredData);
        setTotalCount(filteredData.length);
        setHasMore(limit ? filteredData.length >= limit : false);
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
  }, [limit, filters, toast]);

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
          agency,
          published_date,
          external_url,
          dismissed_by,
          ai_summary,
          urgency_score,
          full_content
        `)
        .order('published_date', { ascending: false })
        .lt('published_date', lastAlert.published_date);

        // Apply filters to pagination too  
        if (filters) {
          // We'll apply client-side filtering for source matching
          
          // Filter by date range
          if (filters.sinceDays && filters.sinceDays > 0) {
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - filters.sinceDays);
            query = query.gte('published_date', sinceDate.toISOString());
          }

          // Filter by minimum severity
          if (filters.minSeverity !== null && filters.minSeverity > 0) {
            query = query.gte('urgency_score', filters.minSeverity);
          }

          // Filter by search query
          if (filters.searchQuery && filters.searchQuery.trim()) {
            const searchTerm = filters.searchQuery.trim();
            query = query.or(`title.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`);
          }
        }

        if (limit && limit > 0) {
          query = query.limit(limit);
        }

        const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        // Apply client-side source filtering to pagination results too
        let filteredData = data;
        if (filters && filters.sources.length > 0 && filters.sources.length < 7) {
          filteredData = data.filter(alert => 
            filters.sources.some(filterCategory => 
              sourceMatchesFilter(alert.source, filterCategory, alert.agency)
            )
          );
        }
        
        if (filteredData.length > 0) {
          setAlerts(prev => [...prev, ...filteredData]);
          setHasMore(limit ? data.length >= limit : false);
        } else {
          setHasMore(false);
        }
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