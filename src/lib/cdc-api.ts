// CDC API Client
// Integrates with CDC's public APIs for outbreaks, advisories, and health alerts

import { z } from 'zod';
import { mapCDC, type NormalizedAlert } from './alerts-schema';

// CDC Outbreak Response Schema
const CDCOutbreakSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  investigation_start_date: z.string(),
  investigation_status: z.string(),
  date_updated: z.string().optional(),
  states_affected: z.array(z.string()).default([]),
  food_vehicle: z.array(z.string()).default([]),
  pathogen: z.string().optional(),
  illnesses: z.number().optional(),
  hospitalizations: z.number().optional(),
  deaths: z.number().optional(),
  web_link: z.string().optional(),
  case_count: z.number().optional(),
  multistate: z.boolean().default(false),
});

// CDC Health Advisory Schema
const CDCAdvisorySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  pub_date: z.string(),
  date_updated: z.string().optional(),
  category: z.string().optional(),
  jurisdiction: z.string().optional(),
  link: z.string().optional(),
  content: z.string().optional(),
  urgency: z.enum(['routine', 'urgent', 'emergency']).optional(),
});

// RSS Feed Item Schema (fallback for some CDC data)
const RSSItemSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  link: z.string().optional(),
  pubDate: z.string(),
  guid: z.string(),
  category: z.string().optional(),
});

export type CDCOutbreak = z.infer<typeof CDCOutbreakSchema>;
export type CDCAdvisory = z.infer<typeof CDCAdvisorySchema>;
export type RSSItem = z.infer<typeof RSSItemSchema>;

interface CDCClientOptions {
  apiKey?: string;
  maxRetries?: number;
  retryDelay?: number;
  cacheExpiry?: number;
}

export class CDCApiClient {
  private requestsCache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry: number;
  private maxRetries: number;
  private retryDelay: number;
  private apiKey?: string;

  constructor(options: CDCClientOptions = {}) {
    this.cacheExpiry = options.cacheExpiry || 30 * 60 * 1000; // 30 minutes default
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.apiKey = options.apiKey;
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'User-Agent': 'RegIQ-CDC-Client/1.0',
            'Accept': 'application/json',
            ...options.headers,
          },
        });

        if (response.ok) {
          return response;
        }

        if (response.status >= 500 && attempt < this.maxRetries) {
          // Server error, retry with exponential backoff
          await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
          continue;
        }

        throw new Error(`CDC API error: ${response.status} ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < this.maxRetries && this.isRetryableError(lastError)) {
          await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: Error): boolean {
    return error.message.includes('ECONNRESET') ||
           error.message.includes('ETIMEDOUT') ||
           error.message.includes('500') ||
           error.message.includes('502') ||
           error.message.includes('503') ||
           error.message.includes('504');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCachedData<T>(cacheKey: string): T | null {
    const cached = this.requestsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(cacheKey: string, data: any): void {
    this.requestsCache.set(cacheKey, { data, timestamp: Date.now() });
  }

  // Primary method: Get recent outbreaks from CDC's API
  async getRecentOutbreaks(days: number = 30): Promise<CDCOutbreak[]> {
    const cacheKey = `outbreaks_${days}`;
    const cached = this.getCachedData<CDCOutbreak[]>(cacheKey);
    if (cached) return cached;

    try {
      // CDC's outbreak data is available through their data.cdc.gov platform
      // This endpoint provides structured JSON data for foodborne outbreaks
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const url = new URL('https://data.cdc.gov/resource/5uma-a6sb.json');
      url.searchParams.append('$where', `investigation_start_date >= '${startDate.toISOString().split('T')[0]}'`);
      url.searchParams.append('$limit', '100');
      url.searchParams.append('$order', 'investigation_start_date DESC');

      const response = await this.fetchWithRetry(url.toString());
      const rawData = await response.json();

      const outbreaks = rawData.map((item: any) => {
        const parsed = CDCOutbreakSchema.safeParse({
          id: item.id || item.outbreak_code || `cdc_outbreak_${Date.now()}_${Math.random()}`,
          title: item.title || item.pathogen || 'CDC Outbreak Investigation',
          summary: item.summary || item.description,
          investigation_start_date: item.investigation_start_date || new Date().toISOString(),
          investigation_status: item.investigation_status || 'active',
          date_updated: item.date_updated,
          states_affected: item.states_affected ? item.states_affected.split(', ') : [],
          food_vehicle: item.food_vehicle ? [item.food_vehicle] : [],
          pathogen: item.pathogen,
          illnesses: parseInt(item.illnesses) || 0,
          hospitalizations: parseInt(item.hospitalizations) || 0,
          deaths: parseInt(item.deaths) || 0,
          web_link: item.web_link,
          case_count: parseInt(item.case_count) || 0,
          multistate: item.multistate === 'Yes' || item.multistate === true,
        });

        return parsed.success ? parsed.data : null;
      }).filter(Boolean);

      this.setCachedData(cacheKey, outbreaks);
      return outbreaks;
    } catch (error) {
      console.error('Failed to fetch CDC outbreaks:', error);
      return [];
    }
  }

  // Get health advisories from CDC RSS feeds
  async getHealthAdvisories(days: number = 30): Promise<CDCAdvisory[]> {
    const cacheKey = `advisories_${days}`;
    const cached = this.getCachedData<CDCAdvisory[]>(cacheKey);
    if (cached) return cached;

    try {
      // CDC health advisories are available through RSS feeds
      // We'll parse the RSS and convert to our format
      const rssFeeds = [
        'https://tools.cdc.gov/api/v2/resources/media/132608.rss', // Health advisories
        'https://tools.cdc.gov/api/v2/resources/media/132609.rss', // Emergency preparedness
      ];

      const allAdvisories: CDCAdvisory[] = [];

      for (const feedUrl of rssFeeds) {
        try {
          const response = await this.fetchWithRetry(feedUrl);
          const rssText = await response.text();
          const advisories = await this.parseRSSFeed(rssText, days);
          allAdvisories.push(...advisories);
        } catch (error) {
          console.error(`Failed to fetch RSS feed ${feedUrl}:`, error);
        }
      }

      this.setCachedData(cacheKey, allAdvisories);
      return allAdvisories;
    } catch (error) {
      console.error('Failed to fetch CDC advisories:', error);
      return [];
    }
  }

  private async parseRSSFeed(rssText: string, days: number): Promise<CDCAdvisory[]> {
    try {
      // Simple RSS parser for CDC feeds
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      const advisories: CDCAdvisory[] = [];

      // Extract items using regex (basic XML parsing)
      const itemMatches = rssText.match(/<item[^>]*>[\s\S]*?<\/item>/gi);
      if (!itemMatches) return [];

      for (const itemXml of itemMatches) {
        const title = this.extractXMLTag(itemXml, 'title');
        const description = this.extractXMLTag(itemXml, 'description');
        const link = this.extractXMLTag(itemXml, 'link');
        const pubDate = this.extractXMLTag(itemXml, 'pubDate');
        const guid = this.extractXMLTag(itemXml, 'guid') || `cdc_advisory_${Date.now()}_${Math.random()}`;

        if (!title || !pubDate) continue;

        const itemDate = new Date(pubDate);
        if (itemDate < cutoffDate) continue;

        const advisory: CDCAdvisory = {
          id: guid,
          title: this.cleanText(title),
          summary: description ? this.cleanText(description) : undefined,
          pub_date: itemDate.toISOString(),
          category: 'advisory',
          jurisdiction: 'United States',
          link: link || undefined,
        };

        advisories.push(advisory);
      }

      return advisories;
    } catch (error) {
      console.error('Failed to parse RSS feed:', error);
      return [];
    }
  }

  private extractXMLTag(xml: string, tagName: string): string | null {
    const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    return match ? match[1].trim() : null;
  }

  private cleanText(text: string): string {
    return text
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-zA-Z0-9#]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Search CDC data
  async search(query: string, limit: number = 25): Promise<(CDCOutbreak | CDCAdvisory)[]> {
    const cacheKey = `search_${query}_${limit}`;
    const cached = this.getCachedData<(CDCOutbreak | CDCAdvisory)[]>(cacheKey);
    if (cached) return cached;

    try {
      const [outbreaks, advisories] = await Promise.all([
        this.getRecentOutbreaks(90), // Search last 90 days
        this.getHealthAdvisories(90),
      ]);

      const queryLower = query.toLowerCase();
      const results: (CDCOutbreak | CDCAdvisory)[] = [];

      // Search outbreaks
      const matchingOutbreaks = outbreaks.filter(outbreak =>
        outbreak.title.toLowerCase().includes(queryLower) ||
        outbreak.summary?.toLowerCase().includes(queryLower) ||
        outbreak.pathogen?.toLowerCase().includes(queryLower) ||
        outbreak.food_vehicle.some(food => food.toLowerCase().includes(queryLower))
      );

      // Search advisories
      const matchingAdvisories = advisories.filter(advisory =>
        advisory.title.toLowerCase().includes(queryLower) ||
        advisory.summary?.toLowerCase().includes(queryLower)
      );

      results.push(...matchingOutbreaks, ...matchingAdvisories);

      // Sort by date (newest first) and limit
      const sortedResults = results
        .sort((a, b) => {
          const dateA = new Date('investigation_start_date' in a ? a.investigation_start_date : a.pub_date);
          const dateB = new Date('investigation_start_date' in b ? b.investigation_start_date : b.pub_date);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, limit);

      this.setCachedData(cacheKey, sortedResults);
      return sortedResults;
    } catch (error) {
      console.error('Failed to search CDC data:', error);
      return [];
    }
  }

  // Convert to normalized format
  async getRecentNormalized(days: number = 30): Promise<NormalizedAlert[]> {
    const [outbreaks, advisories] = await Promise.all([
      this.getRecentOutbreaks(days),
      this.getHealthAdvisories(days),
    ]);

    const normalized: NormalizedAlert[] = [];

    // Map outbreaks
    for (const outbreak of outbreaks) {
      try {
        const mapped = mapCDC({
          ...outbreak,
          type: 'outbreak',
          status: outbreak.investigation_status,
          date_published: outbreak.investigation_start_date,
          locations: outbreak.states_affected,
          products: outbreak.food_vehicle,
        });
        normalized.push(mapped);
      } catch (error) {
        console.error('Failed to map CDC outbreak:', error);
      }
    }

    // Map advisories
    for (const advisory of advisories) {
      try {
        const mapped = mapCDC({
          ...advisory,
          type: 'advisory',
          status: 'active',
          date_published: advisory.pub_date,
          locations: advisory.jurisdiction ? [advisory.jurisdiction] : [],
          products: [],
        });
        normalized.push(mapped);
      } catch (error) {
        console.error('Failed to map CDC advisory:', error);
      }
    }

    return normalized;
  }

  clearCache(): void {
    this.requestsCache.clear();
  }
}

// Export singleton instance
export const cdcApi = new CDCApiClient();