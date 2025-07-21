import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AlertTag {
  id: string;
  tag: {
    id: string;
    name: string;
    slug: string;
    color: string;
    category: {
      name: string;
    };
  };
  confidence_score: number;
  is_primary: boolean;
}

interface TaggedAlert {
  id: string;
  title: string;
  summary: string;
  urgency: string;
  source: string;
  published_date: string;
  external_url?: string;
  alert_tags?: AlertTag[];
}

interface ActiveFilter {
  categoryId: string;
  categoryName: string;
  tagId: string;
  tagName: string;
  color: string;
}

interface UseTaggedAlertsProps {
  filters?: ActiveFilter[];
  limit?: number;
}

export const useTaggedAlerts = ({ filters = [], limit = 50 }: UseTaggedAlertsProps = {}) => {
  const [alerts, setAlerts] = useState<TaggedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        console.log('Fetching tagged alerts...', { filters, limit });
        setLoading(true);
        setError(null);

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
            alert_tags (
              id,
              confidence_score,
              is_primary,
              taxonomy_tags!inner (
                id,
                name,
                slug,
                color,
                taxonomy_categories!inner (
                  name
                )
              )
            )
          `)
          .order('published_date', { ascending: false })
          .limit(limit);

        // Apply filters if any
        if (filters.length > 0) {
          // Filter by tag IDs through the alert_tags relationship
          const tagIds = filters.map(f => f.tagId);
          query = query.in('alert_tags.taxonomy_tags.id', tagIds);
          console.log('Applied filters:', { tagIds });
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Error fetching alerts:', fetchError);
          throw fetchError;
        }

        console.log('Raw alert data:', { count: data?.length, data });

        // Transform the data to match our interface
        const transformedAlerts = data?.map(alert => ({
          ...alert,
          alert_tags: alert.alert_tags?.map(alertTag => ({
            id: alertTag.id,
            confidence_score: alertTag.confidence_score,
            is_primary: alertTag.is_primary,
            tag: {
              id: alertTag.taxonomy_tags.id,
              name: alertTag.taxonomy_tags.name,
              slug: alertTag.taxonomy_tags.slug,
              color: alertTag.taxonomy_tags.color,
              category: {
                name: alertTag.taxonomy_tags.taxonomy_categories.name
              }
            }
          }))
        })) || [];
        
        console.log('Transformed alerts:', { count: transformedAlerts?.length });
        let filteredAlerts = transformedAlerts;
        if (filters.length > 0) {
          const filtersByCategory = filters.reduce((acc, filter) => {
            if (!acc[filter.categoryId]) {
              acc[filter.categoryId] = [];
            }
            acc[filter.categoryId].push(filter.tagId);
            return acc;
          }, {} as Record<string, string[]>);

          filteredAlerts = transformedAlerts.filter(alert => {
            return Object.entries(filtersByCategory).every(([categoryId, tagIds]) => {
              return alert.alert_tags?.some(alertTag => 
                tagIds.includes(alertTag.tag.id)
              );
            });
          });
        }

        setAlerts(filteredAlerts);
      } catch (err: any) {
        console.error('Error fetching tagged alerts:', err);
        setError(err.message || 'Failed to load alerts');
        toast({
          title: 'Error',
          description: 'Failed to load alerts with tags',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [filters, limit, toast]);

  return { alerts, loading, error };
};