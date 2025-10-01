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
  'export', 'tax', 'excise', 'trade', 'practice'
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

async function scrapeTTBFeed(supabase: any) {
  // Try multiple potential TTB RSS feed URLs
  const ttbFeedUrls = [
    'https://www.ttb.gov/rss-feeds/news-rss.xml',
    'https://www.ttb.gov/news/feed',
    'https://www.ttb.gov/rss/news.xml'
  ];

  logStep('Attempting to fetch TTB RSS feed from multiple URLs');

  // Start sync log
  const { data: logData } = await supabase.rpc('start_sync_log', {
    p_source: 'TTB',
    p_metadata: { trigger: 'scrape_ttb_feed', urls: ttbFeedUrls }
  });
  const logId = logData as string;

  let xmlText = '';
  let successUrl = '';

  try {
    // Try each URL with retry logic
    for (const ttbFeedUrl of ttbFeedUrls) {
      logStep('Trying TTB feed URL', { url: ttbFeedUrl });
      
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch(ttbFeedUrl, {
            headers: {
              'User-Agent': 'RegIQ-TTBScraper/1.0',
              'Accept': 'application/rss+xml, application/xml, text/xml, */*',
              'Cache-Control': 'no-cache'
            },
            signal: AbortSignal.timeout(15000)
          });

          if (response.ok) {
            xmlText = await response.text();
            successUrl = ttbFeedUrl;
            logStep('TTB RSS feed fetched successfully', { url: successUrl, length: xmlText.length });
            break;
          } else {
            logStep(`TTB feed returned ${response.status} from ${ttbFeedUrl}`);
          }
        } catch (error) {
          logStep(`Attempt ${attempt} failed for ${ttbFeedUrl}:`, error);
          if (attempt === 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (xmlText) break;
    }

    if (!xmlText) {
      throw new Error('TTB RSS feed unavailable at all known URLs. The feed may have been moved or discontinued. Tried: ' + ttbFeedUrls.join(', '));
    }
    // Parse XML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/html'); // Use text/html for better compatibility

    if (!doc) {
      throw new Error('Failed to parse TTB RSS XML');
    }

    // Extract RSS items
    const items = doc.querySelectorAll('item');
    logStep('Found RSS items', { count: items.length });

    if (items.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No RSS items found in TTB feed',
        processed: 0,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const feedItems: TTBFeedItem[] = [];

    // Parse each RSS item
    for (const item of items) {
      try {
        const title = item.querySelector('title')?.textContent?.trim() || '';
        const description = item.querySelector('description')?.textContent?.trim() || '';
        const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
        const link = item.querySelector('link')?.textContent?.trim() || '';

        if (title && link) {
          feedItems.push({
            title,
            description,
            pubDate,
            link
          });
        }
      } catch (itemError) {
        logStep('Error parsing RSS item', { error: itemError });
        continue;
      }
    }

    logStep('Parsed RSS items', { total: feedItems.length });

    // Filter for compliance-relevant items
    const relevantItems = filterRelevantItems(feedItems);
    logStep('Filtered relevant items', {
      total: feedItems.length,
      relevant: relevantItems.length
    });

    if (relevantItems.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No relevant TTB items found matching compliance keywords',
        processed: 0,
        total_items: feedItems.length,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Convert to alerts and save to database
    let processedCount = 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const item of relevantItems) {
      try {
        const alert = convertToAlert(item);

        // Check if alert already exists (avoid duplicates)
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

    // Finish sync log with success
    await supabase.rpc('finish_sync_log', {
      p_log_id: logId,
      p_status: 'success',
      p_alerts_fetched: feedItems.length,
      p_alerts_inserted: processedCount,
      p_alerts_skipped: relevantItems.length - processedCount,
      p_results: { total_items: feedItems.length, relevant_items: relevantItems.length }
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} TTB regulatory updates`,
      processed: processedCount,
      total_items: feedItems.length,
      relevant_items: relevantItems.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // Log failure to sync logs
    await supabase.rpc('finish_sync_log', {
      p_log_id: logId,
      p_status: 'error',
      p_errors: [error instanceof Error ? error.message : String(error)]
    });
    
    throw new Error(`Failed to scrape TTB feed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testTTBFeed() {
  const ttbFeedUrl = 'https://www.ttb.gov/rss/news-and-events.xml';

  logStep('Testing TTB RSS feed access', { url: ttbFeedUrl });

  try {
    const response = await fetch(ttbFeedUrl, {
      headers: {
        'User-Agent': 'RegIQ-TTBScraper/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(10000)
    });

    const isSuccess = response.ok;
    const responseText = await response.text();

    return new Response(JSON.stringify({
      success: isSuccess,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      contentLength: responseText.length,
      contentPreview: responseText.substring(0, 500),
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

function filterRelevantItems(items: TTBFeedItem[]): TTBFeedItem[] {
  return items.filter(item => {
    const searchText = `${item.title} ${item.description}`.toLowerCase();

    // Check if any compliance keywords are present
    return COMPLIANCE_KEYWORDS.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    );
  });
}

function convertToAlert(item: TTBFeedItem): TTBAlert {
  // Parse publication date
  let publishedDate: string;
  try {
    if (item.pubDate) {
      publishedDate = new Date(item.pubDate).toISOString();
    } else {
      publishedDate = new Date().toISOString();
    }
  } catch {
    publishedDate = new Date().toISOString();
  }

  // Determine urgency based on content
  const urgency = determineUrgency(item);

  // Create summary from description or title
  const summary = item.description || item.title;

  return {
    title: item.title,
    source: 'TTB',
    urgency,
    summary: summary.length > 500 ? summary.substring(0, 497) + '...' : summary,
    published_date: publishedDate,
    external_url: item.link,
    full_content: JSON.stringify(item),
    agency: 'TTB',
    region: 'US',
    category: 'alcohol-labeling'
  };
}

function determineUrgency(item: TTBFeedItem): string {
  const text = `${item.title} ${item.description}`.toLowerCase();

  // High urgency keywords
  const highUrgencyKeywords = [
    'recall', 'emergency', 'immediate', 'urgent', 'critical', 'violation',
    'enforcement', 'penalty', 'warning', 'alert', 'suspension', 'revocation',
    'cease', 'desist', 'prohibited'
  ];

  // Medium urgency keywords
  const mediumUrgencyKeywords = [
    'new', 'requirement', 'deadline', 'compliance', 'mandatory', 'must',
    'regulation', 'rule', 'policy', 'guidance', 'update', 'change'
  ];

  if (highUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'High';
  } else if (mediumUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'Medium';
  }

  return 'Low';
}