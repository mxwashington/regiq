import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RSSFeedConfig {
  id: string;
  url: string;
  agency: string;
  category: string;
  title: string;
  urgencyDefault: number;
  color: string;
  icon: string;
}

interface RSSFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: Date;
  agency: string;
  category: string;
  urgencyScore: number;
  color: string;
  icon: string;
  guid: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Updated RSS feeds - removed problematic ones, kept only reliable sources
const RSS_FEEDS: RSSFeedConfig[] = [
  {
    id: "fda-recalls",
    url: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml",
    agency: "FDA",
    category: "Recalls",
    title: "FDA Recalls",
    urgencyDefault: 8,
    color: "#dc2626",
    icon: "🚨"
  },
  {
    id: "usda-news",
    url: "https://www.usda.gov/rss/latest-releases.xml",
    agency: "USDA",
    category: "News Releases",
    title: "USDA Latest Releases",
    urgencyDefault: 6,
    color: "#059669",
    icon: "🌾"
  }
];

const logStep = (message: string, data?: any) => {
  console.log(`RSS Feed Log: ${message}`, data ? JSON.stringify(data) : '');
};

// Simple XML parser for RSS feeds using regex (more reliable than DOMParser in Deno)
function parseRSSXML(xmlContent: string): { title: string; description: string; link: string; pubDate: string; guid: string; }[] {
  const items: { title: string; description: string; link: string; pubDate: string; guid: string; }[] = [];
  
  // Extract items using regex
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  
  while ((itemMatch = itemRegex.exec(xmlContent)) !== null) {
    const itemContent = itemMatch[1];
    
    // Extract individual fields
    const titleMatch = itemContent.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    const descMatch = itemContent.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const linkMatch = itemContent.match(/<link[^>]*>(.*?)<\/link>/i);
    const pubDateMatch = itemContent.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);
    const guidMatch = itemContent.match(/<guid[^>]*>(.*?)<\/guid>/i);
    
    items.push({
      title: titleMatch ? titleMatch[1].trim() : 'No title',
      description: descMatch ? descMatch[1].trim() : '',
      link: linkMatch ? linkMatch[1].trim() : '',
      pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
      guid: guidMatch ? guidMatch[1].trim() : ''
    });
  }
  
  return items;
}

// Fetch and parse a single RSS feed with improved error handling
async function fetchRSSFeed(feedConfig: RSSFeedConfig): Promise<RSSFeedItem[]> {
  logStep("Starting RSS fetch", { 
    agency: feedConfig.agency, 
    url: feedConfig.url,
    title: feedConfig.title 
  });
  
  try {
    // Direct fetch with timeout - some feeds work better without CORS proxy
    logStep("Fetching RSS feed directly", { url: feedConfig.url });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch(feedConfig.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'RegIQ-RSS-Bot/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlContent = await response.text();
    
    if (!xmlContent || xmlContent.length < 100) {
      throw new Error('Empty or invalid XML content');
    }

    logStep("Parsing XML content", { contentLength: xmlContent.length });
    
    // Use our custom XML parser instead of DOMParser
    const parsedItems = parseRSSXML(xmlContent);
    
    logStep("Found RSS items", { count: parsedItems.length });

    if (parsedItems.length === 0) {
      logStep("No items found in feed", { xmlPreview: xmlContent.substring(0, 500) });
      return [];
    }

    const rssItems = parsedItems.slice(0, 20).map((item, index) => {
      let pubDate = new Date();
      if (item.pubDate) {
        const parsedDate = new Date(item.pubDate);
        if (!isNaN(parsedDate.getTime())) {
          pubDate = parsedDate;
        }
      }
      
      return {
        id: `${feedConfig.id}-${index}`,
        title: item.title.substring(0, 200),
        description: item.description.replace(/<[^>]*>/g, '').substring(0, 500), // Strip HTML
        link: item.link,
        pubDate,
        agency: feedConfig.agency,
        category: feedConfig.category,
        urgencyScore: feedConfig.urgencyDefault,
        color: feedConfig.color,
        icon: feedConfig.icon,
        guid: item.guid || `${feedConfig.id}-${index}-${Date.now()}`
      };
    });
    
    logStep("Successfully parsed items", { count: rssItems.length, agency: feedConfig.agency });
    return rssItems;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error fetching RSS feed", { 
      agency: feedConfig.agency, 
      error: errorMessage,
      url: feedConfig.url
    });
    
    // Try CORS proxy as fallback
    try {
      logStep("Trying CORS proxy fallback", { agency: feedConfig.agency });
      
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedConfig.url)}`;
      const proxyResponse = await fetch(proxyUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(8000)
      });

      if (proxyResponse.ok) {
        const data = await proxyResponse.json();
        if (data.contents) {
          const parsedItems = parseRSSXML(data.contents);
          const rssItems = parsedItems.slice(0, 20).map((item, index) => ({
            id: `${feedConfig.id}-${index}`,
            title: item.title.substring(0, 200),
            description: item.description.replace(/<[^>]*>/g, '').substring(0, 500),
            link: item.link,
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            agency: feedConfig.agency,
            category: feedConfig.category,
            urgencyScore: feedConfig.urgencyDefault,
            color: feedConfig.color,
            icon: feedConfig.icon,
            guid: item.guid || `${feedConfig.id}-${index}-${Date.now()}`
          }));
          
          logStep("CORS proxy fallback successful", { count: rssItems.length, agency: feedConfig.agency });
          return rssItems;
        }
      }
    } catch (fallbackError) {
      logStep("CORS proxy fallback also failed", { agency: feedConfig.agency, error: String(fallbackError) });
    }
    
    return [];
  }
}

// Main Edge Function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  
  try {
    logStep("Starting RSS feed aggregation");

    // Check for cached results (15 minute cache - reduced for fresher data)
    const { data: cachedData } = await supabaseClient
      .from("search_cache")
      .select("*")
      .eq("cache_key", "rss_feeds_all")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cachedData && cachedData.result_data) {
      logStep("Returning cached RSS data", { itemCount: cachedData.result_data.length });
      return new Response(JSON.stringify({
        items: cachedData.result_data,
        cached: true,
        fetched_at: cachedData.created_at
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch all RSS feeds in parallel with timeout
    logStep("Fetching fresh RSS data from all sources");
    const startTime = Date.now();
    
    const feedPromises = RSS_FEEDS.map(feed => 
      Promise.race([
        fetchRSSFeed(feed),
        new Promise<RSSFeedItem[]>((_, reject) => 
          setTimeout(() => reject(new Error('Feed timeout')), 10000)
        )
      ])
    );
    
    const feedResults = await Promise.allSettled(feedPromises);
    
    // Combine all successful results
    const allItems: RSSFeedItem[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    feedResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
        if (result.value.length > 0) {
          successCount++;
        }
        logStep("Feed fetch completed", { 
          agency: RSS_FEEDS[index].agency, 
          itemCount: result.value.length 
        });
      } else {
        errorCount++;
        logStep("Feed fetch failed", { 
          agency: RSS_FEEDS[index].agency, 
          error: String(result.reason)
        });
      }
    });

    // Sort by publication date (newest first)
    allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    const executionTime = Date.now() - startTime;
    
    logStep("RSS feeds aggregation complete", { 
      totalItems: allItems.length,
      successfulFeeds: successCount,
      failedFeeds: errorCount,
      executionTimeMs: executionTime
    });

    // Cache the results for 15 minutes
    if (allItems.length > 0) {
      await supabaseClient
        .from("search_cache")
        .upsert({
          cache_key: "rss_feeds_all",
          query: "rss_feeds",
          result_data: allItems,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        });
    }

    // Log successful fetch
    await supabaseClient
      .from("rss_feed_logs")
      .insert({
        feed_id: "all_feeds",
        fetch_status: allItems.length > 0 ? "success" : "partial",
        items_fetched: allItems.length,
        fetch_duration: executionTime,
        error_message: errorCount > 0 ? `${errorCount} feeds failed` : null
      });

    return new Response(JSON.stringify({
      items: allItems,
      cached: false,
      fetched_at: new Date().toISOString(),
      stats: {
        total_items: allItems.length,
        successful_feeds: successCount,
        failed_feeds: errorCount,
        execution_time_ms: executionTime
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("CRITICAL ERROR in RSS fetch", { message: errorMessage });
    
    // Log failed fetch
    try {
      await supabaseClient
        .from("rss_feed_logs")
        .insert({
          feed_id: "all_feeds",
          fetch_status: "error",
          error_message: errorMessage,
          items_fetched: 0
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      items: [] // Return empty array instead of failing completely
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});