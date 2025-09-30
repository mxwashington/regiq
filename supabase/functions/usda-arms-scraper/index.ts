import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ARMSDataPoint {
  year: number;
  report: string;
  category: string;
  value: number;
  unit: string;
}

const PRODUCTION_SECTORS = [
  'Dairy',
  'Poultry and eggs',
  'Beef cattle',
  'Vegetables and melons',
  'Fruits and tree nuts',
  'Grains and oilseeds'
];

const FINANCIAL_METRICS = [
  'debt repayment capacity',
  'government payments',
  'debt-to-asset ratio',
  'operating profit margin'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ARMS_API_KEY');
    if (!apiKey) {
      throw new Error('ARMS_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🌾 Starting USDA ARMS economic data collection...');

    // Start sync log
    const { data: logData } = await supabase.rpc('start_sync_log', {
      p_source: 'USDA-ARMS',
      p_metadata: { trigger: 'manual', timestamp: new Date().toISOString() }
    });
    const logId = logData as string;

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear - 2]; // Last 2 years
    
    let totalProcessed = 0;
    let totalSaved = 0;
    const results: Record<string, number> = {};

    // Fetch data for each sector and metric combination
    for (const sector of PRODUCTION_SECTORS) {
      for (const metric of FINANCIAL_METRICS) {
        try {
          console.log(`📊 Fetching ${metric} for ${sector}...`);

          const requestBody = {
            year: years,
            report: metric,
            category: sector,
            api_key: apiKey
          };

          const response = await fetch('https://api.ers.usda.gov/data/arms/surveydata', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'RegIQ-ARMS-Monitor/1.0 (Regulatory Compliance Platform)',
              'Accept': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            console.error(`❌ Failed to fetch ${metric} for ${sector}: ${response.status} ${response.statusText}`);
            if (response.status === 403) {
              console.error('⚠️ 403 Forbidden - API may require registration or different authentication');
            }
            // Don't fail entire job on single request failure
            continue;
          }

          const data = await response.json();
          
          if (!data || !Array.isArray(data.data)) {
            console.log(`⚠️  No data returned for ${metric} - ${sector}`);
            continue;
          }

          // Process each data point
          for (const dataPoint of data.data) {
            totalProcessed++;

            // Create a unique identifier for deduplication
            const uniqueId = `${sector}-${metric}-${dataPoint.year}`;

            // Check if this alert already exists
            const { data: existing } = await supabase
              .from('alerts')
              .select('id')
              .eq('source', 'USDA-ARMS')
              .contains('full_content', `"unique_id":"${uniqueId}"`)
              .single();

            if (existing) {
              console.log(`⏭️  Skipping existing alert: ${uniqueId}`);
              continue;
            }

            // Determine urgency based on the metric value
            const urgency = determineUrgency(metric, dataPoint.value);
            const urgencyScore = urgency === 'High' ? 7 : urgency === 'Medium' ? 5 : 3;

            // Create alert (removed data_classification to use default)
            const alertData = {
              title: `Economic Alert: ${sector} farms showing ${interpretMetric(metric, dataPoint.value)}`,
              summary: buildEconomicSummary(sector, metric, dataPoint),
              source: 'USDA-ARMS',
              agency: 'USDA',
              urgency,
              urgency_score: urgencyScore,
              published_date: new Date().toISOString(),
              external_url: `https://www.ers.usda.gov/data-products/arms-farm-financial-and-crop-production-practices/`,
              full_content: JSON.stringify({
                unique_id: uniqueId,
                economicData: {
                  sector,
                  metric,
                  year: dataPoint.year,
                  value: dataPoint.value,
                  unit: dataPoint.unit || 'percent',
                }
              }),
            };

            const { error: insertError } = await supabase
              .from('alerts')
              .insert(alertData);

            if (insertError) {
              console.error(`❌ Failed to insert ${uniqueId}:`, insertError);
            } else {
              totalSaved++;
              console.log(`✅ Saved: ${uniqueId}`);
            }
          }

          results[`${sector}-${metric}`] = data.data.length;

          // Rate limiting: wait 1 second between requests
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`❌ Error processing ${sector} - ${metric}:`, error);
        }
      }
    }

    console.log(`✅ USDA ARMS scraper completed: ${totalSaved}/${totalProcessed} saved`);

    // Finish sync log with success
    await supabase.rpc('finish_sync_log', {
      p_log_id: logId,
      p_status: 'success',
      p_alerts_fetched: totalProcessed,
      p_alerts_inserted: totalSaved,
      p_alerts_skipped: totalProcessed - totalSaved,
      p_results: { 
        sectorsProcessed: PRODUCTION_SECTORS.length,
        metricsProcessed: FINANCIAL_METRICS.length,
        results 
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed,
        totalSaved,
        sectorsProcessed: PRODUCTION_SECTORS.length,
        metricsProcessed: FINANCIAL_METRICS.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ USDA ARMS scraper error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log failure to sync logs
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabase.rpc('finish_sync_log', {
        p_log_id: (typeof logId !== 'undefined' ? logId : null),
        p_status: 'error',
        p_errors: [errorMessage]
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function determineUrgency(metric: string, value: number): string {
  // Higher debt-to-asset ratio = higher risk
  if (metric.includes('debt-to-asset')) {
    if (value > 0.4) return 'High';
    if (value > 0.25) return 'Medium';
    return 'Low';
  }
  
  // Lower debt repayment capacity = higher risk
  if (metric.includes('debt repayment')) {
    if (value < 50) return 'High';
    if (value < 75) return 'Medium';
    return 'Low';
  }
  
  // Lower profit margin = higher risk
  if (metric.includes('profit margin')) {
    if (value < 0) return 'High';
    if (value < 5) return 'Medium';
    return 'Low';
  }
  
  return 'Medium';
}

function interpretMetric(metric: string, value: number): string {
  if (metric.includes('debt repayment')) {
    if (value < 50) return 'critical debt repayment stress';
    if (value < 75) return 'elevated debt repayment pressure';
    return 'stable debt repayment capacity';
  }
  
  if (metric.includes('debt-to-asset')) {
    if (value > 0.4) return 'high financial leverage';
    if (value > 0.25) return 'moderate financial leverage';
    return 'healthy debt levels';
  }
  
  if (metric.includes('profit margin')) {
    if (value < 0) return 'operating losses';
    if (value < 5) return 'thin profit margins';
    return 'stable profitability';
  }
  
  if (metric.includes('government payments')) {
    return `${value}% income from government support`;
  }
  
  return metric;
}

function buildEconomicSummary(sector: string, metric: string, dataPoint: any): string {
  const value = dataPoint.value;
  const year = dataPoint.year;
  const unit = dataPoint.unit || '%';
  
  let summary = `${sector} operations reported ${value}${unit} ${metric} in ${year}. `;
  
  // Add context about compliance risk
  if (metric.includes('debt') && value > 30) {
    summary += 'High financial stress in this sector may increase supplier compliance risks due to cost-cutting pressures. Monitor suppliers for potential quality control shortcuts.';
  } else if (metric.includes('profit') && value < 5) {
    summary += 'Narrow profit margins suggest economic pressure. Suppliers may reduce investment in compliance infrastructure and training.';
  } else if (metric.includes('government payments') && value > 20) {
    summary += 'Heavy reliance on government support indicates economic vulnerability. Regulatory changes could impact supplier stability.';
  } else {
    summary += 'Economic conditions in this sector may affect supplier resource allocation for compliance activities.';
  }
  
  return summary;
}
