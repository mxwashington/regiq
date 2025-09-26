import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { logger } from '@/lib/logger';
export interface EnhancedMetrics {
  complianceScore: number;
  alertTrends: {
    period: string;
    count: number;
    avgUrgency: number;
  }[];
  categoryBreakdown: {
    category: string;
    count: number;
    percentage: number;
  }[];
  supplierRiskHeatmap: {
    name: string;
    riskScore: number;
    alertCount: number;
  }[];
  upcomingDeadlines: {
    title: string;
    dueDate: string;
    priority: string;
  }[];
  workloadForecast: {
    week: string;
    estimatedHours: number;
    taskCount: number;
  }[];
}

export const useEnhancedMetrics = (daysBack: number = 30) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<EnhancedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateComplianceScore = async () => {
    if (!user) return 0;

    try {
      // Get total tasks
      const { data: allTasks, error: allTasksError } = await supabase
        .from('tasks')
        .select('status')
        .eq('user_id', user.id);
      
      if (allTasksError) throw allTasksError;

      if (!allTasks || allTasks.length === 0) return 100;

      const completedTasks = allTasks.filter(t => t.status === 'completed').length;
      return Math.round((completedTasks / allTasks.length) * 100);
    } catch (error) {
      logger.error('Error calculating compliance score:', error);
      return 0;
    }
  };

  const getAlertTrends = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      const { data: alerts, error } = await supabase
        .from('alerts')
        .select('published_date, urgency_score')
        .gte('published_date', startDate.toISOString())
        .lte('published_date', endDate.toISOString());

      if (error) throw error;

      // Group by week
      const trends = [];
      for (let i = 0; i < Math.ceil(daysBack / 7); i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekAlerts = alerts?.filter(a => {
          const alertDate = new Date(a.published_date);
          return alertDate >= weekStart && alertDate <= weekEnd;
        }) || [];

        const avgUrgency = weekAlerts.length > 0
          ? weekAlerts.reduce((sum, a) => sum + (a.urgency_score || 5), 0) / weekAlerts.length
          : 0;

        trends.push({
          period: `Week ${i + 1}`,
          count: weekAlerts.length,
          avgUrgency: Math.round(avgUrgency * 10) / 10
        });
      }

      return trends;
    } catch (error) {
      logger.error('Error getting alert trends:', error);
      return [];
    }
  };

  const getCategoryBreakdown = async () => {
    try {
      const { data: alerts, error } = await supabase
        .from('alerts')
        .select('agency, source')
        .gte('published_date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const categoryCount: Record<string, number> = {};
      const total = alerts?.length || 0;

      alerts?.forEach(alert => {
        const category = alert.agency || alert.source || 'Uncategorized';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      return Object.entries(categoryCount).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100)
      }));
    } catch (error) {
      logger.error('Error getting category breakdown:', error);
      return [];
    }
  };

  const getSupplierRiskHeatmap = async () => {
    try {
      const { data: suppliers, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('risk_score', { ascending: false });

      if (error) throw error;

      return suppliers?.map(supplier => ({
        name: supplier.name,
        riskScore: supplier.risk_score || 0,
        alertCount: Math.floor(Math.random() * 10) // Mock data for now
      })).slice(0, 10) || [];
    } catch (error) {
      logger.error('Error getting supplier risk heatmap:', error);
      return [];
    }
  };

  const getUpcomingDeadlines = async () => {
    if (!user) return [];

    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('title, due_date, priority')
        .eq('user_id', user.id)
        .not('due_date', 'is', null)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5);

      if (error) throw error;

      return tasks?.map(task => ({
        title: task.title,
        dueDate: task.due_date,
        priority: task.priority || 'medium'
      })) || [];
    } catch (error) {
      logger.error('Error getting upcoming deadlines:', error);
      return [];
    }
  };

  const getWorkloadForecast = async () => {
    if (!user) return [];

    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('due_date, priority')
        .eq('user_id', user.id)
        .not('due_date', 'is', null)
        .gte('due_date', new Date().toISOString());

      if (error) throw error;

      // Group by week and estimate hours
      const forecast = [];
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekTasks = tasks?.filter(task => {
          const taskDate = new Date(task.due_date);
          return taskDate >= weekStart && taskDate <= weekEnd;
        }) || [];

        // Estimate hours based on priority
        const estimatedHours = weekTasks.reduce((total, task) => {
          switch (task.priority) {
            case 'high': return total + 4;
            case 'medium': return total + 2;
            case 'low': return total + 1;
            default: return total + 2;
          }
        }, 0);

        forecast.push({
          week: `Week ${i + 1}`,
          estimatedHours,
          taskCount: weekTasks.length
        });
      }

      return forecast;
    } catch (error) {
      logger.error('Error getting workload forecast:', error);
      return [];
    }
  };

  const fetchMetrics = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const [
        complianceScore,
        alertTrends,
        categoryBreakdown,
        supplierRiskHeatmap,
        upcomingDeadlines,
        workloadForecast
      ] = await Promise.all([
        calculateComplianceScore(),
        getAlertTrends(),
        getCategoryBreakdown(),
        getSupplierRiskHeatmap(),
        getUpcomingDeadlines(),
        getWorkloadForecast()
      ]);

      setMetrics({
        complianceScore,
        alertTrends,
        categoryBreakdown,
        supplierRiskHeatmap,
        upcomingDeadlines,
        workloadForecast
      });
    } catch (error) {
      logger.error('Error fetching enhanced metrics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [user, daysBack]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  };
};