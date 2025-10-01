import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logger = {
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

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
  days: number = 30
): Promise<FDAEnforcementRecord[]> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
  
  // FDA API requires YYYY-MM-DD format, not YYYYMMDD
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  const searchQuery = `report_date:[${startDateStr}+TO+${endDateStr}]`;
  const url = new URL(`https://api.fda.gov${endpoint}`);
  url.searchParams.set('search', searchQuery);
  url.searchParams.set('limit', '100');
  url.searchParams.set('sort', 'report_date:desc');
  
  if (apiKey) {
    url.searchParams.set('api_key', apiKey);
  }
  
  logger.info(`Fetching FDA enforcement from: ${endpoint}`);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'RegIQ/2.0'
    }
  });
  
  if (!response.ok) {
    throw new Error(`FDA API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.results || [];
}

async function saveEnforcementRecords(
  supabase: any,
  records: FDAEnforcementRecord[],
  tableName: string
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  
  for (const record of records) {
    try {
      const { error } = await supabase
        .from(tableName)
        .upsert({
          recall_number: record.recall_number,
          classification: record.classification,
          status: record.status,
          distribution_pattern: record.distribution_pattern,
          product_description: record.product_description,
          code_info: record.code_info,
          reason_for_recall: record.reason_for_recall,
          recalling_firm: record.recalling_firm,
          city: record.city,
          state: record.state,
          country: record.country,
          voluntary_mandated: record.voluntary_mandated,
          initial_firm_notification: record.initial_firm_notification,
          recall_initiation_date: record.recall_initiation_date || null,
          center_classification_date: record.center_classification_date || null,
          report_date: record.report_date,
          termination_date: record.termination_date || null,
          more_code_info: record.more_code_info,
          address_1: record.address_1,
          address_2: record.address_2,
          postal_code: record.postal_code,
          event_id: record.event_id,
          product_type: record.product_type,
          source_url: `https://api.fda.gov${tableName.replace('fda_', '').replace('_enforcement', '/enforcement')}.json?search=recall_number:"${record.recall_number}"`,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'recall_number'
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
      { path: '/food/enforcement.json', table: 'fda_food_enforcement', name: 'Food' },
      { path: '/drug/enforcement.json', table: 'fda_drug_enforcement', name: 'Drug' },
      { path: '/device/enforcement.json', table: 'fda_device_enforcement', name: 'Device' }
    ];
    
    const results: any = {};
    
    for (const endpoint of endpoints) {
      try {
        logger.info(`Processing ${endpoint.name} enforcement`);
        
        const records = await fetchFDAEnforcement(endpoint.path, fdaApiKey, days);
        const stats = await saveEnforcementRecords(supabase, records, endpoint.table);
        
        results[endpoint.name.toLowerCase()] = {
          fetched: records.length,
          inserted: stats.inserted,
          errors: stats.errors
        };
        
        // Update data freshness tracking
        await supabase
          .from('data_freshness')
          .upsert({
            source_name: `FDA ${endpoint.name} Enforcement`,
            last_attempt: new Date().toISOString(),
            last_successful_fetch: new Date().toISOString(),
            fetch_status: 'success',
            records_fetched: records.length
          });
        
        // Small delay between endpoints
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.error(`Error processing ${endpoint.name}:`, error);
        results[endpoint.name.toLowerCase()] = {
          error: error instanceof Error ? error.message : String(error)
        };
        
        await supabase
          .from('data_freshness')
          .upsert({
            source_name: `FDA ${endpoint.name} Enforcement`,
            last_attempt: new Date().toISOString(),
            fetch_status: 'error',
            error_message: error instanceof Error ? error.message : String(error)
          });
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'FDA enforcement fetch completed',
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