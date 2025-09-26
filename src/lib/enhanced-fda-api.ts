// Enhanced FDA/FSIS API Client with Mappers and Robust Error Handling
// Updated with exponential backoff, Zod validation, and NormalizedAlert mappers

import { z } from 'zod';
import { mapFDA, mapFSIS, type NormalizedAlert, validateAlert } from './alerts-schema';

// Enhanced FDA Enforcement Result Schema with Zod validation
const FDAEnforcementResultSchema = z.object({
  recall_number: z.string(),
  status: z.string(),
  classification: z.enum(['Class I', 'Class II', 'Class III']).optional(),
  product_description: z.string(),
  company_name: z.string(),
  brand_name: z.string().optional(),
  product_quantity: z.string().optional(),
  reason_for_recall: z.string(),
  recall_initiation_date: z.string(),
  state: z.string().optional(),
  initial_firm_notification: z.string().optional(),
  distribution_pattern: z.string().optional(),
  voluntary_mandated: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  event_id: z.string().optional(),
  product_type: z.string().optional(),
  termination_date: z.string().optional(),
  recall_announcement_date: z.string().optional(),
  code_info: z.string().optional(),
  more_code_info: z.string().optional(),
});

// FSIS Recall Result Schema
const FSISRecallResultSchema = z.object({
  recallNumber: z.string(),
  productName: z.string(),
  companyName: z.string(),
  recallDate: z.string(),
  recallClass: z.string().optional(),
  summary: z.string().optional(),
  distributionPattern: z.string().optional(),
  productQuantity: z.string().optional(),
  reasonForRecall: z.string().optional(),
});

// FDA Response Schema
const FDAResponseSchema = z.object({
  meta: z.object({
    disclaimer: z.string(),
    terms: z.string(),
    license: z.string(),
    last_updated: z.string(),
    results: z.object({
      skip: z.number(),
      limit: z.number(),
      total: z.number(),
    }),
  }),
  results: z.array(FDAEnforcementResultSchema),
});

export type EnhancedFDAEnforcementResult = z.infer<typeof FDAEnforcementResultSchema>;
export type EnhancedFSISRecallResult = z.infer<typeof FSISRecallResultSchema>;
export type EnhancedFDAResponse = z.infer<typeof FDAResponseSchema>;

interface FetchOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class EnhancedFDAApiClient {
  private baseUrl = 'https://api.fda.gov';
  private requestsCache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour cache
  private apiKey?: string;
  private defaultOptions: Required<FetchOptions> = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 20000,
  };

  constructor(apiKey?: string, options: FetchOptions = {}) {
    this.apiKey = apiKey;
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    fetchOptions: FetchOptions = {}
  ): Promise<Response> {
    const { maxRetries, retryDelay, timeout } = { ...this.defaultOptions, ...fetchOptions };
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': 'RegIQ-FDA-Client/2.0',
            'Accept': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return response;
        }

        // Handle specific error codes
        if (response.status === 404) {
          throw new Error('No data found for this search');
        }
        if (response.status === 429) {
          // Rate limited - wait longer before retry
          const waitTime = retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
          if (attempt < maxRetries) {
            await this.delay(waitTime);
            continue;
          }
          throw new Error('FDA API rate limit exceeded. Please try again later.');
        }
        if (response.status >= 500 && attempt < maxRetries) {
          // Server error - retry with exponential backoff
          await this.delay(retryDelay * Math.pow(2, attempt - 1));
          continue;
        }

        throw new Error(`FDA API error: ${response.status} ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxRetries && this.isRetryableError(lastError)) {
          await this.delay(retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000);
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
           error.message.includes('aborted') ||
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

  private buildSearchQuery(filters: {
    productDescription?: string;
    companyName?: string;
    classification?: 'Class I' | 'Class II' | 'Class III';
    state?: string;
    dateRange?: { start: string; end: string };
    voluntaryMandated?: 'Voluntary' | 'FDA Mandated';
  }): string {
    const queryParts: string[] = [];

    if (filters.productDescription) {
      queryParts.push(`product_description:"${filters.productDescription}"`);
    }
    if (filters.companyName) {
      queryParts.push(`company_name:"${filters.companyName}"`);
    }
    if (filters.classification) {
      queryParts.push(`classification:"${filters.classification}"`);
    }
    if (filters.state) {
      queryParts.push(`state:"${filters.state}"`);
    }
    if (filters.dateRange) {
      queryParts.push(`recall_initiation_date:[${filters.dateRange.start}+TO+${filters.dateRange.end}]`);
    }
    if (filters.voluntaryMandated) {
      queryParts.push(`voluntary_mandated:"${filters.voluntaryMandated}"`);
    }

    return queryParts.join('+AND+');
  }

  // Enhanced enforcement search with validation
  async searchFoodEnforcement(
    params: { search?: string; limit?: number; skip?: number; sort?: string } = {}
  ): Promise<{ data: EnhancedFDAEnforcementResult[]; meta: any }> {
    const cacheKey = `food_enforcement_${JSON.stringify(params)}`;
    const cached = this.getCachedData<{ data: EnhancedFDAEnforcementResult[]; meta: any }>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/food/enforcement.json`);

    // Add API key if available
    if (this.apiKey) {
      url.searchParams.append('api_key', this.apiKey);
    }

    // Add parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    // Set default limit
    if (!params.limit) {
      url.searchParams.append('limit', '100');
    }

    const response = await this.fetchWithRetry(url.toString());
    const rawData = await response.json();

    // Validate response structure
    const validatedResponse = FDAResponseSchema.parse(rawData);

    // Validate individual results
    const validatedResults = validatedResponse.results.map(item => {
      try {
        return FDAEnforcementResultSchema.parse(item);
      } catch (error) {
        console.warn('Invalid FDA enforcement result:', error, item);
        return null;
      }
    }).filter(Boolean) as EnhancedFDAEnforcementResult[];

    const result = { data: validatedResults, meta: validatedResponse.meta };
    this.setCachedData(cacheKey, result);
    return result;
  }

  async searchDrugEnforcement(
    params: { search?: string; limit?: number; skip?: number; sort?: string } = {}
  ): Promise<{ data: EnhancedFDAEnforcementResult[]; meta: any }> {
    const cacheKey = `drug_enforcement_${JSON.stringify(params)}`;
    const cached = this.getCachedData<{ data: EnhancedFDAEnforcementResult[]; meta: any }>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/drug/enforcement.json`);

    if (this.apiKey) {
      url.searchParams.append('api_key', this.apiKey);
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    if (!params.limit) {
      url.searchParams.append('limit', '100');
    }

    const response = await this.fetchWithRetry(url.toString());
    const rawData = await response.json();
    const validatedResponse = FDAResponseSchema.parse(rawData);

    const validatedResults = validatedResponse.results.map(item => {
      try {
        return FDAEnforcementResultSchema.parse(item);
      } catch (error) {
        console.warn('Invalid FDA drug enforcement result:', error, item);
        return null;
      }
    }).filter(Boolean) as EnhancedFDAEnforcementResult[];

    const result = { data: validatedResults, meta: validatedResponse.meta };
    this.setCachedData(cacheKey, result);
    return result;
  }

  async searchDeviceEnforcement(
    params: { search?: string; limit?: number; skip?: number; sort?: string } = {}
  ): Promise<{ data: EnhancedFDAEnforcementResult[]; meta: any }> {
    const cacheKey = `device_enforcement_${JSON.stringify(params)}`;
    const cached = this.getCachedData<{ data: EnhancedFDAEnforcementResult[]; meta: any }>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${this.baseUrl}/device/enforcement.json`);

    if (this.apiKey) {
      url.searchParams.append('api_key', this.apiKey);
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    if (!params.limit) {
      url.searchParams.append('limit', '100');
    }

    const response = await this.fetchWithRetry(url.toString());
    const rawData = await response.json();
    const validatedResponse = FDAResponseSchema.parse(rawData);

    const validatedResults = validatedResponse.results.map(item => {
      try {
        return FDAEnforcementResultSchema.parse(item);
      } catch (error) {
        console.warn('Invalid FDA device enforcement result:', error, item);
        return null;
      }
    }).filter(Boolean) as EnhancedFDAEnforcementResult[];

    const result = { data: validatedResults, meta: validatedResponse.meta };
    this.setCachedData(cacheKey, result);
    return result;
  }

  // Get recent recalls with date filtering
  async getRecentRecalls(days: number = 30): Promise<EnhancedFDAEnforcementResult[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const dateString = date.toISOString().split('T')[0];

    const searchQuery = `recall_initiation_date:[${dateString}+TO+*]`;
    const params = {
      search: searchQuery,
      limit: 100,
      sort: 'recall_initiation_date:desc'
    };

    const [food, drug, device] = await Promise.allSettled([
      this.searchFoodEnforcement(params),
      this.searchDrugEnforcement(params),
      this.searchDeviceEnforcement(params)
    ]);

    const allResults: EnhancedFDAEnforcementResult[] = [];

    if (food.status === 'fulfilled') {
      allResults.push(...food.value.data);
    }
    if (drug.status === 'fulfilled') {
      allResults.push(...drug.value.data);
    }
    if (device.status === 'fulfilled') {
      allResults.push(...device.value.data);
    }

    return allResults;
  }

  // Convert FDA results to normalized alerts
  async getRecentNormalized(days: number = 30): Promise<NormalizedAlert[]> {
    const fdaResults = await this.getRecentRecalls(days);
    const normalized: NormalizedAlert[] = [];

    for (const result of fdaResults) {
      try {
        const mapped = mapFDA(result);
        const validated = validateAlert(mapped);
        normalized.push(validated);
      } catch (error) {
        console.error('Failed to map/validate FDA result:', error, result);
      }
    }

    return normalized;
  }

  clearCache(): void {
    this.requestsCache.clear();
  }
}

// Enhanced FSIS API Client
export class EnhancedFSISApiClient {
  private baseUrl = 'https://www.fsis.usda.gov/node';
  private requestsCache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour cache
  private defaultOptions: Required<FetchOptions> = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 20000,
  };

  constructor(options: FetchOptions = {}) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    fetchOptions: FetchOptions = {}
  ): Promise<Response> {
    const { maxRetries, retryDelay, timeout } = { ...this.defaultOptions, ...fetchOptions };
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': 'RegIQ-FSIS-Client/2.0',
            'Accept': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return response;
        }

        if (response.status === 404) {
          throw new Error('No FSIS recall data found');
        }
        if (response.status === 429) {
          const waitTime = retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
          if (attempt < maxRetries) {
            await this.delay(waitTime);
            continue;
          }
          throw new Error('FSIS API rate limit exceeded. Please try again later.');
        }
        if (response.status >= 500 && attempt < maxRetries) {
          await this.delay(retryDelay * Math.pow(2, attempt - 1));
          continue;
        }

        throw new Error(`FSIS API error: ${response.status} ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxRetries && this.isRetryableError(lastError)) {
          await this.delay(retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000);
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
           error.message.includes('aborted') ||
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

  async searchFSISRecalls(params: Record<string, string> = {}): Promise<EnhancedFSISRecallResult[]> {
    const cacheKey = `fsis_recalls_${JSON.stringify(params)}`;
    const cached = this.getCachedData<EnhancedFSISRecallResult[]>(cacheKey);
    if (cached) return cached;

    // Updated FSIS endpoint - they use a different API structure
    const url = new URL(`${this.baseUrl}.json`);

    // Add parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    const response = await this.fetchWithRetry(url.toString());
    const rawData = await response.json();

    // FSIS API returns an array of recall objects
    const recalls = Array.isArray(rawData) ? rawData : [];

    const validatedResults = recalls.map(item => {
      try {
        // Transform FSIS API response to our expected format
        const transformed = {
          recallNumber: item.recall_number || item.id || '',
          productName: item.product_name || item.title || '',
          companyName: item.company_name || item.firm_name || '',
          recallDate: item.recall_date || item.date_announced || new Date().toISOString(),
          recallClass: item.recall_class || item.classification || '',
          summary: item.summary || item.reason || '',
          distributionPattern: item.distribution_pattern || '',
          productQuantity: item.product_quantity || '',
          reasonForRecall: item.reason_for_recall || item.reason || '',
        };

        return FSISRecallResultSchema.parse(transformed);
      } catch (error) {
        console.warn('Invalid FSIS recall result:', error, item);
        return null;
      }
    }).filter(Boolean) as EnhancedFSISRecallResult[];

    this.setCachedData(cacheKey, validatedResults);
    return validatedResults;
  }

  async getRecentFSISRecalls(days: number = 30): Promise<EnhancedFSISRecallResult[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const dateString = date.toISOString().split('T')[0];

    return this.searchFSISRecalls({
      fromDate: dateString,
      limit: '100'
    });
  }

  // Convert FSIS results to normalized alerts
  async getRecentNormalized(days: number = 30): Promise<NormalizedAlert[]> {
    const fsisResults = await this.getRecentFSISRecalls(days);
    const normalized: NormalizedAlert[] = [];

    for (const result of fsisResults) {
      try {
        const mapped = mapFSIS(result);
        const validated = validateAlert(mapped);
        normalized.push(validated);
      } catch (error) {
        console.error('Failed to map/validate FSIS result:', error, result);
      }
    }

    return normalized;
  }

  clearCache(): void {
    this.requestsCache.clear();
  }
}

// Export singleton instances
export const enhancedFdaApi = new EnhancedFDAApiClient();
export const enhancedFsisApi = new EnhancedFSISApiClient();