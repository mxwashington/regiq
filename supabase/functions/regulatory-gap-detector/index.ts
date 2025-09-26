import { logger } from '@/lib/logger';

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Alert {
  id: string;
  title: string;
  summary: string;
  full_content?: string;
  source: string;
  agency?: string;
  published_date: string;
  external_url?: string;
}

interface ProcessFailurePattern {
  alert_id: string;
  failure_type: string;
  failure_category: string;
  severity_level: string;
  affected_systems: string[];
  root_cause_analysis: any;
  regulatory_gaps: any;
  similar_pattern_count: number;
  trend_indicators: any;
}

interface ImportComplianceGap {
  alert_id: string;
  product_type: string;
  origin_country?: string;
  importer_name?: string;
  gap_type: string;
  compliance_requirements_missed: string[];
  potential_risk_level: string;
  affected_facilities: any[];
  remediation_needed: any;
  timeline_to_fix: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { alert_ids, analyze_all = false } = await req.json();
    
    logger.info('Starting regulatory gap detection analysis', { alert_ids, analyze_all });

    // Get alerts to analyze
    let query = supabase
      .from('alerts')
      .select('*')
      .order('published_date', { ascending: false });

    if (!analyze_all && alert_ids?.length > 0) {
      query = query.in('id', alert_ids);
    } else if (!analyze_all) {
      // Analyze recent alerts if no specific IDs provided
      query = query.limit(50);
    }

    const { data: alerts, error: alertsError } = await query;

    if (alertsError) {
      logger.error('Error fetching alerts:', alertsError);
      throw alertsError;
    }

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No alerts found for analysis',
        analyzed_count: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.info(`Analyzing ${alerts.length} alerts for regulatory gaps`);

    const processFailures: ProcessFailurePattern[] = [];
    const importGaps: ImportComplianceGap[] = [];
    let analyzed_count = 0;

    for (const alert of alerts) {
      try {
        // Analyze for process failure patterns
        const processFailure = analyzeProcessFailure(alert);
        if (processFailure) {
          processFailures.push(processFailure);
        }

        // Analyze for import compliance gaps
        const importGap = analyzeImportCompliance(alert);
        if (importGap) {
          importGaps.push(importGap);
        }

        analyzed_count++;
      } catch (error) {
        logger.error(`Error analyzing alert ${alert.id}:`, error);
      }
    }

    // Save detected patterns to database
    if (processFailures.length > 0) {
      const { error: processError } = await supabase
        .from('process_failure_patterns')
        .upsert(processFailures, { onConflict: 'alert_id' });

      if (processError) {
        logger.error('Error saving process failure patterns:', processError);
      } else {
        logger.info(`Saved ${processFailures.length} process failure patterns`);
      }
    }

    if (importGaps.length > 0) {
      const { error: importError } = await supabase
        .from('import_compliance_gaps')
        .upsert(importGaps, { onConflict: 'alert_id' });

      if (importError) {
        logger.error('Error saving import compliance gaps:', importError);
      } else {
        logger.info(`Saved ${importGaps.length} import compliance gaps`);
      }
    }

    // Generate gap indicators for users (simplified for this implementation)
    await generateGapIndicators(supabase, processFailures, importGaps);

    return new Response(JSON.stringify({
      success: true,
      analyzed_count,
      process_failures_detected: processFailures.length,
      import_gaps_detected: importGaps.length,
      patterns: {
        process_failures: processFailures.map(pf => ({
          failure_type: pf.failure_type,
          severity: pf.severity_level,
          affected_systems: pf.affected_systems
        })),
        import_gaps: importGaps.map(ig => ({
          gap_type: ig.gap_type,
          product_type: ig.product_type,
          risk_level: ig.potential_risk_level
        }))
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Error in regulatory gap detector:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeProcessFailure(alert: Alert): ProcessFailurePattern | null {
  const title = alert.title.toLowerCase();
  const summary = alert.summary.toLowerCase();
  const content = (alert.full_content || '').toLowerCase();
  const combinedText = `${title} ${summary} ${content}`;

  // Detect Trader Joe's-style import reinspection bypasses
  const importReinspectionIndicators = [
    'without.*import.*reinspection',
    'import.*reinspection.*bypass',
    'without.*benefit.*reinspection',
    'failed.*import.*inspection',
    'import.*oversight.*failure',
    'customs.*inspection.*missed',
    'border.*inspection.*gap'
  ];

  // Detect other process breakdown patterns
  const processBreakdownIndicators = [
    'process.*breakdown',
    'system.*failure',
    'oversight.*failure',
    'administrative.*error',
    'procedural.*gap',
    'compliance.*breakdown',
    'regulatory.*miss',
    'checkpoint.*bypass',
    'verification.*failure'
  ];

  // Detect administrative/systemic failures
  const administrativeFailureIndicators = [
    'administrative.*recall',
    'paperwork.*error',
    'documentation.*failure',
    'certification.*missing',
    'approval.*bypass',
    'permit.*violation',
    'registration.*gap'
  ];

  let failureType: string | null = null;
  let severity = 'medium';
  let affectedSystems: string[] = [];
  let regulatoryGaps: any = {};

  // Check for import reinspection failures (like Trader Joe's)
  for (const indicator of importReinspectionIndicators) {
    if (new RegExp(indicator).test(combinedText)) {
      failureType = 'import_reinspection';
      severity = 'high'; // Import failures are serious
      affectedSystems = ['Import Control System', 'FDA Reinspection Process', 'Border Security'];
      regulatoryGaps = {
        missed_checkpoints: ['Import reinspection'],
        affected_regulations: ['FDA Import Program', '21 CFR 1.91'],
        risk_areas: ['Product safety verification', 'Supply chain integrity']
      };
      break;
    }
  }

  // Check for process breakdowns
  if (!failureType) {
    for (const indicator of processBreakdownIndicators) {
      if (new RegExp(indicator).test(combinedText)) {
        failureType = 'process_breakdown';
        severity = 'medium';
        affectedSystems = ['Quality Control', 'Compliance Management', 'Internal Processes'];
        regulatoryGaps = {
          process_failures: ['Internal control breakdown'],
          risk_areas: ['Process reliability', 'Quality assurance']
        };
        break;
      }
    }
  }

  // Check for administrative failures
  if (!failureType) {
    for (const indicator of administrativeFailureIndicators) {
      if (new RegExp(indicator).test(combinedText)) {
        failureType = 'oversight_failure';
        severity = 'medium';
        affectedSystems = ['Administrative Controls', 'Documentation System', 'Compliance Tracking'];
        regulatoryGaps = {
          administrative_gaps: ['Documentation failure', 'Process oversight'],
          risk_areas: ['Regulatory compliance', 'Record keeping']
        };
        break;
      }
    }
  }

  if (!failureType) return null;

  return {
    alert_id: alert.id,
    failure_type: failureType,
    failure_category: failureType === 'import_reinspection' ? 'systemic' : 'administrative',
    severity_level: severity,
    affected_systems: affectedSystems,
    root_cause_analysis: {
      identified_causes: extractRootCauses(combinedText),
      contributing_factors: extractContributingFactors(combinedText)
    },
    regulatory_gaps: regulatoryGaps,
    similar_pattern_count: 1,
    trend_indicators: {
      urgency_level: severity === 'high' ? 'immediate_action' : 'monitor',
      pattern_confidence: calculatePatternConfidence(combinedText, failureType)
    }
  };
}

function analyzeImportCompliance(alert: Alert): ImportComplianceGap | null {
  const title = alert.title.toLowerCase();
  const summary = alert.summary.toLowerCase();
  const content = (alert.full_content || '').toLowerCase();
  const combinedText = `${title} ${summary} ${content}`;

  // Look for import-related compliance issues
  const importIndicators = [
    'import',
    'customs',
    'border',
    'entry',
    'foreign',
    'international'
  ];

  const hasImportConnection = importIndicators.some(indicator => 
    combinedText.includes(indicator)
  );

  if (!hasImportConnection) return null;

  // Extract product information
  const productType = extractProductType(combinedText);
  const originCountry = extractOriginCountry(combinedText);
  const importerName = extractImporterName(combinedText);

  // Determine gap type
  let gapType = 'documentation_gap';
  let riskLevel = 'medium';
  let timelineToFix = 'medium_term';

  if (combinedText.includes('reinspection')) {
    gapType = 'reinspection_bypass';
    riskLevel = 'high';
    timelineToFix = 'immediate';
  } else if (combinedText.includes('certification')) {
    gapType = 'certification_missing';
    riskLevel = 'medium';
    timelineToFix = 'short_term';
  }

  const missedRequirements = extractMissedRequirements(combinedText);

  return {
    alert_id: alert.id,
    product_type: productType,
    origin_country: originCountry,
    importer_name: importerName,
    gap_type: gapType,
    compliance_requirements_missed: missedRequirements,
    potential_risk_level: riskLevel,
    affected_facilities: [],
    remediation_needed: {
      immediate_actions: gapType === 'reinspection_bypass' ? 
        ['Implement import verification protocols', 'Audit import processes'] :
        ['Review documentation requirements', 'Update compliance procedures'],
      long_term_improvements: ['Strengthen import controls', 'Enhance supplier verification']
    },
    timeline_to_fix: timelineToFix
  };
}

async function generateGapIndicators(supabase: any, processFailures: ProcessFailurePattern[], importGaps: ImportComplianceGap[]) {
  // For this implementation, we'll create system-wide gap indicators
  // In production, this would be more sophisticated and user-specific

  const indicators = [];

  if (processFailures.length > 0) {
    const highSeverityCount = processFailures.filter(pf => pf.severity_level === 'high').length;
    const riskScore = Math.min(90, 30 + (highSeverityCount * 20));

    indicators.push({
      user_id: null, // System-wide indicator
      indicator_type: 'process_pattern',
      risk_score: riskScore,
      trend_direction: highSeverityCount > 2 ? 'worsening' : 'stable',
      affected_areas: ['Import Control', 'Process Oversight', 'Regulatory Compliance'],
      evidence_alerts: processFailures.map(pf => pf.alert_id),
      gap_description: `Detected ${processFailures.length} process failure patterns, including ${highSeverityCount} high-severity import reinspection bypasses`,
      recommended_actions: [
        'Audit import verification processes',
        'Implement systematic compliance checkpoints',
        'Review supplier verification protocols',
        'Strengthen regulatory oversight procedures'
      ],
      priority_level: highSeverityCount > 0 ? 'high' : 'medium'
    });
  }

  if (importGaps.length > 0) {
    const criticalGaps = importGaps.filter(ig => ig.potential_risk_level === 'high').length;
    const riskScore = Math.min(85, 25 + (criticalGaps * 15));

    indicators.push({
      user_id: null, // System-wide indicator
      indicator_type: 'supplier_risk',
      risk_score: riskScore,
      trend_direction: criticalGaps > 1 ? 'worsening' : 'stable',
      affected_areas: ['Import Compliance', 'Supplier Management', 'Product Safety'],
      evidence_alerts: importGaps.map(ig => ig.alert_id),
      gap_description: `Identified ${importGaps.length} import compliance gaps affecting product safety verification`,
      recommended_actions: [
        'Enhanced supplier due diligence',
        'Implement import compliance monitoring',
        'Review international supplier controls',
        'Strengthen border inspection coordination'
      ],
      priority_level: criticalGaps > 0 ? 'high' : 'medium'
    });
  }

  if (indicators.length > 0) {
    const { error } = await supabase
      .from('regulatory_gap_indicators')
      .upsert(indicators, { onConflict: 'indicator_type' });

    if (error) {
      logger.error('Error saving gap indicators:', error);
    } else {
      logger.info(`Generated ${indicators.length} gap indicators`);
    }
  }
}

// Helper functions for text analysis
function extractRootCauses(text: string): string[] {
  const causes = [];
  if (text.includes('without') && text.includes('inspection')) {
    causes.push('Bypassed mandatory inspection process');
  }
  if (text.includes('administrative')) {
    causes.push('Administrative oversight failure');
  }
  if (text.includes('system') && text.includes('failure')) {
    causes.push('System process breakdown');
  }
  return causes;
}

function extractContributingFactors(text: string): string[] {
  const factors = [];
  if (text.includes('communication')) {
    factors.push('Communication breakdown');
  }
  if (text.includes('training')) {
    factors.push('Training deficiency');
  }
  if (text.includes('oversight')) {
    factors.push('Inadequate oversight');
  }
  return factors;
}

function calculatePatternConfidence(text: string, failureType: string): number {
  let confidence = 50;
  
  if (failureType === 'import_reinspection' && text.includes('reinspection')) {
    confidence += 30;
  }
  if (text.includes('without')) {
    confidence += 20;
  }
  if (text.includes('administrative')) {
    confidence += 15;
  }
  
  return Math.min(100, confidence);
}

function extractProductType(text: string): string {
  const productKeywords = [
    'pizza', 'dairy', 'meat', 'poultry', 'seafood', 'produce', 'beverage',
    'packaged food', 'frozen', 'fresh', 'canned', 'dried', 'supplement'
  ];
  
  for (const keyword of productKeywords) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }
  
  return 'food product';
}

function extractOriginCountry(text: string): string | undefined {
  const countries = [
    'italy', 'china', 'mexico', 'canada', 'brazil', 'india', 'thailand',
    'vietnam', 'chile', 'argentina', 'australia', 'new zealand'
  ];
  
  for (const country of countries) {
    if (text.includes(country)) {
      return country.charAt(0).toUpperCase() + country.slice(1);
    }
  }
  
  return undefined;
}

function extractImporterName(text: string): string | undefined {
  // Simple pattern matching for company names - in production this would be more sophisticated
  const companyPatterns = [
    /trader joe'?s/i,
    /whole foods/i,
    /costco/i,
    /walmart/i,
    /kroger/i
  ];
  
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return undefined;
}

function extractMissedRequirements(text: string): string[] {
  const requirements = [];
  
  if (text.includes('reinspection')) {
    requirements.push('Import reinspection');
  }
  if (text.includes('certification')) {
    requirements.push('Product certification');
  }
  if (text.includes('documentation')) {
    requirements.push('Required documentation');
  }
  if (text.includes('approval')) {
    requirements.push('Regulatory approval');
  }
  
  return requirements;
}