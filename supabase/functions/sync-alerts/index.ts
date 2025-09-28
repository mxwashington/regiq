// Hourly Alert Sync Edge Function
// Scheduled function to sync alerts from all agency APIs

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SyncResult {
  source: string;
  success: boolean;
  startTime: string;
  endTime: string;
  alertsFetched: number;
  alertsInserted: number;
  alertsUpdated: number;
  alertsSkipped: number;
  errors: string[];
}

interface Alert {
  external_id: string;
  source: 'FDA' | 'FSIS' | 'CDC' | 'EPA';
  title: string;
  summary: string | null;
  link_url: string | null;
  date_published: string;
  date_updated: string | null;
  jurisdiction: string | null;
  locations: string[];
  product_types: string[];
  category: string | null;
  severity: number | null;
  raw: any;
  hash: string;
}

// Simple hash function for Deno environment
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Normalize external ID
function normalizeExternalId(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, ' ');
}

// Compute alert hash
function computeAlertHash(source: string, externalId: string, dateUpdated?: string, datePublished?: string): string {
  const hashInput = `${source}:${normalizeExternalId(externalId)}:${dateUpdated || datePublished || ''}`;
  return simpleHash(hashInput);
}

// FDA mapper function
function mapFDA(item: any): Alert {
  const externalId = normalizeExternalId(item.recall_number || item.event_id || item.id || '');
  const datePublished = item.recall_initiation_date || item.receivedate || item.report_date || new Date().toISOString();
  const dateUpdated = item.recall_announcement_date || item.termination_date || null;

  const severity = (() => {
    switch (item.classification?.toLowerCase()) {
      case 'class i': return 90;
      case 'class ii': return 60;
      case 'class iii': return 30;
      default: return 50;
    }
  })();

  return {
    external_id: externalId,
    source: 'FDA',
    title: item.product_description || item.reason_for_recall || item.medicinalproduct || 'FDA Alert',
    summary: item.reason_for_recall || item.product_description || null,
    link_url: item.more_code_info || null,
    date_published: datePublished,
    date_updated: dateUpdated,
    jurisdiction: item.country === 'US' ? item.state : item.country,
    locations: [item.state, item.city, item.country].filter(Boolean),
    product_types: [item.product_type].filter(Boolean),
    category: 'recall',
    severity,
    raw: item,
    hash: computeAlertHash('FDA', externalId, dateUpdated, datePublished)
  };
}

// FSIS mapper function
function mapFSIS(item: any): Alert {
  const externalId = normalizeExternalId(item.recallNumber || item.recall_number || '');
  const datePublished = item.recallDate || item.recall_date || new Date().toISOString();

  const severity = (() => {
    switch (item.recallClass?.toLowerCase() || item.recall_class?.toLowerCase()) {
      case 'class i': return 90;
      case 'class ii': return 60;
      case 'class iii': return 30;
      case 'high': return 85;
      case 'medium': return 55;
      case 'low': return 25;
      default: return 50;
    }
  })();

  return {
    external_id: externalId,
    source: 'FSIS',
    title: item.productName || item.product_name || 'FSIS Recall',
    summary: item.summary || item.reasonForRecall || item.reason_for_recall || null,
    link_url: item.link || item.url || null,
    date_published: datePublished,
    date_updated: null,
    jurisdiction: 'United States',
    locations: [],
    product_types: [item.productName].filter(Boolean),
    category: 'recall',
    severity,
    raw: item,
    hash: computeAlertHash('FSIS', externalId, undefined, datePublished)
  };
}

// Fetch FDA data
async function fetchFDAData(): Promise<any[]> {
  const date = new Date();
  date.setDate(date.getDate() - 1); // Last 1 day for hourly sync
  const dateString = date.toISOString().split('T')[0];

  const searchQuery = `recall_initiation_date:[${dateString}+TO+*]`;
  const endpoints = [
    '/food/enforcement.json',
    '/drug/enforcement.json',
    '/device/enforcement.json'
  ];

  const allResults: any[] = [];

  for (const endpoint of endpoints) {
    try {
      const url = new URL(`https://api.fda.gov${endpoint}`);
      url.searchParams.append('search', searchQuery);
      url.searchParams.append('limit', '100');
      url.searchParams.append('sort', 'recall_initiation_date:desc');

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': 'RegIQ-Sync/1.0' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          allResults.push(...data.results);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error);
    }
  }

  return allResults;
}

// Fetch FSIS data (simplified for Edge Function)
async function fetchFSISData(): Promise<any[]> {
  try {
    // Mock FSIS data for now - in production, implement actual FSIS API call
    return [];
  } catch (error) {
    console.error('Failed to fetch FSIS data:', error);
    return [];
  }
}

// Upsert alert to database
async function upsertAlert(supabase: any, alert: Alert): Promise<{ action: string; success: boolean }> {
  try {
    const { data, error } = await supabase.rpc('upsert_alert_improved', {
      p_external_id: alert.external_id,
      p_source: alert.source,
      p_title: alert.title,
      p_summary: alert.summary,
      p_link_url: alert.link_url,
      p_date_published: alert.date_published,
      p_date_updated: alert.date_updated,
      p_jurisdiction: alert.jurisdiction,
      p_locations: alert.locations,
      p_product_types: alert.product_types,
      p_category: alert.category,
      p_severity: alert.severity,
      p_raw: alert.raw,
      p_hash: alert.hash,
    });

    if (error) {
      console.error('Upsert error:', error);
      return { action: 'error', success: false };
    }

    return { action: data?.[0]?.action || 'unknown', success: true };
  } catch (error) {
    console.error('Upsert exception:', error);
    return { action: 'error', success: false };
  }
}

// Main sync function
async function syncAlerts(): Promise<SyncResult[]> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const results: SyncResult[] = [];

  // Sync FDA
  const fdaResult: SyncResult = {
    source: 'FDA',
    success: false,
    startTime: new Date().toISOString(),
    endTime: '',
    alertsFetched: 0,
    alertsInserted: 0,
    alertsUpdated: 0,
    alertsSkipped: 0,
    errors: [],
  };

  try {
    const fdaData = await fetchFDAData();
    fdaResult.alertsFetched = fdaData.length;

    for (const item of fdaData) {
      try {
        const alert = mapFDA(item);
        const upsertResult = await upsertAlert(supabase, alert);

        if (upsertResult.success) {
          if (upsertResult.action === 'inserted') {
            fdaResult.alertsInserted++;
          } else if (upsertResult.action === 'updated') {
            fdaResult.alertsUpdated++;
          } else {
            fdaResult.alertsSkipped++;
          }
        } else {
          fdaResult.errors.push(`Failed to upsert FDA alert ${alert.external_id}`);
        }
      } catch (error) {
        fdaResult.errors.push(`Failed to process FDA item: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    fdaResult.success = fdaResult.errors.length === 0 || (fdaResult.alertsInserted + fdaResult.alertsUpdated) > 0;
  } catch (error) {
    fdaResult.errors.push(`FDA sync failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  fdaResult.endTime = new Date().toISOString();
  results.push(fdaResult);

  // Sync FSIS
  const fsisResult: SyncResult = {
    source: 'FSIS',
    success: false,
    startTime: new Date().toISOString(),
    endTime: '',
    alertsFetched: 0,
    alertsInserted: 0,
    alertsUpdated: 0,
    alertsSkipped: 0,
    errors: [],
  };

  try {
    const fsisData = await fetchFSISData();
    fsisResult.alertsFetched = fsisData.length;

    for (const item of fsisData) {
      try {
        const alert = mapFSIS(item);
        const upsertResult = await upsertAlert(supabase, alert);

        if (upsertResult.success) {
          if (upsertResult.action === 'inserted') {
            fsisResult.alertsInserted++;
          } else if (upsertResult.action === 'updated') {
            fsisResult.alertsUpdated++;
          } else {
            fsisResult.alertsSkipped++;
          }
        } else {
          fsisResult.errors.push(`Failed to upsert FSIS alert ${alert.external_id}`);
        }
      } catch (error) {
        fsisResult.errors.push(`Failed to process FSIS item: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    fsisResult.success = fsisResult.errors.length === 0 || (fsisResult.alertsInserted + fsisResult.alertsUpdated) > 0;
  } catch (error) {
    fsisResult.errors.push(`FSIS sync failed: ${error.message}`);
  }

  fsisResult.endTime = new Date().toISOString();
  results.push(fsisResult);

  return results;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting hourly alert sync...');
    const startTime = new Date().toISOString();

    const results = await syncAlerts();

    const summary = {
      timestamp: startTime,
      endTime: new Date().toISOString(),
      results,
      totalFetched: results.reduce((sum, r) => sum + r.alertsFetched, 0),
      totalInserted: results.reduce((sum, r) => sum + r.alertsInserted, 0),
      totalUpdated: results.reduce((sum, r) => sum + r.alertsUpdated, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.alertsSkipped, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      success: results.every(r => r.success),
    };

    console.log('Sync completed:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Sync failed:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});