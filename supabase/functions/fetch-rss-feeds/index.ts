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

// Verified working RSS feeds for 2025
const RSS_FEEDS: RSSFeedConfig[] = [
  {
    id: "cdc-mmwr",
    url: "https://www.cdc.gov/mmwr/rss/rss.html",
    agency: "CDC",
    category: "Public Health Reports",
    title: "CDC MMWR Weekly Reports",
    urgencyDefault: 7,
    color: "#dc2626",
    icon: "🏥"
  },
  {
    id: "food-safety-news",
    url: "https://feeds.feedburner.com/foodsafetynews/",
    agency: "Industry",
    category: "Food Safety News",
    title: "Food Safety News",
    urgencyDefault: 6,
    color: "#ea580c",
    icon: "📰"
  },
  {
    id: "fda-legacy-medwatch",
    url: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml",
    agency: "FDA",
    category: "Safety Alerts",
    title: "FDA MedWatch (Legacy - May Be Inactive)",
    urgencyDefault: 8,
    color: "#7c3aed",
    icon: "⚠️"
  }
];

const logStep = (message: string, data?: any) => {
  console.log(`RSS Feed Log: ${message}`, data ? JSON.stringify(data) : '');
};

// Fetch and parse a single RSS feed with improved error handling
async function fetchRSSFeed(feedConfig: RSSFeedConfig): Promise<RSSFeedItem[]> {
  logStep("Starting RSS fetch", { 
    agency: feedConfig.agency, 
    url: feedConfig.url,
    title: feedConfig.title 
  });
  
  try {
    // Use more reliable CORS proxy - allorigins
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedConfig.url)}`;
    
    logStep("Fetching through CORS proxy", { proxyUrl });
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'RegIQ-RSS-Bot/1.0'
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.contents) {
      throw new Error('No content received from CORS proxy');
    }

    logStep("Parsing XML content", { contentLength: data.contents.length });
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents, 'application/xml');
    
    // Check for XML parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`XML parsing failed: ${parseError.textContent}`);
    }

    const items = Array.from(doc.querySelectorAll('item'));
    logStep("Found RSS items", { count: items.length });

    if (items.length === 0) {
      logStep("No items found in feed", { xmlPreview: data.contents.substring(0, 500) });
      return [];
    }

    const parsedItems = items.slice(0, 20).map((item, index) => {
      const title = item.querySelector("title")?.textContent || "No title";
      const description = item.querySelector("description")?.textContent || "";
      const link = item.querySelector("link")?.textContent || item.querySelector("guid")?.textContent || "";
      const pubDateText = item.querySelector("pubDate")?.textContent || item.querySelector("dc\\:date, date")?.textContent;
      
      let pubDate = new Date();
      if (pubDateText) {
        const parsedDate = new Date(pubDateText);
        if (!isNaN(parsedDate.getTime())) {
          pubDate = parsedDate;
        }
      }
      
      return {
        id: `${feedConfig.id}-${index}`,
        title: title.trim(),
        description: description.trim().substring(0, 500),
        link: link.trim(),
        pubDate,
        agency: feedConfig.agency,
        category: feedConfig.category,
        urgencyScore: feedConfig.urgencyDefault,
        color: feedConfig.color,
        icon: feedConfig.icon,
        guid: item.querySelector("guid, id")?.textContent || `${feedConfig.id}-${index}-${Date.now()}`
      };
    });
    
    logStep("Successfully parsed items", { count: parsedItems.length, agency: feedConfig.agency });
    return parsedItems;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error fetching RSS feed", { 
      agency: feedConfig.agency, 
      error: errorMessage,
      url: feedConfig.url
    });
    
    // Log specific error types for debugging
    if (errorMessage.includes('timeout')) {
      logStep("Timeout error - feed may be slow", { agency: feedConfig.agency });
    } else if (errorMessage.includes('CORS')) {
      logStep("CORS error - proxy may be down", { agency: feedConfig.agency });
    } else if (errorMessage.includes('404')) {
      logStep("Feed URL not found - URL may have changed", { agency: feedConfig.agency });
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

    // Check for cached results (30 minute cache)
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

    // Fetch all RSS feeds in parallel
    logStep("Fetching fresh RSS data from all sources");
    const feedPromises = RSS_FEEDS.map(feed => fetchRSSFeed(feed));
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
          error: result.reason 
        });
      }
    });

    // Sort by publication date (newest first)
    allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    logStep("RSS feeds aggregation complete", { 
      totalItems: allItems.length,
      successfulFeeds: successCount,
      failedFeeds: errorCount
    });

    // Cache the results for 30 minutes
    await supabaseClient
      .from("search_cache")
      .upsert({
        cache_key: "rss_feeds_all",
        query: "rss_feeds",
        result_data: allItems,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      });

    // Log successful fetch
    await supabaseClient
      .from("rss_feed_logs")
      .insert({
        feed_id: "all_feeds",
        fetch_status: "success",
        items_fetched: allItems.length,
        fetch_duration: Date.now(),
        error_message: errorCount > 0 ? `${errorCount} feeds failed` : null
      });

    return new Response(JSON.stringify({
      items: allItems,
      cached: false,
      fetched_at: new Date().toISOString(),
      stats: {
        total_items: allItems.length,
        successful_feeds: successCount,
        failed_feeds: errorCount
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("CRITICAL ERROR in RSS fetch", { message: errorMessage });
    
    // Log failed fetch
    await supabaseClient
      .from("rss_feed_logs")
      .insert({
        feed_id: "all_feeds",
        fetch_status: "error",
        error_message: errorMessage,
        items_fetched: 0
      });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      items: [] // Return empty array instead of failing completely
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});