import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface RSSFeed {
  agency: string;
  url: string;
  priority: number;
  urgencyKeywords: string[];
}

// Real RSS feeds from regulatory agencies
const RSS_FEEDS: RSSFeed[] = [
  {
    agency: 'FDA',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls-market-withdrawals-safety-alerts/rss.xml',
    priority: 9,
    urgencyKeywords: ['class i', 'urgent', 'immediate', 'serious', 'death', 'hospitalization']
  },
  {
    agency: 'FDA',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/warning-letters/rss.xml',
    priority: 7,
    urgencyKeywords: ['warning letter', 'violation', 'serious', 'significant']
  },
  {
    agency: 'USDA',
    url: 'https://www.fsis.usda.gov/sites/default/files/rss_feeds/recalls.xml',
    priority: 9,
    urgencyKeywords: ['class i', 'listeria', 'salmonella', 'e.coli', 'urgent', 'immediate']
  },
  {
    agency: 'EPA',
    url: 'https://www.epa.gov/newsroom/search/rss?type[news_releases]=news_releases&topic[enforcement]=enforcement',
    priority: 6,
    urgencyKeywords: ['enforcement', 'violation', 'penalty', 'contamination']
  },
  {
    agency: 'OSHA',
    url: 'https://www.osha.gov/rss/press_releases.xml',
    priority: 5,
    urgencyKeywords: ['fatality', 'serious', 'willful', 'repeat', 'citation']
  }
];

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

async function fetchRSSFeed(feed: RSSFeed): Promise<any[]> {
  try {
    logStep(`Fetching RSS feed for ${feed.agency}: ${feed.url}`);
    
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'RegIQ-RSS-Scraper/1.0 (Regulatory Intelligence Platform)'
      }
    });

    if (!response.ok) {
      logStep(`Failed to fetch ${feed.agency} RSS: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    
    if (!doc) {
      logStep(`Failed to parse XML for ${feed.agency}`);
      return [];
    }

    const items = doc.querySelectorAll('item');
    const results: any[] = [];

    for (const item of items) {
      try {
        const title = item.querySelector('title')?.textContent?.trim() || '';
        const description = item.querySelector('description')?.textContent?.trim() || '';
        const link = item.querySelector('link')?.textContent?.trim() || '';
        const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
        
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
    logStep(`Error fetching RSS feed for ${feed.agency}:`, error);
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
  
  return {
    title: item.title,
    source: item.agency,
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