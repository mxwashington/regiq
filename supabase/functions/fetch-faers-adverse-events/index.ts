import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchFDAWithFallback, type FDAErrorHandlerConfig } from '../_shared/fda-error-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logger = {
  info: (msg: string, data?: any) => console.info(`[FAERS] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[FAERS] ${msg}`, data || '')
};

interface FAERSRecord {
  safetyreportid: string;
  receivedate: string;
  serious?: string;
  patient?: {
    patientage?: string;
    patientsex?: string;
  };
  drug?: Array<{
    medicinalproduct?: string;
    drugindication?: string;
  }>;
  reaction?: Array<{
    reactionmeddrapt?: string;
  }>;
  sender?: {
    senderorganization?: string;
  };
}

async function fetchFAERS(apiKey: string | null, days: number = 90): Promise<FAERSRecord[]> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // Simplified query to avoid 400 errors
  const searchQuery = `receivedate:[${startDateStr}+TO+${endDateStr}]`;
  
  logger.info('Fetching FAERS adverse events with intelligent error handling');
  
  const config: FDAErrorHandlerConfig = {
    endpoint: '/drug/event.json',
    searchQuery,
    apiKey,
    maxRetries: 3,
    enableRSSFallback: true
  };
  
  const result = await fetchFDAWithFallback(config);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch FAERS data');
  }
  
  logger.info(`Successfully fetched FAERS records from ${result.source}`, {
    count: result.data?.results?.length || 0
  });
  
  return result.data?.results || [];
}

async function saveFAERSRecords(
  supabase: any,
  records: FAERSRecord[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;
  
  for (const record of records) {
    try {
      // Extract drug name (first drug in array)
      const drugName = record.drug?.[0]?.medicinalproduct || 'Unknown Drug';
      const drugIndication = record.drug?.[0]?.drugindication || null;
      
      // Extract reactions (all reaction terms)
      const reactions = record.reaction?.map(r => r.reactionmeddrapt).filter(Boolean) || [];
      
      // Parse patient age if available
      let patientAge: number | null = null;
      if (record.patient?.patientage) {
        const ageStr = record.patient.patientage;
        const ageNum = parseFloat(ageStr);
        if (!isNaN(ageNum)) {
          patientAge = ageNum;
        }
      }
      
      // Extract manufacturer
      const manufacturer = record.sender?.senderorganization || null;
      
      // Parse receive date (YYYYMMDD format)
      let receiveDate = new Date().toISOString().split('T')[0];
      if (record.receivedate && record.receivedate.length === 8) {
        const year = record.receivedate.substring(0, 4);
        const month = record.receivedate.substring(4, 6);
        const day = record.receivedate.substring(6, 8);
        receiveDate = `${year}-${month}-${day}`;
      }
      
      const { error } = await supabase
        .from('fda_adverse_events')
        .upsert({
          safetyreportid: record.safetyreportid,
          receivedate: receiveDate,
          serious: record.serious === '1' ? 1 : 0,
          patient_age: patientAge,
          patient_sex: record.patient?.patientsex || null,
          drug_name: drugName,
          drug_indication: drugIndication,
          reaction_term: reactions,
          outcome: [],
          report_source: 'FAERS',
          manufacturer_name: manufacturer,
          raw_data: record
        }, {
          onConflict: 'safetyreportid'
        });
      
      if (error) {
        logger.error(`Error saving ${record.safetyreportid}:`, error);
        errors++;
      } else {
        inserted++;
      }
    } catch (err) {
      logger.error(`Exception saving ${record.safetyreportid}:`, err);
      errors++;
    }
  }
  
  return { inserted, errors };
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
    const { days = 90 } = await req.json().catch(() => ({}));
    
    logger.info('Starting FAERS adverse events fetch');
    
    const records = await fetchFAERS(fdaApiKey, days);
    const stats = await saveFAERSRecords(supabase, records);
    
    // Update data freshness tracking
    await supabase
      .from('data_freshness')
      .upsert({
        source_name: 'FDA FAERS Adverse Events',
        last_attempt: new Date().toISOString(),
        last_successful_fetch: new Date().toISOString(),
        fetch_status: 'success',
        records_fetched: records.length
      });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'FAERS fetch completed',
        fetched: records.length,
        inserted: stats.inserted,
        errors: stats.errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    logger.error('Fatal error:', error);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase
        .from('data_freshness')
        .upsert({
          source_name: 'FDA FAERS Adverse Events',
          last_attempt: new Date().toISOString(),
          fetch_status: 'error',
          error_message: error instanceof Error ? error.message : String(error)
        });
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});