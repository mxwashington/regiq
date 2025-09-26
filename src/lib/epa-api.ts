// EPA API Client
// Integrates with EPA's ECHO and enforcement APIs for environmental alerts

import { z } from 'zod';
import { mapEPA, type NormalizedAlert } from './alerts-schema';

// EPA Enforcement Action Schema
const EPAEnforcementSchema = z.object({
  case_number: z.string(),
  defendant_entity: z.string(),
  facility_name: z.string().optional(),
  case_name: z.string().optional(),
  settlement_date: z.string().optional(),
  date_achieved: z.string().optional(),
  action_date: z.string().optional(),
  date_updated: z.string().optional(),
  case_summary: z.string().optional(),
  violations: z.string().optional(),
  penalty_amount: z.number().optional(),
  action_type: z.string().optional(),
  state: z.string().optional(),
  region: z.string().optional(),
  facility_city: z.string().optional(),
  environmental_media: z.array(z.string()).default([]),
  programs: z.array(z.string()).default([]),
  enforcement_conclusion: z.string().optional(),
  link: z.string().optional(),
  significance: z.string().optional(),
});

// EPA ECHO Facility Schema
const EPAFacilitySchema = z.object({
  registry_id: z.string(),
  facility_name: z.string(),
  facility_street: z.string().optional(),
  facility_city: z.string().optional(),
  facility_state: z.string().optional(),
  facility_zip: z.string().optional(),
  naics_codes: z.array(z.string()).default([]),
  sic_codes: z.array(z.string()).default([]),
  enforcement_actions: z.array(z.string()).default([]),
  inspections: z.array(z.any()).default([]),
  violations: z.array(z.any()).default([]),
  last_inspection: z.string().optional(),
  compliance_status: z.string().optional(),
});

// RSS Item Schema for EPA feeds
const EPARSSItemSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  link: z.string().optional(),
  pubDate: z.string(),
  guid: z.string(),
  category: z.string().optional(),
});

export type EPAEnforcement = z.infer<typeof EPAEnforcementSchema>;
export type EPAFacility = z.infer<typeof EPAFacilitySchema>;
export type EPARSSItem = z.infer<typeof EPARSSItemSchema>;

interface EPAClientOptions {
  apiKey?: string;
  maxRetries?: number;
  retryDelay?: number;
  cacheExpiry?: number;
}

export class EPAApiClient {
  private requestsCache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry: number;
  private maxRetries: number;
  private retryDelay: number;
  private apiKey?: string;

  // EPA ECHO API base URLs
  private readonly echoBaseUrl = 'https://echodata.epa.gov/echo/rest_services.get_download';
  private readonly enforcementBaseUrl = 'https://echo.epa.gov/tools/data-downloads/enforcement-case-results';

  constructor(options: EPAClientOptions = {}) {
    this.cacheExpiry = options.cacheExpiry || 60 * 60 * 1000; // 1 hour default
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
            'User-Agent': 'RegIQ-EPA-Client/1.0',
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

        throw new Error(`EPA API error: ${response.status} ${response.statusText}`);
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

  // Get recent enforcement actions from EPA RSS feeds
  async getRecentEnforcement(days: number = 30): Promise<EPAEnforcement[]> {
    const cacheKey = `enforcement_${days}`;
    const cached = this.getCachedData<EPAEnforcement[]>(cacheKey);
    if (cached) return cached;

    try {
      // EPA enforcement data comes from multiple RSS feeds and data sources
      const rssFeeds = [
        'https://www.epa.gov/newsreleases/rss.xml', // EPA news releases
        'https://www.epa.gov/enforcement/rss.xml',  // Enforcement news (if available)
      ];

      const allEnforcement: EPAEnforcement[] = [];

      for (const feedUrl of rssFeeds) {
        try {
          const response = await this.fetchWithRetry(feedUrl);
          const rssText = await response.text();
          const enforcement = await this.parseEnforcementRSS(rssText, days);
          allEnforcement.push(...enforcement);
        } catch (error) {
          console.error(`Failed to fetch EPA RSS feed ${feedUrl}:`, error);
        }
      }

      // Also try to get data from the EPA ECHO API if available
      try {
        const echoData = await this.getECHOEnforcementData(days);
        allEnforcement.push(...echoData);
      } catch (error) {
        console.error('Failed to fetch ECHO enforcement data:', error);
      }

      this.setCachedData(cacheKey, allEnforcement);
      return allEnforcement;
    } catch (error) {
      console.error('Failed to fetch EPA enforcement actions:', error);
      return [];
    }
  }

  private async getECHOEnforcementData(days: number): Promise<EPAEnforcement[]> {
    try {
      // EPA ECHO API for enforcement data
      // Note: This endpoint may require special access or formatting
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      // Using a simplified approach with public enforcement data
      // In production, you might need to integrate with EPA's official APIs
      const mockEnforcementData: EPAEnforcement[] = [];

      // For now, return empty array as ECHO API requires special access
      // In production, implement actual ECHO API integration
      return mockEnforcementData;
    } catch (error) {
      console.error('Failed to fetch ECHO data:', error);
      return [];
    }
  }

  private async parseEnforcementRSS(rssText: string, days: number): Promise<EPAEnforcement[]> {
    try {
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      const enforcement: EPAEnforcement[] = [];

      // Extract items using regex (basic XML parsing)
      const itemMatches = rssText.match(/<item[^>]*>[\s\S]*?<\/item>/gi);
      if (!itemMatches) return [];

      for (const itemXml of itemMatches) {
        const title = this.extractXMLTag(itemXml, 'title');
        const description = this.extractXMLTag(itemXml, 'description');
        const link = this.extractXMLTag(itemXml, 'link');
        const pubDate = this.extractXMLTag(itemXml, 'pubDate');
        const guid = this.extractXMLTag(itemXml, 'guid') || `epa_enforcement_${Date.now()}_${Math.random()}`;

        if (!title || !pubDate) continue;

        const itemDate = new Date(pubDate);
        if (itemDate < cutoffDate) continue;

        // Filter for enforcement-related content
        const titleLower = title.toLowerCase();
        const descLower = (description || '').toLowerCase();

        const isEnforcement = titleLower.includes('enforcement') ||
                             titleLower.includes('penalty') ||
                             titleLower.includes('settlement') ||
                             titleLower.includes('violation') ||
                             titleLower.includes('consent decree') ||
                             descLower.includes('enforcement') ||
                             descLower.includes('penalty') ||
                             descLower.includes('violation');

        if (!isEnforcement) continue;

        // Extract location information from title/description
        const state = this.extractStateFromText(title + ' ' + (description || ''));

        // Determine action type and significance
        const actionType = this.determineActionType(title, description);
        const significance = this.determineSignificance(title, description);

        const enforcementAction: EPAEnforcement = {
          case_number: guid,
          defendant_entity: this.extractDefendantFromTitle(title),
          facility_name: this.extractFacilityFromTitle(title),
          case_name: title,
          action_date: itemDate.toISOString(),
          date_achieved: itemDate.toISOString(),
          case_summary: description ? this.cleanText(description) : undefined,
          violations: this.extractViolationsFromText(description || ''),
          action_type: actionType,
          state: state,
          region: this.stateToRegion(state),
          environmental_media: this.extractMediaFromText(title + ' ' + (description || '')),
          link: link || undefined,
          significance: significance,
          penalty_amount: this.extractPenaltyAmount(description || ''),
        };

        enforcement.push(enforcementAction);
      }

      return enforcement;
    } catch (error) {
      console.error('Failed to parse EPA enforcement RSS:', error);
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

  private extractStateFromText(text: string): string | undefined {
    // Look for state names or abbreviations
    const statePattern = /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i;
    const match = text.match(statePattern);
    return match ? match[1] : undefined;
  }

  private extractDefendantFromTitle(title: string): string {
    // Try to extract company/entity name from enforcement title
    // Look for patterns like "EPA settles with [Company Name]"
    const patterns = [
      /EPA (?:settles with|fines|penalizes) ([^,;]+)/i,
      /([^,;]+) (?:settles with EPA|agrees to pay|to pay penalty)/i,
      /^([^:]+):/, // Everything before first colon
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return title.split(' ').slice(0, 5).join(' '); // Fallback: first 5 words
  }

  private extractFacilityFromTitle(title: string): string | undefined {
    // Look for facility-related keywords
    const facilityPattern = /(facility|plant|factory|refinery|site) ([^,;]+)/i;
    const match = title.match(facilityPattern);
    return match ? match[2].trim() : undefined;
  }

  private determineActionType(title: string, description?: string): string {
    const text = (title + ' ' + (description || '')).toLowerCase();

    if (text.includes('settlement') || text.includes('settles')) return 'settlement';
    if (text.includes('penalty') || text.includes('fine')) return 'penalty';
    if (text.includes('consent decree')) return 'consent_decree';
    if (text.includes('enforcement')) return 'enforcement_action';
    if (text.includes('violation')) return 'violation_notice';
    if (text.includes('warning')) return 'warning';

    return 'enforcement_action';
  }

  private determineSignificance(title: string, description?: string): string {
    const text = (title + ' ' + (description || '')).toLowerCase();

    if (text.includes('million') || text.includes('significant') || text.includes('major')) return 'significant';
    if (text.includes('criminal') || text.includes('felony')) return 'significant';
    if (text.includes('notice') || text.includes('warning')) return 'routine';

    return 'moderate';
  }

  private extractViolationsFromText(text: string): string | undefined {
    // Look for violation-related keywords and extract context
    const violationPatterns = [
      /violations? of ([^.;]+)/i,
      /violated ([^.;]+)/i,
      /failure to ([^.;]+)/i,
    ];

    for (const pattern of violationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractPenaltyAmount(text: string): number | undefined {
    // Extract monetary amounts
    const penaltyPattern = /\$([0-9,]+(?:\.[0-9]{2})?)(?: million| thousand)?/i;
    const match = text.match(penaltyPattern);

    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      if (text.toLowerCase().includes('million')) amount *= 1000000;
      if (text.toLowerCase().includes('thousand')) amount *= 1000;
      return amount;
    }

    return undefined;
  }

  private extractMediaFromText(text: string): string[] {
    const media: string[] = [];
    const textLower = text.toLowerCase();

    if (textLower.includes('air') || textLower.includes('emission')) media.push('Air');
    if (textLower.includes('water') || textLower.includes('discharge')) media.push('Water');
    if (textLower.includes('waste') || textLower.includes('hazardous')) media.push('Waste');
    if (textLower.includes('chemical') || textLower.includes('toxic')) media.push('Chemical');
    if (textLower.includes('soil') || textLower.includes('groundwater')) media.push('Land');

    return [...new Set(media)]; // Remove duplicates
  }

  private stateToRegion(state?: string): string | undefined {
    if (!state) return undefined;

    const regions: { [key: string]: string } = {
      'CT': 'Region 1', 'ME': 'Region 1', 'MA': 'Region 1', 'NH': 'Region 1', 'RI': 'Region 1', 'VT': 'Region 1',
      'NJ': 'Region 2', 'NY': 'Region 2', 'PR': 'Region 2', 'VI': 'Region 2',
      'DE': 'Region 3', 'DC': 'Region 3', 'MD': 'Region 3', 'PA': 'Region 3', 'VA': 'Region 3', 'WV': 'Region 3',
      'AL': 'Region 4', 'FL': 'Region 4', 'GA': 'Region 4', 'KY': 'Region 4', 'MS': 'Region 4', 'NC': 'Region 4', 'SC': 'Region 4', 'TN': 'Region 4',
      'IL': 'Region 5', 'IN': 'Region 5', 'MI': 'Region 5', 'MN': 'Region 5', 'OH': 'Region 5', 'WI': 'Region 5',
      'AR': 'Region 6', 'LA': 'Region 6', 'NM': 'Region 6', 'OK': 'Region 6', 'TX': 'Region 6',
      'IA': 'Region 7', 'KS': 'Region 7', 'MO': 'Region 7', 'NE': 'Region 7',
      'CO': 'Region 8', 'MT': 'Region 8', 'ND': 'Region 8', 'SD': 'Region 8', 'UT': 'Region 8', 'WY': 'Region 8',
      'AZ': 'Region 9', 'CA': 'Region 9', 'HI': 'Region 9', 'NV': 'Region 9', 'AS': 'Region 9', 'GU': 'Region 9',
      'AK': 'Region 10', 'ID': 'Region 10', 'OR': 'Region 10', 'WA': 'Region 10',
    };

    return regions[state.toUpperCase()];
  }

  // Search EPA data
  async search(query: string, limit: number = 25): Promise<EPAEnforcement[]> {
    const cacheKey = `search_${query}_${limit}`;
    const cached = this.getCachedData<EPAEnforcement[]>(cacheKey);
    if (cached) return cached;

    try {
      const enforcement = await this.getRecentEnforcement(90); // Search last 90 days

      const queryLower = query.toLowerCase();
      const results = enforcement.filter(action =>
        action.defendant_entity.toLowerCase().includes(queryLower) ||
        action.case_name?.toLowerCase().includes(queryLower) ||
        action.case_summary?.toLowerCase().includes(queryLower) ||
        action.violations?.toLowerCase().includes(queryLower) ||
        action.environmental_media.some(media => media.toLowerCase().includes(queryLower))
      );

      // Sort by date (newest first) and limit
      const sortedResults = results
        .sort((a, b) => {
          const dateA = new Date(a.action_date || a.date_achieved || '');
          const dateB = new Date(b.action_date || b.date_achieved || '');
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, limit);

      this.setCachedData(cacheKey, sortedResults);
      return sortedResults;
    } catch (error) {
      console.error('Failed to search EPA data:', error);
      return [];
    }
  }

  // Convert to normalized format
  async getRecentNormalized(days: number = 30): Promise<NormalizedAlert[]> {
    const enforcement = await this.getRecentEnforcement(days);
    const normalized: NormalizedAlert[] = [];

    for (const action of enforcement) {
      try {
        const mapped = mapEPA({
          ...action,
          id: action.case_number,
          title: action.case_name || action.defendant_entity,
          summary: action.case_summary,
          date_published: action.action_date || action.date_achieved,
          date_updated: action.date_updated,
          url: action.link,
          media: action.environmental_media,
        });
        normalized.push(mapped);
      } catch (error) {
        console.error('Failed to map EPA enforcement action:', error);
      }
    }

    return normalized;
  }

  clearCache(): void {
    this.requestsCache.clear();
  }
}

// Export singleton instance
export const epaApi = new EPAApiClient();