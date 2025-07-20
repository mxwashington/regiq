import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardMetrics {
  myRecentSearches: number;
  newUpdatesThisWeek: number;
  activeMonitoring: number;
  myAccountStatus: string;
  loading: boolean;
  error: string | null;
}

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    myRecentSearches: 0,
    newUpdatesThisWeek: 0,
    activeMonitoring: 7, // Static for now - represents agencies being monitored
    myAccountStatus: 'Free',
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetrics(prev => ({ ...prev, loading: true, error: null }));

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // If no user, show general metrics
          setMetrics({
            myRecentSearches: 0,
            newUpdatesThisWeek: 47, // Static placeholder for regulatory updates
            activeMonitoring: 7, // FDA, USDA, EPA, FSIS, CDC, EMA, FTC
            myAccountStatus: 'Sign in to view your data',
            loading: false,
            error: null
          });
          return;
        }

        // Get user's search count (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: mySearchCount, error: searchError } = await supabase
          .from('perplexity_searches')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (searchError) throw searchError;

        // Get user's subscription status
        const { data: subscriber } = await supabase
          .from('subscribers')
          .select('subscribed, subscription_tier')
          .eq('user_id', user.id)
          .single();

        const accountStatus = subscriber?.subscribed 
          ? (subscriber.subscription_tier?.charAt(0).toUpperCase() + subscriber.subscription_tier?.slice(1) || 'Pro')
          : 'Free';

        setMetrics({
          myRecentSearches: mySearchCount || 0,
          newUpdatesThisWeek: 47, // Placeholder - would be actual regulatory updates
          activeMonitoring: 7, // Number of agencies monitored
          myAccountStatus: accountStatus,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        setMetrics(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load metrics'
        }));
      }
    };

    fetchMetrics();
  }, []);

  return metrics;
};