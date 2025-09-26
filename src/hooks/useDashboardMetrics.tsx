import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { logger } from '@/lib/logger';
interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  monthlyUsers: number;
  totalAlerts: number;
  alertEngagement: number;
  userGrowthPercent: number;
  alertsBySource: { source: string; count: number }[];
  userSignupsOverTime: { date: string; signups: number }[];
  dailyActiveUsers: { date: string; users: number }[];
  monthlyActiveUsers: { date: string; users: number }[];
}

export const useDashboardMetrics = () => {
  const { isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        logger.info('Fetching dashboard metrics, user is admin:', isAdmin);

        // Use the new function for quick dashboard stats if available, with fallback
        try {
          const { data: quickStats, error: quickStatsError } = await supabase.rpc('get_quick_dashboard_stats');

          if (!quickStatsError && quickStats) {
            logger.info('Using quick dashboard stats:', quickStats);
            // Convert quick stats format to metrics format
            setMetrics({
              totalUsers: quickStats.users?.total || 0,
              activeUsers: quickStats.users?.total || 0, // Fallback if no active user tracking
              monthlyUsers: quickStats.users?.new_this_week || 0,
              totalAlerts: quickStats.alerts?.total || 0,
              alertEngagement: quickStats.activity?.events_today || 0,
              userGrowthPercent: 0, // Calculate if needed
              alertsBySource: [],
              userSignupsOverTime: [],
              dailyActiveUsers: [],
              monthlyActiveUsers: []
            });
            return;
          }
        } catch (quickError) {
          logger.warn('Quick stats not available, falling back to manual queries:', quickError);
        }

        // Fallback to manual queries with proper permissions
        // For non-admin users, show limited data or redirect
        if (!isAdmin) {
          setMetrics({
            totalUsers: 0,
            activeUsers: 0,
            monthlyUsers: 0,
            totalAlerts: 0,
            alertEngagement: 0,
            userGrowthPercent: 0,
            alertsBySource: [],
            userSignupsOverTime: [],
            dailyActiveUsers: [],
            monthlyActiveUsers: []
          });
          return;
        }

        // Fetch total users (admin only)
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

        // Fetch monthly users (users who logged in this month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: monthlyUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen_at', startOfMonth.toISOString());

        // Fetch total alerts
        const { count: totalAlerts } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true });

        // Fetch alert engagement (analytics data)
        const { data: analyticsData } = await supabase
          .from('user_analytics')
          .select('event_type, created_at')
          .eq('event_type', 'alert_view');

        // Fetch alerts by source using the filtered view for better security
        const { data: alertsData } = await supabase
          .from('alerts_filtered')
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

        // Get monthly active users over time
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (5 - i));
          date.setDate(1);
          return date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM format
        });

        const monthlyActiveUsers = await Promise.all(
          last6Months.map(async (monthStr) => {
            const startOfMonth = new Date(monthStr + '-01');
            const endOfMonth = new Date(startOfMonth);
            endOfMonth.setMonth(endOfMonth.getMonth() + 1);
            
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .gte('last_seen_at', startOfMonth.toISOString())
              .lt('last_seen_at', endOfMonth.toISOString());
            
            return { date: monthStr, users: count || 0 };
          })
        );

        setMetrics({
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          monthlyUsers: monthlyUsers || 0,
          totalAlerts: totalAlerts || 0,
          alertEngagement: analyticsData?.length || 0,
          userGrowthPercent,
          alertsBySource,
          userSignupsOverTime,
          dailyActiveUsers,
          monthlyActiveUsers
        });

      } catch (err) {
        logger.error('Error fetching dashboard metrics:', err);
        setError(`Failed to load metrics: ${(err as Error).message}`);

        // Set default metrics on error to prevent blank dashboard
        setMetrics({
          totalUsers: 0,
          activeUsers: 0,
          monthlyUsers: 0,
          totalAlerts: 0,
          alertEngagement: 0,
          userGrowthPercent: 0,
          alertsBySource: [],
          userSignupsOverTime: [],
          dailyActiveUsers: [],
          monthlyActiveUsers: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { metrics, loading, error };
};