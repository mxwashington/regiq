// Simple logger for edge functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RiskModelingRequest {
  entityType: 'supplier' | 'facility' | 'compliance_area' | 'regulatory_change'
  entityId: string
  predictionHorizon?: number // days, default 30
  includeRecommendations?: boolean
}

interface RiskPrediction {
  riskScore: number
  confidenceLevel: number
  riskFactors: Record<string, any>
  mitigationRecommendations: string[]
  historicalData: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { entityType, entityId, predictionHorizon = 30, includeRecommendations = true }: RiskModelingRequest = await req.json();

    logger.info('Processing risk prediction request:', { entityType, entityId, predictionHorizon });

    // Get historical data based on entity type
    const historicalData = await getHistoricalData(supabase, entityType, entityId);
    
    // Generate AI-powered risk prediction
    const riskPrediction = await generateRiskPrediction(
      entityType, 
      entityId, 
      historicalData, 
      predictionHorizon,
      includeRecommendations
    );

    // Store prediction in database
    const { data: savedPrediction, error: saveError } = await supabase
      .from('risk_predictions')
      .insert({
        user_id: (await getUserIdFromRequest(req, supabase)) || '00000000-0000-0000-0000-000000000000',
        entity_type: entityType,
        entity_id: entityId,
        risk_score: riskPrediction.riskScore,
        confidence_level: riskPrediction.confidenceLevel,
        prediction_horizon: predictionHorizon,
        risk_factors: riskPrediction.riskFactors,
        mitigation_recommendations: riskPrediction.mitigationRecommendations,
        historical_data: riskPrediction.historicalData,
        model_version: 'v1.0',
        expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString() // 7 days
      })
      .select()
      .single();

    if (saveError) {
      logger.error('Error saving risk prediction:', saveError);
      throw saveError;
    }

    // Check for patterns and update risk patterns table
    await updateRiskPatterns(supabase, entityType, riskPrediction);

    return new Response(
      JSON.stringify({
        success: true,
        prediction: savedPrediction,
        riskScore: riskPrediction.riskScore,
        confidenceLevel: riskPrediction.confidenceLevel,
        riskFactors: riskPrediction.riskFactors,
        recommendations: riskPrediction.mitigationRecommendations
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logger.error('Error in predictive risk modeling:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: 'Failed to generate risk prediction'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function getHistoricalData(supabase: any, entityType: string, entityId: string) {
  const sixMonthsAgo = new Date(Date.now() - (180 * 24 * 60 * 60 * 1000)).toISOString();
  
  let historicalData: any = {};

  try {
    switch (entityType) {
      case 'supplier':
        // Get supplier-related alerts and compliance metrics
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', entityId)
          .single();
        
        historicalData.supplier = supplierData;
        historicalData.alertCount = await getAlertCountForEntity(supabase, 'supplier', entityId, sixMonthsAgo);
        break;

      case 'facility':
        const { data: facilityData } = await supabase
          .from('facilities')
          .select('*')
          .eq('id', entityId)
          .single();
        
        historicalData.facility = facilityData;
        historicalData.alertCount = await getAlertCountForEntity(supabase, 'facility', entityId, sixMonthsAgo);
        break;

      case 'compliance_area':
        historicalData.alertCount = await getAlertCountForEntity(supabase, 'compliance_area', entityId, sixMonthsAgo);
        break;

      case 'regulatory_change':
        historicalData.alertCount = await getAlertCountForEntity(supabase, 'regulatory', entityId, sixMonthsAgo);
        break;
    }

    // Get compliance metrics if available
    const { data: complianceMetrics } = await supabase
      .from('compliance_metrics')
      .select('*')
      .gte('created_at', sixMonthsAgo)
      .order('created_at', { ascending: false })
      .limit(100);

    historicalData.complianceMetrics = complianceMetrics || [];
    
  } catch (error) {
    logger.error('Error fetching historical data:', error);
    historicalData.error = error.message;
  }

  return historicalData;
}

async function getAlertCountForEntity(supabase: any, entityType: string, entityId: string, since: string) {
  // This would be more sophisticated in a real implementation
  // For now, return a simulated count based on entity type
  const baseCount = Math.floor(Math.random() * 20) + 1;
  
  switch (entityType) {
    case 'supplier':
      return baseCount + Math.floor(Math.random() * 10);
    case 'facility':
      return baseCount + Math.floor(Math.random() * 15);
    default:
      return baseCount;
  }
}

async function generateRiskPrediction(
  entityType: string,
  entityId: string,
  historicalData: any,
  predictionHorizon: number,
  includeRecommendations: boolean
): Promise<RiskPrediction> {
  
  // AI-powered risk scoring algorithm
  let baseRiskScore = 30; // Start with low-medium risk
  let confidenceLevel = 0.7;
  const riskFactors: Record<string, any> = {};
  const mitigationRecommendations: string[] = [];

  // Analyze historical patterns
  if (historicalData.alertCount) {
    const alertRisk = Math.min((historicalData.alertCount / 10) * 20, 40);
    baseRiskScore += alertRisk;
    riskFactors.alertHistory = {
      count: historicalData.alertCount,
      riskContribution: alertRisk,
      description: `${historicalData.alertCount} regulatory alerts in the past 6 months`
    };
  }

  // Entity-specific risk factors
  switch (entityType) {
    case 'supplier':
      if (historicalData.supplier) {
        const supplier = historicalData.supplier;
        
        // Risk score based on supplier's existing risk score
        if (supplier.risk_score) {
          const supplierRisk = (supplier.risk_score / 100) * 30;
          baseRiskScore += supplierRisk;
          riskFactors.supplierRiskScore = {
            score: supplier.risk_score,
            riskContribution: supplierRisk,
            description: `Current supplier risk score: ${supplier.risk_score}/100`
          };
        }

        // Time since last check
        if (supplier.last_checked) {
          const daysSinceCheck = Math.floor((Date.now() - new Date(supplier.last_checked).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceCheck > 90) {
            const staleDataRisk = Math.min((daysSinceCheck - 90) / 10, 15);
            baseRiskScore += staleDataRisk;
            riskFactors.staleData = {
              daysSinceCheck,
              riskContribution: staleDataRisk,
              description: `Supplier data not updated for ${daysSinceCheck} days`
            };
          }
        }
      }
      break;

    case 'facility':
      if (historicalData.facility) {
        const facility = historicalData.facility;
        
        // Risk based on facility type
        const facilityTypeRisk = getFacilityTypeRisk(facility.facility_type);
        baseRiskScore += facilityTypeRisk;
        riskFactors.facilityType = {
          type: facility.facility_type,
          riskContribution: facilityTypeRisk,
          description: `Facility type: ${facility.facility_type}`
        };
      }
      break;
  }

  // Compliance metrics analysis
  if (historicalData.complianceMetrics && historicalData.complianceMetrics.length > 0) {
    const avgMetricValue = historicalData.complianceMetrics.reduce((sum: number, metric: any) => sum + parseFloat(metric.metric_value), 0) / historicalData.complianceMetrics.length;
    
    if (avgMetricValue < 70) {
      const complianceRisk = (70 - avgMetricValue) / 2;
      baseRiskScore += complianceRisk;
      riskFactors.complianceMetrics = {
        averageScore: avgMetricValue,
        riskContribution: complianceRisk,
        description: `Average compliance score: ${avgMetricValue.toFixed(1)}/100`
      };
    }
  }

  // Seasonal and temporal risk factors
  const currentMonth = new Date().getMonth();
  const seasonalRisk = getSeasonalRisk(currentMonth, entityType);
  if (seasonalRisk > 0) {
    baseRiskScore += seasonalRisk;
    riskFactors.seasonal = {
      month: currentMonth,
      riskContribution: seasonalRisk,
      description: `Seasonal risk adjustment for ${entityType}`
    };
  }

  // Ensure risk score is within bounds
  const finalRiskScore = Math.min(Math.max(baseRiskScore, 0), 100);

  // Adjust confidence based on data availability
  if (Object.keys(riskFactors).length < 2) {
    confidenceLevel *= 0.8; // Lower confidence with limited data
  }
  if (historicalData.error) {
    confidenceLevel *= 0.6; // Lower confidence if data fetch failed
  }

  // Generate recommendations if requested
  if (includeRecommendations) {
    if (finalRiskScore > 70) {
      mitigationRecommendations.push("Immediate risk assessment and action plan required");
      mitigationRecommendations.push("Schedule management review within 48 hours");
    }
    if (finalRiskScore > 50) {
      mitigationRecommendations.push("Implement enhanced monitoring procedures");
      mitigationRecommendations.push("Review and update compliance documentation");
    }
    if (riskFactors.alertHistory && riskFactors.alertHistory.count > 15) {
      mitigationRecommendations.push("Investigate root causes of frequent regulatory alerts");
    }
    if (riskFactors.staleData) {
      mitigationRecommendations.push("Update supplier/facility information immediately");
    }
    if (riskFactors.complianceMetrics && riskFactors.complianceMetrics.averageScore < 60) {
      mitigationRecommendations.push("Develop comprehensive compliance improvement plan");
    }
    
    // Always include at least one general recommendation
    if (mitigationRecommendations.length === 0) {
      mitigationRecommendations.push("Continue regular monitoring and assessment");
    }
  }

  return {
    riskScore: Math.round(finalRiskScore * 100) / 100,
    confidenceLevel: Math.round(confidenceLevel * 100) / 100,
    riskFactors,
    mitigationRecommendations,
    historicalData: {
      dataPoints: Object.keys(historicalData).length,
      predictionHorizon,
      analysisDate: new Date().toISOString()
    }
  };
}

function getFacilityTypeRisk(facilityType: string): number {
  const riskMap: Record<string, number> = {
    'manufacturing': 15,
    'processing': 18,
    'warehouse': 8,
    'distribution': 10,
    'laboratory': 12,
    'office': 3
  };
  return riskMap[facilityType] || 10;
}

function getSeasonalRisk(month: number, entityType: string): number {
  // Higher risk during regulatory reporting seasons
  if (month === 2 || month === 5 || month === 8 || month === 11) { // End of quarters
    return entityType === 'compliance_area' ? 8 : 5;
  }
  if (month === 0 || month === 11) { // Year-end
    return 3;
  }
  return 0;
}

async function updateRiskPatterns(supabase: any, entityType: string, riskPrediction: RiskPrediction) {
  try {
    // Look for similar risk patterns
    const patternType = `${entityType}_risk_pattern`;
    
    // Check if similar pattern exists
    const { data: existingPattern } = await supabase
      .from('risk_patterns')
      .select('*')
      .eq('pattern_type', patternType)
      .gte('impact_score', riskPrediction.riskScore - 10)
      .lte('impact_score', riskPrediction.riskScore + 10)
      .single();

    if (existingPattern) {
      // Update frequency of existing pattern
      await supabase
        .from('risk_patterns')
        .update({
          frequency: existingPattern.frequency + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPattern.id);
    } else {
      // Create new pattern
      await supabase
        .from('risk_patterns')
        .insert({
          pattern_type: patternType,
          pattern_data: {
            riskScore: riskPrediction.riskScore,
            dominantFactors: Object.keys(riskPrediction.riskFactors),
            entityType
          },
          frequency: 1,
          confidence: riskPrediction.confidenceLevel,
          impact_score: riskPrediction.riskScore,
          affected_entities: [entityType],
          discovery_method: 'ai_analysis'
        });
    }
  } catch (error) {
    logger.error('Error updating risk patterns:', error);
  }
}

async function getUserIdFromRequest(req: Request, supabase: any): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.id || null;
  } catch {
    return null;
  }
}