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
  logger.info(`[USDA-AMS-API] ${step}${detailsStr}`);
};

// USDA AMS Organic INTEGRITY Database API
// https://organic.ams.usda.gov/integrity/api/
const ORGANIC_INTEGRITY_BASE = 'https://organic.ams.usda.gov/integrity/api';

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
    logStep("USDA AMS API function started");

    const { action } = await req.json().catch(() => ({ action: 'sync_organic_suspensions' }));

    switch (action) {
      case 'sync_organic_suspensions':
        return await syncOrganicSuspensions(supabaseClient);
      case 'sync_organic_operations':
        return await syncOrganicOperations(supabaseClient);
      case 'test_api':
        return await testAPI();
      default:
        return await syncOrganicSuspensions(supabaseClient);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in usda-ams-api", { message: errorMessage });

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

async function syncOrganicSuspensions(supabase: any) {
  logStep('Syncing USDA AMS Organic suspensions/revocations');

  try {
    // Query for suspended or revoked organic certifications
    // This is critical for food safety compliance
    const url = `${ORGANIC_INTEGRITY_BASE}/operations?status=Suspended&status=Revoked&limit=100`;

    logStep('Fetching suspended/revoked organic operations', { url });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RegIQ-USDA-AMS/1.0',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`USDA AMS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    logStep('USDA AMS API response received', {
      hasData: !!data,
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 0
    });

    let operations = [];
    if (Array.isArray(data)) {
      operations = data;
    } else if (data.results && Array.isArray(data.results)) {
      operations = data.results;
    } else if (data.data && Array.isArray(data.data)) {
      operations = data.data;
    }

    if (operations.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No suspended/revoked organic operations found',
        processed: 0,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let processedCount = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const operation of operations) {
      try {
        const alert = convertOperationToAlert(operation);

        // Check if alert already exists
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

          if (error) {
            logStep('Database insert error', { error: error.message, title: alert.title });
          } else {
            processedCount++;
            logStep('Added USDA AMS organic alert', { title: alert.title });
          }
        }
      } catch (alertError) {
        logStep('Error processing organic operation', { error: alertError });
        continue;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} USDA AMS organic compliance alerts`,
      processed: processedCount,
      total_operations: operations.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    throw new Error(`Failed to sync organic suspensions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function syncOrganicOperations(supabase: any) {
  logStep('Syncing USDA AMS Organic operations (general)');

  try {
    // Query for recently updated operations
    const url = `${ORGANIC_INTEGRITY_BASE}/operations?limit=50&sort=-updated`;

    logStep('Fetching recent organic operations', { url });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RegIQ-USDA-AMS/1.0',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`USDA AMS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    let operations = [];
    if (Array.isArray(data)) {
      operations = data;
    } else if (data.results && Array.isArray(data.results)) {
      operations = data.results;
    } else if (data.data && Array.isArray(data.data)) {
      operations = data.data;
    }

    // Filter for compliance-relevant changes
    const relevantOps = operations.filter((op: any) => {
      const status = (op.status || '').toLowerCase();
      return status.includes('suspend') ||
             status.includes('revoke') ||
             status.includes('surrender') ||
             status.includes('cancel');
    });

    let processedCount = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const operation of relevantOps) {
      try {
        const alert = convertOperationToAlert(operation);

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
            processedCount++;
            logStep('Added USDA AMS organic alert', { title: alert.title });
          }
        }
      } catch (alertError) {
        logStep('Error processing organic operation', { error: alertError });
        continue;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} USDA AMS organic alerts`,
      processed: processedCount,
      total_operations: operations.length,
      relevant_operations: relevantOps.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    throw new Error(`Failed to sync organic operations: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testAPI() {
  const testUrl = `${ORGANIC_INTEGRITY_BASE}/operations?limit=5`;

  logStep('Testing USDA AMS Organic INTEGRITY API', { url: testUrl });

  try {
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'RegIQ-USDA-AMS/1.0',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(15000)
    });

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

function convertOperationToAlert(operation: any): any {
  const operationName = operation.name || operation.operationName || 'Unknown Operation';
  const status = operation.status || 'Unknown Status';
  const certifier = operation.certifier || operation.certifierName || 'Unknown Certifier';
  const location = operation.location || operation.city
    ? `${operation.city || ''}, ${operation.state || ''} ${operation.country || ''}`.trim()
    : 'Unknown Location';

  // Determine urgency based on status
  const urgency = determineUrgency(operation);

  // Create summary
  const summary = `Organic operation ${operationName} in ${location} - Status: ${status} - Certifier: ${certifier}`;

  // Parse dates
  let publishedDate = new Date().toISOString();
  if (operation.statusDate || operation.updated || operation.updatedDate) {
    try {
      const dateStr = operation.statusDate || operation.updated || operation.updatedDate;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        publishedDate = date.toISOString();
      }
    } catch {
      // Use current date if parsing fails
    }
  }

  return {
    title: `USDA Organic Certification: ${operationName} - ${status}`,
    source: 'USDA-AMS',
    urgency,
    summary: summary.length > 500 ? summary.substring(0, 497) + '...' : summary,
    published_date: publishedDate,
    external_url: operation.link || 'https://organic.ams.usda.gov/integrity/',
    full_content: JSON.stringify(operation),
    agency: 'USDA-AMS',
    region: operation.country || 'US',
    category: 'organic-certification'
  };
}

function determineUrgency(operation: any): string {
  const status = (operation.status || '').toLowerCase();
  const text = `${operation.name || ''} ${status} ${operation.certifier || ''}`.toLowerCase();

  // High urgency for suspensions and revocations
  const highUrgencyKeywords = [
    'suspend', 'revoke', 'cancel', 'terminate', 'noncompliance',
    'violation', 'fraud', 'misrepresent'
  ];

  // Medium urgency for surrenders and withdrawals
  const mediumUrgencyKeywords = [
    'surrender', 'withdraw', 'voluntary', 'expire'
  ];

  if (highUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'High';
  } else if (mediumUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'Medium';
  }

  return 'Low';
}