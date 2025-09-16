import { BaseSourceAdapter, AdapterConfig } from './BaseSourceAdapter';
import { SourceFilter, APIRequest, APIResponse, NormalizedResult } from '@/types/filter-engine';

export class FSISAdapter extends BaseSourceAdapter {
  private static readonly BASE_URL = 'https://www.fsis.usda.gov/wps/portal/fsis/topics/food-safety-education/get-answers/food-safety-fact-sheets/safe-food-handling/basics-for-handling-food-safely/ct_index';
  
  constructor() {
    const config: AdapterConfig = {
      auth: {
        type: 'api_key',
        header_name: 'X-API-Key'
      },
      rate_limit: {
        requests_per_hour: 300,
        requests_per_minute: 15
      },
      retry: {
        max_attempts: 3,
        base_delay_ms: 2000,
        max_delay_ms: 20000,
        exponential_base: 2,
        jitter: true
      },
      cache: {
        ttl_seconds: 900, // 15 minutes
        use_etag: true,
        use_if_modified_since: true
      },
      timeout_ms: 30000,
      circuit_breaker: {
        failure_threshold: 4,
        reset_timeout_ms: 180000
      }
    };
    
    super(config);
  }

  getSourceType(): string {
    return 'FSIS';
  }

  buildRequest(filter: SourceFilter): APIRequest {
    const base_request: APIRequest = {
      url: 'https://www.fsis.usda.gov/api/inspection-results',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'RegIQ/1.0'
      }
    };

    const url = new URL(base_request.url);
    
    // Inspection type filter
    if (filter.filters.inspection_type?.value) {
      const types = Array.isArray(filter.filters.inspection_type.value) 
        ? filter.filters.inspection_type.value 
        : [filter.filters.inspection_type.value];
      
      url.searchParams.set('inspection_type', types.join(','));
    }

    // Violation code filter
    if (filter.filters.violation_code?.value) {
      url.searchParams.set('violation', filter.filters.violation_code.value.toString());
    }

    // Facility search filter
    if (filter.filters.facility_name?.value) {
      url.searchParams.set('facility', filter.filters.facility_name.value.toString());
    }

    // Establishment number filter
    if (filter.filters.establishment_number?.value) {
      url.searchParams.set('est_number', filter.filters.establishment_number.value.toString());
    }

    // Date range filter
    if (filter.filters.inspection_date?.value) {
      const range = filter.filters.inspection_date.value as { min?: string; max?: string };
      if (range.min) {
        url.searchParams.set('from_date', range.min);
      }
      if (range.max) {
        url.searchParams.set('to_date', range.max);
      }
    }

    // State filter
    if (filter.filters.state?.value) {
      url.searchParams.set('state', filter.filters.state.value.toString());
    }

    // Pagination
    url.searchParams.set('limit', '75');
    if (filter.filters.page?.value) {
      url.searchParams.set('page', filter.filters.page.value.toString());
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
    if (!response.data?.inspection_results) {
      return [];
    }

    return response.data.inspection_results.map((item: any) => {
      // Determine urgency based on violation severity
      let urgency: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
      
      const violation_type = item.violation_type?.toLowerCase() || '';
      if (violation_type.includes('critical') || violation_type.includes('imminent')) {
        urgency = 'Critical';
      } else if (violation_type.includes('serious') || violation_type.includes('major')) {
        urgency = 'High';
      } else if (violation_type.includes('minor')) {
        urgency = 'Low';
      }

      return {
        id: `fsis_${item.inspection_id || Math.random().toString(36).substr(2, 9)}`,
        external_id: item.inspection_id || item.establishment_number || '',
        source: 'FSIS',
        title: item.facility_name || 'FSIS Inspection Report',
        summary: item.violation_description || item.inspection_type || '',
        urgency,
        published_date: item.inspection_date || new Date().toISOString(),
        external_url: item.report_url || '',
        metadata: {
          inspection_id: item.inspection_id,
          establishment_number: item.establishment_number,
          facility_name: item.facility_name,
          facility_address: item.facility_address,
          inspection_type: item.inspection_type,
          inspection_date: item.inspection_date,
          violation_code: item.violation_code,
          violation_type: item.violation_type,
          violation_description: item.violation_description,
          corrective_action: item.corrective_action,
          inspector_name: item.inspector_name,
          state: item.state,
          district: item.district
        }
      };
    });
  }

  private getAPIKey(): string | null {
    // In production, this would be retrieved from secure storage
    return null;
  }
}