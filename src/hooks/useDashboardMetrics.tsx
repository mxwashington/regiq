import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalAlerts: number;
  alertEngagement: number;
  userGrowthPercent: number;
  alertsBySource: { source: string; count: number }[];
  userSignupsOverTime: { date: string; signups: number }[];
  dailyActiveUsers: { date: string; users: number }[];
}

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch total users
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch active users (users who logged in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: activeUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen_at', thirtyDaysAgo.toISOString());

        // Fetch total alerts
        const { count: totalAlerts } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true });

        // Fetch alert engagement (analytics data)
        const { data: analyticsData } = await supabase
          .from('user_analytics')
          .select('event_type, created_at')
          .eq('event_type', 'alert_view');

        // Fetch alerts by source
        const { data: alertsData } = await supabase
          .from('alerts')
          .select('source');

        const alertsBySource = alertsData?.reduce((acc: any[], alert) => {
          const existing = acc.find(item => item.source === alert.source);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ source: alert.source, count: 1 });
          }
          return acc;
        }, []) || [];

        // Calculate growth metrics
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count: recentUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString());

        const { count: previousUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .lt('created_at', sevenDaysAgo.toISOString());

        const userGrowthPercent = previousUsers > 0 
          ? ((recentUsers || 0) / previousUsers) * 100 
          : 0;

        // Generate time series data based on actual data
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        // Get actual user signups over time
        const userSignupsOverTime = await Promise.all(
          last7Days.map(async (date) => {
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', date)
              .lt('created_at', nextDate.toISOString());
            
            return { date, signups: count || 0 };
          })
        );

        // Get actual daily active users (based on last_seen_at)
        const dailyActiveUsers = await Promise.all(
          last7Days.map(async (date) => {
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .gte('last_seen_at', date)
              .lt('last_seen_at', nextDate.toISOString());
            
            return { date, users: count || 0 };
          })
        );

        setMetrics({
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          totalAlerts: totalAlerts || 0,
          alertEngagement: analyticsData?.length || 0,
          userGrowthPercent,
          alertsBySource,
          userSignupsOverTime,
          dailyActiveUsers
        });

      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
        setError('Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { metrics, loading, error };
};