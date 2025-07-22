import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsOverview {
  total_page_views: number;
  unique_visitors: number;
  avg_session_duration: number;
  bounce_rate: number;
  top_pages: Array<{ page: string; views: number }>;
  user_growth: Array<{ date: string; new_users: number }>;
  device_breakdown: Array<{ device: string; count: number }>;
}

interface AlertAnalytics {
  total_alert_views: number;
  most_viewed_alerts: Array<{ title: string; views: number; alert_id: string }>;
  interaction_breakdown: Record<string, number>;
  top_sources: Array<{ source: string; interactions: number }>;
}

interface SearchAnalytics {
  total_searches: number;
  avg_results_count: number;
  top_queries: Array<{ query: string; count: number }>;
  search_types: Record<string, number>;
}

export const useEnhancedAnalytics = (daysBack: number = 30) => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [alertAnalytics, setAlertAnalytics] = useState<AlertAnalytics | null>(null);
  const [searchAnalytics, setSearchAnalytics] = useState<SearchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsOverview = async () => {
    try {
      const { data, error } = await supabase.rpc('get_analytics_overview', { days_back: daysBack });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const result = data[0];
        setOverview({
          total_page_views: Number(result.total_page_views) || 0,
          unique_visitors: Number(result.unique_visitors) || 0,
          avg_session_duration: Number(result.avg_session_duration) || 0,
          bounce_rate: Number(result.bounce_rate) || 0,
          top_pages: Array.isArray(result.top_pages) ? result.top_pages as Array<{ page: string; views: number }> : [],
          user_growth: Array.isArray(result.user_growth) ? result.user_growth as Array<{ date: string; new_users: number }> : [],
          device_breakdown: Array.isArray(result.device_breakdown) ? result.device_breakdown as Array<{ device: string; count: number }> : []
        });
      }
    } catch (err) {
      console.error('Error fetching analytics overview:', err);
      setError('Failed to fetch analytics overview');
    }
  };

  const fetchAlertAnalytics = async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Get alert interaction stats
      const { data: interactionData, error: interactionError } = await supabase
        .from('alert_interactions')
        .select(`
          interaction_type,
          alert_id,
          alerts!inner(title, source)
        `)
        .gte('created_at', cutoffDate.toISOString());

      if (interactionError) throw interactionError;

      // Process the data
      const interactionBreakdown: Record<string, number> = {};
      const alertViewCounts: Record<string, { title: string; views: number; alert_id: string }> = {};
      const sourceCounts: Record<string, number> = {};

      interactionData?.forEach(interaction => {
        // Count interaction types
        interactionBreakdown[interaction.interaction_type] = 
          (interactionBreakdown[interaction.interaction_type] || 0) + 1;

        // Count alert views
        if (interaction.interaction_type === 'view' && interaction.alerts) {
          const alertId = interaction.alert_id;
          if (!alertViewCounts[alertId]) {
            alertViewCounts[alertId] = {
              title: interaction.alerts.title,
              views: 0,
              alert_id: alertId
            };
          }
          alertViewCounts[alertId].views++;

          // Count source interactions
          const source = interaction.alerts.source;
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        }
      });

      const mostViewedAlerts = Object.values(alertViewCounts)
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      const topSources = Object.entries(sourceCounts)
        .map(([source, interactions]) => ({ source, interactions }))
        .sort((a, b) => b.interactions - a.interactions);

      setAlertAnalytics({
        total_alert_views: interactionBreakdown.view || 0,
        most_viewed_alerts: mostViewedAlerts,
        interaction_breakdown: interactionBreakdown,
        top_sources: topSources
      });
    } catch (err) {
      console.error('Error fetching alert analytics:', err);
      setError('Failed to fetch alert analytics');
    }
  };

  const fetchSearchAnalytics = async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data: searchData, error: searchError } = await supabase
        .from('search_analytics')
        .select('*')
        .gte('created_at', cutoffDate.toISOString());

      if (searchError) throw searchError;

      const queryCount: Record<string, number> = {};
      const typeCount: Record<string, number> = {};
      let totalResults = 0;

      searchData?.forEach(search => {
        queryCount[search.search_query] = (queryCount[search.search_query] || 0) + 1;
        typeCount[search.search_type || 'general'] = (typeCount[search.search_type || 'general'] || 0) + 1;
        totalResults += search.results_count || 0;
      });

      const topQueries = Object.entries(queryCount)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setSearchAnalytics({
        total_searches: searchData?.length || 0,
        avg_results_count: searchData?.length ? totalResults / searchData.length : 0,
        top_queries: topQueries,
        search_types: typeCount
      });
    } catch (err) {
      console.error('Error fetching search analytics:', err);
      setError('Failed to fetch search analytics');
    }
  };

  useEffect(() => {
    const fetchAllAnalytics = async () => {
      setLoading(true);
      setError(null);

      await Promise.all([
        fetchAnalyticsOverview(),
        fetchAlertAnalytics(),
        fetchSearchAnalytics()
      ]);

      setLoading(false);
    };

    fetchAllAnalytics();
  }, [daysBack]);

  const refetch = () => {
    const fetchAllAnalytics = async () => {
      setLoading(true);
      setError(null);

      await Promise.all([
        fetchAnalyticsOverview(),
        fetchAlertAnalytics(),
        fetchSearchAnalytics()
      ]);

      setLoading(false);
    };

    fetchAllAnalytics();
  };

  return {
    overview,
    alertAnalytics,
    searchAnalytics,
    loading,
    error,
    refetch
  };
};