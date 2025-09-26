import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
export interface RiskPrediction {
  id: string;
  entityType: 'supplier' | 'facility' | 'compliance_area' | 'regulatory_change';
  entityId: string;
  riskScore: number;
  confidenceLevel: number;
  predictionHorizon: number;
  riskFactors: Record<string, any>;
  mitigationRecommendations: string[];
  historicalData: Record<string, any>;
  modelVersion: string;
  predictedAt: string;
  expiresAt: string;
}

export interface RiskPattern {
  id: string;
  patternType: string;
  patternData: Record<string, any>;
  frequency: number;
  confidence: number;
  impactScore: number;
  affectedEntities: string[];
  discoveryMethod: string;
}

export const usePredictiveRiskModeling = () => {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<RiskPrediction[]>([]);
  const [patterns, setPatterns] = useState<RiskPattern[]>([]);
  const { toast } = useToast();

  const generateRiskPrediction = useCallback(async (
    entityType: 'supplier' | 'facility' | 'compliance_area' | 'regulatory_change',
    entityId: string,
    predictionHorizon: number = 30,
    includeRecommendations: boolean = true
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predictive-risk-modeling', {
        body: {
          entityType,
          entityId,
          predictionHorizon,
          includeRecommendations
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Risk Prediction Generated",
          description: `Risk score: ${data.riskScore}% (${data.confidenceLevel * 100}% confidence)`,
        });

        // Refresh predictions list
        await fetchRiskPredictions();
        
        return data.prediction;
      } else {
        throw new Error(data.error || 'Failed to generate risk prediction');
      }
    } catch (error: any) {
      logger.error('Error generating risk prediction:', error);
      toast({
        title: "Risk Prediction Failed",
        description: error.message || "Failed to generate risk prediction",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchRiskPredictions = useCallback(async (entityType?: string, entityId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('risk_predictions')
        .select('*')
        .order('predicted_at', { ascending: false });

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map database columns to interface properties
      const mappedPredictions = (data || []).map((item: any) => ({
        id: item.id,
        entityType: item.entity_type,
        entityId: item.entity_id,
        riskScore: item.risk_score,
        confidenceLevel: item.confidence_level,
        predictionHorizon: item.prediction_horizon,
        riskFactors: item.risk_factors,
        mitigationRecommendations: item.mitigation_recommendations,
        historicalData: item.historical_data,
        modelVersion: item.model_version,
        predictedAt: item.predicted_at,
        expiresAt: item.expires_at
      }));

      setPredictions(mappedPredictions);
      return mappedPredictions;
    } catch (error: any) {
      logger.error('Error fetching risk predictions:', error);
      toast({
        title: "Failed to Load Predictions",
        description: error.message || "Could not fetch risk predictions",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchRiskPatterns = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('risk_patterns')
        .select('*')
        .order('impact_score', { ascending: false });

      if (error) throw error;

      // Map database columns to interface properties
      const mappedPatterns = (data || []).map((item: any) => ({
        id: item.id,
        patternType: item.pattern_type,
        patternData: item.pattern_data,
        frequency: item.frequency,
        confidence: item.confidence,
        impactScore: item.impact_score,
        affectedEntities: item.affected_entities,
        discoveryMethod: item.discovery_method
      }));

      setPatterns(mappedPatterns);
      return mappedPatterns;
    } catch (error: any) {
      logger.error('Error fetching risk patterns:', error);
      toast({
        title: "Failed to Load Risk Patterns",
        description: error.message || "Could not fetch risk patterns",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  const getRiskScoreColor = useCallback((score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  }, []);

  const getRiskScoreLabel = useCallback((score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  }, []);

  const getConfidenceLabel = useCallback((confidence: number) => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  }, []);

  return {
    loading,
    predictions,
    patterns,
    generateRiskPrediction,
    fetchRiskPredictions,
    fetchRiskPatterns,
    getRiskScoreColor,
    getRiskScoreLabel,
    getConfidenceLabel
  };
};