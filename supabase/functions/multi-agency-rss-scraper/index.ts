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

interface RSSFeedConfig {
  agency: string;
  source: string;
  url: string;
  keywords: string[];
  urgencyLevel: string;
  category: string;
  description: string;
}

interface FeedItem {
  title: string;
  description: string;
  pubDate: string;
  link: string;
}

interface Alert {
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

// RSS Feed configurations for multiple agencies
const RSS_FEEDS: RSSFeedConfig[] = [
  // CDC Feeds - VERIFIED 2025 URLs
  {
    agency: 'CDC',
    source: 'CDC',
    url: 'https://tools.cdc.gov/api/v2/resources/media.rss',
    keywords: ['food', 'foodborne', 'outbreak', 'illness', 'contamination', 'recall', 'safety', 'surveillance', 'salmonella', 'listeria', 'e.coli'],
    urgencyLevel: 'High',
    category: 'foodborne-illness',
    description: 'CDC Media & News'
  },

  // EPA Feeds - VERIFIED 2025 URL
  {
    agency: 'EPA',
    source: 'EPA',
    url: 'https://www.epa.gov/feeds/epa-newsroom.xml',
    keywords: ['pesticide', 'tolerance', 'residue', 'agricultural', 'chemical', 'food', 'crop', 'registration', 'water', 'contamination'],
    urgencyLevel: 'Medium',
    category: 'pesticide-tolerance',
    description: 'EPA Newsroom Feed'
  },

  // NOAA Feeds - VERIFIED 2025 URL
  {
    agency: 'NOAA',
    source: 'NOAA',
    url: 'https://www.fisheries.noaa.gov/about-us/newsroom',
    keywords: ['seafood', 'fish', 'mercury', 'advisory', 'closure', 'import', 'aquaculture', 'safety', 'fishery', 'marine'],
    urgencyLevel: 'Medium',
    category: 'seafood-safety',
    description: 'NOAA Fisheries Newsroom'
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
    const { action, agency } = body;

    logger.info(`[MULTI-AGENCY-RSS] Function started with action: ${action || 'scrape_all'}`);

    switch (action) {
      case 'scrape_cdc':
        return await scrapeSpecificAgency(supabaseClient, 'CDC');
      case 'scrape_epa':
        return await scrapeSpecificAgency(supabaseClient, 'EPA');
      case 'scrape_noaa':
        return await scrapeSpecificAgency(supabaseClient, 'NOAA');
      case 'scrape_osha':
        return await scrapeSpecificAgency(supabaseClient, 'OSHA');
      case 'test_feeds':
        return await testAllFeeds();
      default:
        return await scrapeAllAgencies(supabaseClient);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error in multi-agency-rss-scraper", { message: errorMessage });

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

async function scrapeAllAgencies(supabase: any) {
  logger.info('Starting multi-agency RSS scraping');

  let totalProcessed = 0;
  const results: any[] = [];

  for (const feedConfig of RSS_FEEDS) {
    try {
      logger.info(`Processing ${feedConfig.agency} feed: ${feedConfig.description}`);

      const processed = await scrapeFeed(supabase, feedConfig);
      totalProcessed += processed;

      results.push({
        agency: feedConfig.agency,
        source: feedConfig.source,
        description: feedConfig.description,
        processed,
        status: 'success'
      });

      // Rate limiting between feeds
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      logger.error(`Error processing ${feedConfig.agency} feed`, {
        url: feedConfig.url,
        error: error instanceof Error ? error.message : String(error)
      });

      results.push({
        agency: feedConfig.agency,
        source: feedConfig.source,
        description: feedConfig.description,
        processed: 0,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Multi-agency RSS scraping completed. Processed ${totalProcessed} total alerts.`,
    total_processed: totalProcessed,
    feed_results: results,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function scrapeSpecificAgency(supabase: any, agency: string) {
  const startTime = Date.now();
  const agencyFeeds = RSS_FEEDS.filter(feed => feed.agency === agency);

  if (agencyFeeds.length === 0) {
    throw new Error(`No feeds configured for agency: ${agency}`);
  }

  // Start sync log
  const { data: logData, error: logError } = await supabase
    .rpc('start_sync_log', {
      p_source: agency,
      p_metadata: {
        action: `scrape_${agency.toLowerCase()}`,
        feeds_count: agencyFeeds.length,
        started_at: new Date().toISOString()
      }
    });

  if (logError) {
    logger.error('Failed to start sync log', { error: logError });
  }

  const syncLogId = logData;
  let totalProcessed = 0;
  let totalFetched = 0;
  let totalSkipped = 0;
  const errors: string[] = [];
  const results: any[] = [];

  for (const feedConfig of agencyFeeds) {
    try {
      const { processed, fetched, skipped } = await scrapeFeed(supabase, feedConfig);
      totalProcessed += processed;
      totalFetched += fetched;
      totalSkipped += skipped;

      results.push({
        description: feedConfig.description,
        processed,
        fetched,
        skipped,
        status: 'success'
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Error processing ${agency} feed`, {
        url: feedConfig.url,
        error: errorMsg
      });

      errors.push(`${feedConfig.description}: ${errorMsg}`);
      results.push({
        description: feedConfig.description,
        processed: 0,
        fetched: 0,
        skipped: 0,
        status: 'error',
        error: errorMsg
      });
    }
  }

  const processingTimeMs = Date.now() - startTime;
  const status = errors.length === agencyFeeds.length ? 'error' : 'success';

  // Finish sync log
  if (syncLogId) {
    await supabase.rpc('finish_sync_log', {
      p_log_id: syncLogId,
      p_status: status,
      p_alerts_fetched: totalFetched,
      p_alerts_inserted: totalProcessed,
      p_alerts_skipped: totalSkipped,
      p_errors: errors.length > 0 ? errors : null,
      p_results: {
        processing_time_ms: processingTimeMs,
        feeds_processed: agencyFeeds.length,
        feed_results: results
      }
    });
  }

  // Update data freshness
  await supabase
    .from('data_freshness')
    .upsert({
      source_name: agency,
      last_successful_fetch: new Date().toISOString(),
      last_attempt: new Date().toISOString(),
      fetch_status: status,
      records_fetched: totalProcessed,
      error_message: errors.length > 0 ? errors.join('; ') : null
    }, {
      onConflict: 'source_name'
    });

  logger.info(`${agency} scraping completed`, {
    processed: totalProcessed,
    fetched: totalFetched,
    skipped: totalSkipped,
    errors: errors.length,
    duration_ms: processingTimeMs
  });

  return new Response(JSON.stringify({
    success: status === 'success',
    message: `${agency} RSS scraping completed. Processed ${totalProcessed} alerts.`,
    agency,
    total_processed: totalProcessed,
    total_fetched: totalFetched,
    total_skipped: totalSkipped,
    processing_time_ms: processingTimeMs,
    feed_results: results,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function scrapeFeed(supabase: any, feedConfig: RSSFeedConfig): Promise<{ processed: number; fetched: number; skipped: number }> {
  logger.info(`[${feedConfig.agency}] Fetching RSS feed`, { url: feedConfig.url });

  let retries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(feedConfig.url, {
        headers: {
          'User-Agent': 'RegIQ-MultiAgencyScraper/2.0',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        if (attempt < retries && (response.status === 429 || response.status >= 500)) {
          const backoff = Math.pow(2, attempt) * 1000;
          logger.warn(`[${feedConfig.agency}] Attempt ${attempt} failed (${response.status}), retrying in ${backoff}ms`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
        throw new Error(`RSS feed error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();
      
      // Enhanced logging for debugging
      logger.info(`[${feedConfig.agency}] Response received`, {
        contentType,
        contentLength: responseText.length,
        preview: responseText.substring(0, 500)
      });
      
      // Detect if response is JSON (CDC API might return JSON)
      if (contentType.includes('json') || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
        logger.info(`[${feedConfig.agency}] Detected JSON response, attempting JSON parse`);
        try {
          const jsonData = JSON.parse(responseText);
          logger.info(`[${feedConfig.agency}] JSON parsed successfully`, { 
            keys: Object.keys(jsonData),
            type: Array.isArray(jsonData) ? 'array' : 'object'
          });
          // CDC API might have a different structure - log and return empty for now
          logger.warn(`[${feedConfig.agency}] JSON format not yet supported for this feed`);
          return { processed: 0, fetched: 0, skipped: 0 };
        } catch (jsonError) {
          logger.error(`[${feedConfig.agency}] Failed to parse as JSON`, { error: jsonError });
        }
      }
      
      // Manual XML/RSS parsing (DOMParser doesn't support text/xml in Deno)
      // Helper function to extract text from XML tags
      const extractXMLContent = (xml: string, tagName: string): string => {
        const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
        const match = xml.match(pattern);
        if (!match) return '';
        
        let content = match[1].trim();
        // Remove CDATA wrapper if present
        content = content.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1');
        // Decode HTML entities
        content = content
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        return content.trim();
      };

      // Extract items (support both RSS <item> and Atom <entry>)
      let itemMatches = responseText.match(/<item[^>]*>[\s\S]*?<\/item>/gi);
      let isAtom = false;
      
      if (!itemMatches || itemMatches.length === 0) {
        itemMatches = responseText.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi);
        isAtom = true;
        logger.info(`[${feedConfig.agency}] No <item> found, trying <entry> (Atom format)`);
      }
      
      logger.info(`[${feedConfig.agency}] Found feed items`, { 
        count: itemMatches?.length || 0,
        format: isAtom ? 'Atom' : 'RSS'
      });

      if (!itemMatches || itemMatches.length === 0) {
        logger.warn(`[${feedConfig.agency}] No feed items found in response`);
        return { processed: 0, fetched: 0, skipped: 0 };
      }

      const feedItems: FeedItem[] = [];

      // Parse each item
      for (const itemXML of itemMatches) {
        try {
          const title = extractXMLContent(itemXML, 'title');
          
          // For description, try multiple tags
          let description = '';
          if (isAtom) {
            description = extractXMLContent(itemXML, 'summary') || 
                         extractXMLContent(itemXML, 'content');
          } else {
            description = extractXMLContent(itemXML, 'description');
          }
          
          // For pubDate, try multiple date tags
          let pubDate = '';
          if (isAtom) {
            pubDate = extractXMLContent(itemXML, 'updated') || 
                     extractXMLContent(itemXML, 'published');
          } else {
            pubDate = extractXMLContent(itemXML, 'pubDate');
          }
          
          // For link, handle both text content and href attribute
          let link = '';
          if (isAtom) {
            // Atom feeds use <link href="..."/>
            const linkMatch = itemXML.match(/<link[^>]+href=["']([^"']+)["']/i);
            link = linkMatch ? linkMatch[1] : '';
          } else {
            link = extractXMLContent(itemXML, 'link');
          }

          if (title && link) {
            feedItems.push({ title, description, pubDate, link });
            logger.debug(`[${feedConfig.agency}] Parsed item`, { title: title.substring(0, 80) });
          } else {
            logger.warn(`[${feedConfig.agency}] Skipped item missing title or link`, { 
              hasTitle: !!title, 
              hasLink: !!link 
            });
          }
        } catch (itemError) {
          logger.warn(`[${feedConfig.agency}] Error parsing feed item`, { error: itemError });
          continue;
        }
      }

    logger.info(`[${feedConfig.agency}] Parsed feed items`, { 
      total: feedItems.length,
      format: isAtom ? 'Atom' : 'RSS'
    });

    // Filter for relevant items
    const relevantItems = filterRelevantItems(feedItems, feedConfig.keywords);
    logger.info(`[${feedConfig.agency}] Filtered relevant items`, {
      total: feedItems.length,
      relevant: relevantItems.length,
      keywords: feedConfig.keywords
    });

    if (relevantItems.length === 0) {
      return { processed: 0, fetched: feedItems.length, skipped: feedItems.length };
    }

    // Save to database
    let processedCount = 0;
    let skippedCount = 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const item of relevantItems) {
      try {
        const alert = convertToAlert(item, feedConfig);

        // Check for duplicates
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
            logger.error('Database insert error', {
              error: error.message,
              title: alert.title,
              agency: feedConfig.agency
            });
            skippedCount++;
          } else {
            processedCount++;
            logger.info(`Added ${feedConfig.agency} alert`, { title: alert.title });
          }
        } else {
          skippedCount++;
        }
      } catch (alertError) {
        logger.error('Error processing item', {
          error: alertError,
          title: item.title,
          agency: feedConfig.agency
        });
        skippedCount++;
        continue;
      }
    }

      return { 
        processed: processedCount, 
        fetched: feedItems.length, 
        skipped: skippedCount 
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === retries) {
        throw new Error(`Failed to scrape ${feedConfig.agency} feed after ${retries} attempts: ${lastError.message}`);
      }
    }
  }
  
  throw lastError || new Error(`Failed to scrape ${feedConfig.agency} feed`);
}

async function testAllFeeds() {
  const results: any[] = [];

  for (const feedConfig of RSS_FEEDS) {
    try {
      logger.info(`Testing feed: ${feedConfig.url}`);

      const response = await fetch(feedConfig.url, {
        headers: {
          'User-Agent': 'RegIQ-MultiAgencyScraper/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        signal: AbortSignal.timeout(10000)
      });

      const isSuccess = response.ok;
      const contentLength = response.headers.get('content-length') || 'unknown';

      results.push({
        agency: feedConfig.agency,
        description: feedConfig.description,
        url: feedConfig.url,
        status: response.status,
        statusText: response.statusText,
        success: isSuccess,
        contentLength
      });

    } catch (error) {
      results.push({
        agency: feedConfig.agency,
        description: feedConfig.description,
        url: feedConfig.url,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Feed testing completed',
    results,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

function filterRelevantItems(items: FeedItem[], keywords: string[]): FeedItem[] {
  const filtered = items.filter(item => {
    const searchText = `${item.title} ${item.description}`.toLowerCase();
    const matchedKeywords: string[] = [];
    
    const hasMatch = keywords.some(keyword => {
      if (searchText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        return true;
      }
      return false;
    });
    
    if (hasMatch) {
      logger.debug('Item matched keywords', { 
        title: item.title.substring(0, 60),
        keywords: matchedKeywords
      });
    }
    
    return hasMatch;
  });
  
  logger.info('Keyword filtering complete', {
    total: items.length,
    matched: filtered.length,
    keywords: keywords.join(', ')
  });
  
  return filtered;
}

function convertToAlert(item: FeedItem, feedConfig: RSSFeedConfig): Alert {
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

  // Determine urgency
  const urgency = determineUrgency(item, feedConfig.urgencyLevel);

  // Create summary
  const summary = item.description || item.title;

  return {
    title: item.title,
    source: feedConfig.source,
    urgency,
    summary: summary.length > 500 ? summary.substring(0, 497) + '...' : summary,
    published_date: publishedDate,
    external_url: item.link,
    full_content: JSON.stringify(item),
    agency: feedConfig.agency,
    region: 'US',
    category: feedConfig.category
  };
}

function determineUrgency(item: FeedItem, defaultUrgency: string): string {
  const text = `${item.title} ${item.description}`.toLowerCase();

  // High urgency keywords
  const highUrgencyKeywords = [
    'recall', 'emergency', 'immediate', 'urgent', 'critical', 'outbreak',
    'contamination', 'death', 'illness', 'warning', 'alert', 'danger'
  ];

  // Medium urgency keywords
  const mediumUrgencyKeywords = [
    'advisory', 'closure', 'violation', 'enforcement', 'new', 'requirement',
    'update', 'change', 'guidance', 'standard'
  ];

  if (highUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'High';
  } else if (mediumUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'Medium';
  }

  return defaultUrgency;
}