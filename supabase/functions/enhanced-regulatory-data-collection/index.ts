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

// EPA ECHO Enforcement Data
async function fetchEPAEnforcement(): Promise<ProcessedAlert[]> {
  try {
    logStep('Fetching EPA ECHO enforcement data');
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000));
    
    // EPA Enforcement Case Search API
    const url = new URL('https://echo.epa.gov/echo/case_rest_services.get_cases');
    url.searchParams.set('output', 'JSON');
    url.searchParams.set('qcolumns', '1,2,3,4,5,6,7,8,9,10');
    url.searchParams.set('p_settlement_fy', endDate.getFullYear().toString());
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
          source: 'EPA ECHO Enforcement',
          urgency,
          summary: `EPA enforcement action. ${item.ViolationTypes ? `Violations: ${item.ViolationTypes}` : ''} ${penaltyAmount > 0 ? `Penalty: $${penaltyAmount.toLocaleString()}` : ''}`,
          published_date: new Date(item.SettlementDate || item.FiledDate || Date.now()).toISOString(),
          external_url: 'https://echo.epa.gov/',
          full_content: JSON.stringify(item),
          region: 'US',
          agency: 'EPA',
          data_classification: 'live'
        });
      }
    }

    logStep(`Retrieved ${alerts.length} EPA enforcement alerts`);
    return alerts;

  } catch (error) {
    logStep('Error fetching EPA enforcement data:', error);
    return [];
  }
}

// USDA/FSIS Recall RSS Data
async function fetchFSISRecalls(): Promise<ProcessedAlert[]> {
  try {
    logStep('Fetching FSIS recall data');
    
    const alerts: ProcessedAlert[] = [];
    const rssUrls = [
      'https://www.fsis.usda.gov/wps/wcm/connect/fsis-content/internet/main/topics/recalls-and-public-health-alerts/recall-summaries/rss',
      'https://www.fsis.usda.gov/news-events/news-press-releases/rss.xml'
    ];

    for (const rssUrl of rssUrls) {
      try {
        const response = await fetch(rssUrl, {
          headers: {
            'User-Agent': 'RegIQ-Pipeline/2.0 (regulatory.intelligence@regiq.com)',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          }
        });

        if (!response.ok) continue;

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
              source: 'FSIS Recalls',
              urgency,
              summary: description || title,
              published_date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
              external_url: link,
              full_content: itemXml,
              region: 'US',
              agency: 'USDA',
              data_classification: 'live'
            });
          }
        }
      } catch (error) {
        logStep(`Error fetching FSIS RSS ${rssUrl}:`, error);
      }
    }

    logStep(`Retrieved ${alerts.length} FSIS recall alerts`);
    return alerts;

  } catch (error) {
    logStep('Error fetching FSIS recalls:', error);
    return [];
  }
}

// Missing fetchFDACompliance function - adding it back
async function fetchFDACompliance(): Promise<any[]> {
  try {
    logStep('Fetching FDA compliance data (483s and Warning Letters)');
    
    const apiKey = Deno.env.get('FDA_DDAPI_KEY');
    if (!apiKey) {
      logStep('FDA DDAPI key not available, skipping FDA compliance data');
      return [];
    }

    const items: any[] = [];
    const endpoints = [
      { url: 'https://datadashboard.fda.gov/ora/api/complianceactions.json', name: 'Warning Letters' },
      { url: 'https://datadashboard.fda.gov/ora/api/inspectionscitations.json', name: 'Form 483s' }
    ];

    for (const endpoint of endpoints) {
      try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        let url = endpoint.url;
        if (endpoint.name === 'Warning Letters') {
          url += `?posted_date_from=${startDate.toISOString().split('T')[0]}&limit=15`;
        } else {
          url += `?inspection_end_date_from=${startDate.toISOString().split('T')[0]}&limit=15`;
        }

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'RegIQ-Pipeline/2.0',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) continue;

        const data = await response.json();
        const results = data.results || data.data || [];

        for (const item of results) {
          const companyName = item.legal_name || item.firm_name || 'Unknown Entity';
          items.push({
            title: `FDA ${endpoint.name}: ${companyName}`,
            link: item.letter_url || item.report_url || 'https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations',
            description: `${item.subject || item.citation || 'FDA compliance action'}. ${item.state ? `State: ${item.state}` : ''}`,
            pubDate: item.posted_date || item.inspection_end_date || new Date().toISOString(),
            source: `FDA ${endpoint.name}`,
            region: 'US',
            fda_compliance_data: item
          });
        }

      } catch (error) {
        logStep(`Error fetching FDA ${endpoint.name}:`, error);
      }
    }

    logStep(`Retrieved ${items.length} FDA compliance items`);
    return items;

  } catch (error) {
    logStep('Error fetching FDA compliance data:', error);
    return [];
  }
}
async function fetchFDACompliance2(): Promise<ProcessedAlert[]> {
  try {
    logStep('Fetching FDA compliance data (483s and Warning Letters)');
    
    const alerts: ProcessedAlert[] = [];
    const apiKey = Deno.env.get('FDA_DDAPI_KEY');
    
    if (!apiKey) {
      logStep('FDA DDAPI key not available, skipping FDA compliance data');
      return [];
    }

    const endpoints = [
      {
        url: 'https://datadashboard.fda.gov/ora/api/complianceactions.json',
        name: 'Warning Letters'
      },
      {
        url: 'https://datadashboard.fda.gov/ora/api/inspectionscitations.json',
        name: 'Form 483s'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // Last 30 days
        
        let url = endpoint.url;
        if (endpoint.name === 'Warning Letters') {
          url += `?posted_date_from=${startDate.toISOString().split('T')[0]}&limit=25`;
        } else {
          url += `?inspection_end_date_from=${startDate.toISOString().split('T')[0]}&limit=25`;
        }

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'RegIQ-Pipeline/2.0',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          logStep(`FDA ${endpoint.name} API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const results = data.results || data.data || [];

        for (const item of results) {
          let title = '';
          let urgency = 'Medium';
          let summary = '';
          let publishedDate = new Date();

          if (endpoint.name === 'Warning Letters') {
            const actionType = item.action_type || item.letter_type || 'Warning Letter';
            const companyName = item.legal_name || item.firm_name || 'Unknown Company';
            
            title = `FDA ${actionType}: ${companyName}`;
            summary = `${item.subject || item.violations || 'Compliance violations noted'}. ${item.state ? `State: ${item.state}` : ''}`;
            
            if (actionType.toLowerCase().includes('warning')) urgency = 'High';
            else if (actionType.toLowerCase().includes('consent')) urgency = 'Critical';
            
            publishedDate = new Date(item.posted_date || item.letter_issued_date || Date.now());
            
          } else {
            // Form 483s
            const facilityName = item.legal_name || item.firm_name || 'Unknown Facility';
            const citationCount = item.citation_count || 1;
            
            title = `FDA Form 483: ${facilityName} (${citationCount} observation${citationCount !== 1 ? 's' : ''})`;
            summary = `${item.citation || item.program_area || 'Inspection observations noted'}. ${item.state ? `State: ${item.state}` : ''}`;
            
            if (citationCount >= 5) urgency = 'High';
            else if (citationCount >= 3) urgency = 'Medium';
            else urgency = 'Low';
            
            publishedDate = new Date(item.inspection_end_date || item.posted_date || Date.now());
          }

          alerts.push({
            title,
            source: `FDA ${endpoint.name}`,
            urgency,
            summary,
            published_date: publishedDate.toISOString(),
            external_url: item.letter_url || item.report_url || 'https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations',
            full_content: JSON.stringify(item),
            region: 'US',
            agency: 'FDA',
            data_classification: 'live'
          });
        }

      } catch (error) {
        logStep(`Error fetching FDA ${endpoint.name}:`, error);
      }
    }

    logStep(`Retrieved ${alerts.length} FDA compliance alerts`);
    return alerts;

  } catch (error) {
    logStep('Error fetching FDA compliance data:', error);
    return [];
  }
}

// Federal Register Real Regulations (not GSA speeches)
async function fetchFederalRegisterRegulations(): Promise<ProcessedAlert[]> {
  try {
    logStep('Fetching Federal Register regulatory documents');
    
    const alerts: ProcessedAlert[] = [];
    const agencies = ['food-and-drug-administration', 'environmental-protection-agency', 'animal-and-plant-health-inspection-service'];
    
    for (const agency of agencies) {
      try {
        const url = `https://www.federalregister.gov/api/v1/articles.json?conditions[agencies][]=${agency}&conditions[type][]=Rule&conditions[type][]=Proposed Rule&per_page=10&order=newest`;
        
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
            source: 'Federal Register',
            urgency,
            summary: item.abstract || item.summary || 'New regulatory document published in Federal Register.',
            published_date: new Date(item.publication_date).toISOString(),
            external_url: item.html_url,
            full_content: JSON.stringify(item),
            region: 'US',
            agency: agencyName.includes('FDA') ? 'FDA' : agencyName.includes('EPA') ? 'EPA' : 'USDA',
            data_classification: 'live'
          });
        }

      } catch (error) {
        logStep(`Error fetching Federal Register for ${agency}:`, error);
      }
    }

    logStep(`Retrieved ${alerts.length} Federal Register alerts`);
    return alerts;

  } catch (error) {
    logStep('Error fetching Federal Register data:', error);
    return [];
  }
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
      return false;
    }

    const { data, error } = await supabase
      .from('alerts')
      .insert([alert])
      .select();

    if (error) {
      logStep('Error saving alert:', error);
      return false;
    }

    logStep(`Saved new alert: ${alert.title}`);
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
    logStep('Enhanced Regulatory Data Collection started');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let totalSaved = 0;
    let totalProcessed = 0;

    // Fetch from all enhanced sources in parallel
    const [epaAlerts, fsisAlerts, fdaAlerts, fedRegAlerts] = await Promise.all([
      fetchEPAEnforcement(),
      fetchFSISRecalls(),
      fetchFDACompliance(),
      fetchFederalRegisterRegulations()
    ]);

    // Process all alerts
    const allAlerts = [...epaAlerts, ...fsisAlerts, ...fdaAlerts, ...fedRegAlerts];
    totalProcessed = allAlerts.length;

    for (const alert of allAlerts) {
      if (await saveAlert(supabase, alert)) {
        totalSaved++;
      }
    }

    // Update data freshness tracking
    const sources = ['EPA ECHO Enforcement', 'FSIS Recalls', 'FDA Form 483s', 'FDA Warning Letters', 'Federal Register'];
    
    for (const sourceName of sources) {
      await supabase
        .from('data_freshness')
        .upsert({
          source_name: sourceName,
          last_attempt: new Date().toISOString(),
          last_successful_fetch: new Date().toISOString(),
          fetch_status: 'success',
          records_fetched: allAlerts.filter(a => a.source.includes(sourceName.split(' ')[0])).length
        });
    }

    const result = {
      success: true,
      message: 'Enhanced Regulatory Data Collection completed successfully',
      sources_processed: sources.length,
      total_items_processed: totalProcessed,
      new_alerts_saved: totalSaved,
      breakdown: {
        epa: epaAlerts.length,
        fsis: fsisAlerts.length,
        fda: fdaAlerts.length,
        federal_register: fedRegAlerts.length
      },
      execution_time: Date.now()
    };

    logStep('Enhanced Regulatory Data Collection completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('Enhanced Regulatory Data Collection error:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Enhanced Regulatory Data Collection failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});