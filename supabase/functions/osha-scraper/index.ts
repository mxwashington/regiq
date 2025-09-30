import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  logger.info(`[OSHA-SCRAPER] ${step}${detailsStr}`);
};

// OSHA data sources focused on food manufacturing and processing
const OSHA_SOURCES = [
  {
    name: 'OSHA News Releases',
    url: 'https://www.osha.gov/news/newsreleases',
    type: 'html',
    keywords: ['food', 'meatpacking', 'poultry', 'processing', 'manufacturing', 'bakery', 'dairy']
  },
  {
    name: 'OSHA Inspections',
    url: 'https://www.osha.gov/pls/imis/establishment.html',
    type: 'html',
    keywords: ['3116', '3111', '3112', '3113', '3114', '3115', '3117', '3118'] // Food manufacturing NAICS codes
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

  let logId: string | null = null;

  try {
    // Start sync log
    const { data: logData, error: logError } = await supabaseClient.rpc('start_sync_log', {
      p_source: 'OSHA',
      p_metadata: { action: 'scrape_food_safety', timestamp: new Date().toISOString() }
    });

    if (logError) {
      logStep("Failed to start sync log", { error: logError.message });
    } else {
      logId = logData;
      logStep("OSHA scraper sync started", { logId });
    }

    const { action } = await req.json().catch(() => ({ action: 'scrape_news' }));

    let totalProcessed = 0;

    if (action === 'scrape_news' || action === 'scrape_all') {
      const newsCount = await scrapeOSHANews(supabaseClient);
      totalProcessed += newsCount;
    }

    // Complete sync log
    if (logId) {
      await supabaseClient.rpc('finish_sync_log', {
        p_log_id: logId,
        p_status: 'success',
        p_alerts_fetched: totalProcessed,
        p_alerts_inserted: totalProcessed,
        p_results: { action, processed: totalProcessed }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${totalProcessed} OSHA alerts`,
      processed: totalProcessed,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    logStep("ERROR in osha-scraper", { message: errorMessage, stack: errorStack });

    // Complete sync log on error
    if (logId) {
      await supabaseClient.rpc('finish_sync_log', {
        p_log_id: logId,
        p_status: 'error',
        p_alerts_fetched: 0,
        p_alerts_inserted: 0,
        p_errors: [errorMessage]
      });
    }

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

async function scrapeOSHANews(supabase: any): Promise<number> {
  const newsUrl = 'https://www.osha.gov/news/newsreleases';
  logStep('Fetching OSHA news releases', { url: newsUrl });

  let processedCount = 0;

  try {
    const response = await fetch(newsUrl, {
      headers: {
        'User-Agent': 'RegIQ/1.0 (Workplace Safety Monitor; contact@regiq.org)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      logStep(`OSHA news page error: ${response.status}`);
      return 0;
    }

    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    if (!doc) {
      logStep('Failed to parse OSHA HTML');
      return 0;
    }

    // Find news releases
    const newsItems = doc.querySelectorAll('.views-row, article, .news-item');
    logStep(`Found ${newsItems.length} potential news items`);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const item of newsItems) {
      try {
        const titleEl = item.querySelector('h2 a, h3 a, .title a, a');
        const dateEl = item.querySelector('.date, time, .news-date');
        const summaryEl = item.querySelector('.summary, .description, p');

        const title = titleEl?.textContent?.trim() || '';
        const link = titleEl?.getAttribute('href')?.trim() || '';
        const dateText = dateEl?.textContent?.trim() || '';
        const summary = summaryEl?.textContent?.trim() || '';

        if (!title || title.length < 10) continue;

        // Check if related to food manufacturing
        const text = `${title} ${summary}`.toLowerCase();
        const keywords = ['food', 'meatpacking', 'poultry', 'processing', 'manufacturing', 
                         'bakery', 'dairy', 'slaughter', 'meat', 'plant', 'facility'];
        
        const isRelevant = keywords.some(keyword => text.includes(keyword));
        if (!isRelevant) continue;

        // Build full URL
        const fullUrl = link.startsWith('http') ? link : `https://www.osha.gov${link}`;

        // Determine urgency
        const urgency = determineUrgency(text);

        const alert = {
          title: `OSHA: ${title}`,
          source: 'OSHA',
          urgency,
          summary: summary.substring(0, 500) || `OSHA workplace safety alert related to food manufacturing`,
          published_date: parseOSHADate(dateText) || new Date().toISOString(),
          external_url: fullUrl,
          full_content: JSON.stringify({ title, summary, date: dateText }),
          agency: 'OSHA',
          region: 'US',
          category: 'workplace-safety'
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
            processedCount++;
            logStep(`Added OSHA alert: ${alert.title}`);
          } else {
            logStep(`Error inserting alert: ${error.message}`);
          }
        }
      } catch (itemError) {
        logStep(`Error processing news item: ${itemError}`);
        continue;
      }
    }

    return processedCount;

  } catch (error) {
    logStep('Error scraping OSHA news', { error });
    return 0;
  }
}

function parseOSHADate(dateText: string): string | null {
  try {
    if (!dateText) return null;
    
    // Try parsing various date formats OSHA might use
    const date = new Date(dateText);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    return null;
  } catch {
    return null;
  }
}

function determineUrgency(text: string): string {
  const highKeywords = ['citation', 'violation', 'penalty', 'fatality', 'death', 
                        'serious', 'willful', 'amputation', 'hospitalization'];
  const mediumKeywords = ['inspection', 'enforcement', 'compliance', 'investigation'];

  if (highKeywords.some(keyword => text.includes(keyword))) {
    return 'High';
  } else if (mediumKeywords.some(keyword => text.includes(keyword))) {
    return 'Medium';
  }

  return 'Low';
}
