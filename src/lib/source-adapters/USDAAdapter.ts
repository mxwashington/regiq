import { BaseSourceAdapter, AdapterConfig } from './BaseSourceAdapter';
import { SourceFilter, APIRequest, APIResponse, NormalizedResult } from '@/types/filter-engine';

export class USDAAdapter extends BaseSourceAdapter {
  private static readonly BASE_URL = 'https://www.fsis.usda.gov/wps/wcm/connect/fsis-content/internet/main/topics/recalls-and-public-health-alerts/recall-summaries';
  
  constructor() {
    const config: AdapterConfig = {
      auth: {
        type: 'bearer',
        header_name: 'Authorization'
      },
      rate_limit: {
        requests_per_hour: 500,
        requests_per_minute: 25
      },
      retry: {
        max_attempts: 3,
        base_delay_ms: 1500,
        max_delay_ms: 15000,
        exponential_base: 2,
        jitter: true
      },
      cache: {
        ttl_seconds: 600, // 10 minutes
        use_etag: true,
        use_if_modified_since: true
      },
      timeout_ms: 25000,
      circuit_breaker: {
        failure_threshold: 3,
        reset_timeout_ms: 120000
      }
    };
    
    super(config);
  }

  getSourceType(): string {
    return 'USDA';
  }

  buildRequest(filter: SourceFilter): APIRequest {
    const base_request: APIRequest = {
      url: 'https://www.fsis.usda.gov/fsis/api/recall',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'RegIQ/1.0'
      }
    };

    const url = new URL(base_request.url);
    
    // Product category filter
    if (filter.filters.product_category?.value) {
      const categories = Array.isArray(filter.filters.product_category.value) 
        ? filter.filters.product_category.value 
        : [filter.filters.product_category.value];
      
      url.searchParams.set('category', categories.join(','));
    }

    // Establishment number filter
    if (filter.filters.establishment_number?.value) {
      url.searchParams.set('establishment', filter.filters.establishment_number.value.toString());
    }

    // HACCP category filter
    if (filter.filters.haccp_category?.value) {
      url.searchParams.set('haccp', filter.filters.haccp_category.value.toString());
    }

    // Date range filter
    if (filter.filters.date_published?.value) {
      const range = filter.filters.date_published.value as { min?: string; max?: string };
      if (range.min) {
        url.searchParams.set('start_date', range.min);
      }
      if (range.max) {
        url.searchParams.set('end_date', range.max);
      }
    }

    // Pagination
    url.searchParams.set('limit', '50');
    if (filter.filters.offset?.value) {
      url.searchParams.set('offset', filter.filters.offset.value.toString());
    }

    base_request.url = url.toString();

    // Add Bearer token if available
    const api_key = this.getAPIKey();
    if (api_key) {
      return this.addAuth(base_request, api_key);
    }

    return base_request;
  }

  normalize(response: APIResponse): NormalizedResult[] {
    if (!response.data?.recalls) {
      return [];
    }

    return response.data.recalls.map((item: any) => {
      // Determine urgency based on health hazard evaluation
      let urgency: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
      
      const health_hazard = item.health_hazard_evaluation?.toLowerCase() || '';
      if (health_hazard.includes('high') || health_hazard.includes('serious')) {
        urgency = 'Critical';
      } else if (health_hazard.includes('moderate')) {
        urgency = 'High';
      } else if (health_hazard.includes('low')) {
        urgency = 'Medium';
      }

      return {
        id: `usda_${item.recall_case_number || Math.random().toString(36).substr(2, 9)}`,
        external_id: item.recall_case_number || '',
        source: 'USDA',
        title: item.product_name || 'USDA Recall Notice',
        summary: item.health_hazard_evaluation || item.reason_for_recall || '',
        urgency,
        published_date: item.recall_date || item.date_opened || new Date().toISOString(),
        external_url: item.press_release_url || '',
        metadata: {
          case_number: item.recall_case_number,
          establishment_number: item.establishment_number,
          establishment_name: item.establishment_name,
          product_name: item.product_name,
          problem: item.problem,
          summary: item.summary,
          quantity_recovered: item.quantity_recovered,
          distribution: item.distribution,
          contact: item.contact,
          health_hazard_evaluation: item.health_hazard_evaluation
        }
      };
    });
  }

  private getAPIKey(): string | null {
    // In production, this would be retrieved from secure storage
    return null;
  }
}