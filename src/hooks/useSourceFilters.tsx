import { useState, useCallback } from 'react';
import { FilterQuery, SourceResult } from '@/types/filter-engine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseSourceFiltersResult {
  executeQuery: (query: FilterQuery) => Promise<void>;
  results: SourceResult[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  executionTime: number;
  cacheStats: { hits: number; misses: number };
}

export const useSourceFilters = (): UseSourceFiltersResult => {
  const [results, setResults] = useState<SourceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });

  const executeQuery = useCallback(async (query: FilterQuery) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: functionError } = await supabase.functions.invoke('source-filter-engine', {
        body: { query }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.results || []);
      setTotalResults(data.total_results || 0);
      setExecutionTime(data.execution_time_ms || 0);
      setCacheStats(data.cache_stats || { hits: 0, misses: 0 });

      // Show success toast with stats
      toast.success(`Found ${data.total_results} results in ${data.execution_time_ms}ms`, {
        description: `Cache: ${data.cache_stats.hits} hits, ${data.cache_stats.misses} misses`
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setResults([]);
      setTotalResults(0);
      toast.error('Filter query failed', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    executeQuery,
    results,
    loading,
    error,
    totalResults,
    executionTime,
    cacheStats
  };
};