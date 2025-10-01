import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

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
  logger.info(`[TTB-RSS-SCRAPER] ${step}${detailsStr}`);
};

interface TTBFeedItem {
  title: string;
  description: string;
  pubDate: string;
  link: string;
}

interface TTBAlert {
  title: string;
  source: string;
  urgency: string;
  summary: string;
  published_date: string;
  external_url: string;
  full_content?: string;
  agency: string;
  region: string;
  category: string;
}

// Keywords to filter for relevant compliance content
const COMPLIANCE_KEYWORDS = [
  'labeling', 'advertising', 'alcohol', 'beverage', 'wine', 'beer', 'spirits',
  'compliance', 'regulation', 'requirement', 'standard', 'approval', 'permit',
  'certificate', 'license', 'formula', 'brand', 'label', 'advertisement',
  'marketing', 'distillery', 'brewery', 'winery', 'bottling', 'import',
  'export', 'tax', 'excise', 'trade', 'practice', 'ruling', 'notice'
];

// TTB News Sources (HTML scraping - RSS feeds are discontinued)
const TTB_NEWS_URLS = [
  'https://www.ttb.gov/news',
  'https://www.ttb.gov/public-information'
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
    logStep("TTB RSS Scraper function started");

    const { action } = await req.json().catch(() => ({ action: 'scrape_ttb_feed' }));

    switch (action) {
      case 'scrape_ttb_feed':
        return await scrapeTTBFeed(supabaseClient);
      case 'test_ttb_feed':
        return await testTTBFeed();
      default:
        return await scrapeTTBFeed(supabaseClient);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in ttb-rss-scraper", { message: errorMessage });

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

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RegIQ-TTBScraper/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(20000)
      });

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Retry on 5xx or network errors
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000;
        logger.warn(`TTB fetch attempt ${attempt} failed (${response.status}), retrying in ${backoff}ms`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000;
        logger.warn(`TTB fetch error on attempt ${attempt}, retrying in ${backoff}ms`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }
  
  throw lastError || new Error('TTB fetch failed after retries');
}

async function scrapeTTBFeed(supabase: any) {
  logStep('Starting TTB news page scraping');

  // Start sync log
  const { data: logData } = await supabase.rpc('start_sync_log', {
    p_source: 'TTB',
    p_metadata: { trigger: 'scrape_ttb_feed', urls: TTB_NEWS_URLS }
  });
  const logId = logData as string;

  try {
    let allNewsItems: TTBFeedItem[] = [];

    // Scrape each TTB news page
    for (const newsUrl of TTB_NEWS_URLS) {
      try {
        logStep('Fetching TTB news page', { url: newsUrl });
        
        const response = await fetchWithRetry(newsUrl);

        if (!response.ok) {
          logger.error(`TTB news page returned ${response.status}: ${response.statusText}`);
          continue;
        }

        const htmlText = await response.text();
        logStep('TTB news page fetched', { url: newsUrl, length: htmlText.length });

        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        if (!doc) {
          logger.error('Failed to parse TTB news HTML');
          continue;
        }

        // Extract news items - TTB uses various HTML structures
        const newsElements = doc.querySelectorAll(
          'article, .news-item, .view-content .views-row, div[class*="news-"], li.news'
        );
        logStep('Found news elements', { url: newsUrl, count: newsElements.length });

        for (const element of newsElements) {
          try {
            const titleEl = element.querySelector('h2, h3, h4, .title, a[href*="news"]');
            const linkEl = element.querySelector('a[href]');
            const descEl = element.querySelector('p, .description, .summary, .field--name-body');
            const dateEl = element.querySelector('time, .date, .published, span[class*="date"]');

            const title = titleEl?.textContent?.trim() || '';
            let link = linkEl?.getAttribute('href')?.trim() || '';
            const description = descEl?.textContent?.trim() || '';
            const pubDate = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime') || '';

            // Make link absolute
            if (link && !link.startsWith('http')) {
              link = `https://www.ttb.gov${link.startsWith('/') ? '' : '/'}${link}`;
            }

            if (title && link) {
              allNewsItems.push({ title, link, description, pubDate });
            }
          } catch (itemError) {
            logger.error('Error parsing TTB news item', { error: itemError });
          }
        }
      } catch (urlError) {
        logger.error(`Error scraping TTB URL ${newsUrl}`, { error: urlError });
      }
    }

    logStep('Total TTB news items found', { count: allNewsItems.length });

    if (allNewsItems.length === 0) {
      await supabase.rpc('finish_sync_log', {
        p_log_id: logId,
        p_status: 'success',
        p_alerts_fetched: 0,
        p_alerts_inserted: 0,
        p_results: { message: 'No news items found - page structure may have changed' }
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'No TTB news items found - page may require updated selectors',
        processed: 0,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Filter for compliance-relevant items
    const relevantItems = filterRelevantItems(allNewsItems);
    logStep('Filtered relevant TTB items', {
      total: allNewsItems.length,
      relevant: relevantItems.length
    });

    // Convert to alerts and save to database
    let processedCount = 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const item of relevantItems.slice(0, 50)) { // Limit to 50 most recent
      try {
        const alert = convertToAlert(item);

        // Check if alert already exists
        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('title', alert.title)
          .eq('source', alert.source)
          .gte('published_date', sevenDaysAgo.toISOString())
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('alerts')
            .insert(alert);

          if (error) {
            logStep('Database insert error', { error: error.message, title: alert.title });
          } else {
            processedCount++;
            logStep('Added TTB alert', { title: alert.title });
          }
        } else {
          logStep('TTB alert already exists', { title: alert.title });
        }
      } catch (alertError) {
        logStep('Error processing TTB item', {
          error: alertError,
          title: item.title
        });
        continue;
      }
    }

    // Finish sync log
    await supabase.rpc('finish_sync_log', {
      p_log_id: logId,
      p_status: 'success',
      p_alerts_fetched: allNewsItems.length,
      p_alerts_inserted: processedCount,
      p_alerts_skipped: relevantItems.length - processedCount,
      p_results: { 
        total_items: allNewsItems.length, 
        relevant_items: relevantItems.length,
        scraped_urls: TTB_NEWS_URLS.length
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} TTB regulatory updates`,
      processed: processedCount,
      total_items: allNewsItems.length,
      relevant_items: relevantItems.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // Log failure
    await supabase.rpc('finish_sync_log', {
      p_log_id: logId,
      p_status: 'error',
      p_errors: [error instanceof Error ? error.message : String(error)]
    });
    
    throw new Error(`Failed to scrape TTB feed: ${error instanceof Error ? error.message : String(error)}`);
  }
}