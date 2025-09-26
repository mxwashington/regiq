import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
export interface ComplianceMetric {
  id: string;
  user_id: string;
  metric_type: string;
  metric_value: number;
  metric_date: string;
  facility_id?: string | null;
  agency?: string | null;
  category?: string | null;
  metadata: any;
  created_at: string;
}

export interface BenchmarkData {
  id: string;
  industry_sector: string;
  metric_type: string;
  metric_value: number;
  percentile_rank: number;
  data_source: string;
  valid_from: string;
  valid_to?: string | null;
  created_at: string;
}

export interface AnalyticsReport {
  id: string;
  user_id: string;
  report_name: string;
  report_type: 'compliance_maturity' | 'regulatory_trends' | 'cost_analysis' | 'risk_assessment' | 'executive_summary';
  report_data: any;
  date_range_start?: string | null;
  date_range_end?: string | null;
  filters: any;
  generated_at: string;
  created_at: string;
}

export const useComplianceAnalytics = () => {
  const [metrics, setMetrics] = useState<ComplianceMetric[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch compliance metrics
  const fetchMetrics = async (dateRange?: { start: string; end: string }) => {
    try {
      let query = supabase
        .from('compliance_metrics')
        .select('*')
        .order('metric_date', { ascending: false });

      if (dateRange) {
        query = query
          .gte('metric_date', dateRange.start)
          .lte('metric_date', dateRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      logger.error('Error fetching metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance metrics",
        variant: "destructive"
      });
    }
  };

  // Fetch benchmark data
  const fetchBenchmarks = async (industry: string = 'food_manufacturing') => {
    try {
      const { data, error } = await supabase
        .from('benchmark_data')
        .select('*')
        .eq('industry_sector', industry)
        .order('metric_type', { ascending: true });

      if (error) throw error;
      setBenchmarks(data || []);
    } catch (error) {
      logger.error('Error fetching benchmarks:', error);
    }
  };

  // Fetch saved reports
  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('analytics_reports')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReports((data || []) as AnalyticsReport[]);
    } catch (error) {
      logger.error('Error fetching reports:', error);
    }
  };

  // Generate compliance maturity score
  const generateComplianceMaturity = async () => {
    try {
      // Calculate maturity based on various factors
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Get recent task completion rate
      const { data: taskData } = await supabase
        .from('tasks')
        .select('status')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get recent deadline completion rate
      const { data: deadlineData } = await supabase
        .from('compliance_deadlines')
        .select('status')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Calculate scores
      const totalTasks = taskData?.length || 0;
      const completedTasks = taskData?.filter(t => t.status === 'completed').length || 0;
      const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const totalDeadlines = deadlineData?.length || 0;
      const completedDeadlines = deadlineData?.filter(d => d.status === 'completed').length || 0;
      const deadlineCompletionRate = totalDeadlines > 0 ? (completedDeadlines / totalDeadlines) * 100 : 0;

      // Calculate overall maturity score (0-100)
      const maturityScore = Math.round(
        (taskCompletionRate * 0.4) + 
        (deadlineCompletionRate * 0.4) + 
        (20) // Base score for having the system
      );

      return {
        overall_score: maturityScore,
        task_completion_rate: Math.round(taskCompletionRate),
        deadline_completion_rate: Math.round(deadlineCompletionRate),
        total_tasks: totalTasks,
        total_deadlines: totalDeadlines,
        assessment_date: today.toISOString().split('T')[0]
      };
    } catch (error) {
      logger.error('Error generating maturity score:', error);
      return null;
    }
  };

  // Generate regulatory trends analysis
  const generateRegulatoryTrends = async (dateRange: { start: string; end: string }) => {
    try {
      // Get alerts by agency and date
      const { data: alertData } = await supabase
        .from('alerts')
        .select('agency, urgency, published_date')
        .gte('published_date', dateRange.start)
        .lte('published_date', dateRange.end);

      if (!alertData) return null;

      // Group by agency
      const agencyTrends = alertData.reduce((acc: any, alert) => {
        const agency = alert.agency || 'Unknown';
        if (!acc[agency]) {
          acc[agency] = { total: 0, high_urgency: 0, medium_urgency: 0, low_urgency: 0 };
        }
        acc[agency].total++;
        
        if (alert.urgency === 'High') acc[agency].high_urgency++;
        else if (alert.urgency === 'Medium') acc[agency].medium_urgency++;
        else acc[agency].low_urgency++;
        
        return acc;
      }, {});

      // Calculate trends over time
      const timelineData = alertData.reduce((acc: any, alert) => {
        const date = alert.published_date.split('T')[0];
        if (!acc[date]) acc[date] = 0;
        acc[date]++;
        return acc;
      }, {});

      return {
        agency_breakdown: agencyTrends,
        timeline: timelineData,
        total_alerts: alertData.length,
        date_range: dateRange
      };
    } catch (error) {
      logger.error('Error generating regulatory trends:', error);
      return null;
    }
  };

  // Generate cost analysis
  const generateCostAnalysis = async () => {
    try {
      // This would normally integrate with time tracking, but we'll provide estimates
      const { data: taskData } = await supabase
        .from('tasks')
        .select('category, status, created_at, updated_at');

      const { data: deadlineData } = await supabase
        .from('compliance_deadlines')
        .select('agency, status, created_at, updated_at');

      // Estimate costs based on categories and time
      const estimatedCosts = {
        task_management: (taskData?.length || 0) * 2.5, // $2.50 per task avg
        deadline_tracking: (deadlineData?.length || 0) * 1.8, // $1.80 per deadline avg
        regulatory_monitoring: 150, // Base monthly cost
        compliance_tools: 75 // Tool costs
      };

      const totalEstimatedCost = Object.values(estimatedCosts).reduce((sum, cost) => sum + cost, 0);

      // Calculate potential savings
      const potentialSavings = {
        reduced_violations: 2500, // Estimated monthly savings from avoiding violations
        faster_response_times: 800, // Savings from faster regulatory response
        audit_preparation: 1200 // Savings from better audit preparation
      };

      const totalPotentialSavings = Object.values(potentialSavings).reduce((sum, savings) => sum + savings, 0);

      return {
        estimated_costs: estimatedCosts,
        total_cost: Math.round(totalEstimatedCost),
        potential_savings: potentialSavings,
        total_savings: Math.round(totalPotentialSavings),
        net_benefit: Math.round(totalPotentialSavings - totalEstimatedCost),
        roi_percentage: Math.round(((totalPotentialSavings - totalEstimatedCost) / totalEstimatedCost) * 100)
      };
    } catch (error) {
      logger.error('Error generating cost analysis:', error);
      return null;
    }
  };

  // Generate risk assessment
  const generateRiskAssessment = async () => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Check overdue items
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('priority, due_date')
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'cancelled')
        .lt('due_date', today.toISOString());

      const { data: overdueDeadlines } = await supabase
        .from('compliance_deadlines')
        .select('priority, deadline_date')
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'cancelled')
        .lt('deadline_date', today.toISOString().split('T')[0]);

      // Calculate risk scores
      const taskRisks = overdueTasks?.reduce((score, task) => {
        const multiplier = task.priority === 'critical' ? 4 : task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
        return score + (10 * multiplier);
      }, 0) || 0;

      const deadlineRisks = overdueDeadlines?.reduce((score, deadline) => {
        const multiplier = deadline.priority === 'critical' ? 4 : deadline.priority === 'high' ? 3 : deadline.priority === 'medium' ? 2 : 1;
        return score + (15 * multiplier);
      }, 0) || 0;

      const totalRiskScore = Math.min(taskRisks + deadlineRisks, 100); // Cap at 100

      // Risk level determination
      let riskLevel = 'Low';
      if (totalRiskScore > 70) riskLevel = 'Critical';
      else if (totalRiskScore > 50) riskLevel = 'High';
      else if (totalRiskScore > 25) riskLevel = 'Medium';

      return {
        overall_risk_score: totalRiskScore,
        risk_level: riskLevel,
        overdue_tasks: overdueTasks?.length || 0,
        overdue_deadlines: overdueDeadlines?.length || 0,
        risk_factors: {
          task_delays: taskRisks,
          deadline_misses: deadlineRisks
        },
        recommendations: totalRiskScore > 50 ? [
          'Address overdue high-priority items immediately',
          'Review and update compliance calendars',
          'Consider increasing team resources'
        ] : [
          'Maintain current compliance monitoring',
          'Continue regular progress reviews'
        ]
      };
    } catch (error) {
      logger.error('Error generating risk assessment:', error);
      return null;
    }
  };

  // Save analytics report
  const saveReport = async (reportType: AnalyticsReport['report_type'], reportName: string, reportData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('analytics_reports')
        .insert([{
          user_id: user.id,
          report_name: reportName,
          report_type: reportType,
          report_data: reportData,
          filters: {}
        }])
        .select()
        .single();

      if (error) throw error;

      setReports(prev => [{ ...data, report_type: data.report_type as AnalyticsReport['report_type'] }, ...prev]);
      toast({
        title: "Success",
        description: "Report saved successfully"
      });

      return data;
    } catch (error) {
      logger.error('Error saving report:', error);
      toast({
        title: "Error",
        description: "Failed to save report",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Compare with industry benchmarks
  const compareWithBenchmarks = (userValue: number, metricType: string, industry: string = 'food_manufacturing') => {
    const relevantBenchmarks = benchmarks.filter(b => 
      b.industry_sector === industry && b.metric_type === metricType
    );

    if (relevantBenchmarks.length === 0) return null;

    // Find user's percentile
    const sortedBenchmarks = relevantBenchmarks.sort((a, b) => a.percentile_rank - b.percentile_rank);
    
    let userPercentile = 0;
    for (const benchmark of sortedBenchmarks) {
      if (userValue <= benchmark.metric_value) {
        userPercentile = benchmark.percentile_rank;
        break;
      }
    }

    // If user is better than 90th percentile
    if (userPercentile === 0) userPercentile = 95;

    const median = sortedBenchmarks.find(b => b.percentile_rank === 50)?.metric_value || 0;
    
    return {
      user_value: userValue,
      user_percentile: userPercentile,
      industry_median: median,
      performance: userPercentile >= 75 ? 'Excellent' : userPercentile >= 50 ? 'Good' : userPercentile >= 25 ? 'Fair' : 'Needs Improvement'
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchBenchmarks(), fetchReports()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    metrics,
    benchmarks,
    reports,
    loading,
    fetchMetrics,
    fetchBenchmarks,
    generateComplianceMaturity,
    generateRegulatoryTrends,
    generateCostAnalysis,
    generateRiskAssessment,
    saveReport,
    compareWithBenchmarks
  };
};