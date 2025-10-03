import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

// Simple logger for Supabase functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface RSSFeed {
  agency: string;
  url: string;
  backupUrl?: string; // Fallback URL if primary fails
  priority: number;
  urgencyKeywords: string[];
}

// US-only RSS feeds (non-US sources removed for focused compliance)
// RegIQ focuses exclusively on US federal agencies for regulatory compliance
const RSS_FEEDS: RSSFeed[] = [
  // Primary unified food safety feed covering FDA & USDA recalls
  {
    agency: 'FDA',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food-safety-recalls/rss.xml',
    backupUrl: 'https://www.recalls.gov/rrfda.aspx', // More reliable consolidated feed
    priority: 10,
    urgencyKeywords: ['recall', 'contamination', 'outbreak', 'salmonella', 'listeria', 'e.coli', 'alert', 'class i', 'class ii', 'voluntary', 'market withdrawal', 'public health']
  },
  {
    agency: 'FTC',
    url: 'https://www.ftc.gov/feeds/press-release-consumer-protection.xml',
    priority: 7,
    urgencyKeywords: ['enforcement', 'settlement', 'complaint', 'action', 'order', 'food', 'advertising', 'labeling', 'deceptive']
  },
  {
    agency: 'OSHA',
    url: 'https://www.osha.gov/news/newsreleases.xml',
    priority: 6,
    urgencyKeywords: ['citation', 'violation', 'inspection', 'penalty', 'food', 'manufacturing', 'meatpacking', 'poultry', 'processing']
  }
  // REMOVED: CDC direct RSS (no longer available)
  // CDC food safety data captured through FDA and USDA APIs
  //
  // REMOVED 2025-09-30: Non-US sources for focused US regulatory compliance
  // - EFSA (European Food Safety Authority) - EU agency
  // - FAO (Food and Agriculture Organization) - International/UN
  // - Canada_Health (Health Canada) - Canadian government
  //
  // Additional US federal sources will be managed through the data_sources table
  // in enhanced-regulatory-data-pipeline for centralized configuration
];

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Helper function to extract XML tag content using regex
function extractTag(xml: string, tagName: string): string {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular tags
  const regularRegex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const regularMatch = xml.match(regularRegex);
  if (regularMatch) {
    // Decode HTML entities
    return regularMatch[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  return '';
}

// Helper function to extract all items from RSS/Atom feed
function extractItems(xmlText: string): string[] {
  const items: string[] = [];
  
  // Try RSS <item> tags first
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    items.push(match[1]);
  }
  
  // If no items found, try Atom <entry> tags
  if (items.length === 0) {
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xmlText)) !== null) {
      items.push(match[1]);
    }
  }
  
  return items;
}

async function fetchRSSFeed(feed: RSSFeed, retryCount = 0): Promise<any[]> {
  const maxRetries = 3;
  try {
    logStep(`Fetching RSS feed for ${feed.agency}: ${feed.url}`);

    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'RegIQ Food Safety Monitor/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(60000) // 60 second timeout for slow government sites
    });

    if (!response.ok) {
      // Capture response body for debugging
      const errorText = await response.text().catch(() => 'Unable to read response');
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        errorPreview: errorText.substring(0, 500), // First 500 chars for debugging
        url: feed.url
      };
      
      logStep(`Failed to fetch ${feed.agency} RSS: ${response.status} - ${response.statusText}`, errorDetails);

      // Try backup URL if available and this is first attempt
      if (feed.backupUrl && retryCount === 0) {
        logStep(`Attempting backup URL for ${feed.agency}: ${feed.backupUrl}`);
        const backupFeed = { ...feed, url: feed.backupUrl };
        return fetchRSSFeed(backupFeed, retryCount + 1);
      }

      // Retry with exponential backoff for rate limiting (429) or server errors (5xx)
      if ((response.status === 429 || response.status >= 500) && retryCount < maxRetries) {
        const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        logStep(`Retrying ${feed.agency} after ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return fetchRSSFeed(feed, retryCount + 1);
      }

      return [];
    }

    const xmlText = await response.text();

    // Validate response content
    if (!xmlText || xmlText.length === 0) {
      logStep(`Empty response received from ${feed.agency}`);
      return [];
    }

    // Log feed diagnostics for debugging
    const feedDiagnostics = {
      length: xmlText.length,
      firstChars: xmlText.substring(0, 200),
      containsRSS: xmlText.includes('<rss') || xmlText.includes('<feed'),
      containsHTML: xmlText.includes('<!DOCTYPE html') || xmlText.includes('<html')
    };
    logStep(`Received content from ${feed.agency}:`, feedDiagnostics);

    // Detect if HTML error page was returned instead of XML
    if (feedDiagnostics.containsHTML && !feedDiagnostics.containsRSS) {
      logStep(`⚠️  WARNING: ${feed.agency} returned HTML page (likely 404/error), not XML feed!`, {
        preview: xmlText.substring(0, 500)
      });
      return [];
    }

    // Extract items using regex instead of DOMParser (more reliable in Deno)
    const itemContents = extractItems(xmlText);
    
    // Log parsing results
    logStep(`Found ${itemContents.length} items in ${feed.agency} RSS feed`);

    // Log first item structure for debugging
    if (itemContents.length > 0) {
      const sampleTitle = extractTag(itemContents[0], 'title');
      const sampleDesc = extractTag(itemContents[0], 'description');
      logStep(`Sample item from ${feed.agency}:`, {
        title: sampleTitle.substring(0, 100),
        hasDescription: !!sampleDesc,
        descLength: sampleDesc.length || 0
      });
    }

    if (itemContents.length === 0) {
      logStep(`No items found in ${feed.agency} RSS feed`);
      return [];
    }

    const results: any[] = [];

    for (const itemXml of itemContents) {
      try {
        const title = extractTag(itemXml, 'title');
        const description = extractTag(itemXml, 'description');
        const link = extractTag(itemXml, 'link');
        const pubDate = extractTag(itemXml, 'pubDate') || new Date().toISOString();
        
        if (title && description) {
          results.push({
            title,
            description,
            link,
            pubDate,
            agency: feed.agency,
            priority: feed.priority,
            urgencyKeywords: feed.urgencyKeywords
          });
        }
      } catch (error) {
        logStep(`Error parsing RSS item for ${feed.agency}:`, error);
      }
    }

    logStep(`Successfully parsed ${results.length} items from ${feed.agency}`);
    return results;

  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      agency: feed.agency,
      url: feed.url
    };
    
    logStep(`Error fetching RSS feed for ${feed.agency}:`, errorDetails);
    return [];
  }
}

function calculateUrgency(item: any): string {
  const text = (item.title + ' ' + item.description).toLowerCase();
  let urgencyScore = item.priority || 5;
  
  // Check for urgent keywords
  const foundKeywords = item.urgencyKeywords.filter((keyword: string) => 
    text.includes(keyword.toLowerCase())
  );
  urgencyScore += foundKeywords.length * 2;
  
  // Recency boost
  const pubDate = new Date(item.pubDate);
  const hoursOld = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
  
  if (hoursOld < 24) urgencyScore += 3;
  else if (hoursOld < 72) urgencyScore += 1;
  
  // Determine urgency level
  if (urgencyScore >= 12) return 'High';
  if (urgencyScore >= 8) return 'Medium';
  return 'Low';
}

function parseDate(dateString: string): string {
  try {
    // Handle various RSS date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Fallback to current time if parsing fails
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

async function processRSSItem(item: any): Promise<any> {
  const urgency = calculateUrgency(item);
  const publishedDate = parseDate(item.pubDate);
  
  // Smart agency detection for FDA_FOOD_SAFETY feed
  let detectedAgency = item.agency;
  let source = item.agency;
  
  if (item.agency === 'FDA_FOOD_SAFETY') {
    const text = (item.title + ' ' + item.description).toLowerCase();
    
    // Detect FSIS/USDA content
    if (text.includes('usda') || text.includes('fsis') || 
        text.includes('meat') || text.includes('poultry') || 
        text.includes('egg products')) {
      detectedAgency = 'FSIS';
    } else {
      detectedAgency = 'FDA';
    }
    
    source = 'FDA_FOOD_SAFETY'; // Keep original source for tracking
  }
  
  return {
    title: item.title,
    source: source,
    agency: detectedAgency,
    urgency,
    summary: item.description.length > 500 
      ? item.description.substring(0, 500) + '...' 
      : item.description,
    published_date: publishedDate,
    external_url: item.link,
    full_content: JSON.stringify(item)
  };
}

async function isDuplicate(supabase: any, alert: any): Promise<boolean> {
  const { data } = await supabase
    .from('alerts')
    .select('id')
    .eq('title', alert.title)
    .eq('source', alert.source)
    .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .maybeSingle();

  return !!data;
}

async function saveAlert(supabase: any, alert: any): Promise<boolean> {
  try {
    // Check for duplicates
    if (await isDuplicate(supabase, alert)) {
      logStep(`Duplicate alert skipped: ${alert.title}`);
      return false;
    }

    // Save to database
    const { data: insertedAlert, error } = await supabase
      .from('alerts')
      .insert(alert)
      .select('id')
      .single();

    if (error) {
      logStep('Error saving alert:', error);
      return false;
    }

    logStep(`Saved new alert: ${alert.title}`);
    return true;
  } catch (error) {
    logStep('Error in saveAlert:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('RSS Alert Scraper started');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let totalAlertsProcessed = 0;
    const results: { [agency: string]: number } = {};

    // Process each RSS feed
    for (const feed of RSS_FEEDS) {
      try {
        const rssItems = await fetchRSSFeed(feed);
        let savedCount = 0;

        for (const item of rssItems.slice(0, 10)) { // Limit to 10 most recent per feed
          const alert = await processRSSItem(item);
          if (await saveAlert(supabase, alert)) {
            savedCount++;
          }
        }

        results[feed.agency] = (results[feed.agency] || 0) + savedCount;
        totalAlertsProcessed += savedCount;

        // Small delay between feeds
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logStep(`Error processing RSS feed for ${feed.agency}:`, error);
        results[feed.agency] = 0;
      }
    }

    logStep('RSS scraping completed', { totalAlertsProcessed, results });

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalAlertsProcessed,
        agencyResults: results,
        message: 'RSS alert scraping completed successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    logStep('Unexpected error in RSS scraper', { error: error.message });
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});