import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Simple logger for Supabase functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

// Data source interface from database
interface DataSource {
  id: string;
  name: string;
  source_type: string;
  url: string | null;
  agency: string | null;
  is_active: boolean;
  priority: number;
  polling_interval_minutes: number;
  metadata: any;
}

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
  data_classification: string;
}

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Fetch active data sources from database
async function fetchDataSources(supabase: any): Promise<DataSource[]> {
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });
  
  if (error) {
    logStep('Error fetching data sources:', error);
    throw new Error(`Failed to fetch data sources: ${error.message}`);
  }
  
  return data as DataSource[];
}

// EPA ECHO Enforcement Adapter
async function collectFromEPAEcho(ds: DataSource): Promise<ProcessedAlert[]> {
  try {
    logStep(`Fetching EPA ECHO enforcement data from ${ds.name}`);
    
    const url = new URL('https://echo.epa.gov/echo/case_rest_services.get_cases');
    url.searchParams.set('output', 'JSON');
    url.searchParams.set('p_act_date_range', 'LAST365');
    url.searchParams.set('rows', '50');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'RegIQ-Pipeline/2.0 (regulatory.intelligence@regiq.com)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      logStep(`EPA API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const alerts: ProcessedAlert[] = [];

    if (data.Results && data.Results.length > 0) {
      for (const item of data.Results) {
        const penaltyAmount = parseFloat(item.FedPenaltyAssessed || item.TotalPenalty || '0');
        let urgency = 'Medium';
        
        if (penaltyAmount > 1000000) urgency = 'Critical';
        else if (penaltyAmount > 100000) urgency = 'High';
        else if (penaltyAmount > 10000) urgency = 'Medium';
        else urgency = 'Low';

        alerts.push({
          title: `EPA Enforcement: ${item.DefendantEntity || item.FacilityName || 'Environmental Violation'}`,
          source: ds.name, // Use data source name
          urgency,
          summary: `EPA enforcement action. ${item.ViolationTypes ? `Violations: ${item.ViolationTypes}` : ''} ${penaltyAmount > 0 ? `Penalty: $${penaltyAmount.toLocaleString()}` : ''}`,
          published_date: new Date(item.SettlementDate || item.FiledDate || Date.now()).toISOString(),
          external_url: 'https://echo.epa.gov/',
          full_content: JSON.stringify(item),
          region: 'US',
          agency: ds.agency || 'EPA', // Use data source agency
          data_classification: 'enforcement'
        });
      }
    }

    logStep(`Retrieved ${alerts.length} EPA enforcement alerts`);
    return alerts;

  } catch (error) {
    logStep(`Error in EPA ECHO adapter for ${ds.name}:`, error);
    return [];
  }
}

// FSIS RSS Adapter  
async function collectFromFSISRSS(ds: DataSource): Promise<ProcessedAlert[]> {
  try {
    logStep(`Fetching FSIS RSS data from ${ds.name}`);
    
    const alerts: ProcessedAlert[] = [];
    const rssUrl = ds.url || 'https://www.fsis.usda.gov/wps/wcm/connect/fsis-content/internet/main/topics/recalls-and-public-health-alerts/recall-summaries/rss';
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'RegIQ-Pipeline/2.0 (regulatory.intelligence@regiq.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      logStep(`FSIS RSS error: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    
    // Parse RSS items
    const itemPattern = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    
    while ((match = itemPattern.exec(xmlText)) !== null && alerts.length < 25) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const descMatch = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      const link = linkMatch ? linkMatch[1].trim() : '';
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
      
      if (title && (title.toLowerCase().includes('recall') || title.toLowerCase().includes('alert'))) {
        let urgency = 'Medium';
        const content = (title + ' ' + description).toLowerCase();
        
        if (content.includes('class i') || content.includes('serious') || content.includes('death')) {
          urgency = 'Critical';
        } else if (content.includes('class ii') || content.includes('illness') || content.includes('contamination')) {
          urgency = 'High';
        }

        alerts.push({
          title: `FSIS: ${title}`,
          source: ds.name, // Use data source name
          urgency,
          summary: description || title,
          published_date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          external_url: link,
          full_content: itemXml,
          region: 'US',
          agency: ds.agency || 'FSIS', // Use data source agency
          data_classification: 'recall'
        });
      }
    }
    
    logStep(`Retrieved ${alerts.length} FSIS recall alerts`);
    return alerts;

  } catch (error) {
    logStep(`Error in FSIS RSS adapter for ${ds.name}:`, error);
    return [];
  }
}

// FDA Compliance Adapter
async function collectFromFDACompliance(ds: DataSource): Promise<ProcessedAlert[]> {
  try {
    logStep(`Fetching FDA compliance data from ${ds.name}`);
    
    const alerts: ProcessedAlert[] = [];
    const documentType = ds.metadata?.document_type || 'warning_letters';
    
    let rssUrl = ds.url;
    let feedName = 'Compliance';
    
    // Map document types to RSS feeds
    if (documentType === '483') {
      // Note: Form 483s are not publicly available via RSS
      logStep(`Form 483 observations are not publicly available via RSS feed`);
      return [];
    } else if (documentType === 'warning_letters' || !rssUrl) {
      rssUrl = 'https://www.fda.gov/media/121504/rss';
      feedName = 'Warning Letters';
    }

    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'RegIQ-Pipeline/2.0 (regulatory.intelligence@regiq.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      logStep(`FDA RSS error: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    
    // Parse RSS items
    const itemPattern = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    
    while ((match = itemPattern.exec(xmlText)) !== null && alerts.length < 25) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const descMatch = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      const link = linkMatch ? linkMatch[1].trim() : '';
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
      
      if (title) {
        let urgency = 'Medium';
        const content = (title + ' ' + description).toLowerCase();
        
        if (content.includes('warning letter') || content.includes('import alert')) urgency = 'High';
        
        alerts.push({
          title: `FDA ${feedName}: ${title}`,
          source: ds.name, // Use data source name
          urgency,
          summary: description || title,
          published_date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          external_url: link || 'https://www.fda.gov',
          full_content: itemXml,
          region: 'US',
          agency: ds.agency || 'FDA', // Use data source agency
          data_classification: documentType === 'warning_letters' ? 'enforcement' : 'compliance'
        });
      }
    }

    logStep(`Retrieved ${alerts.length} FDA compliance alerts`);
    return alerts;

  } catch (error) {
    logStep(`Error in FDA compliance adapter for ${ds.name}:`, error);
    return [];
  }
}

// Federal Register Adapter
async function collectFromFederalRegister(ds: DataSource): Promise<ProcessedAlert[]> {
  try {
    logStep(`Fetching Federal Register data from ${ds.name}`);
    
    const alerts: ProcessedAlert[] = [];
    const agencies = ['food-and-drug-administration', 'environmental-protection-agency', 'animal-and-plant-health-inspection-service'];
    
    for (const agency of agencies) {
      try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const url = `https://www.federalregister.gov/api/v1/documents.json?conditions[agencies][]=${agency}&conditions[type][]=RULE&conditions[type][]=PRORULE&conditions[publication_date][gte]=${startDate.toISOString().split('T')[0]}&per_page=10&order=newest`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'RegIQ-Pipeline/2.0 (regulatory.intelligence@regiq.com)',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) continue;

        const data = await response.json();
        
        for (const item of data.results || []) {
          let urgency = 'Medium';
          const type = item.type || '';
          
          if (type === 'Rule') urgency = 'High';
          else if (type === 'Proposed Rule') urgency = 'Medium';
          
          const agencyName = item.agencies?.[0]?.name || agency.replace(/-/g, ' ');

          alerts.push({
            title: `${agencyName}: ${item.title || 'New Regulation'}`,
            source: ds.name, // Use data source name
            urgency,
            summary: item.abstract || item.summary || 'New regulatory document published in Federal Register.',
            published_date: new Date(item.publication_date).toISOString(),
            external_url: item.html_url,
            full_content: JSON.stringify(item),
            region: 'US',
            agency: ds.agency || 'Federal Register', // Use data source agency
            data_classification: 'federal_register'
          });
        }
      } catch (error) {
        logStep(`Error fetching Federal Register for ${agency}:`, error);
      }
    }

    logStep(`Retrieved ${alerts.length} Federal Register alerts`);
    return alerts;

  } catch (error) {
    logStep(`Error in Federal Register adapter for ${ds.name}:`, error);
    return [];
  }
}

// Central adapter dispatcher
async function collectFromSource(ds: DataSource): Promise<ProcessedAlert[]> {
  switch (ds.source_type) {
    case 'epa_echo':
      return await collectFromEPAEcho(ds);
    case 'rss_fsis':
      return await collectFromFSISRSS(ds);
    case 'fda_compliance':
      return await collectFromFDACompliance(ds);
    case 'federal_register':
      return await collectFromFederalRegister(ds);
    default:
      logStep(`Unknown source type: ${ds.source_type} for ${ds.name}`);
      return [];
  }
}

// Check for duplicates
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

// Save alert to database
async function saveAlert(supabase: any, alert: ProcessedAlert, ds: DataSource): Promise<boolean> {
  try {
    // Enforce database alignment
    const alignedAlert = {
      ...alert,
      source: ds.name, // Exact DB source label
      agency: ds.agency || alert.agency // Prefer DS.agency if provided
    };

    if (await isDuplicate(supabase, alignedAlert)) {
      return false;
    }

    const { data, error } = await supabase
      .from('alerts')
      .insert([alignedAlert])
      .select();

    if (error) {
      logStep(`Error saving alert for ${ds.name}:`, error.message);
      return false;
    }

    logStep(`Saved new alert from ${ds.name}: ${alignedAlert.title}`);
    return true;

  } catch (error) {
    logStep(`Error in saveAlert for ${ds.name}:`, error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const runId = crypto.randomUUID();
  const runStart = new Date();
  let attempted = 0, succeeded = 0, failed = 0;
  const details: any = {};

  try {
    logStep('Enhanced Regulatory Data Collection started (Database-driven)', { runId });
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch active data sources from database
    const sources = await fetchDataSources(supabase);
    attempted = sources.length;
    
    logStep(`Found ${sources.length} active data sources`);

    // Process each source
    for (const ds of sources) {
      const sourceStart = Date.now();
      
      try {
        logStep(`Processing source: ${ds.name} (${ds.source_type})`);
        
        const alerts = await collectFromSource(ds);
        let savedCount = 0;
        
        // Save alerts for this source
        for (const alert of alerts) {
          if (await saveAlert(supabase, alert, ds)) {
            savedCount++;
          }
        }

        // Update data freshness tracking
        await supabase.from('data_freshness').upsert({
          source_name: ds.name,
          fetch_status: 'success',
          last_successful_fetch: new Date().toISOString(),
          last_attempt: new Date().toISOString(),
          records_fetched: savedCount,
          error_message: null,
          last_error_count: 0,
          updated_at: new Date().toISOString()
        });

        succeeded++;
        details[ds.name] = {
          attempted: alerts.length,
          saved: savedCount,
          processing_time_ms: Date.now() - sourceStart,
          source_type: ds.source_type
        };

        logStep(`Completed ${ds.name}: ${alerts.length} fetched, ${savedCount} saved`);

      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        // Update data freshness with error
        await supabase.from('data_freshness').upsert({
          source_name: ds.name,
          fetch_status: 'error',
          last_attempt: new Date().toISOString(),
          error_message: errorMsg,
          last_error_count: 1, // Could increment existing count
          updated_at: new Date().toISOString()
        });

        details[ds.name] = {
          error: errorMsg,
          processing_time_ms: Date.now() - sourceStart,
          source_type: ds.source_type
        };

        logStep(`Error processing ${ds.name}:`, errorMsg);
      }
    }

    // Log pipeline run
    await supabase.from('pipeline_runs').insert({
      started_at: runStart,
      finished_at: new Date(),
      status: failed > 0 ? 'partial_success' : 'success',
      sources_attempted: attempted,
      sources_succeeded: succeeded,
      sources_failed: failed,
      details,
      error_summary: failed > 0 ? `${failed} sources failed; see details` : null
    });

    logStep('Enhanced Regulatory Data Collection completed', {
      runId,
      attempted,
      succeeded,
      failed,
      total_runtime_ms: Date.now() - runStart.getTime()
    });

    return new Response(JSON.stringify({
      success: true,
      runId,
      sources_attempted: attempted,
      sources_succeeded: succeeded,
      sources_failed: failed,
      details
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Log failed pipeline run
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabase.from('pipeline_runs').insert({
        started_at: runStart,
        finished_at: new Date(),
        status: 'error',
        error_summary: errorMsg,
        details,
        sources_attempted: attempted,
        sources_succeeded: succeeded,
        sources_failed: failed
      });
    } catch (logError) {
      logStep('Error logging pipeline failure:', logError);
    }

    logStep('Critical error in Enhanced Regulatory Data Collection:', errorMsg);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
      runId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});