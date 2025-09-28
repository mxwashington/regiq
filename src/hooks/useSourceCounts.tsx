import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgencySource, getFilterCategory } from '@/lib/source-mapping';
import { logger } from '@/lib/logger';

interface SourceCount {
  source: AgencySource;
  count: number;
}

export const useSourceCounts = () => {
  const [sourceCounts, setSourceCounts] = useState<Record<AgencySource, number>>({} as Record<AgencySource, number>);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSourceCounts = async () => {
      try {
        setLoading(true);
        
        // Fetch source counts from recent alerts (last 90 days)
        const { data, error } = await supabase
          .from('alerts')
          .select('source')
          .gte('published_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        if (error) throw error;

        // Group by filter category and count
        const counts: Record<AgencySource, number> = {
          FDA: 0,
          EPA: 0, 
          USDA: 0,
          FSIS: 0,
          Federal_Register: 0,
        };
        
        data?.forEach(alert => {
          if (alert.source) {
            const filterCategory = getFilterCategory(alert.source);
            if (filterCategory) {
              counts[filterCategory] = (counts[filterCategory] || 0) + 1;
            }
          }
        });

        setSourceCounts(counts);
        setError(null);
      } catch (err) {
        logger.error('Error fetching source counts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch source counts');
        
        // Fallback to zero counts
        setSourceCounts({
          FDA: 0,
          EPA: 0,
          USDA: 0,
          FSIS: 0,
          Federal_Register: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSourceCounts();
  }, []);

  return {
    sourceCounts,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      setSourceCounts({} as Record<AgencySource, number>);
    }
  };
};