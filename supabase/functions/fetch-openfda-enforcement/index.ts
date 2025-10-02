import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { CircuitBreaker } from '../_shared/circuit-breaker.ts';
import { logStructuredError, logInfo } from '../_shared/structured-logging.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logger = {
  info: (msg: string, data?: any) => console.info(`[FDA-ENFORCEMENT] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[FDA-ENFORCEMENT] ${msg}`, data || '')
};

// Rate limiting configuration
const RATE_LIMIT_WITH_KEY = 240; // requests per hour with API key
const RATE_LIMIT_WITHOUT_KEY = 1000; // requests per day without API key
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

// Circuit breaker: 3 failures = 15 min cooldown
const circuitBreaker = new CircuitBreaker(3, 15 * 60 * 1000, 'FDA-Enforcement');

interface FDAEnforcementRecord {
  recall_number: string;
  classification: string;
  status: string;
  distribution_pattern?: string;
  product_description: string;
  code_info?: string;
  reason_for_recall: string;
  recalling_firm: string;
  city?: string;
  state?: string;
  country?: string;
  voluntary_mandated?: string;
  initial_firm_notification?: string;
  recall_initiation_date?: string;
  center_classification_date?: string;
  report_date: string;
  termination_date?: string;
  more_code_info?: string;
  address_1?: string;
  address_2?: string;
  postal_code?: string;
  event_id?: string;
  product_type?: string;
}

async function fetchFDAEnforcement(
  endpoint: string,
  apiKey: string | null,
  days: number = 30,
  supabase: any
): Promise<FDAEnforcementRecord[]> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
  
  const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
  const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const searchQuery = `report_date:[${startDateStr}+TO+${endDateStr}]`;
  
  logger.info(`Fetching FDA enforcement: ${endpoint}`, { days, searchQuery });
  
  // Check rate limiting
  await checkRateLimit(supabase, apiKey);
  
  // Execute with circuit breaker
  return await circuitBreaker.execute(async () => {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const url = new URL(`https://api.fda.gov${endpoint}`);
        url.searchParams.set('search', searchQuery);
        url.searchParams.set('limit', '100');
        
        if (apiKey) {
          url.searchParams.set('api_key', apiKey);
        }
        
        logger.info(`Attempt ${attempt + 1}/${maxRetries}: ${url.toString()}`);
        
        const response = await fetch(url.toString(), {
          signal: AbortSignal.timeout(30000),
          headers: {
            'User-Agent': 'RegIQ/1.0',
            'Accept': 'application/json'
          }
        });
        
        // Log rate limit
        await logRateLimit(supabase, apiKey);
        
        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          
          // Handle rate limiting (429)
          if (response.status === 429 && attempt < maxRetries - 1) {
            const retryAfter = response.headers.get('Retry-After');
            const backoffMs = retryAfter ? parseInt(retryAfter) * 1000 : calculateBackoff(attempt);
            logger.info(`Rate limited (429), retrying in ${backoffMs}ms`);
            await sleep(backoffMs);
            continue;
          }
          
          // Handle server errors (500, 503, 504)
          if ([500, 503, 504].includes(response.status) && attempt < maxRetries - 1) {
            const backoffMs = calculateBackoff(attempt);
            logger.info(`Server error ${response.status}, retrying in ${backoffMs}ms`);
            await sleep(backoffMs);
            continue;
          }
          
          throw new Error(`FDA API ${response.status}: ${errorBody.substring(0, 200)}`);
        }
        
        const data = await response.json();
        
        if (!data.results || !Array.isArray(data.results)) {
          throw new Error('FDA API response missing results array');
        }
        
        logger.info(`Successfully fetched ${data.results.length} records`);
        return data.results;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.error(`Attempt ${attempt + 1} failed:`, lastError.message);
        
        if (attempt < maxRetries - 1) {
          const backoffMs = calculateBackoff(attempt);
          await sleep(backoffMs);
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  });
}

// Calculate exponential backoff with jitter
function calculateBackoff(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // 0-1 second jitter
  return exponentialDelay + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Rate limiting functions
async function checkRateLimit(supabase: any, apiKey: string | null): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);
  
  const { count } = await supabase
    .from('api_health_checks')
    .select('*', { count: 'exact', head: true })
    .eq('api_name', 'FDA')
    .gte('checked_at', windowStart.toISOString());
  
  const limit = apiKey ? RATE_LIMIT_WITH_KEY : RATE_LIMIT_WITHOUT_KEY;
  
  if (count && count >= limit) {
    throw new Error(`Rate limit exceeded: ${count}/${limit} requests in last hour`);
  }
}

async function logRateLimit(supabase: any, apiKey: string | null): Promise<void> {
  await supabase.from('api_health_checks').insert({
    api_name: 'FDA',
    endpoint: '/enforcement',
    status: 'success',
    checked_at: new Date().toISOString(),
    metadata: { has_api_key: !!apiKey }
  });
}

async function saveEnforcementRecords(
  supabase: any,
  records: FDAEnforcementRecord[],
  sourceName: string
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  
  // Remove duplicates based on recall_number
  const uniqueRecords = new Map<string, FDAEnforcementRecord>();
  for (const record of records) {
    if (record.recall_number && !uniqueRecords.has(record.recall_number)) {
      uniqueRecords.set(record.recall_number, record);
    }
  }
  
  logger.info(`Processing ${uniqueRecords.size} unique records (${records.length - uniqueRecords.size} duplicates removed)`);
  
  for (const record of uniqueRecords.values()) {
    try {
      // Validate required fields
      if (!record.recall_number || !record.product_description || !record.report_date) {
        logger.error('Skipping record with missing required fields:', {
          recall_number: record.recall_number,
          has_product_description: !!record.product_description,
          has_report_date: !!record.report_date
        });
        errors++;
        continue;
      }
      
      // Determine urgency based on classification
      let urgency = 'Medium';
      if (record.classification?.includes('Class I')) {
        urgency = 'Critical';
      } else if (record.classification?.includes('Class II')) {
        urgency = 'High';
      }
      
      // Save to alerts table
      const { error } = await supabase
        .from('alerts')
        .upsert({
          external_id: record.recall_number,
          source: sourceName,
          agency: 'FDA',
          title: record.product_description.substring(0, 255),
          summary: record.reason_for_recall || record.product_description,
          urgency,
          urgency_score: urgency === 'Critical' ? 10 : urgency === 'High' ? 7 : 5,
          published_date: record.report_date,
          external_url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
          full_content: JSON.stringify(record),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'external_id,source'
        });
      
      if (error) {
        logger.error(`Error saving ${record.recall_number}:`, error);
        errors++;
      } else {
        inserted++;
      }
    } catch (err) {
      logger.error(`Exception saving ${record.recall_number}:`, err);
      errors++;
    }
  }
  
  return { inserted, updated, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const fdaApiKey = Deno.env.get('OPENFDA_API_KEY') || null;
    const { days = 30 } = await req.json().catch(() => ({}));
    
    logger.info('Starting openFDA enforcement fetch');
    
    const endpoints = [
      { path: '/food/enforcement.json', name: 'FDA Enforcement Reports' },
      { path: '/drug/enforcement.json', name: 'FDA Drug Enforcement' },
      { path: '/device/enforcement.json', name: 'FDA Device Enforcement' }
    ];
    
    const results: any = {};
    let totalInserted = 0;
    let totalErrors = 0;
    
    for (const endpoint of endpoints) {
      try {
        logger.info(`Processing ${endpoint.name}`);
        
        const records = await fetchFDAEnforcement(endpoint.path, fdaApiKey, days, supabase);
        const stats = await saveEnforcementRecords(supabase, records, endpoint.name);
        
        totalInserted += stats.inserted;
        totalErrors += stats.errors;
        
        results[endpoint.name] = {
          fetched: records.length,
          inserted: stats.inserted,
          errors: stats.errors,
          success_rate: records.length > 0 ? ((stats.inserted / records.length) * 100).toFixed(1) + '%' : 'N/A'
        };
        
        // Update data freshness tracking
        await supabase
          .from('data_freshness')
          .upsert({
            source_name: endpoint.name,
            last_attempt: new Date().toISOString(),
            last_successful_fetch: new Date().toISOString(),
            fetch_status: 'success',
            records_fetched: records.length
          }, {
            onConflict: 'source_name'
          });
        
        // Delay between endpoints to respect rate limits
        await sleep(2000);
        
      } catch (error) {
        totalErrors++;
        logger.error(`Error processing ${endpoint.name}:`, error);
        
        await logStructuredError(error instanceof Error ? error : new Error(String(error)), {
          function_name: 'fetch-openfda-enforcement',
          endpoint: endpoint.name
        });
        
        results[endpoint.name] = {
          error: error instanceof Error ? error.message : String(error)
        };
        
        await supabase
          .from('data_freshness')
          .upsert({
            source_name: endpoint.name,
            last_attempt: new Date().toISOString(),
            fetch_status: 'error',
            error_message: error instanceof Error ? error.message : String(error)
          }, {
            onConflict: 'source_name'
          });
      }
    }
    
    // Calculate overall success rate
    const successRate = totalInserted > 0 ? ((totalInserted / (totalInserted + totalErrors)) * 100).toFixed(1) : '0';
    
    logger.info(`Sync complete: ${totalInserted} inserted, ${totalErrors} errors, ${successRate}% success rate`);
    
    return new Response(
      JSON.stringify({
        success: totalErrors === 0 || (totalInserted / (totalInserted + totalErrors)) >= 0.95,
        message: 'FDA enforcement sync completed',
        summary: {
          total_inserted: totalInserted,
          total_errors: totalErrors,
          success_rate: successRate + '%',
          circuit_breaker_status: circuitBreaker.getStats()
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    logger.error('Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});