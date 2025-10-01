/**
 * Regulatory Feeds Scraper
 *
 * Fetches data from multiple regulatory sources (FDA API and RSS feeds)
 * Uses centralized error handling with FDA API authentication
 *
 * Changes from original:
 * - Integrated with fda-error-handler.ts for FDA API calls
 * - Added FDA_API_KEY authentication
 * - Throws errors instead of silently continuing with empty arrays
 * - All fetch requests have 30-second timeouts
 * - Better error tracking and reporting
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  fetchFDAData,
  FDAAPIError,
  NoResultsError
} from "../_shared/fda-error-handler.ts";

// Simple logger for edge functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get FDA API key from environment
const FDA_API_KEY = Deno.env.get('FDA_API_KEY');

// Log warning if API key is missing
if (!FDA_API_KEY) {
  logger.warn(
    '[FDA Auth] FDA_API_KEY not set - using unauthenticated rate limits (1,000 req/day). ' +
    'Get key from: https://open.fda.gov/apis/authentication/'
  );
}

interface DataSource {
  id: string;
  name: string;
  agency: string;
  source_type: string;
  url: string;
  is_active: boolean;
  last_fetched_at: string;
  fetch_interval: number;
  metadata: any;
}

interface Alert {
  title: string;
  summary: string;
  urgency: string;
  source: string;
  published_date: string;
  external_url?: string;
  full_content?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active data sources that need updating
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('data_sources')
      .select('*')
      .eq('is_active', true)
      .or(`last_fetched_at.is.null,last_fetched_at.lt.${new Date(Date.now() - 3600000).toISOString()}`); // 1 hour ago

    if (sourcesError) {
      throw sourcesError;
    }

    const alerts: Alert[] = [];
    const errors: any[] = [];

    for (const source of sources as DataSource[]) {
      logger.info(`Processing source: ${source.name}`);

      try {
        let sourceAlerts: Alert[] = [];

        if (source.source_type === 'api') {
          sourceAlerts = await fetchApiData(source);
        } else if (source.source_type === 'rss') {
          sourceAlerts = await fetchRssData(source);
        }

        alerts.push(...sourceAlerts);

        // Update last_fetched_at on success
        await supabaseClient
          .from('data_sources')
          .update({ last_fetched_at: new Date().toISOString() })
          .eq('id', source.id);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.error(`Error processing source ${source.name}:`, errorMessage);

        // Track error for reporting
        errors.push({
          source: source.name,
          error: errorMessage,
          type: error?.constructor?.name,
          timestamp: new Date().toISOString()
        });

        // Don't throw - continue processing other sources
        continue;
      }
    }

    // Insert new alerts into database
    if (alerts.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('alerts')
        .upsert(alerts, { onConflict: 'title,source,published_date' });

      if (insertError) {
        logger.error('Error inserting alerts:', insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_sources: sources.length,
        new_alerts: alerts.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in regulatory-feeds-scraper:', error);
    return new Response(
      JSON.stringify({
        error: (error as any)?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Fetches data from API sources (primarily FDA API)
 *
 * WHY THIS CHANGE: Uses centralized FDA error handler instead of inline fetch
 * Now throws on failures instead of returning empty arrays
 */
async function fetchApiData(source: DataSource): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // Handle FDA API endpoints with centralized error handler
    if (source.url.includes('api.fda.gov')) {
      logger.info(`Fetching FDA API data from: ${source.url}`);

      // WHY THIS CHANGE: Use centralized error handler
      // Automatically handles retries, timeouts, and error detection
      const results = await fetchFDAData({
        endpoint: source.url,
        params: {
          limit: '50'
        },
        api_key: FDA_API_KEY,
        rss_fallback_enabled: false,
        max_retries: 3,
        timeout_ms: 30000
      });

      // Process results from FDA API
      for (const result of results) {
        alerts.push({
          title: result.product_description || result.reason_for_recall || 'FDA Alert',
          summary: `${result.product_description || ''} - ${result.reason_for_recall || ''}`.substring(0, 500),
          urgency: result.classification === 'Class I' ? 'high' :
                  result.classification === 'Class II' ? 'medium' : 'low',
          source: source.agency,
          published_date: result.report_date || result.recall_initiation_date || new Date().toISOString(),
          external_url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
          full_content: JSON.stringify(result)
        });
      }

    } else {
      // Handle non-FDA APIs with basic fetch
      logger.info(`Fetching generic API data from: ${source.url}`);

      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Process generic API response (adapt as needed)
      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          alerts.push({
            title: item.title || 'Regulatory Alert',
            summary: item.summary || item.description || '',
            urgency: 'medium',
            source: source.agency,
            published_date: item.date || new Date().toISOString(),
            external_url: item.url || source.url,
            full_content: JSON.stringify(item)
          });
        }
      }
    }

  } catch (error) {
    // Re-throw with context - don't return empty array
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error fetching API data from ${source.url}:`, errorMessage);
    throw new Error(`Failed to fetch API data from ${source.name}: ${errorMessage}`);
  }

  return alerts;
}

/**
 * Fetches data from RSS feeds
 *
 * WHY THIS CHANGE: Added timeout and better error handling
 */
async function fetchRssData(source: DataSource): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    logger.info(`Fetching RSS data from: ${source.url}`);

    // WHY THIS CHANGE: Added 30-second timeout
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`RSS feed HTTP ${response.status}: ${response.statusText}`);
    }

    const rssText = await response.text();

    // Basic RSS parsing - extract title, description, and pubDate
    const items = rssText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

    if (items.length === 0) {
      logger.warn(`RSS feed ${source.url} returned 0 items`);
      // Don't throw - empty RSS feeds are sometimes normal
      return [];
    }

    for (const item of items.slice(0, 20)) { // Limit to 20 items per feed
      const title = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      const description = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim();
      const pubDate = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();
      const link = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim();

      if (title) {
        // Determine urgency based on keywords
        const urgencyKeywords = {
          high: ['recall', 'contamination', 'outbreak', 'emergency', 'class i', 'death', 'serious'],
          medium: ['warning', 'alert', 'class ii', 'injury', 'adverse'],
          low: ['notice', 'update', 'guidance', 'class iii']
        };

        let urgency = 'low';
        const titleLower = title.toLowerCase();
        const descLower = (description || '').toLowerCase();

        if (urgencyKeywords.high.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword))) {
          urgency = 'high';
        } else if (urgencyKeywords.medium.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword))) {
          urgency = 'medium';
        }

        alerts.push({
          title: title.substring(0, 200),
          summary: (description || title).substring(0, 500),
          urgency,
          source: source.agency,
          published_date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          external_url: link || source.url,
          full_content: item
        });
      }
    }

  } catch (error) {
    // Re-throw with context
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error fetching RSS data from ${source.url}:`, errorMessage);
    throw new Error(`Failed to fetch RSS data from ${source.name}: ${errorMessage}`);
  }

  return alerts;
}
