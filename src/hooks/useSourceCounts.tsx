import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgencySource, getFilterCategory } from '@/lib/source-mapping';
import { logger } from '@/lib/logger';

interface SourceCount {
  source: AgencySource;
  count: number;
}

export const useSourceCounts = (sinceDays: number = 30, selectedSources?: AgencySource[]) => {
  const [sourceCounts, setSourceCounts] = useState<Record<AgencySource, number>>({} as Record<AgencySource, number>);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSourceCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch source counts based on sinceDays parameter
      const sinceDate = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
      
      let query = supabase
        .from('alerts')
        .select('source, agency, title')
        .gte('published_date', sinceDate.toISOString());
      
      // Apply source filter if provided (matching dashboard logic)
      if (selectedSources && selectedSources.length > 0) {
        const sourceConditions = selectedSources.map(s => `source.eq.${s},agency.eq.${s}`).join(',');
        query = query.or(sourceConditions);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Source counts fetch error:', error);
        throw error;
      }

      // If no data, that's not an error - just no alerts yet
      if (!data || data.length === 0) {
        logger.info('[useSourceCounts] No alerts found in database');
        setSourceCounts({
          FDA: 0,
          EPA: 0,
          USDA: 0,
          'USDA-ARMS': 0,
          'USDA-FDC': 0,
          FSIS: 0,
          Federal_Register: 0,
          CDC: 0,
          REGULATIONS_GOV: 0,
          TTB: 0,
          NOAA: 0,
          OSHA: 0,
          USDA_APHIS: 0,
          CBP: 0,
          FDA_IMPORT: 0
        });
        setError(null);
        return;
      }

      // Group by filter category and count
      const counts: Record<AgencySource, number> = {
        FDA: 0,
        EPA: 0,
        USDA: 0,
        'USDA-ARMS': 0,
        'USDA-FDC': 0,
        FSIS: 0,
        Federal_Register: 0,
        CDC: 0,
        REGULATIONS_GOV: 0,
        TTB: 0,
        NOAA: 0,
        OSHA: 0,
        USDA_APHIS: 0,
        CBP: 0,
        FDA_IMPORT: 0
      };
      
      data?.forEach(alert => {
        if (alert.source) {
          const filterCategory = getFilterCategory(alert.source, alert.agency);
          
          // Debug key source mappings
          if (alert.source === 'Federal Register' || alert.source === 'Enhanced Federal Register Rules') {
            console.log('[SourceCounts] Federal Register classification:', {
              source: alert.source,
              agency: alert.agency,
              filterCategory: filterCategory,
              title: alert.title?.substring(0, 50) + '...'
            });
          }
          
          if (filterCategory) {
            counts[filterCategory] = (counts[filterCategory] || 0) + 1;
          } else {
            // Track unmapped sources
            console.warn('[SourceCounts] Unmapped source:', {
              source: alert.source,
              agency: alert.agency,
              count: 1
            });
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
        'USDA-ARMS': 0,
        'USDA-FDC': 0,
        FSIS: 0,
        Federal_Register: 0,
        CDC: 0,
        REGULATIONS_GOV: 0,
        TTB: 0,
        NOAA: 0,
        OSHA: 0,
        USDA_APHIS: 0,
        CBP: 0,
        FDA_IMPORT: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if database has data or this is the first load
    fetchSourceCounts();
    
    // Set up periodic refresh every 5 minutes
    const interval = setInterval(() => {
      fetchSourceCounts();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [sinceDays, selectedSources]);

  const refetch = () => {
    fetchSourceCounts();
  };

  return {
    sourceCounts,
    loading,
    error,
    refetch
  };
};