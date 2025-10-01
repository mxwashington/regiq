/**
 * FDA API Error Handler
 *
 * Provides centralized error handling for all FDA API interactions with:
 * - Custom error classes for different failure modes
 * - Fail-fast error propagation (no silent failures)
 * - RSS fallback mechanism for specific error codes
 * - Zero-results detection
 * - Structured error context for debugging
 * - Integrated structured logging to database
 */

import { logStructuredError, logWarning, logInfo } from './structured-logging.ts';

// ============================================================================
// Custom Error Classes
// ============================================================================

export class FDAAPIError extends Error {
  constructor(
    message: string,
    public context: {
      statusCode: number;
      endpoint: string;
      responseBody?: string;
      timestamp: string;
    }
  ) {
    super(message);
    this.name = 'FDAAPIError';
  }
}

export class NoResultsError extends Error {
  constructor(
    message: string,
    public context: {
      endpoint: string;
      searchParams?: any;
      timestamp: string;
    }
  ) {
    super(message);
    this.name = 'NoResultsError';
  }
}

export class RSSParseError extends Error {
  constructor(
    message: string,
    public context: {
      feedUrl: string;
      parseError?: string;
      timestamp: string;
    }
  ) {
    super(message);
    this.name = 'RSSParseError';
  }
}

// ============================================================================
// Configuration Interface
// ============================================================================

export interface FDARequestConfig {
  endpoint: string;
  params?: Record<string, any>;
  api_key?: string;
  rss_fallback_enabled?: boolean;
  rss_fallback_url?: string;
  max_retries?: number;
  timeout_ms?: number;
}

// ============================================================================
// FDA API Request Handler
// ============================================================================

export async function fetchFDAData(config: FDARequestConfig): Promise<any[]> {
  const {
    endpoint,
    params = {},
    api_key,
    rss_fallback_enabled = false,
    rss_fallback_url,
    max_retries = 3,
    timeout_ms = 30000
  } = config;

  let lastError: Error | null = null;

  // Attempt API request with retries
  for (let attempt = 0; attempt < max_retries; attempt++) {
    try {
      // Build URL with parameters
      const url = new URL(endpoint);

      // Add API key if provided
      if (api_key) {
        url.searchParams.set('api_key', api_key);
      }

      // Add search parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });

      console.log(`[FDA Error Handler] Attempt ${attempt + 1}/${max_retries}: ${url.toString()}`);

      // Make request with timeout
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(timeout_ms),
        headers: {
          'User-Agent': 'RegIQ-FDA-Client/2.0',
          'Accept': 'application/json'
        }
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read response body');

        // Create structured error
        const error = new FDAAPIError(
          `FDA API ${response.status}: ${response.statusText}`,
          {
            statusCode: response.status,
            endpoint: endpoint,
            responseBody: errorBody.substring(0, 1000), // Limit size
            timestamp: new Date().toISOString()
          }
        );

        // Log error with structured logging
        await logStructuredError(error, {
          function_name: 'fetchFDAData',
          endpoint: endpoint,
          statusCode: response.status,
          attempt: attempt + 1,
          willRetry: attempt < max_retries - 1
        });

        // Check if we should attempt RSS fallback on final retry
        if (
          [400, 429, 500, 503, 504].includes(response.status) &&
          rss_fallback_enabled &&
          rss_fallback_url &&
          attempt === max_retries - 1
        ) {
          console.log(`[FDA Error Handler] API failed with ${response.status}, attempting RSS fallback`);
          await logWarning('fetchFDAData', `Attempting RSS fallback after ${max_retries} API failures`, {
            endpoint,
            statusCode: response.status,
            rss_fallback_url
          });
          return await attemptRSSFallback(rss_fallback_url);
        }

        // For 500/503/504 errors, retry with exponential backoff
        if ([500, 503, 504].includes(response.status) && attempt < max_retries - 1) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          console.log(`[FDA Error Handler] Server error ${response.status}, retrying in ${backoffMs}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          lastError = error;
          continue;
        }

        // For 429 (rate limit), retry with longer backoff
        if (response.status === 429 && attempt < max_retries - 1) {
          const backoffMs = Math.pow(2, attempt) * 5000; // Longer backoff for rate limits
          console.log(`[FDA Error Handler] Rate limited, retrying in ${backoffMs}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          lastError = error;
          continue;
        }

        // Otherwise, throw immediately
        throw error;
      }

      // Parse response
      const data = await response.json();

      // Check for results
      if (!data.results || !Array.isArray(data.results)) {
        throw new NoResultsError(
          'FDA API response missing results array',
          {
            endpoint: endpoint,
            searchParams: params,
            timestamp: new Date().toISOString()
          }
        );
      }

      // Check if results are empty
      if (data.results.length === 0) {
        const error = new NoResultsError(
          'FDA API returned 0 results',
          {
            endpoint: endpoint,
            searchParams: params,
            timestamp: new Date().toISOString()
          }
        );

        // Log zero results as critical (data freshness issue)
        await logStructuredError(error, {
          function_name: 'fetchFDAData',
          endpoint: endpoint,
          searchParams: params
        });

        throw error;
      }

      // Success - return results
      console.log(`[FDA Error Handler] Successfully fetched ${data.results.length} results from FDA API`);
      await logInfo('fetchFDAData', `Successfully fetched ${data.results.length} results`, {
        endpoint,
        results_count: data.results.length
      });
      return data.results;

    } catch (error) {
      // If it's already one of our custom errors, re-throw it
      if (
        error instanceof FDAAPIError ||
        error instanceof NoResultsError ||
        error instanceof RSSParseError
      ) {
        lastError = error;

        // Don't retry on NoResultsError
        if (error instanceof NoResultsError) {
          throw error;
        }

        // Only retry on FDAAPIError with retryable status codes
        if (error instanceof FDAAPIError) {
          const retryableStatuses = [429, 500, 503, 504];
          if (!retryableStatuses.includes(error.context.statusCode) || attempt === max_retries - 1) {
            throw error;
          }
        }

        continue;
      }

      // Handle network/timeout errors
      lastError = new FDAAPIError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        {
          statusCode: 0,
          endpoint: endpoint,
          timestamp: new Date().toISOString()
        }
      );

      // Retry on network errors
      if (attempt < max_retries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`[FDA Error Handler] Network error, retrying in ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      throw lastError;
    }
  }

  // If we exhausted all retries, throw the last error
  if (lastError) {
    throw lastError;
  }

  // This should never happen, but TypeScript needs it
  throw new FDAAPIError(
    'Unexpected error: all retries exhausted without error',
    {
      statusCode: 0,
      endpoint: endpoint,
      timestamp: new Date().toISOString()
    }
  );
}

// ============================================================================
// RSS Fallback Handler
// ============================================================================

async function attemptRSSFallback(rss_url: string): Promise<any[]> {
  try {
    console.log(`[FDA Error Handler] Attempting RSS fallback: ${rss_url}`);

    const response = await fetch(rss_url, {
      signal: AbortSignal.timeout(30000),
      headers: {
        'User-Agent': 'RegIQ-FDA-RSS-Client/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      throw new RSSParseError(
        `RSS feed fetch failed: ${response.status} ${response.statusText}`,
        {
          feedUrl: rss_url,
          timestamp: new Date().toISOString()
        }
      );
    }

    const xmlText = await response.text();
    const results = parseRSSFeed(xmlText);

    if (results.length === 0) {
      throw new NoResultsError(
        'RSS fallback returned 0 results',
        {
          endpoint: rss_url,
          timestamp: new Date().toISOString()
        }
      );
    }

    console.log(`[FDA Error Handler] RSS fallback successful: ${results.length} items`);
    return results;

  } catch (error) {
    if (error instanceof RSSParseError || error instanceof NoResultsError) {
      throw error;
    }

    throw new RSSParseError(
      `RSS fallback failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        feedUrl: rss_url,
        parseError: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }
    );
  }
}

// ============================================================================
// RSS Parser
// ============================================================================

function parseRSSFeed(xmlText: string): any[] {
  try {
    const results: any[] = [];

    // Simple regex-based RSS parsing (works for most FDA RSS feeds)
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const titleRegex = /<title>([\s\S]*?)<\/title>/i;
    const linkRegex = /<link>([\s\S]*?)<\/link>/i;
    const descRegex = /<description>([\s\S]*?)<\/description>/i;
    const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/i;

    let match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXML = match[1];

      const titleMatch = titleRegex.exec(itemXML);
      const linkMatch = linkRegex.exec(itemXML);
      const descMatch = descRegex.exec(itemXML);
      const pubDateMatch = pubDateRegex.exec(itemXML);

      if (titleMatch && linkMatch) {
        results.push({
          title: cleanXMLText(titleMatch[1]),
          link: cleanXMLText(linkMatch[1]),
          description: descMatch ? cleanXMLText(descMatch[1]) : '',
          pubDate: pubDateMatch ? cleanXMLText(pubDateMatch[1]) : new Date().toISOString(),
          source: 'RSS'
        });
      }
    }

    return results;
  } catch (error) {
    throw new RSSParseError(
      'Failed to parse RSS XML',
      {
        feedUrl: 'unknown',
        parseError: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }
    );
  }
}

// ============================================================================
// Utilities
// ============================================================================

function cleanXMLText(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Remove CDATA
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
