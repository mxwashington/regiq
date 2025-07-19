export interface RSSFeedConfig {
  id: string;
  url: string;
  agency: string;
  category: string;
  title: string;
  urgencyDefault: number;
  color: string;
  icon: string;
}

export interface RSSFeedItem {
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

export const RSS_FEEDS: RSSFeedConfig[] = [
  // FDA Recalls - High Priority
  {
    id: "fda-recalls",
    url: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml",
    agency: "FDA",
    category: "Food Safety", 
    title: "FDA Recalls & Safety Alerts",
    urgencyDefault: 9,
    color: "#dc2626", // Red for recalls
    icon: "🚨"
  },
  
  // FDA Warning Letters - Medium-High Priority  
  {
    id: "fda-warnings",
    url: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/warning-letters/rss.xml",
    agency: "FDA", 
    category: "Enforcement",
    title: "FDA Warning Letters",
    urgencyDefault: 7,
    color: "#ea580c", // Orange for warnings
    icon: "⚠️"
  },
  
  // USDA FSIS Recalls - High Priority
  {
    id: "fsis-recalls", 
    url: "https://www.fsis.usda.gov/rss/fsis-recalls.xml",
    agency: "USDA FSIS",
    category: "Food Safety",
    title: "FSIS Meat & Poultry Recalls", 
    urgencyDefault: 9,
    color: "#dc2626", // Red for recalls
    icon: "🥩"
  },
  
  // Federal Register FDA Rules - Medium Priority
  {
    id: "federal-register-fda",
    url: "https://www.federalregister.gov/api/v1/articles.rss?conditions%5Bagencies%5D%5B%5D=food-and-drug-administration",
    agency: "Federal Register",
    category: "Rulemaking",
    title: "FDA Federal Register Entries",
    urgencyDefault: 6,
    color: "#2563eb", // Blue for rules
    icon: "📋"
  }
];

export async function fetchRSSFeed(feedConfig: RSSFeedConfig): Promise<RSSFeedItem[]> {
  try {
    // Use a CORS proxy for client-side RSS fetching
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedConfig.url)}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data.contents, "application/xml");
    
    const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 20); // Limit to 20 items
    
    return items.map((item, index) => ({
      id: `${feedConfig.id}-${index}`,
      title: item.querySelector("title")?.textContent || "No Title",
      description: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '') || "No Description",
      link: item.querySelector("link")?.textContent || "#",
      pubDate: new Date(item.querySelector("pubDate")?.textContent || Date.now()),
      agency: feedConfig.agency,
      category: feedConfig.category,
      urgencyScore: feedConfig.urgencyDefault,
      color: feedConfig.color,
      icon: feedConfig.icon,
      guid: item.querySelector("guid")?.textContent || `${feedConfig.id}-${index}-${Date.now()}`
    }));
    
  } catch (error) {
    console.error(`Failed to fetch RSS feed ${feedConfig.title}:`, error);
    return [];
  }
}

export async function fetchAllRSSFeeds(): Promise<RSSFeedItem[]> {
  const allItems: RSSFeedItem[] = [];
  
  for (const feed of RSS_FEEDS) {
    const items = await fetchRSSFeed(feed);
    allItems.push(...items);
  }
  
  // Sort by publication date (newest first)
  allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  
  return allItems;
}