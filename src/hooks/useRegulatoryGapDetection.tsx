import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProcessFailurePattern {
  id: string;
  alert_id: string;
  failure_type: string;
  failure_category: string;
  severity_level: string;
  affected_systems: string[];
  root_cause_analysis: {
    identified_causes?: string[];
    contributing_factors?: string[];
  };
  regulatory_gaps: any;
  similar_pattern_count: number;
  trend_indicators: {
    urgency_level?: string;
    pattern_confidence?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ImportComplianceGap {
  id: string;
  alert_id: string;
  product_type: string;
  origin_country?: string;
  importer_name?: string;
  gap_type: string;
  compliance_requirements_missed: string[];
  potential_risk_level: string;
  affected_facilities: any[];
  remediation_needed: {
    immediate_actions?: string[];
    long_term_improvements?: string[];
  };
  timeline_to_fix: string;
  created_at: string;
  updated_at: string;
}

export interface RegulatoryGapIndicator {
  id: string;
  user_id?: string;
  indicator_type: string;
  risk_score: number;
  trend_direction: string;
  affected_areas: string[];
  evidence_alerts: string[];
  gap_description: string;
  recommended_actions: string[];
  priority_level: string;
  last_updated_at: string;
  created_at: string;
}

export const useRegulatoryGapDetection = () => {
  const { user } = useAuth();
  const [processFailures, setProcessFailures] = useState<ProcessFailurePattern[]>([]);
  const [importGaps, setImportGaps] = useState<ImportComplianceGap[]>([]);
  const [gapIndicators, setGapIndicators] = useState<RegulatoryGapIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const loadGapData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load process failure patterns
      const { data: processData, error: processError } = await supabase
        .from('process_failure_patterns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (processError) {
        console.error('Error loading process failures:', processError);
      } else {
        setProcessFailures((processData || []).map(item => ({
          ...item,
          root_cause_analysis: (item.root_cause_analysis as any) || {},
          regulatory_gaps: (item.regulatory_gaps as any) || {},
          trend_indicators: (item.trend_indicators as any) || {}
        })));
      }

      // Load import compliance gaps
      const { data: importData, error: importError } = await supabase
        .from('import_compliance_gaps')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (importError) {
        console.error('Error loading import gaps:', importError);
      } else {
        setImportGaps((importData || []).map(item => ({
          ...item,
          affected_facilities: (item.affected_facilities as any) || [],
          remediation_needed: (item.remediation_needed as any) || {}
        })));
      }

      // Load gap indicators (both user-specific and system-wide)
      const { data: indicatorData, error: indicatorError } = await supabase
        .from('regulatory_gap_indicators')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('risk_score', { ascending: false })
        .limit(20);

      if (indicatorError) {
        console.error('Error loading gap indicators:', indicatorError);
      } else {
        setGapIndicators((indicatorData || []).map(item => ({
          ...item,
          affected_areas: (item.affected_areas as any) || [],
          recommended_actions: (item.recommended_actions as any) || []
        })));
      }

    } catch (error) {
      console.error('Error in loadGapData:', error);
      toast.error('Failed to load regulatory gap data');
    } finally {
      setLoading(false);
    }
  };

  const runGapAnalysis = async (alertIds?: string[], analyzeAll = false) => {
    if (!user) {
      toast.error('Please sign in to run gap analysis');
      return;
    }

    try {
      setAnalyzing(true);
      toast.info('Starting regulatory gap analysis...');

      const { data, error } = await supabase.functions.invoke('regulatory-gap-detector', {
        body: {
          alert_ids: alertIds,
          analyze_all: analyzeAll
        }
      });

      if (error) {
        console.error('Gap analysis error:', error);
        throw error;
      }

      if (data.success) {
        toast.success(
          `Analysis complete! Found ${data.process_failures_detected} process failures and ${data.import_gaps_detected} import gaps`
        );
        
        // Reload data to show new results
        await loadGapData();
      } else {
        throw new Error(data.error || 'Analysis failed');
      }

    } catch (error: any) {
      console.error('Error running gap analysis:', error);
      toast.error(error.message || 'Failed to run gap analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadGapData();
    }
  }, [user]);

  return {
    processFailures,
    importGaps,
    gapIndicators,
    loading,
    analyzing,
    loadGapData,
    runGapAnalysis
  };
};