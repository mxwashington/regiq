/**
 * Source Health Check Function
 * 
 * Validates regulatory data ingestion across all sources (FDA, FSIS, EPA, CDC)
 * with freshness thresholds, connectivity tests, and duplicate detection.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface SourceHealthStatus {
  status: 'OK' | 'STALE' | 'AUTH_ERROR' | 'CONNECTIVITY_ERROR' | 'NO_DATA';
  latest?: string;
  records_last7?: number;
  dupes?: number;
  error?: string;
  response_time_ms?: number;
  freshness_threshold_hours?: number;
}

interface HealthCheckResult {
  FDA: SourceHealthStatus;
  FSIS: SourceHealthStatus;
  EPA: SourceHealthStatus;
  CDC: SourceHealthStatus;
  overall_status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  total_alerts_7d: number;
}

// Freshness thresholds in hours
const FRESHNESS_THRESHOLDS = {
  FDA: 24,
  FSIS: 12,
  EPA: 48,
  CDC: 72,
};

// API endpoints to test connectivity
const API_ENDPOINTS = {
  FDA: 'https://api.fda.gov/food/enforcement.json?limit=1',
  FSIS: 'https://www.fsis.usda.gov/rss/fsis-recalls.xml',
  EPA: 'https://www.regulations.gov/api/search/v2/documents?filter[agencyId]=EPA&page[size]=1',
  CDC: 'https://tools.cdc.gov/api/v2/resources/media?max=1',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Source Health Check] Starting comprehensive health check');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Run all health checks in parallel
    const [fdaHealth, fsisHealth, epaHealth, cdcHealth] = await Promise.all([
      checkSourceHealth(supabase, 'FDA', FRESHNESS_THRESHOLDS.FDA, API_ENDPOINTS.FDA),
      checkSourceHealth(supabase, 'FSIS', FRESHNESS_THRESHOLDS.FSIS, API_ENDPOINTS.FSIS),
      checkSourceHealth(supabase, 'EPA', FRESHNESS_THRESHOLDS.EPA, API_ENDPOINTS.EPA),
      checkSourceHealth(supabase, 'CDC', FRESHNESS_THRESHOLDS.CDC, API_ENDPOINTS.CDC),
    ]);

    // Calculate total alerts in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: totalAlerts7d } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .gte('published_date', sevenDaysAgo.toISOString());

    // Determine overall status
    const statuses = [fdaHealth, fsisHealth, epaHealth, cdcHealth];
    const hasError = statuses.some(s => s.status === 'AUTH_ERROR' || s.status === 'CONNECTIVITY_ERROR');
    const hasStale = statuses.some(s => s.status === 'STALE' || s.status === 'NO_DATA');
    const allOk = statuses.every(s => s.status === 'OK');

    let overallStatus: 'healthy' | 'degraded' | 'critical';
    if (hasError) {
      overallStatus = 'critical';
    } else if (hasStale) {
      overallStatus = 'degraded';
    } else if (allOk) {
      overallStatus = 'healthy';
    } else {
      overallStatus = 'degraded';
    }

    const result: HealthCheckResult = {
      FDA: fdaHealth,
      FSIS: fsisHealth,
      EPA: epaHealth,
      CDC: cdcHealth,
      overall_status: overallStatus,
      timestamp: new Date().toISOString(),
      total_alerts_7d: totalAlerts7d || 0,
    };

    // Log to source_health_logs table
    await supabase.from('source_health_logs').insert({
      check_timestamp: new Date().toISOString(),
      fda_status: fdaHealth.status,
      fsis_status: fsisHealth.status,
      epa_status: epaHealth.status,
      cdc_status: cdcHealth.status,
      overall_status: overallStatus,
      results: result,
    });

    console.log('[Source Health Check] Complete:', overallStatus);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[Source Health Check] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/**
 * Check health of individual source
 */
async function checkSourceHealth(
  supabase: any,
  source: string,
  freshnessThresholdHours: number,
  apiEndpoint: string
): Promise<SourceHealthStatus> {
  const startTime = Date.now();

  try {
    // Test API connectivity
    const connectivityTest = await testConnectivity(apiEndpoint);
    const responseTime = Date.now() - startTime;

    if (!connectivityTest.success) {
      return {
        status: connectivityTest.authError ? 'AUTH_ERROR' : 'CONNECTIVITY_ERROR',
        error: connectivityTest.error,
        response_time_ms: responseTime,
        freshness_threshold_hours: freshnessThresholdHours,
      };
    }

    // Query database for latest alert
    const { data: latestAlert } = await supabase
      .from('alerts')
      .select('published_date')
      .or(`source.eq.${source},agency.eq.${source}`)
      .order('published_date', { ascending: false })
      .limit(1)
      .single();

    if (!latestAlert) {
      return {
        status: 'NO_DATA',
        records_last7: 0,
        dupes: 0,
        error: 'No data found in database',
        response_time_ms: responseTime,
        freshness_threshold_hours: freshnessThresholdHours,
      };
    }

    const latestDate = new Date(latestAlert.published_date);
    const now = new Date();
    const hoursDiff = (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60);

    // Check if data is stale
    const isStale = hoursDiff > freshnessThresholdHours;

    // Count records in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recordsLast7 } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .or(`source.eq.${source},agency.eq.${source}`)
      .gte('published_date', sevenDaysAgo.toISOString());

    // Check for duplicates
    const { data: dupeCheck } = await supabase
      .rpc('check_source_duplicates', { source_name: source });

    const dupeCount = dupeCheck?.[0]?.duplicate_count || 0;

    return {
      status: isStale ? 'STALE' : 'OK',
      latest: latestDate.toISOString(),
      records_last7: recordsLast7 || 0,
      dupes: dupeCount,
      response_time_ms: responseTime,
      freshness_threshold_hours: freshnessThresholdHours,
    };

  } catch (error) {
    console.error(`[Source Health Check] Error checking ${source}:`, error);
    return {
      status: 'CONNECTIVITY_ERROR',
      error: error instanceof Error ? error.message : String(error),
      response_time_ms: Date.now() - startTime,
      freshness_threshold_hours: freshnessThresholdHours,
    };
  }
}

/**
 * Test API connectivity
 */
async function testConnectivity(endpoint: string): Promise<{ success: boolean; authError?: boolean; error?: string }> {
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'Accept': 'application/json, application/xml, text/xml',
        'User-Agent': 'RegIQ-HealthCheck/1.0',
      },
    });

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        authError: true,
        error: `Authentication error: ${response.status} ${response.statusText}`,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
