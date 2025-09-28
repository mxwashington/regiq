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

// EPA ECHO Enforcement Data - Updated 2025 endpoint
async function fetchEPAEnforcement(): Promise<ProcessedAlert[]> {
  try {
    logStep('Fetching EPA ECHO enforcement data');
    
    // Updated EPA ECHO API endpoint (2025)
    const url = new URL('https://echo.epa.gov/api/case_rest_services.get_cases');
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

// USDA/FSIS Recall API Data - Updated 2025 endpoint
async function fetchFSISRecalls(): Promise<ProcessedAlert[]> {
  try {
    logStep('Fetching FSIS recall data via API');
    
    const alerts: ProcessedAlert[] = [];
    
    // Use official FSIS Recall API (launched 2023)
    const apiUrl = 'https://www.fsis.usda.gov/recalls/api/latest';
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'RegIQ-Pipeline/2.0 (regulatory.intelligence@regiq.com)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      logStep(`FSIS API error: ${response.status}`);
      
      // Fallback to RSS if API fails
      const rssUrls = [
        'https://www.fsis.usda.gov/news-events/recalls-public-health-alerts/rss'
      ];

      for (const rssUrl of rssUrls) {
        try {
          const rssResponse = await fetch(rssUrl, {
            headers: {
              'User-Agent': 'RegIQ-Pipeline/2.0 (regulatory.intelligence@regiq.com)',
              'Accept': 'application/rss+xml, application/xml, text/xml'
            }
          });

          if (!rssResponse.ok) continue;

          const xmlText = await rssResponse.text();
          
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
      
      logStep(`Retrieved ${alerts.length} FSIS recall alerts (RSS fallback)`);
      return alerts;
    }

    const data = await response.json();
    
    if (data.recalls && Array.isArray(data.recalls)) {
      for (const recall of data.recalls.slice(0, 25)) {
        let urgency = 'Medium';
        const healthHazard = (recall.health_hazard_evaluation || '').toLowerCase();
        
        if (healthHazard.includes('high') || healthHazard.includes('serious')) urgency = 'Critical';
        else if (healthHazard.includes('moderate')) urgency = 'High';
        else if (healthHazard.includes('low')) urgency = 'Medium';

        alerts.push({
          title: `FSIS Recall: ${recall.product_name || 'Meat/Poultry Product'}`,
          source: 'FSIS Recalls',
          urgency,
          summary: `${recall.reason_for_recall || recall.health_hazard_evaluation || 'Product recall'} - Est. ${recall.establishment_number || 'N/A'}`,
          published_date: new Date(recall.recall_date || recall.date_opened || Date.now()).toISOString(),
          external_url: recall.press_release_url || 'https://www.fsis.usda.gov/recalls',
          full_content: JSON.stringify(recall),
          region: 'US',
          agency: 'USDA',
          data_classification: 'live'
        });
      }
    }

    logStep(`Retrieved ${alerts.length} FSIS recall alerts`);
    return alerts;

  } catch (error) {
    logStep('Error fetching FSIS recalls:', error);
    return [];
  }
}

// FDA RSS Feeds - Updated 2025 endpoints (Form 483s not publicly available)
async function fetchFDACompliance(): Promise<ProcessedAlert[]> {
  try {
    logStep('Fetching FDA RSS feeds');
    
    const alerts: ProcessedAlert[] = [];
    const rssFeeds = [
      { url: 'https://www.fda.gov/media/121504/rss', name: 'Warning Letters' },
      { url: 'https://www.fda.gov/media/121203/rss', name: 'Import Alerts' },
      { url: 'https://www.accessdata.fda.gov/scripts/drugshortages/rss.xml', name: 'Drug Shortages' }
    ];

    for (const feed of rssFeeds) {
      try {
        const response = await fetch(feed.url, {
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
        
        while ((match = itemPattern.exec(xmlText)) !== null && alerts.length < 50) {
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
            else if (content.includes('shortage')) urgency = 'Medium';

            alerts.push({
              title: `FDA ${feed.name}: ${title}`,
              source: `FDA ${feed.name}`,
              urgency,
              summary: description || title,
              published_date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
              external_url: link || 'https://www.fda.gov',
              full_content: itemXml,
              region: 'US',
              agency: 'FDA',
              data_classification: 'live'
            });
          }
        }

      } catch (error) {
        logStep(`Error fetching FDA RSS ${feed.url}:`, error);
      }
    }

    logStep(`Retrieved ${alerts.length} FDA RSS alerts`);
    return alerts;

  } catch (error) {
    logStep('Error fetching FDA RSS feeds:', error);
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
    const sources = ['EPA ECHO Enforcement', 'FSIS Recalls', 'FDA Warning Letters', 'FDA Import Alerts', 'FDA Drug Shortages', 'Federal Register'];
    
    for (const sourceName of sources) {
      await supabase
        .from('data_freshness')
        .upsert([{
          source_name: sourceName,
          last_successful_fetch: new Date().toISOString(),
          fetch_status: 'success',
          records_fetched: sourceName === 'EPA ECHO Enforcement' ? epaAlerts.length :
                          sourceName === 'FSIS Recalls' ? fsisAlerts.length :
                          sourceName.startsWith('FDA') ? fdaAlerts.length :
                          fedRegAlerts.length
        }], { onConflict: 'source_name' });
    }

    logStep('Enhanced Regulatory Data Collection completed', {
      totalProcessed,
      totalSaved,
      sources: {
        epa: epaAlerts.length,
        fsis: fsisAlerts.length,
        fda: fdaAlerts.length,
        federalRegister: fedRegAlerts.length
      }
    });

    return new Response(JSON.stringify({
      success: true,
      totalProcessed,
      totalSaved,
      sources: {
        epa: epaAlerts.length,
        fsis: fsisAlerts.length,
        fda: fdaAlerts.length,
        federalRegister: fedRegAlerts.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    logStep('Error in Enhanced Regulatory Data Collection:', error);
    
    return new Response(JSON.stringify({
      error: (error as Error).message || 'Unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});