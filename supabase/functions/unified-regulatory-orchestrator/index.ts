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

// Unified orchestrator for all regulatory data collection
interface ScraperFunction {
  name: string;
  endpoint: string;
  action?: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  category: 'rss' | 'web_scraper' | 'api';
}

// All available scrapers
const SCRAPER_FUNCTIONS: ScraperFunction[] = [
  // RSS-based scrapers
  {
    name: 'multi-agency-rss-scraper',
    endpoint: 'multi-agency-rss-scraper',
    description: 'CDC, EPA, NOAA, OSHA RSS feeds',
    frequency: 'daily',
    category: 'rss'
  },
  {
    name: 'enhanced-regulatory-apis',
    endpoint: 'enhanced-regulatory-apis',
    action: 'fetch_fsis_recalls',
    description: 'FSIS API and RSS fallback',
    frequency: 'daily',
    category: 'api'
  },
  {
    name: 'regulations-gov-api',
    endpoint: 'regulations-gov-api',
    action: 'sync_recent',
    description: 'Regulations.gov documents',
    frequency: 'daily',
    category: 'api'
  },

  // Specialized web scrapers
  {
    name: 'cbp-customs-scraper',
    endpoint: 'cbp-customs-scraper',
    description: 'CBP customs and trade enforcement',
    frequency: 'daily',
    category: 'web_scraper'
  },
  {
    name: 'fda-import-alerts',
    endpoint: 'fda-import-alerts',
    description: 'FDA import alerts and detentions',
    frequency: 'daily',
    category: 'web_scraper'
  },
  {
    name: 'noaa-fisheries-scraper',
    endpoint: 'noaa-fisheries-scraper',
    description: 'NOAA fisheries advisories and closures',
    frequency: 'weekly',
    category: 'web_scraper'
  },
  {
    name: 'usda-aphis-scraper',
    endpoint: 'usda-aphis-scraper',
    description: 'USDA APHIS plant and animal health',
    frequency: 'daily',
    category: 'web_scraper'
  },
  {
    name: 'usda-ams-api',
    endpoint: 'usda-ams-api',
    description: 'USDA AMS market monitoring',
    frequency: 'weekly',
    category: 'api'
  },
  {
    name: 'ttb-rss-scraper',
    endpoint: 'ttb-rss-scraper',
    description: 'TTB alcohol regulatory updates',
    frequency: 'weekly',
    category: 'web_scraper'
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
    const body = await req.json().catch(() => ({}));
    const { action, frequency_filter, category_filter, specific_scrapers } = body;

    logger.info(`[UNIFIED-ORCHESTRATOR] Started with action: ${action || 'run_all'}`);

    switch (action) {
      case 'run_all':
        return await runAllScrapers(supabaseClient, frequency_filter, category_filter);
      case 'run_daily':
        return await runScrapersByFrequency(supabaseClient, 'daily');
      case 'run_weekly':
        return await runScrapersByFrequency(supabaseClient, 'weekly');
      case 'run_category':
        return await runScrapersByCategory(supabaseClient, category_filter || 'rss');
      case 'run_specific':
        return await runSpecificScrapers(supabaseClient, specific_scrapers || []);
      case 'status':
        return await getScrapersStatus();
      default:
        return await runAllScrapers(supabaseClient);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error in unified orchestrator", { message: errorMessage });

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

async function runAllScrapers(supabase: any, frequencyFilter?: string, categoryFilter?: string) {
  let scrapersToRun = SCRAPER_FUNCTIONS;

  // Apply filters
  if (frequencyFilter) {
    scrapersToRun = scrapersToRun.filter(s => s.frequency === frequencyFilter);
  }
  if (categoryFilter) {
    scrapersToRun = scrapersToRun.filter(s => s.category === categoryFilter);
  }

  logger.info(`Running ${scrapersToRun.length} scrapers`, {
    total: SCRAPER_FUNCTIONS.length,
    filtered: scrapersToRun.length,
    frequency_filter: frequencyFilter,
    category_filter: categoryFilter
  });

  const results: any[] = [];
  let totalProcessed = 0;

  for (const scraper of scrapersToRun) {
    try {
      logger.info(`Executing scraper: ${scraper.name}`);

      const result = await invokeScraper(scraper);

      results.push({
        scraper: scraper.name,
        description: scraper.description,
        category: scraper.category,
        status: 'success',
        processed: result.processed || 0,
        message: result.message || 'Completed successfully'
      });

      totalProcessed += result.processed || 0;

      // Rate limiting between scrapers
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      logger.error(`Error in scraper ${scraper.name}`, {
        error: error instanceof Error ? error.message : String(error)
      });

      results.push({
        scraper: scraper.name,
        description: scraper.description,
        category: scraper.category,
        status: 'error',
        processed: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return new Response(JSON.stringify({
    success: true,
    message: `Unified scraping completed. ${successCount} successful, ${errorCount} failed.`,
    total_processed: totalProcessed,
    scrapers_run: scrapersToRun.length,
    successful: successCount,
    failed: errorCount,
    results,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function runScrapersByFrequency(supabase: any, frequency: string) {
  return await runAllScrapers(supabase, frequency);
}

async function runScrapersByCategory(supabase: any, category: string) {
  return await runAllScrapers(supabase, undefined, category);
}

async function runSpecificScrapers(supabase: any, scraperNames: string[]) {
  const scrapersToRun = SCRAPER_FUNCTIONS.filter(s => scraperNames.includes(s.name));

  if (scrapersToRun.length === 0) {
    return new Response(JSON.stringify({
      success: false,
      error: 'No valid scrapers specified',
      available_scrapers: SCRAPER_FUNCTIONS.map(s => s.name),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  return await runAllScrapers(supabase, undefined, undefined);
}

async function getScrapersStatus() {
  return new Response(JSON.stringify({
    success: true,
    available_scrapers: SCRAPER_FUNCTIONS.length,
    scrapers: SCRAPER_FUNCTIONS.map(s => ({
      name: s.name,
      description: s.description,
      frequency: s.frequency,
      category: s.category
    })),
    categories: {
      rss: SCRAPER_FUNCTIONS.filter(s => s.category === 'rss').length,
      web_scraper: SCRAPER_FUNCTIONS.filter(s => s.category === 'web_scraper').length,
      api: SCRAPER_FUNCTIONS.filter(s => s.category === 'api').length
    },
    frequencies: {
      daily: SCRAPER_FUNCTIONS.filter(s => s.frequency === 'daily').length,
      weekly: SCRAPER_FUNCTIONS.filter(s => s.frequency === 'weekly').length,
      monthly: SCRAPER_FUNCTIONS.filter(s => s.frequency === 'monthly').length
    },
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function invokeScraper(scraper: ScraperFunction): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }

  const url = `${supabaseUrl}/functions/v1/${scraper.endpoint}`;
  const payload = scraper.action ? { action: scraper.action } : {};

  logger.info(`Invoking ${scraper.name}`, { url, payload });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000) // 2 minute timeout
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.success === false) {
    throw new Error(result.error || 'Scraper returned error');
  }

  return result;
}