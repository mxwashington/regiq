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

export const useSimpleAlerts = (limit = 50) => {
  const [alerts, setAlerts] = useState<SimpleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        console.log('Fetching simple alerts...', { limit });
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('alerts')
          .select(`
            id,
            title,
            summary,
            urgency,
            source,
            published_date,
            external_url
          `)
          .order('published_date', { ascending: false })
          .limit(limit);

        if (fetchError) {
          console.error('Error fetching simple alerts:', fetchError);
          throw fetchError;
        }

        console.log('Simple alert data fetched:', { count: data?.length, firstAlert: data?.[0] });
        setAlerts(data || []);
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

  return { alerts, loading, error };
};