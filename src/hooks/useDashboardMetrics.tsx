import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardMetrics {
  totalUsers: number;
  recentAdminActivities: number;
  recentSearches: number;
  activeSubscribers: number;
  loading: boolean;
  error: string | null;
}

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    recentAdminActivities: 0,
    recentSearches: 0,
    activeSubscribers: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetrics(prev => ({ ...prev, loading: true, error: null }));

        // Get total users count
        const { count: totalUsers, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // Get recent admin activities (last 24 hours)
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { count: recentAdminActivities, error: adminError } = await supabase
          .from('admin_activities')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', twentyFourHoursAgo.toISOString());

        if (adminError) throw adminError;

        // Get recent searches (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: recentSearches, error: searchError } = await supabase
          .from('perplexity_searches')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (searchError) throw searchError;

        // Get active subscribers
        const { count: activeSubscribers, error: subscribersError } = await supabase
          .from('subscribers')
          .select('*', { count: 'exact', head: true })
          .eq('subscribed', true);

        if (subscribersError) throw subscribersError;

        setMetrics({
          totalUsers: totalUsers || 0,
          recentAdminActivities: recentAdminActivities || 0,
          recentSearches: recentSearches || 0,
          activeSubscribers: activeSubscribers || 0,
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