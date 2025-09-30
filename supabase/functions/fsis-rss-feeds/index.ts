import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface FSISFeed {
  url: string;
  category: string;
  priority: number;
}

// FSIS RSS feed sources with categories
const FSIS_FEEDS: FSISFeed[] = [
  {
    url: 'https://www.fsis.usda.gov/fsis-content/rss/recalls.xml',
    category: 'recalls',
    priority: 9
  },
  {
    url: 'https://www.fsis.usda.gov/fsis-content/rss/notices.xml',
    category: 'notices',
    priority: 7
  },
  {
    url: 'https://www.fsis.usda.gov/fsis-content/rss/news-release.xml',
    category: 'news',
    priority: 6
  },
  {
    url: 'https://www.fsis.usda.gov/fsis-content/rss/directives.xml',
    category: 'directives',
    priority: 5
  }
];

interface ProcessedAlert {
  title: string;
  source: string;
  urgency: string;
  summary: string;
  published_date: string;
  external_url: string;
  full_content: string;
  region: string;
  agency: string;
  category: string;
}

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

async function fetchRSSFeed(feed: FSISFeed): Promise<any[]> {
  try {
    logStep(`Fetching FSIS RSS feed: ${feed.url}`);

    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RegIQ-Bot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read response');
      logStep(`Failed to fetch FSIS RSS: ${response.status} - ${response.statusText}`, { 
        status: response.status,
        statusText: response.statusText,
        errorPreview: errorText.substring(0, 200)
      });
      return [];
    }

    const xmlText = await response.text();
    
    if (!xmlText || xmlText.length === 0) {
      logStep(`Empty response received from ${feed.url}`);
      return [];
    }
    
    logStep(`Received XML response, length: ${xmlText.length}`);
    logStep(`First 500 chars of XML:`, xmlText.substring(0, 500));

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    if (!doc) {
      logStep(`Failed to parse XML for ${feed.url}`);
      return [];
    }

    const items = doc.querySelectorAll('item');
    const results: any[] = [];

    logStep(`Found ${items.length} items in RSS feed`);

    for (const item of items) {
      try {
        const title = (item as any).querySelector('title')?.textContent?.trim() || '';
        let description = (item as any).querySelector('description')?.textContent?.trim() || '';
        const link = (item as any).querySelector('link')?.textContent?.trim() || '';
        const pubDate = (item as any).querySelector('pubDate')?.textContent?.trim() || '';
        const guid = (item as any).querySelector('guid')?.textContent?.trim() || '';

        // Clean up description - remove HTML tags and extra whitespace
        description = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        logStep(`Parsed item: "${title}" published: "${pubDate}"`);

        if (title && description) {
          results.push({
            title,
            description,
            link,
            pubDate,
            guid,
            category: feed.category,
            priority: feed.priority,
            feedUrl: feed.url
          });
        } else {
          logStep(`Skipped item - missing title or description: title="${title}" desc="${description.substring(0, 50)}..."`);
        }
      } catch (error) {
        logStep(`Error parsing RSS item:`, error);
      }
    }

    logStep(`Successfully parsed ${results.length} items from ${feed.category}`);
    return results;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep(`Error fetching RSS feed ${feed.url}:`, { 
      error: errorMessage,
      stack: errorStack,
      feedCategory: feed.category
    });
    return [];
  }
}

function calculateUrgency(item: any): string {
  const text = (item.title + ' ' + item.description).toLowerCase();
  let urgencyScore = item.priority || 5;

  // Check for urgent keywords
  const urgentKeywords = ['recall', 'alert', 'contamination', 'outbreak', 'urgent', 'immediate', 'public health'];
  const foundKeywords = urgentKeywords.filter(keyword => text.includes(keyword));
  urgencyScore += foundKeywords.length * 2;

  // Category-based scoring
  if (item.category === 'recalls') urgencyScore += 4;
  else if (item.category === 'notices') urgencyScore += 2;

  // Recency boost
  const pubDate = new Date(item.pubDate);
  const hoursOld = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);

  if (hoursOld < 6) urgencyScore += 3;
  else if (hoursOld < 24) urgencyScore += 2;
  else if (hoursOld < 72) urgencyScore += 1;

  // Determine urgency level
  if (urgencyScore >= 15) return 'High';
  if (urgencyScore >= 10) return 'Medium';
  return 'Low';
}

function parseDate(dateString: string): string {
  try {
    // Handle FSIS date format: "Thu, 09/25/2025 - 12:00"
    let cleanDate = dateString.trim();

    // Remove day of week if present
    cleanDate = cleanDate.replace(/^[A-Za-z]{3},?\s*/, '');

    // Handle FSIS format MM/DD/YYYY - HH:MM
    if (cleanDate.match(/\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2}/)) {
      const parts = cleanDate.split(' - ');
      const datePart = parts[0]; // "09/25/2025"
      const timePart = parts[1] || "00:00"; // "12:00"

      // Convert to standard format
      const [month, day, year] = datePart.split('/');
      cleanDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}:00.000Z`;
    }

    const date = new Date(cleanDate);
    if (isNaN(date.getTime())) {
      console.log(`Failed to parse date: "${dateString}" -> "${cleanDate}"`);
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (error) {
    console.log(`Error parsing date "${dateString}":`, error);
    return new Date().toISOString();
  }
}

function processRSSItem(item: any): ProcessedAlert {
  const urgency = calculateUrgency(item);
  const publishedDate = parseDate(item.pubDate);

  return {
    title: item.title,
    source: 'FSIS',
    urgency,
    summary: item.description.length > 500
      ? item.description.substring(0, 500) + '...'
      : item.description,
    published_date: publishedDate,
    external_url: item.link || 'https://www.fsis.usda.gov',
    full_content: JSON.stringify({
      ...item,
      source_type: 'FSIS_RSS',
      parsed_at: new Date().toISOString()
    }),
    region: 'US',
    agency: 'FSIS',
    category: item.category
  };
}

async function isDuplicate(supabase: any, alert: ProcessedAlert): Promise<boolean> {
  const { data } = await supabase
    .from('alerts')
    .select('id')
    .eq('title', alert.title)
    .eq('source', alert.source)
    .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .maybeSingle();

  return !!data;
}

async function saveAlert(supabase: any, alert: ProcessedAlert): Promise<boolean> {
  try {
    // Check for duplicates
    if (await isDuplicate(supabase, alert)) {
      logStep(`Duplicate alert skipped: ${alert.title}`);
      return false;
    }

    // Save to database
    const { data: insertedAlert, error } = await supabase
      .from('alerts')
      .insert({
        title: alert.title,
        source: alert.source,
        urgency: alert.urgency,
        summary: alert.summary,
        published_date: alert.published_date,
        external_url: alert.external_url,
        full_content: alert.full_content,
        region: alert.region,
        agency: alert.agency,
        category: alert.category
      })
      .select('id')
      .single();

    if (error) {
      logStep('Error saving alert:', error);
      return false;
    }

    logStep(`Saved new FSIS alert: ${alert.title} (${alert.category})`);
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
    logStep('FSIS RSS Feeds processor started');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let totalAlertsProcessed = 0;
    const results: { [category: string]: number } = {};

    // Process each FSIS RSS feed
    for (const feed of FSIS_FEEDS) {
      try {
        const rssItems = await fetchRSSFeed(feed);
        let savedCount = 0;

        for (const item of rssItems) {
          const alert = processRSSItem(item);
          if (await saveAlert(supabase, alert)) {
            savedCount++;
          }
        }

        results[feed.category] = savedCount;
        totalAlertsProcessed += savedCount;

        logStep(`${feed.category}: processed ${rssItems.length} items, saved ${savedCount} new alerts`);

        // Small delay between feeds
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logStep(`Error processing RSS feed for ${feed.category}:`, error);
        results[feed.category] = 0;
      }
    }

    logStep('FSIS RSS processing completed', { totalAlertsProcessed, results });

    // Log to alert_sync_logs
    await supabase.from('alert_sync_logs').insert({
      source_name: 'FSIS',
      status: totalAlertsProcessed > 0 ? 'success' : 'no_data',
      records_processed: totalAlertsProcessed,
      error_message: totalAlertsProcessed === 0 ? 'No new alerts found in RSS feeds' : null,
      sync_metadata: { feedResults: results }
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalAlertsProcessed,
        feedResults: results,
        message: 'FSIS RSS feeds processed successfully',
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    logStep('Unexpected error in FSIS RSS processor', { error: error.message, stack: error.stack });
    
    // Log error to alert_sync_logs
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('alert_sync_logs').insert({
        source_name: 'FSIS',
        status: 'error',
        records_processed: 0,
        error_message: error.message,
        sync_metadata: { stack: error.stack }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});