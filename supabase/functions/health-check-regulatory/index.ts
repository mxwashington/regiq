import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface HealthCheckResult {
  source: string;
  endpoint: string;
  status: 'OK' | 'ERROR' | 'TIMEOUT' | 'UNKNOWN';
  httpStatus?: number;
  responseTime: number;
  dataFormat: 'JSON' | 'XML' | 'HTML' | 'TEXT' | 'ERROR';
  recordCount?: number;
  lastUpdate?: string;
  sampleData?: string;
  errorMessage?: string;
  configuredInCode: boolean;
  databaseRecords: number;
  lastDbRecord?: string;
}

interface DatabaseStats {
  source: string;
  count: number;
  last_published: string | null;
}

async function testEndpoint(url: string, expectedFormat: 'JSON' | 'XML' = 'JSON', timeout = 10000): Promise<Partial<HealthCheckResult>> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RegIQ-HealthCheck/1.0',
        'Accept': expectedFormat === 'JSON' ? 'application/json' : 'application/xml, text/xml, application/rss+xml',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(timeout)
    });

    const responseTime = Date.now() - startTime;
    const responseText = await response.text();

    let dataFormat: HealthCheckResult['dataFormat'] = 'TEXT';
    let recordCount = 0;
    let sampleData = responseText.substring(0, 500);
    let lastUpdate = undefined;

    // Determine data format and parse
    if (response.headers.get('content-type')?.includes('json') || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
      dataFormat = 'JSON';
      try {
        const data = JSON.parse(responseText);
        if (Array.isArray(data)) {
          recordCount = data.length;
          if (data[0]) {
            sampleData = JSON.stringify(data[0], null, 2);
            // Look for date fields
            const item = data[0];
            lastUpdate = item.field_recall_date || item.published_date || item.date || item.recall_date || item.updated_at;
          }
        } else if (data && typeof data === 'object') {
          recordCount = data.results?.length || data.data?.length || (data.results ? 1 : 0);
          sampleData = JSON.stringify(data, null, 2).substring(0, 500);
        }
      } catch {
        dataFormat = 'ERROR';
      }
    } else if (responseText.includes('<?xml') || responseText.includes('<rss') || responseText.includes('<feed')) {
      dataFormat = 'XML';
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(responseText, 'text/xml');
        const items = doc?.querySelectorAll('item, entry') || [];
        recordCount = items.length;

        if (items[0]) {
          const firstItem = items[0] as any;
          const title = firstItem.querySelector('title')?.textContent || '';
          const pubDate = firstItem.querySelector('pubDate, published, updated')?.textContent || '';
          sampleData = `Title: ${title}\nPubDate: ${pubDate}`;
          lastUpdate = pubDate;
        }
      } catch {
        dataFormat = 'ERROR';
      }
    } else if (responseText.includes('<!DOCTYPE html') || responseText.includes('<html')) {
      dataFormat = 'HTML';
      sampleData = 'HTML page returned (likely 404 or error page)';
    }

    return {
      status: response.ok ? 'OK' : 'ERROR',
      httpStatus: response.status,
      responseTime,
      dataFormat,
      recordCount,
      lastUpdate,
      sampleData,
      errorMessage: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
    };

  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    return {
      status: error.name === 'TimeoutError' ? 'TIMEOUT' : 'ERROR',
      responseTime,
      dataFormat: 'ERROR',
      errorMessage: error.message,
      sampleData: undefined
    };
  }
}

async function getDatabaseStats(supabase: any): Promise<DatabaseStats[]> {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('source, published_date')
      .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Database query error:', error);
      return [];
    }

    // Group by source and get stats
    const sourceStats = new Map<string, { count: number; lastDate?: string }>();

    for (const record of data || []) {
      const source = record.source;
      const date = record.published_date;

      if (!sourceStats.has(source)) {
        sourceStats.set(source, { count: 0 });
      }

      const stats = sourceStats.get(source)!;
      stats.count++;

      if (!stats.lastDate || date > stats.lastDate) {
        stats.lastDate = date;
      }
    }

    return Array.from(sourceStats.entries()).map(([source, stats]) => ({
      source,
      count: stats.count,
      last_published: stats.lastDate || null
    }));

  } catch (error) {
    console.error('Error getting database stats:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting regulatory data sources health check...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get database stats
    const dbStats = await getDatabaseStats(supabase);
    const dbStatsMap = new Map(dbStats.map(s => [s.source, s]));

    // Test all regulatory data sources
    const healthChecks: HealthCheckResult[] = [];

    // 1. FDA Sources
    console.log('Testing FDA sources...');

    // FDA openFDA API
    const fdaApi = await testEndpoint('https://api.fda.gov/food/enforcement.json?search=recall_initiation_date:[2024-01-01+TO+*]&limit=5', 'JSON');
    healthChecks.push({
      source: 'FDA',
      endpoint: 'https://api.fda.gov/food/enforcement.json',
      configuredInCode: true,
      databaseRecords: dbStatsMap.get('FDA')?.count || 0,
      lastDbRecord: dbStatsMap.get('FDA')?.last_published || undefined,
      ...fdaApi
    });

    // 2. FSIS Sources
    console.log('Testing FSIS sources...');

    // FSIS Recall API
    const fsisApi = await testEndpoint('https://www.fsis.usda.gov/fsis/api/recall/v/1', 'JSON', 15000);
    healthChecks.push({
      source: 'FSIS_API',
      endpoint: 'https://www.fsis.usda.gov/fsis/api/recall/v/1',
      configuredInCode: true,
      databaseRecords: dbStatsMap.get('FSIS')?.count || 0,
      lastDbRecord: dbStatsMap.get('FSIS')?.last_published || undefined,
      ...fsisApi
    });

    // FSIS RSS Feeds
    const fsisRssFeeds = [
      'https://www.fsis.usda.gov/fsis-content/rss/recalls.xml',
      'https://www.fsis.usda.gov/fsis-content/rss/notices.xml',
      'https://www.fsis.usda.gov/fsis-content/rss/news-release.xml',
      'https://www.fsis.usda.gov/fsis-content/rss/directives.xml'
    ];

    for (const rssUrl of fsisRssFeeds) {
      const feedName = rssUrl.split('/').pop()?.replace('.xml', '') || 'unknown';
      const rssResult = await testEndpoint(rssUrl, 'XML', 15000);
      healthChecks.push({
        source: `FSIS_RSS_${feedName}`,
        endpoint: rssUrl,
        configuredInCode: true,
        databaseRecords: 0, // RSS feeds save to FSIS source
        lastDbRecord: undefined,
        ...rssResult
      });
    }

    // 3. EPA Sources
    console.log('Testing EPA sources...');

    // Test current EPA endpoint (likely broken)
    const epaOld = await testEndpoint('https://echo.epa.gov/echo/case_rest_services.get_cases?output=JSON', 'JSON');
    healthChecks.push({
      source: 'EPA_ECHO',
      endpoint: 'https://echo.epa.gov/echo/case_rest_services.get_cases',
      configuredInCode: true,
      databaseRecords: dbStatsMap.get('EPA')?.count || 0,
      lastDbRecord: dbStatsMap.get('EPA')?.last_published || undefined,
      ...epaOld
    });

    // Test alternative EPA endpoints
    const epaAlternatives = [
      'https://data.epa.gov/efservice/rest/lookups/enforcement_action_types/JSON',
      'https://ordspub.epa.gov/ords/pesticides/ppls/f?p=ppls:1',
    ];

    for (const epaUrl of epaAlternatives) {
      const epaResult = await testEndpoint(epaUrl, 'JSON');
      healthChecks.push({
        source: 'EPA_ALT',
        endpoint: epaUrl,
        configuredInCode: false,
        databaseRecords: 0,
        lastDbRecord: undefined,
        ...epaResult
      });
    }

    // 4. CDC Sources
    console.log('Testing CDC sources...');

    // Test CDC Newsroom RSS
    const cdcNewsroom = await testEndpoint('https://www.cdc.gov/rss/cdc-newsroom.xml', 'XML');
    healthChecks.push({
      source: 'CDC_Newsroom',
      endpoint: 'https://www.cdc.gov/rss/cdc-newsroom.xml',
      configuredInCode: true,
      databaseRecords: dbStatsMap.get('CDC')?.count || 0,
      lastDbRecord: dbStatsMap.get('CDC')?.last_published || undefined,
      ...cdcNewsroom
    });

    // Test CDC Food Safety RSS
    const cdcFoodSafety = await testEndpoint('https://www.cdc.gov/foodsafety/rss/foodsafety-RSS.xml', 'XML');
    healthChecks.push({
      source: 'CDC_FoodSafety',
      endpoint: 'https://www.cdc.gov/foodsafety/rss/foodsafety-RSS.xml',
      configuredInCode: true,
      databaseRecords: dbStatsMap.get('CDC')?.count || 0,
      lastDbRecord: dbStatsMap.get('CDC')?.last_published || undefined,
      ...cdcFoodSafety
    });

    // 5. Federal Register
    console.log('Testing Federal Register...');

    const fedRegister = await testEndpoint('https://www.federalregister.gov/api/v1/articles.json?conditions[agencies][]=food-and-drug-administration&per_page=5', 'JSON');
    healthChecks.push({
      source: 'Fed Register',
      endpoint: 'https://www.federalregister.gov/api/v1/articles.json',
      configuredInCode: true,
      databaseRecords: dbStatsMap.get('Fed Register')?.count || 0,
      lastDbRecord: dbStatsMap.get('Fed Register')?.last_published || undefined,
      ...fedRegister
    });

    // 6. Regulations.gov
    console.log('Testing Regulations.gov...');

    const regulations = await testEndpoint('https://api.regulations.gov/v4/documents?api_key=DEMO_KEY&filter[agencyId]=FDA', 'JSON');
    healthChecks.push({
      source: 'Regulations.gov',
      endpoint: 'https://api.regulations.gov/v4/documents',
      configuredInCode: false,
      databaseRecords: dbStatsMap.get('Regulations.gov')?.count || 0,
      lastDbRecord: dbStatsMap.get('Regulations.gov')?.last_published || undefined,
      ...regulations
    });

    // Generate summary report
    const summary = healthChecks.map(check => ({
      source: check.source,
      status: check.status === 'OK' ? '✓' : '✗',
      lastSuccess: check.lastUpdate || 'Unknown',
      records7days: check.databaseRecords,
      issue: check.errorMessage || (check.status === 'OK' ? 'Working' : 'See details'),
      responseTime: `${check.responseTime}ms`,
      dataFormat: check.dataFormat,
      configured: check.configuredInCode ? 'Yes' : 'No'
    }));

    // Identify fixes needed
    const fixes = healthChecks
      .filter(check => check.status !== 'OK')
      .map(check => ({
        source: check.source,
        issue: check.errorMessage || 'Unknown error',
        suggestedFix: getSuggestedFix(check)
      }));

    console.log('Health check completed');

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          totalSources: healthChecks.length,
          working: healthChecks.filter(c => c.status === 'OK').length,
          broken: healthChecks.filter(c => c.status !== 'OK').length,
          configured: healthChecks.filter(c => c.configuredInCode).length
        },
        healthChecks,
        summaryTable: summary,
        databaseStats: dbStats,
        fixesNeeded: fixes,
        message: 'Regulatory data sources health check completed'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getSuggestedFix(check: HealthCheckResult): string {
  if (check.httpStatus === 404) {
    return 'Endpoint not found - check if URL has changed or needs authentication';
  }

  if (check.status === 'TIMEOUT') {
    return 'Server timeout - may need longer timeout or server is down';
  }

  if (check.dataFormat === 'HTML' && check.status === 'ERROR') {
    return 'Returning HTML error page - check authentication or endpoint URL';
  }

  if (check.dataFormat === 'ERROR') {
    return 'Invalid JSON/XML response - check response format and parsing logic';
  }

  if (check.httpStatus === 403) {
    return 'Access forbidden - may need API key or authentication';
  }

  if (check.httpStatus && check.httpStatus >= 500) {
    return 'Server error - government API may be temporarily down';
  }

  return 'Check logs for detailed error information';
}