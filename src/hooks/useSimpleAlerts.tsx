import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertFilters } from '@/hooks/useAlertFilters';
import { sourceMatchesFilter } from '@/lib/source-mapping';
import { logger } from '@/lib/logger';

const SOURCE_MAP: Record<string, string[]> = {
  'FDA': ['FDA', 'fda', 'Food and Drug Administration'],
  'CDC': ['CDC', 'cdc', 'Centers for Disease Control'],
  'USDA': ['USDA', 'usda', 'Agriculture'],
  'EPA': ['EPA', 'epa', 'Environmental Protection'],
  'FSIS': ['FSIS', 'fsis', 'Food Safety'],
  'Federal_Register': ['Federal Register', 'Federal_Register'],
  'REGULATIONS_GOV': ['Regulations.gov', 'REGULATIONS_GOV'],
  'USDA-ARMS': ['USDA-ARMS', 'ARMS'],
  'USDA-FDC': ['USDA-FDC', 'FoodData'],
  'TTB': ['TTB', 'ttb', 'Alcohol and Tobacco Tax'],
  'NOAA': ['NOAA', 'noaa', 'Fisheries'],
  'OSHA': ['OSHA', 'osha', 'Occupational Safety'],
  'USDA_APHIS': ['APHIS', 'USDA_APHIS', 'Animal Health'],
  'CBP': ['CBP', 'cbp', 'Customs'],
  'FDA_IMPORT': ['FDA Import', 'FDA_IMPORT', 'Import Alert']
};

const ALL_SOURCES = Object.keys(SOURCE_MAP);
const TOTAL_SOURCE_COUNT = ALL_SOURCES.length; // 15 sources
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

  const fetchAlerts = useCallback(async () => {

    try {
      setLoading(true);
      setError(null);

      // Build the base query
      let query = supabase
        .from('alerts')
        .select('*', { count: 'exact' })
        .order('published_date', { ascending: false })
        .limit(limit || 100);

      // Apply date filter if specified
      if (filters && filters.sinceDays && filters.sinceDays > 0) {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - filters.sinceDays);
        query = query.gte('published_date', sinceDate.toISOString());
      }

      // Apply severity filter if specified
      if (filters && filters.minSeverity !== null && filters.minSeverity > 0) {
        query = query.gte('urgency_score', filters.minSeverity);
      }

      // CRITICAL FIX: Apply source filter at database level when fewer than all sources selected
      if (filters && filters.sources.length > 0 && filters.sources.length < TOTAL_SOURCE_COUNT) {
        const sourceVariations: string[] = [];
        filters.sources.forEach(source => {
          const variations = SOURCE_MAP[source] || [];
          sourceVariations.push(...variations);
        });
        
        if (sourceVariations.length > 0) {
          query = query.in('source', sourceVariations);
        }
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        throw new Error('No data returned from query');
      }

      // Additional client-side filtering for edge cases
      let filteredData = data;

      // Apply source filter client-side if needed (backup filtering)
      if (filters && filters.sources.length > 0 && filters.sources.length < TOTAL_SOURCE_COUNT) {
        filteredData = filteredData.filter(alert => {
          if (!alert.source) return false;
          
          const normalizedSource = alert.source.toLowerCase().trim();
          
          return filters.sources.some(filterSource => {
            const variations = SOURCE_MAP[filterSource] || [];
            return variations.some(v => 
              normalizedSource.includes(v.toLowerCase())
            );
          });
        });
      }

      // Apply search filter if specified
      if (filters && filters.searchQuery && filters.searchQuery.trim() !== '') {
        const searchLower = filters.searchQuery.toLowerCase().trim();
        filteredData = filteredData.filter(alert => 
          alert.title?.toLowerCase().includes(searchLower) ||
          alert.summary?.toLowerCase().includes(searchLower) ||
          alert.source?.toLowerCase().includes(searchLower)
        );
      }

      setAlerts(filteredData);
      setTotalCount(filteredData.length);
      setHasMore(limit ? filteredData.length >= limit : false);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
      setError(err.message || 'Failed to load alerts');
      setLoading(false);
      
      toast({
        title: 'Error Loading Alerts',
        description: err.message || 'Failed to fetch alerts. Please try again.',
        variant: 'destructive'
      });
    }
  }, [filters, limit, toast]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Load more for pagination
  const loadMore = async () => {
    if (!hasMore || loading) return;

    try {
      const lastAlert = alerts[alerts.length - 1];
      if (!lastAlert) return;

      let query = supabase
        .from('alerts')
        .select('*')
        .order('published_date', { ascending: false })
        .lt('published_date', lastAlert.published_date)
        .limit(limit || 50);

      // Apply same filters as initial fetch
      if (filters && filters.sinceDays && filters.sinceDays > 0) {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - filters.sinceDays);
        query = query.gte('published_date', sinceDate.toISOString());
      }

      if (filters && filters.minSeverity !== null && filters.minSeverity > 0) {
        query = query.gte('urgency_score', filters.minSeverity);
      }

      if (filters && filters.sources.length > 0 && filters.sources.length < TOTAL_SOURCE_COUNT) {
        const sourceVariations: string[] = [];
        filters.sources.forEach(source => {
          const variations = SOURCE_MAP[source] || [];
          sourceVariations.push(...variations);
        });
        if (sourceVariations.length > 0) {
          query = query.in('source', sourceVariations);
        }
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
    fetchAlerts();
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