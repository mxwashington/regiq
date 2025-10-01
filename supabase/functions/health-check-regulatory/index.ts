/**
 * Regulatory API Health Check Function
 *
 * Monitors health of all external regulatory APIs (FDA, CDC, USDA, etc.)
 * Logs results to api_health_checks table for historical tracking.
 *
 * Features:
 * - Tests multiple FDA endpoints in parallel
 * - Detects degraded performance (>5s response time)
 * - Handles rate limiting gracefully
 * - Returns overall system health status
 * - Designed to run via cron every 15 minutes
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface HealthCheck {
  api_name: string;
  endpoint: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  status_code?: number;
  response_time_ms?: number;
  error_message?: string;
  timestamp: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Get FDA API key from environment
const FDA_API_KEY = Deno.env.get('FDA_API_KEY');

// Endpoints to monitor
const ENDPOINTS_TO_CHECK = [
  {
    name: 'FDA Food Enforcement',
    url: `https://api.fda.gov/food/enforcement.json?limit=1${FDA_API_KEY ? `&api_key=${FDA_API_KEY}` : ''}`
  },
  {
    name: 'FDA Drug Enforcement',
    url: `https://api.fda.gov/drug/enforcement.json?limit=1${FDA_API_KEY ? `&api_key=${FDA_API_KEY}` : ''}`
  },
  {
    name: 'FDA Device Enforcement',
    url: `https://api.fda.gov/device/enforcement.json?limit=1${FDA_API_KEY ? `&api_key=${FDA_API_KEY}` : ''}`
  },
  {
    name: 'FDA Drug Shortages',
    url: `https://api.fda.gov/drug/shortages.json?limit=1${FDA_API_KEY ? `&api_key=${FDA_API_KEY}` : ''}`
  },
  {
    name: 'FDA Food RSS',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food/rss.xml'
  },
  {
    name: 'FDA Recalls RSS',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml'
  }
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Health Check] Starting regulatory API health check');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const results: HealthCheck[] = [];

  // Check each endpoint in parallel for speed
  const checkPromises = ENDPOINTS_TO_CHECK.map(endpoint => checkEndpoint(endpoint, supabase));
  const checkResults = await Promise.allSettled(checkPromises);

  // Process results
  for (let i = 0; i < checkResults.length; i++) {
    const result = checkResults[i];
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      // Handle promise rejection
      const endpoint = ENDPOINTS_TO_CHECK[i];
      results.push({
        api_name: endpoint.name,
        endpoint: endpoint.url,
        status: 'unhealthy',
        error_message: `Check failed: ${result.reason}`,
        timestamp: new Date().toISOString()
      });

      // Log to database
      await supabase.from('api_health_checks').insert({
        api_name: endpoint.name,
        endpoint: endpoint.url,
        status: 'unhealthy',
        error_message: `Check failed: ${result.reason}`
      });
    }
  }

  // Determine overall health
  const allHealthy = results.every(r => r.status === 'healthy');
  const anyUnhealthy = results.some(r => r.status === 'unhealthy');
  const overallStatus = allHealthy ? 'healthy' : (anyUnhealthy ? 'unhealthy' : 'degraded');

  console.log(`[Health Check] Overall status: ${overallStatus}`);
  console.log(`[Health Check] Results: ${JSON.stringify(results.map(r => ({ name: r.api_name, status: r.status })))}`);

  return new Response(
    JSON.stringify({
      overall: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      summary: {
        total: results.length,
        healthy: results.filter(r => r.status === 'healthy').length,
        degraded: results.filter(r => r.status === 'degraded').length,
        unhealthy: results.filter(r => r.status === 'unhealthy').length
      }
    }),
    {
      status: allHealthy ? 200 : 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
  );
});

/**
 * Check a single endpoint and return health status
 */
async function checkEndpoint(
  endpoint: { name: string; url: string },
  supabase: any
): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const response = await fetch(endpoint.url, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
      headers: {
        'Accept': 'application/json, application/xml, text/xml',
        'User-Agent': 'RegIQ-HealthCheck/1.0'
      }
    });

    const responseTime = Date.now() - startTime;

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let errorMessage: string | undefined;

    // Unhealthy: Non-OK response (except 429)
    if (!response.ok) {
      if (response.status === 429) {
        status = 'degraded';
        errorMessage = 'Rate limited';
      } else {
        status = 'unhealthy';
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    }
    // Degraded: Slow response (>5 seconds)
    else if (responseTime > 5000) {
      status = 'degraded';
      errorMessage = `Slow response: ${responseTime}ms`;
    }

    const healthCheck: HealthCheck = {
      api_name: endpoint.name,
      endpoint: endpoint.url,
      status,
      status_code: response.status,
      response_time_ms: responseTime,
      error_message: errorMessage,
      timestamp: new Date().toISOString()
    };

    // Log to database
    await supabase.from('api_health_checks').insert({
      api_name: endpoint.name,
      endpoint: endpoint.url,
      status,
      status_code: response.status,
      response_time_ms: responseTime,
      error_message: errorMessage
    });

    console.log(`[Health Check] ${endpoint.name}: ${status} (${responseTime}ms)`);

    return healthCheck;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    const healthCheck: HealthCheck = {
      api_name: endpoint.name,
      endpoint: endpoint.url,
      status: 'unhealthy',
      response_time_ms: responseTime,
      error_message: errorMessage,
      timestamp: new Date().toISOString()
    };

    // Log to database
    await supabase.from('api_health_checks').insert({
      api_name: endpoint.name,
      endpoint: endpoint.url,
      status: 'unhealthy',
      error_message: errorMessage
    });

    console.error(`[Health Check] ${endpoint.name} failed:`, errorMessage);

    return healthCheck;
  }
}
