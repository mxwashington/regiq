// Simple logger for edge functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FilterQuery {
  sources: SourceFilter[];
  shared: SharedFacets;
  pagination: PaginationParams;
  sorting: SortParams;
}

interface SourceFilter {
  source_type: string;
  enabled: boolean;
  filters: Record<string, FilterValue>;
}

interface SharedFacets {
  time_range?: {
    start_date?: string;
    end_date?: string;
  };
  keyword?: string;
  jurisdiction?: string[];
  urgency?: string[];
}

interface FilterValue {
  operator: string;
  value: any;
}

interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

interface NormalizedResult {
  id: string;
  external_id: string;
  source: string;
  title: string;
  summary: string;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  published_date: string;
  external_url?: string;
  metadata: Record<string, any>;
}

interface SourceResult {
  source: string;
  success: boolean;
  data: NormalizedResult[];
  error?: string;
  pagination?: {
    total?: number;
    has_more?: boolean;
    next_cursor?: string;
  };
  cache_info?: {
    hit: boolean;
    ttl?: number;
  };
}

// Simple in-memory source adapters for demo (would be replaced with full implementations)
class SourceFilterEngine {
  private supabase;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async executeFilterQuery(query: FilterQuery): Promise<{
    results: SourceResult[];
    total_results: number;
    execution_time_ms: number;
    cache_stats: { hits: number; misses: number };
  }> {
    const start_time = Date.now();
    const results: SourceResult[] = [];
    let cache_hits = 0;
    let cache_misses = 0;

    logger.info('Executing filter query:', JSON.stringify(query, null, 2));

    // Execute filters for enabled sources
    const enabled_sources = query.sources.filter(source => source.enabled);
    
    for (const source_filter of enabled_sources) {
      try {
        const result = await this.executeSourceFilter(source_filter, query.shared);
        results.push(result);
        
        if (result.cache_info?.hit) {
          cache_hits++;
        } else {
          cache_misses++;
        }
      } catch (error) {
        logger.error(`Error executing filter for ${source_filter.source_type}:`, error);
        results.push({
          source: source_filter.source_type,
          success: false,
          data: [],
          error: error instanceof Error ? error.message : String(error)
        });
        cache_misses++;
      }
    }

    // Combine and sort results
    const all_results = results.flatMap(r => r.data);
    const sorted_results = this.sortResults(all_results, query.sorting);
    const paginated_results = this.paginateResults(sorted_results, query.pagination);

    // Update results with paginated data
    const final_results = results.map(result => ({
      ...result,
      data: result.success 
        ? paginated_results.filter(r => r.source === result.source)
        : result.data
    }));

    const execution_time = Date.now() - start_time;

    // Log telemetry
    await this.logTelemetry({
      event_type: 'filter_query_executed',
      query_metadata: {
        sources_count: enabled_sources.length,
        total_results: all_results.length,
        execution_time_ms: execution_time,
        cache_hits,
        cache_misses
      }
    });

    return {
      results: final_results,
      total_results: all_results.length,
      execution_time_ms: execution_time,
      cache_stats: { hits: cache_hits, misses: cache_misses }
    };
  }

  private async executeSourceFilter(source_filter: SourceFilter, shared_facets: SharedFacets): Promise<SourceResult> {
    const { source_type } = source_filter;
    
    // Check cache first
    const cache_key = this.generateCacheKey(source_filter, shared_facets);
    const cached_result = await this.checkCache(cache_key);
    
    if (cached_result) {
      logger.info(`Cache hit for ${source_type}`);
      return {
        source: source_type,
        success: true,
        data: cached_result,
        cache_info: { hit: true }
      };
    }

    // Execute source-specific logic
    let results: NormalizedResult[] = [];

    switch (source_type) {
      case 'FDA':
        results = await this.executeFDAFilter(source_filter, shared_facets);
        break;
      case 'USDA':
        results = await this.executeUSDAFilter(source_filter, shared_facets);
        break;
      case 'FSIS':
        results = await this.executeFSISFilter(source_filter, shared_facets);
        break;
      case 'WHO':
        results = await this.executeWHOFilter(source_filter, shared_facets);
        break;
      default:
        // Placeholder for other sources (R-010 to R-026)
        results = await this.executePlaceholderFilter(source_filter, shared_facets);
        break;
    }

    // Cache the results
    await this.cacheResults(cache_key, results);

    return {
      source: source_type,
      success: true,
      data: results,
      cache_info: { hit: false }
    };
  }

  private async executeFDAFilter(source_filter: SourceFilter, shared_facets: SharedFacets): Promise<NormalizedResult[]> {
    // Mock FDA data for demo (would be replaced with actual API calls)
    const mock_data: NormalizedResult[] = [
      {
        id: 'fda_001',
        external_id: 'FDA-2024-001',
        source: 'FDA',
        title: 'Recall of Contaminated Lettuce Products',
        summary: 'E. coli contamination in packaged lettuce products distributed nationwide',
        urgency: 'Critical',
        published_date: '2024-01-15T10:30:00Z',
        external_url: 'https://www.fda.gov/safety/recalls/recall-001',
        metadata: {
          product_type: 'food',
          recall_class: 'I',
          recalling_firm: 'Fresh Foods Inc.'
        }
      },
      {
        id: 'fda_002',
        external_id: 'FDA-2024-002',
        source: 'FDA',
        title: 'Medical Device Recall - Infusion Pumps',
        summary: 'Software malfunction in Model XYZ infusion pumps may cause incorrect dosing',
        urgency: 'High',
        published_date: '2024-01-14T14:15:00Z',
        external_url: 'https://www.fda.gov/safety/recalls/recall-002',
        metadata: {
          product_type: 'device',
          recall_class: 'II',
          recalling_firm: 'MedTech Solutions'
        }
      }
    ];

    return this.applySharedFilters(mock_data, shared_facets);
  }

  private async executeUSDAFilter(source_filter: SourceFilter, shared_facets: SharedFacets): Promise<NormalizedResult[]> {
    // Mock USDA data
    const mock_data: NormalizedResult[] = [
      {
        id: 'usda_001',
        external_id: 'USDA-FSIS-001-2024',
        source: 'USDA',
        title: 'Ground Beef Recall Due to E. coli O157:H7',
        summary: 'Approximately 15,000 pounds of ground beef products recalled due to E. coli contamination',
        urgency: 'Critical',
        published_date: '2024-01-16T09:00:00Z',
        external_url: 'https://www.usda.gov/recalls/recall-001',
        metadata: {
          product_category: 'meat',
          establishment_number: 'EST-123',
          health_hazard_evaluation: 'High'
        }
      }
    ];

    return this.applySharedFilters(mock_data, shared_facets);
  }

  private async executeFSISFilter(source_filter: SourceFilter, shared_facets: SharedFacets): Promise<NormalizedResult[]> {
    // Mock FSIS data
    const mock_data: NormalizedResult[] = [
      {
        id: 'fsis_001',
        external_id: 'FSIS-INS-001',
        source: 'FSIS',
        title: 'Inspection Report - Processing Facility Violations',
        summary: 'Multiple HACCP violations found during routine inspection of meat processing facility',
        urgency: 'High',
        published_date: '2024-01-13T11:45:00Z',
        metadata: {
          inspection_type: 'routine',
          facility_name: 'ABC Meat Processing',
          violation_codes: ['01A02', '02B01']
        }
      }
    ];

    return this.applySharedFilters(mock_data, shared_facets);
  }

  private async executeWHOFilter(source_filter: SourceFilter, shared_facets: SharedFacets): Promise<NormalizedResult[]> {
    // Mock WHO data
    const mock_data: NormalizedResult[] = [
      {
        id: 'who_001',
        external_id: 'WHO-DON-001',
        source: 'WHO',
        title: 'Disease Outbreak Notification - Cholera in Region X',
        summary: 'Cholera outbreak reported in multiple districts with 150+ cases',
        urgency: 'Critical',
        published_date: '2024-01-17T08:00:00Z',
        external_url: 'https://www.who.int/emergencies/outbreak-001',
        metadata: {
          disease: 'cholera',
          countries_affected: ['Country A', 'Country B'],
          cases_reported: 156,
          who_region: 'AFRO'
        }
      }
    ];

    return this.applySharedFilters(mock_data, shared_facets);
  }

  private async executePlaceholderFilter(source_filter: SourceFilter, shared_facets: SharedFacets): Promise<NormalizedResult[]> {
    // Placeholder implementation for sources not yet implemented (R-010 to R-026)
    return [];
  }

  private applySharedFilters(data: NormalizedResult[], shared_facets: SharedFacets): NormalizedResult[] {
    let filtered_data = [...data];

    // Apply keyword filter
    if (shared_facets.keyword) {
      const keyword = shared_facets.keyword.toLowerCase();
      filtered_data = filtered_data.filter(item =>
        item.title.toLowerCase().includes(keyword) ||
        item.summary.toLowerCase().includes(keyword)
      );
    }

    // Apply urgency filter
    if (shared_facets.urgency && shared_facets.urgency.length > 0) {
      filtered_data = filtered_data.filter(item =>
        shared_facets.urgency!.includes(item.urgency)
      );
    }

    // Apply date range filter
    if (shared_facets.time_range) {
      const { start_date, end_date } = shared_facets.time_range;
      
      if (start_date) {
        filtered_data = filtered_data.filter(item =>
          new Date(item.published_date) >= new Date(start_date)
        );
      }
      
      if (end_date) {
        filtered_data = filtered_data.filter(item =>
          new Date(item.published_date) <= new Date(end_date)
        );
      }
    }

    return filtered_data;
  }

  private sortResults(results: NormalizedResult[], sorting: SortParams): NormalizedResult[] {
    return results.sort((a, b) => {
      let comparison = 0;
      
      switch (sorting.field) {
        case 'published_date':
          comparison = new Date(a.published_date).getTime() - new Date(b.published_date).getTime();
          break;
        case 'urgency':
          const urgency_order = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          comparison = urgency_order[a.urgency] - urgency_order[b.urgency];
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        default:
          comparison = 0;
      }
      
      return sorting.direction === 'desc' ? -comparison : comparison;
    });
  }

  private paginateResults(results: NormalizedResult[], pagination: PaginationParams): NormalizedResult[] {
    const { limit = 50, offset = 0 } = pagination;
    return results.slice(offset, offset + limit);
  }

  private generateCacheKey(source_filter: SourceFilter, shared_facets: SharedFacets): string {
    const key_data = {
      source: source_filter.source_type,
      filters: source_filter.filters,
      shared: shared_facets
    };
    return `filter_cache_${btoa(JSON.stringify(key_data)).replace(/[+/=]/g, '')}`;
  }

  private async checkCache(cache_key: string): Promise<NormalizedResult[] | null> {
    try {
      const { data, error } = await this.supabase
        .from('search_cache')
        .select('result_data, expires_at')
        .eq('cache_key', cache_key)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if cache entry is still valid
      if (new Date(data.expires_at) < new Date()) {
        // Cache expired, delete it
        await this.supabase
          .from('search_cache')
          .delete()
          .eq('cache_key', cache_key);
        return null;
      }

      return data.result_data as NormalizedResult[];
    } catch (error) {
      logger.error('Cache check error:', error);
      return null;
    }
  }

  private async cacheResults(cache_key: string, results: NormalizedResult[]): Promise<void> {
    try {
      const expires_at = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL
      
      await this.supabase
        .from('search_cache')
        .upsert({
          cache_key,
          query: cache_key,
          result_data: results,
          expires_at: expires_at.toISOString()
        });
    } catch (error) {
      logger.error('Cache store error:', error);
    }
  }

  private async logTelemetry(event: { event_type: string; query_metadata: any }): Promise<void> {
    try {
      await this.supabase
        .from('usage_logs')
        .insert({
          user_id: null, // System operation
          feature_name: 'source_filter_engine',
          amount: 1,
          metadata: event
        });
    } catch (error) {
      logger.error('Telemetry logging error:', error);
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query) {
      throw new Error('Filter query is required');
    }

    const engine = new SourceFilterEngine();
    const result = await engine.executeFilterQuery(query as FilterQuery);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Error in source-filter-engine function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        results: [],
        total_results: 0,
        execution_time_ms: 0,
        cache_stats: { hits: 0, misses: 0 }
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});