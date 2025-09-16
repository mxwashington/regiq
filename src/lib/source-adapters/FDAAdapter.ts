import { BaseSourceAdapter, AdapterConfig } from './BaseSourceAdapter';
import { SourceFilter, APIRequest, APIResponse, NormalizedResult } from '@/types/filter-engine';

export class FDAAdapter extends BaseSourceAdapter {
  private static readonly BASE_URL = 'https://api.fda.gov';
  
  constructor() {
    const config: AdapterConfig = {
      auth: {
        type: 'api_key',
        key_param: 'api_key'
      },
      rate_limit: {
        requests_per_hour: 1000,
        requests_per_minute: 40,
        burst_limit: 10
      },
      retry: {
        max_attempts: 3,
        base_delay_ms: 1000,
        max_delay_ms: 10000,
        exponential_base: 2,
        jitter: true
      },
      cache: {
        ttl_seconds: 300, // 5 minutes
        use_etag: true,
        use_if_modified_since: true
      },
      timeout_ms: 30000,
      circuit_breaker: {
        failure_threshold: 5,
        reset_timeout_ms: 60000
      }
    };
    
    super(config);
  }

  getSourceType(): string {
    return 'FDA';
  }

  buildRequest(filter: SourceFilter): APIRequest {
    const base_request: APIRequest = {
      url: '',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RegIQ/1.0'
      }
    };

    // Determine endpoint based on filter type
    let endpoint = '/food/enforcement.json'; // Default to food recalls
    
    if (filter.filters.endpoint?.value === 'device') {
      endpoint = '/device/enforcement.json';
    } else if (filter.filters.endpoint?.value === 'drug') {
      endpoint = '/drug/enforcement.json';
    }

    const url = new URL(FDAAdapter.BASE_URL + endpoint);
    
    // Build search query
    const search_parts: string[] = [];
    
    // Product type filter
    if (filter.filters.product_type?.value) {
      const product_types = Array.isArray(filter.filters.product_type.value) 
        ? filter.filters.product_type.value 
        : [filter.filters.product_type.value];
      
      const product_query = product_types.map(type => `product_type:"${type}"`).join(' OR ');
      search_parts.push(`(${product_query})`);
    }

    // Recall class filter
    if (filter.filters.recall_class?.value) {
      search_parts.push(`classification:"Class ${filter.filters.recall_class.value}"`);
    }

    // Date range filter
    if (filter.filters.date_range?.value) {
      const range = filter.filters.date_range.value as { min?: string; max?: string };
      if (range.min && range.max) {
        search_parts.push(`report_date:[${range.min} TO ${range.max}]`);
      }
    }

    // Event ID filter
    if (filter.filters.event_id?.value) {
      search_parts.push(`event_id:"${filter.filters.event_id.value}"`);
    }

    // Keyword search
    if (filter.filters.keyword?.value) {
      search_parts.push(`product_description:"${filter.filters.keyword.value}"`);
    }

    if (search_parts.length > 0) {
      url.searchParams.set('search', search_parts.join(' AND '));
    }

    // Pagination
    url.searchParams.set('limit', '100');
    if (filter.filters.skip?.value) {
      url.searchParams.set('skip', filter.filters.skip.value.toString());
    }

    base_request.url = url.toString();

    // Add API key if available
    const api_key = this.getAPIKey();
    if (api_key) {
      return this.addAuth(base_request, api_key);
    }

    return base_request;
  }

  normalize(response: APIResponse): NormalizedResult[] {
    if (!response.data?.results) {
      return [];
    }

    return response.data.results.map((item: any) => {
      // Determine urgency based on recall classification
      let urgency: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
      
      if (item.classification?.includes('Class I')) {
        urgency = 'Critical';
      } else if (item.classification?.includes('Class II')) {
        urgency = 'High';
      } else if (item.classification?.includes('Class III')) {
        urgency = 'Medium';
      }

      return {
        id: `fda_${item.recall_number || item.event_id || Math.random().toString(36).substr(2, 9)}`,
        external_id: item.recall_number || item.event_id || '',
        source: 'FDA',
        title: item.product_description || 'FDA Recall Notice',
        summary: item.reason_for_recall || item.product_description || '',
        urgency,
        published_date: item.report_date || item.recall_initiation_date || new Date().toISOString(),
        external_url: item.more_code_info || '',
        metadata: {
          recall_number: item.recall_number,
          classification: item.classification,
          recalling_firm: item.recalling_firm,
          product_quantity: item.product_quantity,
          distribution_pattern: item.distribution_pattern,
          state: item.state,
          country: item.country,
          voluntary_mandated: item.voluntary_mandated,
          initial_firm_notification: item.initial_firm_notification
        }
      };
    });
  }

  private getAPIKey(): string | null {
    // In production, this would be retrieved from secure storage
    // For now, return null to work without API key (with rate limits)
    return null;
  }
}