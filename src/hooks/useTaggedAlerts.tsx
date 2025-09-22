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

interface UseTaggedAlertsReturn {
  alerts: TaggedAlert[];
  loading: boolean;
  error: string | null;
  retryCount: number;
  retryLoad: () => void;
  hasMore: boolean;
  loadMore: () => void;
}

export const useTaggedAlerts = ({ filters = [], limit = 50 }: UseTaggedAlertsProps = {}): UseTaggedAlertsReturn => {
  const [alerts, setAlerts] = useState<TaggedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const { toast } = useToast();

  const loadTaggedAlertsWithRetry = async (maxRetries = 2) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[useTaggedAlerts] Attempt ${attempt + 1}/${maxRetries + 1} - Loading tagged alerts...`, { filters, limit });
        setLoading(true);
        setError(null);

        // Test if the tables exist first with a simple query
        console.log('[useTaggedAlerts] Testing table access...');
        const { error: testError } = await supabase
          .from('alerts')
          .select('id')
          .limit(1);

        if (testError) {
          throw new Error(`Table access failed: ${testError.message}`);
        }

        // Try the complex query with proper error handling
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
            dismissed_by,
            alert_tags!left (
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

        // Apply filters if any - but do it more safely
        if (filters.length > 0) {
          const tagIds = filters.map(f => f.tagId);
          console.log('[useTaggedAlerts] Applying filters:', { tagIds });
          
          // Use a more specific filter that's less likely to fail
          query = query.not('alert_tags', 'is', null);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('[useTaggedAlerts] Complex query failed:', fetchError);
          
          // If it's a relationship error, this might be expected
          if (fetchError.message.includes('foreign key') || 
              fetchError.message.includes('relation') ||
              fetchError.message.includes('does not exist')) {
            throw new Error('Tagged alerts feature not available - missing database relationships');
          }
          
          throw new Error(`Query failed: ${fetchError.message}`);
        }

        console.log('[useTaggedAlerts] Raw data loaded:', { count: data?.length });

        // Transform the data more safely
        const transformedAlerts = data?.map(alert => {
          try {
            return {
              ...alert,
              alert_tags: alert.alert_tags?.map(alertTag => ({
                id: alertTag.id,
                confidence_score: alertTag.confidence_score,
                is_primary: alertTag.is_primary,
                tag: {
                  id: alertTag.taxonomy_tags?.id || '',
                  name: alertTag.taxonomy_tags?.name || '',
                  slug: alertTag.taxonomy_tags?.slug || '',
                  color: alertTag.taxonomy_tags?.color || '#gray',
                  category: {
                    name: alertTag.taxonomy_tags?.taxonomy_categories?.name || ''
                  }
                }
              })) || []
            };
          } catch (transformError) {
            console.warn('[useTaggedAlerts] Transform error for alert:', alert.id, transformError);
            return {
              ...alert,
              alert_tags: []
            };
          }
        }) || [];
        
        console.log('[useTaggedAlerts] Transformed alerts:', { count: transformedAlerts?.length });
        
        // Apply client-side filtering more safely
        let filteredAlerts = transformedAlerts;
        if (filters.length > 0) {
          try {
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
                  tagIds.includes(alertTag.tag?.id)
                );
              });
            });
            
            console.log('[useTaggedAlerts] Applied client-side filters:', { 
              originalCount: transformedAlerts.length,
              filteredCount: filteredAlerts.length 
            });
          } catch (filterError) {
            console.warn('[useTaggedAlerts] Filter error, using unfiltered data:', filterError);
            filteredAlerts = transformedAlerts;
          }
        }

        setAlerts(filteredAlerts);
        setHasMore(filteredAlerts.length >= limit);
        setRetryCount(0);
        return;

      } catch (err: any) {
        console.error(`[useTaggedAlerts] Attempt ${attempt + 1} failed:`, err);
        
        if (attempt === maxRetries) {
          console.error('[useTaggedAlerts] All retries failed:', err);
          setError(err.message || 'Failed to load tagged alerts');
          setRetryCount(attempt + 1);
          
          // Don't show toast error here - let the parent component handle fallback
          return;
        } else {
          // Wait before retry
          const delay = 1000 * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  };

  useEffect(() => {
    loadTaggedAlertsWithRetry();
  }, [filters, limit]);

  const loadMore = () => {
    if (hasMore && !loading) {
      const currentLimit = alerts.length + limit;
      loadTaggedAlertsWithRetry();
    }
  };

  const retryLoad = () => {
    loadTaggedAlertsWithRetry();
  };

  return { alerts, loading, error, retryCount, retryLoad, hasMore, loadMore };
};