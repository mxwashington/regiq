import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SimpleAlert {
  id: string;
  title: string;
  summary: string;
  urgency: string;
  source: string;
  published_date: string;
  external_url?: string;
}

export const useSimpleAlerts = (limit?: number) => {
  const [alerts, setAlerts] = useState<SimpleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        console.log('Fetching simple alerts...', { limit });
        setLoading(true);
        setError(null);

        // Build query without artificial limit
        let query = supabase
          .from('alerts')
          .select(`
            id,
            title,
            summary,
            urgency,
            source,
            published_date,
            external_url
          `, { count: 'exact' })
          .order('published_date', { ascending: false });

        // Only apply limit if specified
        if (limit && limit > 0) {
          query = query.limit(limit);
        }

        const { data, error: fetchError, count } = await query;

        if (fetchError) {
          console.error('Error fetching simple alerts:', fetchError);
          throw fetchError;
        }

        console.log('Simple alert data fetched:', { 
          count: data?.length, 
          totalCount: count,
          limit,
          firstAlert: data?.[0] 
        });
        
        setAlerts(data || []);
        setTotalCount(count || 0);
      } catch (err: any) {
        console.error('Error in useSimpleAlerts:', err);
        setError(err.message || 'Failed to load alerts');
        toast({
          title: 'Error',
          description: 'Failed to load alerts',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [limit, toast]);

  return { alerts, loading, error, totalCount };
};