import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { logHealthCheck } from "../_shared/error-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define all external APIs to monitor
const APIS_TO_CHECK = [
  {
    name: 'FDA Food Enforcement',
    url: 'https://api.fda.gov/food/enforcement.json?limit=1',
    timeout: 10000
  },
  {
    name: 'FDA Drug Enforcement',
    url: 'https://api.fda.gov/drug/enforcement.json?limit=1',
    timeout: 10000
  },
  {
    name: 'FDA Device Enforcement',
    url: 'https://api.fda.gov/device/enforcement.json?limit=1',
    timeout: 10000
  },
  {
    name: 'FSIS Recalls RSS',
    url: 'https://www.fsis.usda.gov/fsis-content/rss/recalls.xml',
    timeout: 10000
  },
  {
    name: 'USDA Market News API',
    url: 'https://marsapi.ams.usda.gov/services/v1.2/reports?q=organic',
    timeout: 10000
  },
  {
    name: 'EPA ECHO API',
    url: 'https://echo.epa.gov/tools/web-services/facility-registry#/Facility%20Information/get_rest_services_get_facility_info',
    timeout: 10000
  },
  {
    name: 'Regulations.gov API',
    url: 'https://api.regulations.gov/v4/documents?filter[searchTerm]=food&api_key=DEMO_KEY',
    timeout: 10000
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[API-HEALTH-MONITOR] Starting health checks');

    const results = [];

    for (const api of APIS_TO_CHECK) {
      const startTime = Date.now();
      let status: 'healthy' | 'degraded' | 'unhealthy' | 'error' = 'error';
      let statusCode: number | undefined;
      let errorMessage: string | undefined;
      let responseTimeMs: number | undefined;

      try {
        const response = await fetch(api.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(api.timeout)
        });

        responseTimeMs = Date.now() - startTime;
        statusCode = response.status;

        if (response.ok) {
          status = responseTimeMs < 2000 ? 'healthy' : 'degraded';
        } else if (response.status === 429) {
          status = 'degraded';
          errorMessage = 'Rate limited';
        } else {
          status = 'unhealthy';
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        responseTimeMs = Date.now() - startTime;
        status = 'error';
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      // Log to database
      await logHealthCheck(
        api.name,
        api.url,
        status,
        responseTimeMs,
        statusCode,
        errorMessage
      );

      results.push({
        api: api.name,
        url: api.url,
        status,
        response_time_ms: responseTimeMs,
        status_code: statusCode,
        error: errorMessage
      });

      console.log(`[API-HEALTH-MONITOR] ${api.name}: ${status} (${responseTimeMs}ms)`);
    }

    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: APIS_TO_CHECK.length,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        errors: errorCount
      },
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[API-HEALTH-MONITOR] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});