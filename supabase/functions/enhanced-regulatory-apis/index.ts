import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ENHANCED-APIS] ${step}${detailsStr}`);
};

interface APIConfig {
  name: string;
  baseUrl: string;
  requiresAuth: boolean;
  endpoints: APIEndpoint[];
}

interface APIEndpoint {
  path: string;
  params?: Record<string, string>;
  urgencyLevel: string;
  keywords: string[];
}

// Comprehensive API configs including new openFDA and FSIS APIs
const API_CONFIGS: APIConfig[] = [
  {
    name: 'FDA_openFDA',
    baseUrl: 'https://api.fda.gov',
    requiresAuth: false,
    endpoints: [
      {
        path: '/drug/event.json',
        params: { limit: '20' },
        urgencyLevel: 'High',
        keywords: ['adverse', 'reaction', 'side effect', 'death', 'hospitalization']
      },
      {
        path: '/drug/enforcement.json',
        params: { limit: '20' },
        urgencyLevel: 'High',
        keywords: ['recall', 'class i', 'class ii', 'withdrawal', 'defect']
      },
      {
        path: '/food/enforcement.json',
        params: { limit: '20' },
        urgencyLevel: 'High',
        keywords: ['contamination', 'recall', 'listeria', 'salmonella', 'allergen']
      },
      {
        path: '/device/enforcement.json',
        params: { limit: '20' },
        urgencyLevel: 'High',
        keywords: ['malfunction', 'defect', 'recall', 'safety', 'death']
      },
      {
        path: '/animalandveterinary/event.json',
        params: { limit: '20' },
        urgencyLevel: 'Medium',
        keywords: ['veterinary', 'animal', 'adverse', 'death', 'reaction']
      }
    ]
  },
  {
    name: 'FSIS_Recalls',
    baseUrl: 'https://www.fsis.usda.gov/fsis/api/recall/v/1',
    requiresAuth: false,
    endpoints: [
      {
        path: '',
        params: { limit: '20' },
        urgencyLevel: 'High',
        keywords: ['meat', 'poultry', 'recall', 'contamination', 'pathogen']
      }
    ]
  },
  {
    name: 'EPA_ECHO',
    baseUrl: 'https://echo.epa.gov/tools/web-services',
    requiresAuth: false,
    endpoints: [
      {
        path: '/get_facilities.json',
        params: { p_act: 'Y', output: 'JSON', responseset: '1' },
        urgencyLevel: 'Medium',
        keywords: ['enforcement', 'violation', 'penalty', 'compliance']
      },
      {
        path: '/get_enforcement_summary.json',
        params: { output: 'JSON', responseset: '1' },
        urgencyLevel: 'High',
        keywords: ['enforcement', 'action', 'penalty', 'violation']
      }
    ]
  },
  {
    name: 'Federal_Register',
    baseUrl: 'https://www.federalregister.gov/api/v1',
    requiresAuth: false,
    endpoints: [
      {
        path: '/documents.json',
        params: { 
          'conditions[agencies][]': 'food-and-drug-administration',
          'conditions[type]': 'Rule',
          'order': 'newest'
        },
        urgencyLevel: 'Medium',
        keywords: ['rule', 'regulation', 'final rule', 'proposed rule']
      },
      {
        path: '/documents.json',
        params: {
          'conditions[agencies][]': 'environmental-protection-agency',
          'conditions[type]': 'Rule',
          'order': 'newest'
        },
        urgencyLevel: 'Medium',
        keywords: ['environmental', 'pollution', 'cleanup', 'regulation']
      }
    ]
  },
  {
    name: 'Canada_Health_API',
    baseUrl: 'https://healthycanadians.gc.ca/recall-alert-rappel-avis/api',
    requiresAuth: false,
    endpoints: [
      {
        path: '/recent.json',
        params: { lang: 'en', cat: 'all' },
        urgencyLevel: 'High',
        keywords: ['recall', 'safety alert', 'health hazard', 'contamination']
      }
    ]
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Enhanced regulatory APIs function started");

    const { action, apiName, ...params } = await req.json();

    switch (action) {
      case 'fetch_fda_apis':
        return await fetchFDAAPIs(supabaseClient);
      case 'fetch_fsis_recalls':
        return await fetchFSISRecalls(supabaseClient);
      case 'fetch_epa_enforcement':
        return await fetchEPAEnforcement(supabaseClient);
      case 'fetch_federal_register':
        return await fetchFederalRegister(supabaseClient, params);
      case 'fetch_canada_recalls':
        return await fetchCanadaRecalls(supabaseClient);
      case 'sync_all_apis':
        return await syncAllAPIs(supabaseClient);
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in enhanced-regulatory-apis", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function fetchEPAEnforcement(supabase: any) {
  const epaConfig = API_CONFIGS.find(api => api.name === 'EPA_ECHO');
  if (!epaConfig) throw new Error('EPA ECHO config not found');

  let totalProcessed = 0;

  for (const endpoint of epaConfig.endpoints) {
    try {
      const queryParams = new URLSearchParams(endpoint.params || {});
      const url = `${epaConfig.baseUrl}${endpoint.path}?${queryParams}`;
      
      logStep(`Fetching EPA ECHO data from: ${endpoint.path}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RegIQ-Enhanced-APIs/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        logStep(`EPA ECHO API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.Results && data.Results.length > 0) {
        for (const item of data.Results.slice(0, 20)) { // Limit to 20 per endpoint
          const alert = {
            title: `EPA Enforcement: ${item.CurrVioFlag ? 'Current Violation' : 'Facility Update'} - ${item.FacName || 'Unknown Facility'}`,
            source: 'EPA',
            urgency: determineUrgency(item, endpoint),
            summary: `Facility: ${item.FacName || 'N/A'} - State: ${item.FacState || 'N/A'} - ${item.CurrVioFlag ? 'Currently in violation' : 'Compliance status updated'}`,
            published_date: new Date().toISOString(),
            external_url: `https://echo.epa.gov/detailed-facility-report?fid=${item.RegistryID}`,
            full_content: JSON.stringify(item)
          };

          // Check if already exists
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('title', alert.title)
            .eq('source', alert.source)
            .gte('published_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase
              .from('alerts')
              .insert(alert);

            if (!error) {
              totalProcessed++;
              logStep(`Added EPA enforcement alert: ${alert.title}`);
            }
          }
        }
      }

      // Rate limit pause
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      logStep(`Error processing EPA endpoint ${endpoint.path}:`, error);
    }
  }

  return new Response(JSON.stringify({ 
    message: `Processed ${totalProcessed} EPA enforcement alerts`,
    processed: totalProcessed 
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function fetchFederalRegister(supabase: any, params: any) {
  const federalConfig = API_CONFIGS.find(api => api.name === 'Federal_Register');
  if (!federalConfig) throw new Error('Federal Register config not found');

  let totalProcessed = 0;

  for (const endpoint of federalConfig.endpoints) {
    try {
      const queryParams = new URLSearchParams(endpoint.params || {});
      // Add per_page limit
      queryParams.set('per_page', '20');
      
      const url = `${federalConfig.baseUrl}${endpoint.path}?${queryParams}`;
      
      logStep(`Fetching Federal Register data`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RegIQ-Enhanced-APIs/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        logStep(`Federal Register API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        for (const item of data.results) {
          const alert = {
            title: `Federal Register: ${item.title || 'New Regulatory Document'}`,
            source: 'Federal_Register',
            urgency: determineUrgency(item, endpoint),
            summary: `${item.abstract || item.title || 'New federal regulation published'} - Document Number: ${item.document_number}`,
            published_date: item.publication_date ? new Date(item.publication_date).toISOString() : new Date().toISOString(),
            external_url: item.html_url || `https://www.federalregister.gov/documents/${item.document_number}`,
            full_content: JSON.stringify(item)
          };

          // Check if already exists
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('title', alert.title)
            .eq('source', alert.source)
            .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase
              .from('alerts')
              .insert(alert);

            if (!error) {
              totalProcessed++;
              logStep(`Added Federal Register alert: ${alert.title}`);
            }
          }
        }
      }

      // Rate limit pause
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      logStep(`Error processing Federal Register endpoint:`, error);
    }
  }

  return new Response(JSON.stringify({ 
    message: `Processed ${totalProcessed} Federal Register alerts`,
    processed: totalProcessed 
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function fetchCanadaRecalls(supabase: any) {
  const canadaConfig = API_CONFIGS.find(api => api.name === 'Canada_Health_API');
  if (!canadaConfig) throw new Error('Canada Health API config not found');

  let totalProcessed = 0;

  for (const endpoint of canadaConfig.endpoints) {
    try {
      const queryParams = new URLSearchParams(endpoint.params || {});
      const url = `${canadaConfig.baseUrl}${endpoint.path}?${queryParams}`;
      
      logStep(`Fetching Canada Health recalls`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RegIQ-Enhanced-APIs/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        logStep(`Canada Health API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        for (const item of data.results.slice(0, 20)) {
          const alert = {
            title: `Canada Health: ${item.title || 'Health Recall/Alert'}`,
            source: 'Health_Canada',
            urgency: determineUrgency(item, endpoint),
            summary: `${item.summary || 'Health Canada recall or safety alert'} - Category: ${item.category || 'N/A'}`,
            published_date: item.date_published ? new Date(item.date_published).toISOString() : new Date().toISOString(),
            external_url: item.url || 'https://healthycanadians.gc.ca/recall-alert-rappel-avis/',
            full_content: JSON.stringify(item)
          };

          // Check if already exists
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('title', alert.title)
            .eq('source', alert.source)
            .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase
              .from('alerts')
              .insert(alert);

            if (!error) {
              totalProcessed++;
              logStep(`Added Canada Health alert: ${alert.title}`);
            }
          }
        }
      }

      // Rate limit pause
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      logStep(`Error processing Canada Health endpoint:`, error);
    }
  }

  return new Response(JSON.stringify({ 
    message: `Processed ${totalProcessed} Canada Health alerts`,
    processed: totalProcessed 
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function fetchFDAAPIs(supabase: any) {
  const fdaConfig = API_CONFIGS.find(api => api.name === 'FDA_openFDA');
  if (!fdaConfig) throw new Error('FDA openFDA config not found');

  let totalProcessed = 0;

  for (const endpoint of fdaConfig.endpoints) {
    try {
      const queryParams = new URLSearchParams(endpoint.params || {});
      const url = `${fdaConfig.baseUrl}${endpoint.path}?${queryParams}`;
      
      logStep(`Fetching FDA data from: ${endpoint.path}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RegIQ-Enhanced-APIs/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        logStep(`FDA API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        for (const item of data.results.slice(0, 20)) {
          const alert = {
            title: `FDA ${endpoint.path.includes('enforcement') ? 'Enforcement' : 'Alert'}: ${item.product_description || item.brand_name || item.product_name || 'FDA Regulatory Alert'}`,
            source: 'FDA',
            urgency: determineUrgency(item, endpoint),
            summary: `${item.reason_for_recall || item.summary || 'FDA regulatory alert'} - ${item.company_name || 'Unknown Company'}`,
            published_date: item.recall_initiation_date ? new Date(item.recall_initiation_date).toISOString() : new Date().toISOString(),
            external_url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
            full_content: JSON.stringify(item)
          };

          // Check if already exists
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('title', alert.title)
            .eq('source', alert.source)
            .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase
              .from('alerts')
              .insert(alert);

            if (!error) {
              totalProcessed++;
              logStep(`Added FDA alert: ${alert.title}`);
            }
          }
        }
      }

      // Rate limit pause
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      logStep(`Error processing FDA endpoint ${endpoint.path}:`, error);
    }
  }

  return new Response(JSON.stringify({ 
    message: `Processed ${totalProcessed} FDA alerts`,
    processed: totalProcessed 
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function fetchFSISRecalls(supabase: any) {
  const fsisConfig = API_CONFIGS.find(api => api.name === 'FSIS_Recalls');
  if (!fsisConfig) throw new Error('FSIS Recalls config not found');

  let totalProcessed = 0;

  for (const endpoint of fsisConfig.endpoints) {
    try {
      const queryParams = new URLSearchParams(endpoint.params || {});
      const url = `${fsisConfig.baseUrl}${endpoint.path}?${queryParams}`;
      
      logStep(`Fetching FSIS recalls data`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RegIQ-Enhanced-APIs/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        logStep(`FSIS API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        for (const item of data.slice(0, 20)) {
          const alert = {
            title: `FSIS Recall: ${item.productName || item.product_description || 'Meat/Poultry Recall'}`,
            source: 'FSIS',
            urgency: determineUrgency(item, endpoint),
            summary: `${item.summary || item.reasonForRecall || 'FSIS meat/poultry recall'} - ${item.companyName || 'Unknown Company'}`,
            published_date: item.recallDate ? new Date(item.recallDate).toISOString() : new Date().toISOString(),
            external_url: `https://www.fsis.usda.gov/recalls-alerts`,
            full_content: JSON.stringify(item)
          };

          // Check if already exists
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('title', alert.title)
            .eq('source', alert.source)
            .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase
              .from('alerts')
              .insert(alert);

            if (!error) {
              totalProcessed++;
              logStep(`Added FSIS recall alert: ${alert.title}`);
            }
          }
        }
      }

      // Rate limit pause
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      logStep(`Error processing FSIS endpoint:`, error);
    }
  }

  return new Response(JSON.stringify({ 
    message: `Processed ${totalProcessed} FSIS recall alerts`,
    processed: totalProcessed 
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function syncAllAPIs(supabase: any) {
  logStep("Starting sync of all enhanced APIs");
  
  const results = {
    fda_apis: 0,
    fsis_recalls: 0,
    epa_enforcement: 0,
    federal_register: 0,
    canada_health: 0
  };

  try {
    // FDA APIs
    const fdaResponse = await fetchFDAAPIs(supabase);
    const fdaData = await fdaResponse.json();
    results.fda_apis = fdaData.processed || 0;

    // FSIS Recalls
    const fsisResponse = await fetchFSISRecalls(supabase);
    const fsisData = await fsisResponse.json();
    results.fsis_recalls = fsisData.processed || 0;

    // EPA Enforcement
    const epaResponse = await fetchEPAEnforcement(supabase);
    const epaData = await epaResponse.json();
    results.epa_enforcement = epaData.processed || 0;

    // Federal Register
    const fedResponse = await fetchFederalRegister(supabase, {});
    const fedData = await fedResponse.json();
    results.federal_register = fedData.processed || 0;

    // Canada Health
    const canadaResponse = await fetchCanadaRecalls(supabase);
    const canadaData = await canadaResponse.json();
    results.canada_health = canadaData.processed || 0;

  } catch (error) {
    logStep("Error in sync all APIs:", error);
  }

  const totalProcessed = Object.values(results).reduce((sum, count) => sum + count, 0);

  return new Response(JSON.stringify({ 
    message: `Enhanced APIs sync completed - ${totalProcessed} total alerts`,
    results,
    totalProcessed
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

function determineUrgency(item: any, endpoint: APIEndpoint): string {
  const text = JSON.stringify(item).toLowerCase();
  
  // Base urgency from endpoint
  let urgency = endpoint.urgencyLevel;
  
  // Check for high-priority keywords
  const highPriorityTerms = ['violation', 'enforcement', 'penalty', 'recall', 'immediate', 'urgent', 'critical'];
  const hasHighPriority = highPriorityTerms.some(term => text.includes(term));
  
  if (hasHighPriority && urgency === 'Medium') {
    urgency = 'High';
  }
  
  // Check endpoint-specific keywords
  const hasKeywords = endpoint.keywords.some(keyword => text.includes(keyword.toLowerCase()));
  if (hasKeywords && urgency === 'Low') {
    urgency = 'Medium';
  }
  
  return urgency;
}