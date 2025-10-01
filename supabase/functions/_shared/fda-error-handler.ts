/**
 * FDA API Error Handler with Intelligent Fallback
 * Handles 429 (rate limits), 500 (server errors), 400 (bad requests), 503 (service unavailable)
 */

export interface FDAErrorHandlerConfig {
  endpoint: string;
  searchQuery?: string;
  apiKey?: string | null;
  maxRetries?: number;
  enableRSSFallback?: boolean;
}

export interface FDAResponse {
  success: boolean;
  data?: any;
  source: 'API' | 'RSS' | 'NONE';
  error?: string;
  statusCode?: number;
}

const logger = {
  info: (msg: string, data?: any) => console.info(`[FDA-HANDLER] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[FDA-HANDLER] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[FDA-HANDLER] ${msg}`, data || '')
};

/**
 * Main FDA API call with intelligent error handling
 */
export async function fetchFDAWithFallback(config: FDAErrorHandlerConfig): Promise<FDAResponse> {
  const { endpoint, searchQuery, apiKey, maxRetries = 3, enableRSSFallback = true } = config;
  
  // Attempt API call with retry logic
  const apiResult = await attemptFDAAPI(endpoint, searchQuery, apiKey, maxRetries);
  
  if (apiResult.success) {
    return apiResult;
  }
  
  // If API failed and RSS fallback is enabled, try RSS feeds
  if (enableRSSFallback && apiResult.statusCode === 500) {
    logger.warn('FDA API returned 500 error, attempting RSS fallback');
    return await attemptFDARSSFallback(endpoint);
  }
  
  return apiResult;
}

/**
 * Attempt FDA API call with intelligent retry logic
 */
async function attemptFDAAPI(
  endpoint: string,
  searchQuery: string | undefined,
  apiKey: string | null | undefined,
  maxRetries: number
): Promise<FDAResponse> {
  let lastError: Error | null = null;
  let lastStatusCode = 0;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = buildFDAURL(endpoint, searchQuery, apiKey);
      logger.info(`Attempt ${attempt}/${maxRetries}: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RegIQ/2.0'
        },
        signal: AbortSignal.timeout(30000)
      });
      
      lastStatusCode = response.status;
      
      // Handle different error types
      if (response.status === 429) {
        // Rate limit exceeded - use exponential backoff
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        logger.warn(`Rate limit hit (429), waiting ${delayMs}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      if (response.status === 400) {
        // Bad request - try simplifying query
        logger.warn('Bad request (400), simplifying query parameters');
        const simplifiedQuery = simplifyFDAQuery(searchQuery);
        if (simplifiedQuery !== searchQuery && attempt < maxRetries) {
          const simplifiedUrl = buildFDAURL(endpoint, simplifiedQuery, apiKey);
          const retryResponse = await fetch(simplifiedUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'RegIQ/2.0'
            },
            signal: AbortSignal.timeout(30000)
          });
          
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            return { success: true, data, source: 'API' };
          }
        }
        
        throw new Error(`FDA API bad request (400): Invalid query parameters`);
      }
      
      if (response.status === 500) {
        // Server error - don't retry, go straight to RSS fallback
        logger.error(`FDA API server error (500) on attempt ${attempt}`);
        throw new Error(`FDA API server error (500): Upstream issue at api.fda.gov`);
      }
      
      if (response.status === 503) {
        // Service unavailable - exponential backoff
        const delayMs = Math.pow(2, attempt) * 1000;
        logger.warn(`Service unavailable (503), waiting ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`FDA API error: ${response.status} ${response.statusText}`);
      }
      
      // Success!
      const data = await response.json();
      logger.info('FDA API call successful', { recordCount: data.results?.length || 0 });
      return { success: true, data, source: 'API' };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(`Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries && lastStatusCode !== 500) {
        const delayMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  return {
    success: false,
    source: 'NONE',
    error: lastError?.message || 'Unknown error',
    statusCode: lastStatusCode
  };
}

/**
 * Fallback to FDA RSS feeds when API fails
 */
async function attemptFDARSSFallback(endpoint: string): Promise<FDAResponse> {
  logger.info('Attempting FDA RSS fallback');
  
  // Map API endpoints to RSS feeds
  const rssFeedMap: Record<string, string> = {
    '/food/enforcement.json': 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food-updates/rss.xml',
    '/drug/enforcement.json': 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drug-updates/rss.xml',
    '/device/enforcement.json': 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medical-device-updates/rss.xml',
    '/drug/event.json': 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drug-updates/rss.xml'
  };
  
  const rssUrl = rssFeedMap[endpoint];
  
  if (!rssUrl) {
    logger.warn(`No RSS fallback available for endpoint: ${endpoint}`);
    return {
      success: false,
      source: 'NONE',
      error: 'No RSS fallback configured for this endpoint'
    };
  }
  
  try {
    const response = await fetch(rssUrl, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'RegIQ/2.0'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      throw new Error(`RSS feed error: ${response.status}`);
    }
    
    const xmlText = await response.text();
    const parsedData = parseRSSFeed(xmlText);
    
    logger.info('RSS fallback successful', { itemCount: parsedData.length });
    
    return {
      success: true,
      data: { results: parsedData },
      source: 'RSS'
    };
    
  } catch (error) {
    logger.error('RSS fallback failed:', error);
    return {
      success: false,
      source: 'NONE',
      error: `RSS fallback failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Build FDA API URL with proper parameters
 */
function buildFDAURL(endpoint: string, searchQuery: string | undefined, apiKey: string | null | undefined): string {
  const url = new URL(`https://api.fda.gov${endpoint}`);
  
  if (searchQuery) {
    url.searchParams.set('search', searchQuery);
  }
  
  url.searchParams.set('limit', '100');
  
  if (apiKey) {
    url.searchParams.set('api_key', apiKey);
  }
  
  return url.toString();
}

/**
 * Simplify FDA query to avoid 400 errors
 */
function simplifyFDAQuery(query: string | undefined): string {
  if (!query) return '';
  
  // Remove complex date ranges that might trigger 400s
  // Replace [YYYY-MM-DD+TO+YYYY-MM-DD] with just the date field
  const simplified = query
    .replace(/\[[\d-]+\+TO\+[\d-]+\]/g, '[20240101+TO+20251231]')
    .replace(/\+AND\+serious:1/g, '');
  
  return simplified;
}

/**
 * Parse RSS feed XML into FDA-like JSON structure
 */
function parseRSSFeed(xmlText: string): any[] {
  const results: any[] = [];
  
  try {
    // Basic XML parsing (simplified - in production use proper XML parser)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const matches = xmlText.matchAll(itemRegex);
    
    for (const match of matches) {
      const itemXml = match[1];
      
      const title = extractXMLTag(itemXml, 'title');
      const description = extractXMLTag(itemXml, 'description');
      const link = extractXMLTag(itemXml, 'link');
      const pubDate = extractXMLTag(itemXml, 'pubDate');
      
      if (title) {
        results.push({
          product_description: title,
          reason_for_recall: description || title,
          external_url: link,
          report_date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          recall_number: `RSS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          classification: 'Class II', // Default for RSS items
          status: 'Ongoing',
          recalling_firm: 'See details',
          source: 'FDA-RSS'
        });
      }
    }
  } catch (error) {
    logger.error('Error parsing RSS feed:', error);
  }
  
  return results;
}

/**
 * Extract content between XML tags
 */
function extractXMLTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Health check for FDA API endpoints
 */
export async function checkFDAAPIHealth(endpoint: string): Promise<boolean> {
  try {
    const url = `https://api.fda.gov${endpoint}?limit=1`;
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok;
  } catch {
    return false;
  }
}
