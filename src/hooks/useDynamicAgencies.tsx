import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AgencyData {
  name: string;
  count: number;
  displayName: string;
}

export const useDynamicAgencies = () => {
  const [agencies, setAgencies] = useState<AgencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAgencyDisplayName = (agency: string): string => {
    switch (agency) {
      case 'Federal_Register':
        return 'Fed Register';
      case 'Health_Canada':
        return 'Health Canada';
      case 'MHRA':
        return 'MHRA';
      case 'WHO':
        return 'WHO';
      default:
        return agency;
    }
  };

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        setLoading(true);
        
        // Fetch agencies from recent alerts (last 90 days)
        const { data, error } = await supabase
          .from('alerts')
          .select('source, agency')
          .gte('published_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        if (error) throw error;

        // Process the data to get unique agencies with counts
        const agencyCounts: { [key: string]: number } = {};
        
        data?.forEach(alert => {
          // Use agency field if available, otherwise use source
          const agencyName = alert.agency || alert.source;
          if (agencyName) {
            agencyCounts[agencyName] = (agencyCounts[agencyName] || 0) + 1;
          }
        });

        // Convert to array and sort by count (descending)
        const agencyList: AgencyData[] = Object.entries(agencyCounts)
          .map(([name, count]) => ({
            name,
            count,
            displayName: getAgencyDisplayName(name)
          }))
          .sort((a, b) => b.count - a.count);

        setAgencies(agencyList);
        setError(null);
      } catch (err) {
        console.error('Error fetching agencies:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch agencies');
        
        // Fallback to static list if database fetch fails
        const fallbackAgencies = [
          'FDA', 'USDA', 'FSIS', 'EPA', 'CDC', 'MHRA', 'WHO', 'Federal_Register', 'Health_Canada'
        ].map(name => ({
          name,
          count: 0,
          displayName: getAgencyDisplayName(name)
        }));
        setAgencies(fallbackAgencies);
      } finally {
        setLoading(false);
      }
    };

    fetchAgencies();
  }, []);

  return {
    agencies,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      // Re-run the effect by forcing a state change
      setAgencies([]);
    }
  };
};