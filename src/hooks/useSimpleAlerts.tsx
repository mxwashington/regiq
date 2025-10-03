import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fallbackAlerts } from '@/lib/debug-utils';
import { AgencySource, getDatabaseSources, getFilterCategory } from '@/lib/source-mapping';
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
  newUpdatesCount: number;
  highPriorityCount: number;
  uniqueAgenciesCount: number;
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
  const [newUpdatesCount, setNewUpdatesCount] = useState<number>(0);
  const [highPriorityCount, setHighPriorityCount] = useState<number>(0);
  const [uniqueAgenciesCount, setUniqueAgenciesCount] = useState<number>(0);
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
          // Filter by sources - add server-side filtering when specific sources selected
          if (filters.sources.length > 0) {
            // Build array of all possible database source names and agencies
            const allSourceNames: string[] = [];
            const allAgencyNames: string[] = [];
            
            filters.sources.forEach(filterCategory => {
              const sources = getDatabaseSources(filterCategory);
              allSourceNames.push(...sources);
              allAgencyNames.push(filterCategory);
            });
            
            // Apply OR condition: match either source OR agency field
            query = query.or(`source.in.(${allSourceNames.join(',')}),agency.in.(${allAgencyNames.join(',')})`);
          }

          // Filter by date range (0 means all time)
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
        
        console.log('[useSimpleAlerts] Query completed:', { 
          dataLength: data?.length, 
          count, 
          hasError: !!fetchError,
          errorCode: fetchError?.code,
          errorMessage: fetchError?.message
        });

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

        // Run parallel count queries for accurate metrics
        logger.info('[useSimpleAlerts] Running metric count queries...');
        
        // Build base query with same filters for counts
        const buildCountQuery = () => {
          let countQuery = supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true });

          if (filters) {
            if (filters.sources.length > 0) {
              const allSourceNames: string[] = [];
              const allAgencyNames: string[] = [];
              
              filters.sources.forEach(filterCategory => {
                const sources = getDatabaseSources(filterCategory);
                allSourceNames.push(...sources);
                allAgencyNames.push(filterCategory);
              });
              
              countQuery = countQuery.or(`source.in.(${allSourceNames.join(',')}),agency.in.(${allAgencyNames.join(',')})`);
            }

            if (filters.sinceDays && filters.sinceDays > 0) {
              const sinceDate = new Date();
              sinceDate.setDate(sinceDate.getDate() - filters.sinceDays);
              countQuery = countQuery.gte('published_date', sinceDate.toISOString());
            }

            if (filters.minSeverity !== null && filters.minSeverity > 0) {
              countQuery = countQuery.gte('urgency_score', filters.minSeverity);
            }

            if (filters.searchQuery && filters.searchQuery.trim()) {
              const searchTerm = filters.searchQuery.trim();
              countQuery = countQuery.or(`title.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`);
            }
          }

          return countQuery;
        };

        // Query 1: New updates (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newUpdatesQuery = buildCountQuery()
          .gte('published_date', sevenDaysAgo.toISOString());

        // Query 2: High priority (urgency_score >= 7 or urgency High/Critical)
        const highPriorityQuery = buildCountQuery()
          .or('urgency_score.gte.7,urgency.in.(High,Critical)');

        // Query 3: Unique agencies count
        const uniqueAgenciesQuery = supabase
          .from('alerts')
          .select('source, agency');

        // Apply same filters to agencies query
        let agenciesQuery = uniqueAgenciesQuery;
        if (filters) {
          if (filters.sources.length > 0) {
            const allSourceNames: string[] = [];
            const allAgencyNames: string[] = [];
            
            filters.sources.forEach(filterCategory => {
              const sources = getDatabaseSources(filterCategory);
              allSourceNames.push(...sources);
              allAgencyNames.push(filterCategory);
            });
            
            agenciesQuery = agenciesQuery.or(`source.in.(${allSourceNames.join(',')}),agency.in.(${allAgencyNames.join(',')})`);
          }

          if (filters.sinceDays && filters.sinceDays > 0) {
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - filters.sinceDays);
            agenciesQuery = agenciesQuery.gte('published_date', sinceDate.toISOString());
          }

          if (filters.minSeverity !== null && filters.minSeverity > 0) {
            agenciesQuery = agenciesQuery.gte('urgency_score', filters.minSeverity);
          }

          if (filters.searchQuery && filters.searchQuery.trim()) {
            const searchTerm = filters.searchQuery.trim();
            agenciesQuery = agenciesQuery.or(`title.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`);
          }
        }

        // Execute all count queries in parallel
        const [newUpdatesResult, highPriorityResult, agenciesResult] = await Promise.all([
          newUpdatesQuery,
          highPriorityQuery,
          agenciesQuery
        ]);

        // Process results
        const newUpdates = newUpdatesResult.count ?? 0;
        const highPriority = highPriorityResult.count ?? 0;
        
        // Calculate unique filter categories from returned data
        const uniqueAgencies = new Set<string>();
        if (agenciesResult.data) {
          agenciesResult.data.forEach((alert: any) => {
            const filterCategory = getFilterCategory(alert.source, alert.agency);
            if (filterCategory) {
              uniqueAgencies.add(filterCategory);
            }
          });
        }

        logger.info('[useSimpleAlerts] Metric counts:', {
          totalCount: count,
          newUpdates,
          highPriority,
          uniqueAgencies: uniqueAgencies.size
        });
        
        // Server-side filtering already applied, just log results
        console.log('[useSimpleAlerts] Loaded filtered data:', { 
          totalFetched: data.length,
          hasFilters: !!filters,
          sourceFiltersLength: filters?.sources?.length,
          sampleSources: data.slice(0, 5).map(a => ({ source: a.source, agency: a.agency }))
        });
        
        setAlerts(data);
        setTotalCount(count ?? data.length);
        setNewUpdatesCount(newUpdates);
        setHighPriorityCount(highPriority);
        setUniqueAgenciesCount(uniqueAgencies.size);
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
    console.log('[useSimpleAlerts] useEffect triggered with:', { 
      limit, 
      filtersPresent: !!filters,
      filterSources: filters?.sources,
      filterDays: filters?.sinceDays 
    });
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
          // Filter by sources - same server-side filtering as main query
          if (filters.sources.length > 0) {
            const allSourceNames: string[] = [];
            const allAgencyNames: string[] = [];
            
            filters.sources.forEach(filterCategory => {
              const sources = getDatabaseSources(filterCategory);
              allSourceNames.push(...sources);
              allAgencyNames.push(filterCategory);
            });
            
            query = query.or(`source.in.(${allSourceNames.join(',')}),agency.in.(${allAgencyNames.join(',')})`);
          }
          
          // Filter by date range (0 means all time)
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
        // Server-side filtering already applied to pagination
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
    newUpdatesCount,
    highPriorityCount,
    uniqueAgenciesCount,
    retryCount,
    retryLoad,
    hasMore,
    loadMore
  };
};