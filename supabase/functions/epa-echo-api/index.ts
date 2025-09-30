import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  logger.info(`[EPA-ECHO-API] ${step}${detailsStr}`);
};

// EPA ECHO (Enforcement and Compliance History Online) Web Services
const EPA_ECHO_BASE = 'https://echo.epa.gov/tools/web-services';

// Food manufacturing NAICS codes
const FOOD_NAICS_CODES = [
  '311', // Food Manufacturing
  '3111', // Animal Food Manufacturing
  '3112', // Grain and Oilseed Milling
  '3113', // Sugar and Confectionery Product Manufacturing
  '3114', // Fruit and Vegetable Preserving and Specialty Food Manufacturing
  '3115', // Dairy Product Manufacturing
  '3116', // Animal Slaughtering and Processing
  '3117', // Seafood Product Preparation and Packaging
  '3118', // Bakeries and Tortilla Manufacturing
  '3119', // Other Food Manufacturing
  '312'   // Beverage and Tobacco Product Manufacturing
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
    logStep("EPA ECHO API function started");

    const { action } = await req.json().catch(() => ({ action: 'fetch_food_violations' }));

    switch (action) {
      case 'fetch_food_violations':
        return await fetchFoodViolations(supabaseClient);
      case 'fetch_enforcement_actions':
        return await fetchEnforcementActions(supabaseClient);
      case 'test_api':
        return await testAPI();
      default:
        return await fetchFoodViolations(supabaseClient);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in epa-echo-api", { message: errorMessage });

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

async function fetchWithRetry(url: string, retryCount = 0): Promise<Response> {
  const maxRetries = 3;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RegIQ Food Safety Monitor/1.0',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(45000) // 45 second timeout for EPA
    });

    if (!response.ok && (response.status === 429 || response.status >= 500) && retryCount < maxRetries) {
      const backoffMs = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
      logStep(`Retrying EPA ECHO after ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return fetchWithRetry(url, retryCount + 1);
    }

    return response;
  } catch (error) {
    if (retryCount < maxRetries) {
      const backoffMs = Math.pow(2, retryCount) * 2000;
      logStep(`Network error, retrying after ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return fetchWithRetry(url, retryCount + 1);
    }
    throw error;
  }
}

async function fetchFoodViolations(supabase: any) {
  logStep('Fetching EPA ECHO food manufacturing violations');

  let totalProcessed = 0;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch facilities with current violations in food manufacturing
  for (const naicsCode of FOOD_NAICS_CODES.slice(0, 5)) { // Limit to top-level codes
    try {
      // Query EPA ECHO for facilities with violations
      const params = new URLSearchParams({
        output: 'JSON',
        p_naics: naicsCode,
        p_act: 'Y', // Active facilities
        p_qiv: 'Y', // Quarters in Violation
        responseset: '1', // Basic facility data
        p_rows: '50' // Limit results
      });

      const url = `${EPA_ECHO_BASE}/get_facilities.json?${params}`;
      logStep(`Fetching violations for NAICS ${naicsCode}`);

      const response = await fetchWithRetry(url);

      if (!response.ok) {
        logStep(`EPA ECHO API error for NAICS ${naicsCode}: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (!data.Results || !data.Results.Results || data.Results.Results.length === 0) {
        logStep(`No violations found for NAICS ${naicsCode}`);
        continue;
      }

      const facilities = data.Results.Results;
      logStep(`Found ${facilities.length} facilities with violations for NAICS ${naicsCode}`);

      for (const facility of facilities) {
        try {
          // Only process facilities with current violations
          if (!facility.CurrVioFlag || facility.CurrVioFlag !== 'Y') {
            continue;
          }

          const alert = {
            title: `EPA Compliance Violation: ${facility.FacName || 'Unknown Facility'}`,
            source: 'EPA',
            urgency: determineUrgency(facility),
            summary: buildFacilitySummary(facility),
            published_date: new Date().toISOString(),
            external_url: `https://echo.epa.gov/detailed-facility-report?fid=${facility.RegistryID}`,
            full_content: JSON.stringify(facility),
            agency: 'EPA',
            region: facility.FacState || 'US',
            category: 'environmental-compliance'
          };

          // Check for duplicates
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('title', alert.title)
            .eq('source', alert.source)
            .gte('published_date', thirtyDaysAgo.toISOString())
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase
              .from('alerts')
              .insert(alert);

            if (!error) {
              totalProcessed++;
              logStep(`Added EPA violation alert: ${alert.title}`);
            } else {
              logStep(`Error inserting alert: ${error.message}`);
            }
          }
        } catch (facilityError) {
          logStep(`Error processing facility: ${facilityError}`);
          continue;
        }
      }

      // Rate limiting - pause between NAICS code queries
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (naicsError) {
      logStep(`Error processing NAICS ${naicsCode}:`, naicsError);
      continue;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Processed ${totalProcessed} EPA ECHO food manufacturing violations`,
    processed: totalProcessed,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function fetchEnforcementActions(supabase: any) {
  logStep('Fetching EPA ECHO enforcement actions');

  let totalProcessed = 0;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  try {
    // Get recent enforcement actions
    const params = new URLSearchParams({
      output: 'JSON',
      responseset: '1',
      p_rows: '100'
    });

    const url = `${EPA_ECHO_BASE}/get_enforcement_summary.json?${params}`;
    logStep('Fetching recent enforcement actions');

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      throw new Error(`EPA ECHO API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.Results || !data.Results.Results) {
      logStep('No enforcement actions found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No EPA enforcement actions found',
        processed: 0,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const actions = data.Results.Results;
    logStep(`Found ${actions.length} enforcement actions`);

    for (const action of actions) {
      try {
        const alert = {
          title: `EPA Enforcement Action: ${action.EnforcementActionName || 'Enforcement Case'}`,
          source: 'EPA',
          urgency: 'High',
          summary: `EPA enforcement action: ${action.ActionType || 'N/A'} - ${action.FacilityName || 'Unknown Facility'} - Penalty: $${action.PenaltyAmount || 0}`,
          published_date: action.EnforcementDate ? new Date(action.EnforcementDate).toISOString() : new Date().toISOString(),
          external_url: action.EnforcementURL || 'https://echo.epa.gov',
          full_content: JSON.stringify(action),
          agency: 'EPA',
          region: 'US',
          category: 'enforcement'
        };

        // Check for duplicates
        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('title', alert.title)
          .eq('source', alert.source)
          .gte('published_date', ninetyDaysAgo.toISOString())
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
      } catch (actionError) {
        logStep(`Error processing enforcement action: ${actionError}`);
        continue;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${totalProcessed} EPA enforcement actions`,
      processed: totalProcessed,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    throw new Error(`Failed to fetch enforcement actions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testAPI() {
  const testUrl = `${EPA_ECHO_BASE}/get_facilities.json?output=JSON&p_naics=311&p_rows=5`;

  logStep('Testing EPA ECHO API access', { url: testUrl });

  try {
    const response = await fetchWithRetry(testUrl);

    const isSuccess = response.ok;
    const responseText = await response.text();

    return new Response(JSON.stringify({
      success: isSuccess,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      contentLength: responseText.length,
      contentPreview: responseText.substring(0, 1000),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
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
    parts.push(`3-Year Compliance Status: ${facility.Quarters3yrComplStatus}`);
  }

  if (facility.Infea5yrFlag === 'Y') {
    parts.push('Formal enforcement action in last 5 years');
  }

  return parts.join(' - ');
}

function determineUrgency(facility: any): string {
  // High urgency for current violations with enforcement actions
  if (facility.CurrVioFlag === 'Y' && facility.Infea5yrFlag === 'Y') {
    return 'High';
  }

  // High urgency for current violations
  if (facility.CurrVioFlag === 'Y') {
    return 'High';
  }

  // Medium urgency for facilities with recent enforcement
  if (facility.Infea5yrFlag === 'Y') {
    return 'Medium';
  }

  return 'Medium';
}