/**
 * FDA Data Feed Function
 *
 * Fetches FDA enforcement data (recalls, drug shortages) using the new
 * fail-fast error handling pattern with FDA API authentication.
 *
 * Changes from original:
 * - Uses centralized fda-error-handler.ts for all API calls
 * - Adds FDA_API_KEY authentication for higher rate limits
 * - Throws errors instead of silently continuing on failures
 * - Detects and reports zero-results scenarios
 * - All fetch requests have 30-second timeouts
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  fetchFDAData,
  FDAAPIError,
  NoResultsError,
  RSSParseError
} from "../_shared/fda-error-handler.ts";

// Simple logger for edge functions
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

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  logger.info(`[FDA-DATA-FEED] ${step}${detailsStr}`);
};

// Get FDA API key from environment - CRITICAL for avoiding rate limits
const FDA_API_KEY = Deno.env.get('FDA_API_KEY');

// Log warning if API key is missing (helps with production debugging)
if (!FDA_API_KEY) {
  logger.warn(
    '[FDA Auth] FDA_API_KEY not set - using unauthenticated rate limits (1,000 req/day). ' +
    'Get key from: https://open.fda.gov/apis/authentication/'
  );
}

interface FDASearchParams {
  search?: string;
  limit?: number;
  skip?: number;
  sort?: string;
}

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
    logStep("FDA Data Feed function started");

    // This function fetches FDA data and pushes it to the alerts feed
    const { action, ...params } = await req.json();

    switch (action) {
      case 'fetch_recent_recalls':
        return await fetchRecentRecalls(supabaseClient, params);
      case 'fetch_class_i_recalls':
        return await fetchClassIRecalls(supabaseClient);
      case 'fetch_drug_shortages':
        return await fetchDrugShortages(supabaseClient);
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorContext = (error as any)?.context || {};

    logStep("ERROR in fda-data-feed", {
      message: errorMessage,
      context: errorContext,
      type: error?.constructor?.name
    });

    return new Response(JSON.stringify({
      error: errorMessage,
      context: errorContext,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * Fetches recent recalls across all FDA enforcement categories
 *
 * WHY THIS CHANGE: Uses centralized error handler instead of inline error handling
 * that silently continued on failures
 */
async function fetchRecentRecalls(supabase: any, params: any) {
  const days = params.days || 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  const dateString = date.toISOString().split('T')[0].replace(/-/g, '');

  // Fetch FDA enforcement data from multiple endpoints
  const endpoints = [
    { name: 'Food Enforcement', url: 'https://api.fda.gov/food/enforcement.json' },
    { name: 'Drug Enforcement', url: 'https://api.fda.gov/drug/enforcement.json' },
    { name: 'Device Enforcement', url: 'https://api.fda.gov/device/enforcement.json' }
  ];

  let totalProcessed = 0;
  const errors: any[] = [];

  for (const endpoint of endpoints) {
    try {
      const searchQuery = `recall_initiation_date:[${dateString}+TO+*]`;

      logStep(`Fetching FDA data from ${endpoint.name}`);

      // USE NEW ERROR HANDLER - Will throw on failures instead of returning []
      const results = await fetchFDAData({
        endpoint: endpoint.url,
        params: {
          search: searchQuery,
          limit: '20',
          sort: 'recall_initiation_date:desc'
        },
        api_key: FDA_API_KEY,
        rss_fallback_enabled: false, // No RSS fallback for enforcement data
        max_retries: 3,
        timeout_ms: 30000
      });

      // Process results
      for (const item of results) {
        const alert = {
          title: `${item.classification || 'Class Unknown'}: ${item.product_description || 'FDA Recall'}`,
          source: 'FDA',
          urgency: getUrgencyFromClassification(item.classification),
          summary: `${item.reason_for_recall || 'No reason provided'} - ${item.company_name || 'Unknown company'}`,
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
          } else {
            logStep(`Failed to insert alert: ${error.message}`);
          }
        }
      }

      // Rate limit pause between endpoints
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      // Log structured error with full context
      const errorInfo = {
        endpoint: endpoint.name,
        error: error instanceof Error ? error.message : String(error),
        type: error?.constructor?.name,
        context: (error as any)?.context || {}
      };

      logStep(`Error processing ${endpoint.name}`, errorInfo);
      errors.push(errorInfo);

      // CRITICAL: Don't silently continue - track errors for response
    }
  }

  // If ALL endpoints failed, return error response
  if (errors.length === endpoints.length) {
    return new Response(JSON.stringify({
      error: 'All FDA endpoints failed',
      errors: errors,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  return new Response(JSON.stringify({
    message: `Processed ${totalProcessed} FDA alerts`,
    processed: totalProcessed,
    errors: errors.length > 0 ? errors : undefined
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

/**
 * Fetches Class I recalls (most serious - likely to cause serious health problems or death)
 *
 * WHY THIS CHANGE: Now throws errors on API failures instead of propagating them up silently
 */
async function fetchClassIRecalls(supabase: any) {
  try {
    logStep('Fetching Class I recalls');

    // USE NEW ERROR HANDLER with fail-fast pattern
    const results = await fetchFDAData({
      endpoint: 'https://api.fda.gov/food/enforcement.json',
      params: {
        search: 'classification:"Class I"',
        limit: '20',
        sort: 'recall_initiation_date:desc'
      },
      api_key: FDA_API_KEY,
      rss_fallback_enabled: false,
      max_retries: 3,
      timeout_ms: 30000
    });

    let processed = 0;

    for (const item of results) {
      const alert = {
        title: `Class I Recall: ${item.product_description || 'FDA Food Recall'}`,
        source: 'FDA',
        urgency: 'High',
        summary: `URGENT: ${item.reason_for_recall || 'Critical food safety issue'} - ${item.company_name || 'Unknown company'}`,
        published_date: item.recall_initiation_date ? new Date(item.recall_initiation_date).toISOString() : new Date().toISOString(),
        external_url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
        full_content: JSON.stringify(item)
      };

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
          processed++;
        }
      }
    }

    return new Response(JSON.stringify({
      message: `Processed ${processed} Class I recalls`,
      processed
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // Error is thrown with full context from error handler
    throw new Error(`Failed to fetch Class I recalls: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetches drug shortages from FDA API
 *
 * WHY THIS CHANGE: Uses centralized error handler, adds API key authentication
 */
async function fetchDrugShortages(supabase: any) {
  try {
    logStep('Fetching drug shortages');

    // USE NEW ERROR HANDLER
    const results = await fetchFDAData({
      endpoint: 'https://api.fda.gov/drug/shortages.json',
      params: {
        limit: '20'
      },
      api_key: FDA_API_KEY,
      rss_fallback_enabled: false,
      max_retries: 3,
      timeout_ms: 30000
    });

    let processed = 0;

    for (const item of results) {
      const alert = {
        title: `Drug Shortage: ${item.product_name || 'Unknown Drug'}`,
        source: 'FDA',
        urgency: 'Medium',
        summary: `${item.reason || 'Drug shortage reported'} - Status: ${item.status || 'Unknown'}`,
        published_date: item.revision_date ? new Date(item.revision_date).toISOString() : new Date().toISOString(),
        external_url: 'https://www.accessdata.fda.gov/scripts/drugshortages/',
        full_content: JSON.stringify(item)
      };

      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('title', alert.title)
        .eq('source', alert.source)
        .gte('published_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase
          .from('alerts')
          .insert(alert);

        if (!error) {
          processed++;
        }
      }
    }

    return new Response(JSON.stringify({
      message: `Processed ${processed} drug shortages`,
      processed
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    throw new Error(`Failed to fetch drug shortages: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function getUrgencyFromClassification(classification: string): string {
  if (!classification) return 'Medium';

  const lowerClass = classification.toLowerCase();
  if (lowerClass.includes('class i')) return 'High';
  if (lowerClass.includes('class ii')) return 'Medium';
  if (lowerClass.includes('class iii')) return 'Low';

  return 'Medium';
}
