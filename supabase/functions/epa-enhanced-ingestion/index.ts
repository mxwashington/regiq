import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const logger = {
  info: (msg: string, data?: any) => console.info(`[EPA] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[EPA] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[EPA] ${msg}`, data || '')
};

// Food-specific keywords for relevance filtering
const FOOD_KEYWORDS = [
  'food', 'pesticide', 'water contamination', 'manufacturing', 'facility',
  'agricultural', 'beverage', 'meat', 'dairy', 'produce', 'processing plant',
  'slaughterhouse', 'cannery', 'bottling', 'packaging', 'restaurant', 'grocery'
];

// Food manufacturing NAICS codes
const FOOD_NAICS_CODES = ['311', '3111', '3112', '3113', '3114', '3115', '3116', '3117', '3118', '3119', '312'];

interface EPAAlert {
  title: string;
  source: string;
  urgency: string;
  summary: string;
  published_date: string;
  external_url: string;
  full_content: string;
  agency: string;
  region?: string;
  external_id: string;
  relevance_score?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { test_mode = false, days = 30 } = await req.json().catch(() => ({}));
    
    logger.info(`EPA Enhanced Ingestion started`, { test_mode, days });

    const results = {
      echo: { success: false, processed: 0, errors: [] as string[] },
      regulations_gov: { success: false, processed: 0, errors: [] as string[] }
    };

    // Try ECHO API first (preferred for facility data)
    try {
      const echoResult = await ingestFromECHO(supabase, days, test_mode);
      results.echo = echoResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("ECHO API failed", { error: errorMsg });
      results.echo.errors.push(errorMsg);
    }

    // Try Regulations.gov API (fallback and additional coverage)
    try {
      const regsGovResult = await ingestFromRegulationsGov(supabase, days, test_mode);
      results.regulations_gov = regsGovResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Regulations.gov API failed", { error: errorMsg });
      results.regulations_gov.errors.push(errorMsg);
    }

    const totalProcessed = results.echo.processed + results.regulations_gov.processed;
    const hasSuccess = results.echo.success || results.regulations_gov.success;

    // Log to source_health_logs
    await supabase.from('source_health_logs').insert({
      source_name: 'EPA',
      status: hasSuccess ? (totalProcessed > 0 ? 'healthy' : 'stale') : 'error',
      last_check: new Date().toISOString(),
      response_time_ms: 0,
      records_found: totalProcessed,
      error_message: hasSuccess ? null : results.echo.errors.concat(results.regulations_gov.errors).join('; '),
      metadata: {
        test_mode,
        echo_processed: results.echo.processed,
        regulations_gov_processed: results.regulations_gov.processed,
        echo_errors: results.echo.errors,
        regulations_gov_errors: results.regulations_gov.errors
      }
    });

    return new Response(JSON.stringify({
      success: hasSuccess,
      message: `EPA ingestion ${test_mode ? '(TEST MODE)' : ''}: Processed ${totalProcessed} records`,
      totalProcessed,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("EPA ingestion failed", { error: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function ingestFromECHO(supabase: any, days: number, testMode: boolean) {
  const EPA_ECHO_BASE = 'https://echo.epa.gov/tools/web-services';
  const apiKey = Deno.env.get("EPA_ECHO_API_KEY");
  
  logger.info("Starting ECHO API ingestion", { hasApiKey: !!apiKey, days, testMode });

  let totalProcessed = 0;
  const errors: string[] = [];
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    // Query food manufacturing facilities with violations
    for (const naicsCode of FOOD_NAICS_CODES.slice(0, testMode ? 2 : 5)) {
      try {
        const params = new URLSearchParams({
          output: 'JSON',
          p_naics: naicsCode,
          p_act: 'Y', // Active facilities
          p_qiv: 'Y', // Quarters in Violation
          responseset: '1',
          p_rows: testMode ? '10' : '50'
        });

        const url = `${EPA_ECHO_BASE}/get_facilities.json?${params}`;
        logger.info(`Fetching ECHO data for NAICS ${naicsCode}`);

        const headers: HeadersInit = {
          'User-Agent': 'RegIQ-EPA-Client/1.0',
          'Accept': 'application/json'
        };

        if (apiKey) {
          headers['X-Api-Key'] = apiKey;
        }

        const response = await fetchWithRetry(url, { headers }, 3, 1000);

        if (!response.ok) {
          const errorMsg = `ECHO API error for NAICS ${naicsCode}: ${response.status}`;
          logger.warn(errorMsg);
          errors.push(errorMsg);
          
          // Handle rate limiting
          if (response.status === 429) {
            logger.warn("Rate limit hit, waiting 60s");
            await new Promise(resolve => setTimeout(resolve, 60000));
          }
          continue;
        }

        const data = await response.json();

        if (!data.Results?.Results || data.Results.Results.length === 0) {
          logger.info(`No violations found for NAICS ${naicsCode}`);
          continue;
        }

        const facilities = data.Results.Results;
        logger.info(`Found ${facilities.length} facilities with violations for NAICS ${naicsCode}`);

        for (const facility of facilities) {
          if (facility.CurrVioFlag !== 'Y') continue;

          const relevanceScore = calculateFoodRelevance(facility.FacName || '', '');
          
          // Use actual violation date instead of "now"
          const violationDate = facility.QuarterlyViolationDate || 
                                facility.LastInspectionDate || 
                                new Date().toISOString();
          
          const alert: EPAAlert = {
            title: `EPA Compliance Violation: ${facility.FacName || 'Unknown Facility'}`,
            source: 'EPA',
            urgency: determineUrgency(facility),
            summary: buildFacilitySummary(facility),
            published_date: violationDate,
            external_url: `https://echo.epa.gov/detailed-facility-report?fid=${facility.RegistryID}`,
            full_content: JSON.stringify(facility),
            agency: 'EPA',
            region: facility.FacState || 'US',
            external_id: `EPA-ECHO-${facility.RegistryID}`,
            relevance_score: relevanceScore
          };

          // Check for duplicates
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('external_id', alert.external_id)
            .gte('published_date', cutoffDate.toISOString())
            .maybeSingle();

          if (!existing) {
            const tableName = testMode ? 'epa_test' : 'alerts';
            
            if (testMode) {
              // For test mode, try to insert but continue on error
              const { error: insertError } = await supabase
                .from(tableName)
                .insert(alert)
                .select()
                .single();
              
              if (insertError) {
                logger.warn(`Test insert failed (table may not exist): ${insertError.message}`);
              }
            } else {
              const { error: insertError } = await supabase
                .from(tableName)
                .insert(alert);

              if (insertError) {
                logger.error(`Failed to insert alert: ${insertError.message}`);
                errors.push(`Insert error: ${insertError.message}`);
                continue;
              }
            }

            totalProcessed++;
            logger.info(`Added EPA ECHO alert: ${alert.title} (relevance: ${relevanceScore})`);
          }
        }

        // Rate limiting - pause between NAICS queries
        if (!testMode) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (naicsError) {
        const errorMsg = `Error processing NAICS ${naicsCode}: ${naicsError}`;
        logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return {
      success: true,
      processed: totalProcessed,
      errors
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("ECHO ingestion failed", { error: errorMsg });
    return {
      success: false,
      processed: totalProcessed,
      errors: [...errors, errorMsg]
    };
  }
}

async function ingestFromRegulationsGov(supabase: any, days: number, testMode: boolean) {
  const REGULATIONS_BASE_URL = 'https://api.regulations.gov/v4';
  const apiKey = Deno.env.get("REGULATIONS_GOV_API_KEY");
  
  logger.info("Starting Regulations.gov ingestion", { hasApiKey: !!apiKey, days, testMode });

  if (!apiKey) {
    logger.warn("Regulations.gov API key not configured, skipping");
    return {
      success: false,
      processed: 0,
      errors: ["API key not configured"]
    };
  }

  let totalProcessed = 0;
  const errors: string[] = [];
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Fetch EPA documents from last 7 days
    const searchParams = new URLSearchParams({
      'api_key': apiKey,
      'filter[agencyId]': 'EPA',
      'filter[postedDate][ge]': sevenDaysAgo.toISOString().split('T')[0],
      'page[size]': testMode ? '10' : '50',
      'sort': '-postedDate'
    });

    const url = `${REGULATIONS_BASE_URL}/documents?${searchParams}`;
    logger.info("Fetching from Regulations.gov");

    const response = await fetchWithRetry(url, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/vnd.api+json'
      }
    }, 3, 1000);

    if (!response.ok) {
      const errorMsg = `Regulations.gov API error: ${response.status}`;
      logger.warn(errorMsg);
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        logger.warn(`Rate limit hit, retry after ${retryAfter}s`);
      }
      
      return {
        success: false,
        processed: 0,
        errors: [errorMsg]
      };
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      logger.info("No documents found from Regulations.gov");
      return {
        success: true,
        processed: 0,
        errors: []
      };
    }

    logger.info(`Found ${data.data.length} documents from Regulations.gov`);

    for (const doc of data.data) {
      try {
        const relevanceScore = calculateFoodRelevance(
          doc.attributes?.title || '',
          doc.attributes?.summary || ''
        );

        const alert: EPAAlert = {
          title: doc.attributes?.title || 'Untitled EPA Document',
          source: 'EPA',
          urgency: determineUrgencyFromDocument(doc.attributes),
          summary: doc.attributes?.summary || doc.attributes?.title || '',
          published_date: new Date(doc.attributes?.postedDate).toISOString(),
          external_url: `https://www.regulations.gov/document/${doc.id}`,
          full_content: JSON.stringify(doc),
          agency: 'EPA',
          region: 'US',
          external_id: `EPA-REG-${doc.id}`,
          relevance_score: relevanceScore
        };

        // Check for duplicates
        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('external_id', alert.external_id)
          .gte('published_date', cutoffDate.toISOString())
          .maybeSingle();

        if (!existing) {
          const tableName = testMode ? 'epa_test' : 'alerts';
          
          if (testMode) {
            const { error: insertError } = await supabase
              .from(tableName)
              .insert(alert)
              .select()
              .single();
            
            if (insertError) {
              logger.warn(`Test insert failed (table may not exist): ${insertError.message}`);
            }
          } else {
            const { error: insertError } = await supabase
              .from(tableName)
              .insert(alert);

            if (insertError) {
              logger.error(`Failed to insert alert: ${insertError.message}`);
              errors.push(`Insert error: ${insertError.message}`);
              continue;
            }
          }

          totalProcessed++;
          logger.info(`Added EPA Regulations.gov alert: ${alert.title} (relevance: ${relevanceScore})`);
        }
      } catch (docError) {
        const errorMsg = `Error processing document: ${docError}`;
        logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return {
      success: true,
      processed: totalProcessed,
      errors
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Regulations.gov ingestion failed", { error: errorMsg });
    return {
      success: false,
      processed: totalProcessed,
      errors: [...errors, errorMsg]
    };
  }
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number, baseDelay: number): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 404 || response.status === 403) {
        return response;
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          logger.warn(`Retrying after ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.warn(`Network error, retrying after ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

function calculateFoodRelevance(title: string, summary: string): number {
  const text = `${title} ${summary}`.toLowerCase();
  let score = 0;
  let matchedKeywords = 0;

  for (const keyword of FOOD_KEYWORDS) {
    if (text.includes(keyword)) {
      matchedKeywords++;
      score += 10;
    }
  }

  // Boost for multiple keyword matches
  if (matchedKeywords >= 3) score += 20;
  else if (matchedKeywords >= 2) score += 10;

  // Normalize to 0-100
  return Math.min(100, score);
}

function buildFacilitySummary(facility: any): string {
  const parts = [];

  parts.push(`Facility: ${facility.FacName || 'Unknown'}`);

  if (facility.FacCity && facility.FacState) {
    parts.push(`Location: ${facility.FacCity}, ${facility.FacState}`);
  }

  if (facility.CurrVioFlag === 'Y') {
    parts.push('Currently in violation');
  }

  if (facility.Quarters3yrComplStatus) {
    parts.push(`3-Year Compliance: ${facility.Quarters3yrComplStatus}`);
  }

  if (facility.Infea5yrFlag === 'Y') {
    parts.push('Formal enforcement action in last 5 years');
  }

  return parts.join(' | ');
}

function determineUrgency(facility: any): string {
  if (facility.CurrVioFlag === 'Y' && facility.Infea5yrFlag === 'Y') {
    return 'High';
  }
  if (facility.CurrVioFlag === 'Y') {
    return 'High';
  }
  if (facility.Infea5yrFlag === 'Y') {
    return 'Medium';
  }
  return 'Medium';
}

function determineUrgencyFromDocument(attributes: any): string {
  const title = (attributes?.title || '').toLowerCase();
  const summary = (attributes?.summary || '').toLowerCase();
  const text = `${title} ${summary}`;

  const highUrgencyKeywords = [
    'recall', 'emergency', 'immediate', 'urgent', 'critical', 'danger',
    'hazard', 'death', 'injury', 'contamination', 'outbreak', 'violation'
  ];

  const mediumUrgencyKeywords = [
    'rule', 'regulation', 'compliance', 'requirement', 'standard',
    'guideline', 'policy', 'proposed', 'final'
  ];

  if (highUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'High';
  } else if (mediumUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'Medium';
  }

  return 'Low';
}
