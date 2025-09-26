import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
export interface ImpactAnalysis {
  alert_id: string;
  title: string;
  agency: string;
  urgency: string;
  published_date: string;
  business_impact_score: number;
  impact_level: 'Low' | 'Medium' | 'High' | 'Critical';
  affected_areas: string[];
  recommended_actions: string[];
  timeline_urgency: 'Immediate' | 'Short-term' | 'Medium-term' | 'Long-term';
  compliance_implications: string[];
}

export interface ImpactSummary {
  total_alerts: number;
  critical_impact: number;
  high_impact: number;
  medium_impact: number;
  low_impact: number;
  top_agencies: { agency: string; count: number; avg_impact: number }[];
  trend_analysis: { date: string; impact_score: number; alert_count: number }[];
}

export const useRegulatoryImpactAnalysis = () => {
  const [impactAnalyses, setImpactAnalyses] = useState<ImpactAnalysis[]>([]);
  const [impactSummary, setImpactSummary] = useState<ImpactSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Calculate business impact score based on various factors
  const calculateBusinessImpact = (alert: any): number => {
    let score = 0;
    
    // Base urgency scoring (0-30 points)
    if (alert.urgency === 'High') score += 30;
    else if (alert.urgency === 'Medium') score += 20;
    else score += 10;
    
    // Agency weighting (0-25 points)
    const agencyWeights: { [key: string]: number } = {
      'FDA': 25,
      'USDA': 20,
      'EPA': 18,
      'CDC': 15,
      'OSHA': 12,
      'DOT': 10
    };
    score += agencyWeights[alert.agency] || 8;
    
    // Content analysis scoring (0-25 points)
    const highImpactKeywords = [
      'recall', 'violation', 'penalty', 'fine', 'warning letter', 'seizure',
      'injunction', 'criminal', 'prosecution', 'contamination', 'outbreak',
      'mandatory', 'compliance', 'enforcement', 'ban', 'suspension'
    ];
    
    const content = `${alert.title} ${alert.summary || ''} ${alert.full_content || ''}`.toLowerCase();
    const keywordMatches = highImpactKeywords.filter(keyword => content.includes(keyword)).length;
    score += Math.min(keywordMatches * 3, 25);
    
    // Recency bonus (0-20 points)
    const daysOld = Math.floor((Date.now() - new Date(alert.published_date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOld <= 1) score += 20;
    else if (daysOld <= 7) score += 15;
    else if (daysOld <= 30) score += 10;
    else score += 5;
    
    return Math.min(score, 100);
  };

  // Determine affected business areas
  const getAffectedAreas = (alert: any): string[] => {
    const content = `${alert.title} ${alert.summary || ''} ${alert.full_content || ''}`.toLowerCase();
    const areas: string[] = [];
    
    const areaKeywords = {
      'Manufacturing': ['manufacturing', 'production', 'facility', 'plant', 'equipment'],
      'Quality Control': ['quality', 'testing', 'inspection', 'standards', 'specification'],
      'Supply Chain': ['supplier', 'vendor', 'distribution', 'transport', 'logistics'],
      'Food Safety': ['food safety', 'contamination', 'pathogen', 'allergen', 'haccp'],
      'Labeling': ['label', 'labeling', 'mislabeled', 'ingredient', 'nutrition'],
      'Import/Export': ['import', 'export', 'customs', 'border', 'international'],
      'Environmental': ['environmental', 'waste', 'emission', 'pollution', 'clean air'],
      'Worker Safety': ['worker', 'employee', 'safety', 'injury', 'osha', 'workplace']
    };
    
    Object.entries(areaKeywords).forEach(([area, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword))) {
        areas.push(area);
      }
    });
    
    return areas.length > 0 ? areas : ['General Compliance'];
  };

  // Generate recommended actions
  const getRecommendedActions = (alert: any, impactScore: number): string[] => {
    const actions: string[] = [];
    const content = `${alert.title} ${alert.summary || ''} ${alert.full_content || ''}`.toLowerCase();
    
    // High impact actions
    if (impactScore >= 70) {
      actions.push('Schedule immediate leadership review');
      actions.push('Conduct urgent compliance assessment');
      
      if (content.includes('recall')) {
        actions.push('Review supplier relationships and contracts');
        actions.push('Update crisis communication protocols');
      }
      
      if (content.includes('warning letter') || content.includes('violation')) {
        actions.push('Engage legal counsel for compliance strategy');
        actions.push('Implement corrective action plan');
      }
    }
    
    // Medium impact actions
    if (impactScore >= 40) {
      actions.push('Add to compliance calendar for tracking');
      actions.push('Assign responsible team member');
      actions.push('Set follow-up review date');
      
      if (alert.agency === 'FDA') {
        actions.push('Review FDA guidance documents');
      } else if (alert.agency === 'USDA') {
        actions.push('Check FSIS compliance requirements');
      }
    }
    
    // Standard actions
    actions.push('Document in compliance log');
    actions.push('Share with relevant department heads');
    
    return actions;
  };

  // Determine timeline urgency
  const getTimelineUrgency = (alert: any, impactScore: number): ImpactAnalysis['timeline_urgency'] => {
    const content = `${alert.title} ${alert.summary || ''} ${alert.full_content || ''}`.toLowerCase();
    
    if (impactScore >= 80 || content.includes('immediate') || content.includes('urgent')) {
      return 'Immediate';
    } else if (impactScore >= 60 || alert.urgency === 'High') {
      return 'Short-term';
    } else if (impactScore >= 30) {
      return 'Medium-term';
    } else {
      return 'Long-term';
    }
  };

  // Get compliance implications
  const getComplianceImplications = (alert: any): string[] => {
    const implications: string[] = [];
    const content = `${alert.title} ${alert.summary || ''} ${alert.full_content || ''}`.toLowerCase();
    
    if (content.includes('regulation') || content.includes('rule')) {
      implications.push('New regulatory requirements may apply');
    }
    
    if (content.includes('guidance') || content.includes('policy')) {
      implications.push('Updated guidance affects compliance procedures');
    }
    
    if (content.includes('recall') || content.includes('warning')) {
      implications.push('Enhanced monitoring and documentation required');
    }
    
    if (content.includes('inspection') || content.includes('audit')) {
      implications.push('Potential for increased regulatory scrutiny');
    }
    
    if (implications.length === 0) {
      implications.push('Monitor for additional guidance or requirements');
    }
    
    return implications;
  };

  // Fetch and analyze alerts
  const fetchImpactAnalysis = async (dateRange?: { start: string; end: string; }) => {
    try {
      let query = supabase
        .from('alerts')
        .select('*')
        .order('published_date', { ascending: false });

      if (dateRange) {
        query = query
          .gte('published_date', dateRange.start)
          .lte('published_date', dateRange.end);
      } else {
        // Default to last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('published_date', thirtyDaysAgo.toISOString());
      }

      const { data: alerts, error } = await query.limit(100);
      if (error) throw error;

      // Analyze each alert
      const analyses: ImpactAnalysis[] = [];
      
      for (const alert of alerts || []) {
        const impactScore = calculateBusinessImpact(alert);
        let impactLevel: ImpactAnalysis['impact_level'] = 'Low';
        
        if (impactScore >= 80) impactLevel = 'Critical';
        else if (impactScore >= 60) impactLevel = 'High';
        else if (impactScore >= 35) impactLevel = 'Medium';
        
        analyses.push({
          alert_id: alert.id,
          title: alert.title,
          agency: alert.agency || 'Unknown',
          urgency: alert.urgency,
          published_date: alert.published_date,
          business_impact_score: impactScore,
          impact_level: impactLevel,
          affected_areas: getAffectedAreas(alert),
          recommended_actions: getRecommendedActions(alert, impactScore),
          timeline_urgency: getTimelineUrgency(alert, impactScore),
          compliance_implications: getComplianceImplications(alert)
        });
      }

      // Sort by impact score
      analyses.sort((a, b) => b.business_impact_score - a.business_impact_score);
      setImpactAnalyses(analyses);

      // Generate summary
      generateSummary(analyses);
      
      return analyses;
    } catch (error) {
      logger.error('Error fetching impact analysis:', error);
      toast({
        title: "Error",
        description: "Failed to load regulatory impact analysis",
        variant: "destructive"
      });
      return [];
    }
  };

  // Generate impact summary
  const generateSummary = (analyses: ImpactAnalysis[]) => {
    const summary: ImpactSummary = {
      total_alerts: analyses.length,
      critical_impact: analyses.filter(a => a.impact_level === 'Critical').length,
      high_impact: analyses.filter(a => a.impact_level === 'High').length,
      medium_impact: analyses.filter(a => a.impact_level === 'Medium').length,
      low_impact: analyses.filter(a => a.impact_level === 'Low').length,
      top_agencies: [],
      trend_analysis: []
    };

    // Top agencies analysis
    const agencyMap = new Map<string, { count: number; totalImpact: number }>();
    analyses.forEach(analysis => {
      const existing = agencyMap.get(analysis.agency) || { count: 0, totalImpact: 0 };
      agencyMap.set(analysis.agency, {
        count: existing.count + 1,
        totalImpact: existing.totalImpact + analysis.business_impact_score
      });
    });

    summary.top_agencies = Array.from(agencyMap.entries())
      .map(([agency, data]) => ({
        agency,
        count: data.count,
        avg_impact: Math.round(data.totalImpact / data.count)
      }))
      .sort((a, b) => b.avg_impact - a.avg_impact)
      .slice(0, 5);

    // Trend analysis (by week)
    const weekMap = new Map<string, { count: number; totalImpact: number }>();
    analyses.forEach(analysis => {
      const date = new Date(analysis.published_date);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const existing = weekMap.get(weekKey) || { count: 0, totalImpact: 0 };
      weekMap.set(weekKey, {
        count: existing.count + 1,
        totalImpact: existing.totalImpact + analysis.business_impact_score
      });
    });

    summary.trend_analysis = Array.from(weekMap.entries())
      .map(([date, data]) => ({
        date,
        alert_count: data.count,
        impact_score: Math.round(data.totalImpact / data.count)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setImpactSummary(summary);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchImpactAnalysis();
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    impactAnalyses,
    impactSummary,
    loading,
    fetchImpactAnalysis,
    calculateBusinessImpact
  };
};