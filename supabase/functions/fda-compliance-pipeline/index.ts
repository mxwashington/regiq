import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Simple logger for Supabase functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface ProcessedAlert {
  title: string;
  source: string;
  urgency: string;
  summary: string;
  published_date: string;
  external_url?: string;
  full_content?: string;
  region: string;
  agency: string;
}

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

async function fetchFDADataDashboard(endpoint: string, sourceName: string): Promise<any[]> {
  try {
    logStep(`Fetching FDA Data Dashboard from: ${endpoint} (${sourceName})`);
    
    const ddapiKey = Deno.env.get('FDA_DDAPI_KEY');
    if (!ddapiKey) {
      logStep('FDA DDAPI key not found, cannot fetch data');
      return [];
    }
    
    // Calculate date range (last 90 days for compliance data)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000));
    
    // Format dates for FDA DDAPI (ISO format)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Build URL with authentication and filters
    let url = endpoint;
    
    // Add date filters if the endpoint supports them
    if (endpoint.includes('complianceactions')) {
      url += `?posted_date_from=${startDateStr}&posted_date_to=${endDateStr}&limit=50`;
    } else if (endpoint.includes('inspectionscitations')) {
      url += `?inspection_end_date_from=${startDateStr}&inspection_end_date_to=${endDateStr}&limit=50`;
    } else {
      url += `?limit=50`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ddapiKey}`,
        'User-Agent': 'RegIQ-Pipeline/2.0 (regulatory.intelligence@regiq.com)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      logStep(`Failed to fetch FDA DDAPI data: ${response.status} - ${response.statusText}`);
      // Log response text for debugging
      const errorText = await response.text();
      logStep('FDA DDAPI Error Response:', errorText);
      return [];
    }

    const data = await response.json();
    
    // FDA DDAPI returns different structures, normalize to array
    if (data.results) {
      logStep(`Retrieved ${data.results.length} records from ${sourceName}`);
      return data.results;
    } else if (Array.isArray(data)) {
      logStep(`Retrieved ${data.length} records from ${sourceName}`);
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      logStep(`Retrieved ${data.data.length} records from ${sourceName}`);
      return data.data;
    } else {
      logStep(`Retrieved single record from ${sourceName}`);
      return [data];
    }
  } catch (error) {
    logStep(`Error fetching FDA Data Dashboard from ${endpoint}:`, error);
    return [];
  }
}

function processFDADataDashboardItem(item: any, sourceName: string, endpoint: string): ProcessedAlert {
  let title = '';
  let description = '';
  let publishedDate = new Date();
  let externalUrl = '';
  let urgency = 'Medium';

  // Process different types of FDA Data Dashboard data
  if (endpoint.includes('complianceactions') || item.action_type || item.letter_type) {
    // Warning Letters and Compliance Actions
    const actionType = item.action_type || item.letter_type || 'Compliance Action';
    const companyName = item.legal_name || item.company_name || item.firm_name || 'Unknown Company';
    
    title = `FDA ${actionType}: ${companyName}`;
    description = `${item.subject || item.violations || item.citation || 'Compliance violations noted'}. ${item.state ? `State: ${item.state}` : ''}`;
    
    // Warning letters are typically high urgency
    if (actionType.toLowerCase().includes('warning') || item.letter_type?.toLowerCase().includes('warning')) {
      urgency = 'High';
    } else if (actionType.toLowerCase().includes('consent decree')) {
      urgency = 'Critical';
    }
    
    publishedDate = new Date(item.posted_date || item.issued_date || item.letter_issued_date || Date.now());
    externalUrl = item.letter_url || item.document_url || `https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities`;
    
  } else if (endpoint.includes('inspectionscitations') || item.citation || item.cfr_citation) {
    // Form 483s and Inspection Observations
    const establishmentName = item.legal_name || item.firm_name || item.establishment_name || 'Unknown Facility';
    const citationCount = item.citation_count || (Array.isArray(item.citations) ? item.citations.length : 1);
    
    title = `FDA Form 483: ${establishmentName} (${citationCount} observation${citationCount !== 1 ? 's' : ''})`;
    description = `${item.citation || item.program_area || 'Inspection observations noted'}. ${item.product_type ? `Product: ${item.product_type}` : ''} ${item.state ? `State: ${item.state}` : ''}`;
    
    // Multiple citations or critical observations indicate higher urgency
    if (citationCount >= 5) {
      urgency = 'High';
    } else if (citationCount >= 3) {
      urgency = 'Medium';
    } else {
      urgency = 'Low';
    }
    
    publishedDate = new Date(item.inspection_end_date || item.date_issued || item.posted_date || Date.now());
    externalUrl = item.report_url || item.document_url || `https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/inspection-references/inspection-observation-database`;
    
    // Save to dedicated inspection citations table
    try {
      const inspectionData = {
        fei_number: item.fei_number || null,
        legal_name: establishmentName,
        inspection_end_date: item.inspection_end_date || item.date_issued || new Date().toISOString().split('T')[0],
        fiscal_year: item.fiscal_year || new Date().getFullYear(),
        project_area: item.project_area || item.program_area || null,
        classification: item.classification || null,
        cfr_citation: item.cfr_citation || item.citation || null,
        short_description: item.short_description || item.citation || description,
        long_description: item.long_description || null,
        city: item.city || null,
        state: item.state || null,
        country: item.country || 'USA',
        zip_code: item.zip_code || item.postal_code || null,
        raw_data: item
      };
      
      const { error: citationError } = await supabase
        .from('fda_inspection_citations')
        .upsert(inspectionData, {
          onConflict: 'fei_number,inspection_end_date'
        });
      });
    } catch (err) {
      logStep('Error saving to inspection_citations table:', err);
    }
  }

  return {
    title: title || `FDA Compliance Data: ${item.legal_name || 'Unknown Entity'}`,
    source: sourceName,
    urgency,
    summary: description || 'FDA compliance action or inspection observation.',
    published_date: publishedDate.toISOString(),
    external_url: externalUrl,
    full_content: JSON.stringify({ ...item, endpoint, source_type: 'FDA_DDAPI' }),
    region: 'US',
    agency: 'FDA'
  };
}

async function isDuplicate(supabase: any, alert: ProcessedAlert): Promise<boolean> {
  const { data, error } = await supabase
    .from('alerts')
    .select('id')
    .eq('title', alert.title)
    .eq('source', alert.source)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (error) {
    logStep('Error checking for duplicates:', error);
    return false;
  }

  return data && data.length > 0;
}

async function saveAlert(supabase: any, alert: ProcessedAlert): Promise<boolean> {
  try {
    if (await isDuplicate(supabase, alert)) {
      logStep(`Duplicate alert skipped: ${alert.title}`);
      return false;
    }

    const { data, error } = await supabase
      .from('alerts')
      .insert([{
        title: alert.title,
        source: alert.source,
        urgency: alert.urgency,
        summary: alert.summary,
        published_date: alert.published_date,
        external_url: alert.external_url,
        full_content: alert.full_content,
        region: alert.region,
        agency: alert.agency,
        data_classification: 'live'
      }])
      .select();

    if (error) {
      logStep('Error saving alert:', error);
      return false;
    }

    const alertId = data[0]?.id;
    logStep(`Saved new alert: ${alert.title}`);

    // Start classification in background (don't wait for it)
    if (alertId) {
      setTimeout(async () => {
        try {
          logStep(`Starting classification for alert: ${alertId}`);
          const { error: classificationError } = await supabase.functions.invoke(
            'ai-content-classifier',
            {
              body: {
                title: alert.title,
                content: alert.summary || alert.full_content || '',
                source: alert.source,
                alert_id: alertId,
                region: alert.region,
                agency: alert.agency
              }
            }
          );

          if (classificationError) {
            logStep('Classification service error', classificationError);
          } else {
            logStep(`Successfully classified alert: ${alertId}`);
          }
        } catch (error) {
          logStep('Error in background classification', error);
        }
      }, 100);
    }

    return true;
  } catch (error) {
    logStep('Error in saveAlert:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('FDA Compliance Pipeline started');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Define the new FDA compliance sources
    const fdaSources = [
      {
        name: 'FDA Warning Letters Feed',
        endpoint: 'https://datadashboard.fda.gov/ora/api/complianceactions.json',
        description: 'FDA compliance actions including warning letters and consent decrees'
      },
      {
        name: 'FDA Inspection Observations (483s)',
        endpoint: 'https://datadashboard.fda.gov/ora/api/inspectionscitations.json',
        description: 'FDA Form 483 inspection observations and citations'
      }
    ];

    let totalProcessed = 0;
    let totalSaved = 0;

    // Process each FDA compliance source
    for (const source of fdaSources) {
      try {
        logStep(`Processing: ${source.name}`);
        
        const items = await fetchFDADataDashboard(source.endpoint, source.name);
        totalProcessed += items.length;
        
        let sourceSaved = 0;
        for (const item of items) {
          const alert = processFDADataDashboardItem(item, source.name, source.endpoint);
          if (await saveAlert(supabase, alert)) {
            sourceSaved++;
          }
        }
        
        totalSaved += sourceSaved;
        logStep(`Processed ${source.name}: ${sourceSaved} new alerts saved from ${items.length} total items`);
        
        // Update data freshness tracking
        await supabase
          .from('data_freshness')
          .upsert({
            source_name: source.name,
            last_attempt: new Date().toISOString(),
            last_successful_fetch: new Date().toISOString(),
            fetch_status: 'success',
            records_fetched: items.length
          });
        
        // Small delay between sources
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logStep(`Error processing ${source.name}:`, error);
        
        // Update error status
        await supabase
          .from('data_freshness')
          .upsert({
            source_name: source.name,
            last_attempt: new Date().toISOString(),
            fetch_status: 'error',
            error_message: error instanceof Error ? error.message : String(error) || 'Unknown error',
            records_fetched: 0
          });
      }
    }

    const result = {
      success: true,
      message: 'FDA Compliance Pipeline completed successfully',
      sources_processed: fdaSources.length,
      total_items_processed: totalProcessed,
      new_alerts_saved: totalSaved,
      execution_time: Date.now()
    };

    logStep('FDA Compliance Pipeline completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('FDA Compliance Pipeline error:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'FDA Compliance Pipeline failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});