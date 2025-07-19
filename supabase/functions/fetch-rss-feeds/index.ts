import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const RSS_FEEDS: RSSFeedConfig[] = [
  // FDA Recalls - High Priority
  {
    id: "fda-recalls",
    url: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml",
    agency: "FDA",
    category: "Food Safety", 
    title: "FDA Recalls & Safety Alerts",
    urgencyDefault: 9,
    color: "#dc2626",
    icon: "🚨"
  },
  
  // FDA Warning Letters
  {
    id: "fda-warnings",
    url: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/warning-letters/rss.xml",
    agency: "FDA", 
    category: "Enforcement",
    title: "FDA Warning Letters",
    urgencyDefault: 7,
    color: "#ea580c",
    icon: "⚠️"
  },
  
  // USDA FSIS Recalls
  {
    id: "usda-recalls",
    url: "https://www.fsis.usda.gov/recalls-alerts",
    agency: "USDA",
    category: "Food Safety",
    title: "USDA FSIS Recalls",
    urgencyDefault: 8,
    color: "#dc2626",
    icon: "🥩"
  },

  // Federal Register - Recent Rules
  {
    id: "federal-register",
    url: "https://www.federalregister.gov/api/v1/articles.rss?conditions%5Btype%5D%5B%5D=RULE&conditions%5Bpublication_date%5D%5Bgte%5D=" + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    agency: "Federal Register",
    category: "Regulations",
    title: "Recent Federal Rules",
    urgencyDefault: 6,
    color: "#2563eb",
    icon: "📋"
  }
];

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RSS-FETCH] ${step}${detailsStr}`);
};

async function fetchRSSFeed(feedConfig: RSSFeedConfig): Promise<RSSFeedItem[]> {
  try {
    logStep("Fetching RSS feed", { agency: feedConfig.agency, url: feedConfig.url });
    
    // Fetch RSS feed directly (server-side, no CORS issues)
    const response = await fetch(feedConfig.url, {
      headers: {
        'User-Agent': 'RegIQ-RSS-Fetcher/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });
    
    if (!response.ok) {
      logStep("RSS fetch failed", { status: response.status, statusText: response.statusText });
      return [];
    }
    
    const xmlText = await response.text();
    logStep("RSS content received", { length: xmlText.length });
    
    // Parse XML using DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      logStep("XML parsing error", { error: parseError.textContent });
      return [];
    }
    
    // Extract items from RSS feed
    const items = Array.from(xmlDoc.querySelectorAll("item, entry")).slice(0, 20);
    logStep("RSS items found", { count: items.length });
    
    return items.map((item, index) => {
      const title = item.querySelector("title")?.textContent || "No Title";
      const description = item.querySelector("description, summary")?.textContent?.replace(/<[^>]*>/g, '') || "No Description";
      const link = item.querySelector("link")?.textContent || item.querySelector("link")?.getAttribute("href") || "#";
      const pubDateText = item.querySelector("pubDate, published, updated")?.textContent || "";
      const pubDate = pubDateText ? new Date(pubDateText) : new Date();
      
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
    
  } catch (error) {
    logStep("Error fetching RSS feed", { 
      agency: feedConfig.agency, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return [];
  }
}

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
    logStep("Starting RSS feed fetch");

    // Check cache first (cache for 30 minutes)
    const cacheExpiry = new Date();
    cacheExpiry.setMinutes(cacheExpiry.getMinutes() - 30);

    const { data: cachedFeeds } = await supabaseClient
      .from("search_cache")
      .select("result_data, created_at")
      .eq("cache_key", "rss_feeds_all")
      .gte("created_at", cacheExpiry.toISOString())
      .single();

    if (cachedFeeds) {
      logStep("Returning cached RSS feeds");
      return new Response(JSON.stringify({
        items: cachedFeeds.result_data,
        cached: true,
        cached_at: cachedFeeds.created_at
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch all RSS feeds
    const allItems: RSSFeedItem[] = [];
    
    for (const feed of RSS_FEEDS) {
      const items = await fetchRSSFeed(feed);
      allItems.push(...items);
    }
    
    // Sort by publication date (newest first)
    allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    logStep("RSS feeds fetched successfully", { totalItems: allItems.length });

    // Cache the results
    await supabaseClient
      .from("search_cache")
      .upsert({
        cache_key: "rss_feeds_all",
        query: "rss_feeds",
        result_data: allItems,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      });

    // Log successful fetch
    await supabaseClient
      .from("rss_feed_logs")
      .insert({
        feed_id: "all_feeds",
        fetch_status: "success",
        items_fetched: allItems.length,
        fetch_duration: Date.now() // This is just a timestamp for now
      });

    return new Response(JSON.stringify({
      items: allItems,
      cached: false,
      fetched_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in RSS fetch", { message: errorMessage });
    
    // Log failed fetch
    await supabaseClient
      .from("rss_feed_logs")
      .insert({
        feed_id: "all_feeds",
        fetch_status: "error",
        error_message: errorMessage,
        items_fetched: 0
      });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});