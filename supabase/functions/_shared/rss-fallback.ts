/**
 * RSS Fallback Parser
 *
 * Provides robust RSS/Atom feed parsing as a fallback when FDA API fails.
 * Handles all FDA RSS feed categories with comprehensive error handling.
 *
 * Features:
 * - Supports both RSS 2.0 and Atom feed formats
 * - 15-second timeout per feed
 * - Date filtering (lookback window)
 * - Standardized alert output with fetched_via tag
 * - Graceful handling of malformed XML
 */

import { RSSParseError } from './fda-error-handler.ts';

// FDA RSS feed URLs by category
const FDA_RSS_FEEDS = {
  food: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food/rss.xml',
  drug: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drugs/rss.xml',
  device: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medical-devices/rss.xml',
  recalls: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml'
};

export interface RSSFallbackAlert {
  source: string;
  title: string;
  summary: string;
  published_date: string;
  external_url: string;
  urgency: 'Medium';
  fetched_via: 'rss_fallback';
  raw_category?: string;
}

/**
 * Attempts to fetch FDA alerts via RSS fallback when API fails
 *
 * @param category - FDA category ('food', 'drug', 'device', 'recalls')
 * @param lookbackDays - How many days to filter (default: 14)
 * @throws {RSSParseError} When RSS feed cannot be parsed
 * @returns Promise<RSSFallbackAlert[]>
 */
export async function attemptRSSFallback(
  category: 'food' | 'drug' | 'device' | 'recalls',
  lookbackDays: number = 14
): Promise<RSSFallbackAlert[]> {
  const feedUrl = FDA_RSS_FEEDS[category];

  if (!feedUrl) {
    throw new RSSParseError(
      `Invalid RSS category: ${category}`,
      {
        feedUrl: 'unknown',
        parseError: 'Category not found',
        timestamp: new Date().toISOString()
      }
    );
  }

  try {
    console.log(`[RSS Fallback] Attempting to fetch ${category} feed: ${feedUrl}`);

    const response = await fetch(feedUrl, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
        'User-Agent': 'RegIQ-RSS-Fallback/1.0'
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      throw new RSSParseError(
        `RSS feed HTTP ${response.status}: ${response.statusText}`,
        {
          feedUrl,
          parseError: response.statusText,
          timestamp: new Date().toISOString()
        }
      );
    }

    const xmlText = await response.text();

    // Parse XML using regex-based parser (works in Deno without external deps)
    const items = parseXMLItems(xmlText);

    if (items.length === 0) {
      throw new RSSParseError(
        'RSS feed returned 0 items',
        {
          feedUrl,
          parseError: 'Empty feed',
          timestamp: new Date().toISOString()
        }
      );
    }

    // Filter by date and transform to standard format
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

    const alerts: RSSFallbackAlert[] = items
      .map(item => parseRSSItem(item, category))
      .filter(alert => {
        try {
          return new Date(alert.published_date) > cutoffDate;
        } catch {
          // If date parsing fails, include the item
          return true;
        }
      });

    console.log(`[RSS Fallback] Successfully fetched ${alerts.length} alerts from ${category} feed`);

    return alerts;

  } catch (error) {
    console.error(`[RSS Fallback] Failed for ${category}:`, error);

    // If it's already an RSSParseError, re-throw it
    if (error instanceof RSSParseError) {
      throw error;
    }

    // Wrap other errors in RSSParseError
    throw new RSSParseError(
      `RSS fallback failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        feedUrl,
        parseError: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }
    );
  }
}

/**
 * Parses XML text and extracts items (handles both RSS and Atom)
 */
function parseXMLItems(xmlText: string): string[] {
  const items: string[] = [];

  // Try RSS 2.0 format first
  const rssItemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = rssItemRegex.exec(xmlText)) !== null) {
    items.push(match[0]);
  }

  // If no RSS items found, try Atom format
  if (items.length === 0) {
    const atomEntryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = atomEntryRegex.exec(xmlText)) !== null) {
      items.push(match[0]);
    }
  }

  return items;
}

/**
 * Parses individual RSS/Atom item into standardized alert format
 */
function parseRSSItem(itemXML: string, category: string): RSSFallbackAlert {
  // Extract title (works for both RSS and Atom)
  const titleMatch = itemXML.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? cleanXMLText(titleMatch[1]) : 'Untitled Alert';

  // Extract description/summary/content (try multiple tags)
  const descMatch =
    itemXML.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
    itemXML.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
    itemXML.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
  const summary = descMatch ? cleanXMLText(descMatch[1]) : '';

  // Extract publication date (try multiple tags)
  const dateMatch =
    itemXML.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
    itemXML.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
    itemXML.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) ||
    itemXML.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
  const pubDate = dateMatch ? cleanXMLText(dateMatch[1]) : new Date().toISOString();

  // Extract link (handle both RSS and Atom formats)
  let link = '';

  // Try RSS format: <link>URL</link>
  const linkTextMatch = itemXML.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (linkTextMatch) {
    link = cleanXMLText(linkTextMatch[1]);
  }

  // Try Atom format: <link href="URL" />
  if (!link) {
    const linkAttrMatch = itemXML.match(/<link[^>]*href=["']([^"']+)["']/i);
    if (linkAttrMatch) {
      link = linkAttrMatch[1];
    }
  }

  // Parse date to ISO format
  let isoDate: string;
  try {
    isoDate = new Date(pubDate).toISOString();
  } catch {
    isoDate = new Date().toISOString();
  }

  return {
    source: 'FDA_RSS',
    title: title.trim().substring(0, 200),
    summary: summary.trim().substring(0, 500),
    published_date: isoDate,
    external_url: link.trim() || `https://www.fda.gov`,
    urgency: 'Medium',
    fetched_via: 'rss_fallback',
    raw_category: category
  };
}

/**
 * Cleans XML text by removing CDATA, HTML tags, and decoding entities
 */
function cleanXMLText(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Remove CDATA
    .replace(/<[^>]+>/g, '') // Remove HTML/XML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

/**
 * Attempts RSS fallback for multiple categories in parallel
 *
 * Useful when multiple FDA API endpoints fail simultaneously
 */
export async function attemptMultiRSSFallback(
  categories: Array<'food' | 'drug' | 'device' | 'recalls'>,
  lookbackDays: number = 14
): Promise<Map<string, RSSFallbackAlert[]>> {
  const results = new Map<string, RSSFallbackAlert[]>();

  // Fetch all RSS feeds in parallel
  const promises = categories.map(async (category) => {
    try {
      const alerts = await attemptRSSFallback(category, lookbackDays);
      results.set(category, alerts);
    } catch (error) {
      console.error(`[RSS Fallback] Multi-fetch failed for ${category}:`, error);
      results.set(category, []);
    }
  });

  await Promise.all(promises);

  return results;
}
