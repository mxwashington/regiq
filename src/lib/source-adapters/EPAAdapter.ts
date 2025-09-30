import { BaseSourceAdapter, AdapterConfig } from './BaseSourceAdapter';
import { SourceFilter, APIRequest, APIResponse, NormalizedResult } from '@/types/filter-engine';

export class EPAAdapter extends BaseSourceAdapter {
  private static readonly ECHO_BASE_URL = 'https://echo.epa.gov/echo/rest_services.get_download';
  
  constructor() {
    const config: AdapterConfig = {
      auth: {
        type: 'api_key',
        header_name: 'Authorization'
      },
      rate_limit: {
        requests_per_hour: 100,
        requests_per_minute: 10
      },
      retry: {
        max_attempts: 3,
        base_delay_ms: 2000,
        max_delay_ms: 16000,
        exponential_base: 2,
        jitter: true
      },
      cache: {
        ttl_seconds: 1800, // 30 minutes
        use_etag: true,
        use_if_modified_since: true
      },
      timeout_ms: 30000,
      circuit_breaker: {
        failure_threshold: 3,
        reset_timeout_ms: 300000
      }
    };
    
    super(config);
  }

  getSourceType(): string {
    return 'EPA';
  }

  buildRequest(filter: SourceFilter): APIRequest {
    const base_request: APIRequest = {
      url: 'https://echo.epa.gov/tools/web-services/enforcement-case-results.json',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'RegIQ/1.0 Regulatory Intelligence Bot'
      }
    };

    const url = new URL(base_request.url);
    
    // Program filter (e.g., CAA - Clean Air Act, CWA - Clean Water Act)
    if (filter.filters.program?.value) {
      const programs = Array.isArray(filter.filters.program.value) 
        ? filter.filters.program.value 
        : [filter.filters.program.value];
      
      url.searchParams.set('program', programs.join(','));
    }

    // Date range filter
    if (filter.filters.date_range?.value) {
      const range = filter.filters.date_range.value as { min?: string; max?: string };
      if (range.min) {
        url.searchParams.set('start_date', range.min);
      }
      if (range.max) {
        url.searchParams.set('end_date', range.max);
      }
    } else {
      // Default to last 90 days
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000));
      url.searchParams.set('start_date', startDate.toISOString().split('T')[0]);
      url.searchParams.set('end_date', endDate.toISOString().split('T')[0]);
    }

    // State filter
    if (filter.filters.state?.value) {
      url.searchParams.set('state', filter.filters.state.value.toString());
    }

    // Facility filter
    if (filter.filters.facility_name?.value) {
      url.searchParams.set('facility_name', filter.filters.facility_name.value.toString());
    }

    // Limit results
    url.searchParams.set('rows', '100');

    base_request.url = url.toString();
    return base_request;
  }

  normalize(response: APIResponse): NormalizedResult[] {
    if (!response.data?.enforcement_results && !response.data?.results) {
      return [];
    }

    const results = response.data.enforcement_results || response.data.results || [];

    return results.map((item: any) => {
      // Determine urgency based on penalty amount and violation type
      let urgency: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
      
      const penaltyAmount = parseFloat(item.penalty_amount || item.federal_penalty || '0');
      const violationType = (item.violation_type || item.enforcement_type || '').toLowerCase();
      
      if (penaltyAmount > 1000000 || violationType.includes('criminal')) {
        urgency = 'Critical';
      } else if (penaltyAmount > 100000 || violationType.includes('consent decree')) {
        urgency = 'High';
      } else if (penaltyAmount > 10000 || violationType.includes('administrative')) {
        urgency = 'Medium';
      } else {
        urgency = 'Low';
      }

      return {
        id: `epa_${item.case_number || item.enforcement_id || Math.random().toString(36).substr(2, 9)}`,
        external_id: item.case_number || item.enforcement_id || '',
        source: 'EPA',
        title: item.facility_name ? `EPA Enforcement: ${item.facility_name}` : 'EPA Enforcement Action',
        summary: item.violation_description || item.enforcement_summary || item.summary || 'EPA enforcement action taken.',
        urgency,
        published_date: item.settlement_date || item.enforcement_date || new Date().toISOString(),
        external_url: item.case_url || item.enforcement_url || 'https://echo.epa.gov/',
        metadata: {
          case_number: item.case_number,
          facility_name: item.facility_name,
          facility_city: item.facility_city,
          facility_state: item.facility_state,
          program: item.program,
          enforcement_type: item.enforcement_type,
          settlement_date: item.settlement_date,
          penalty_amount: item.penalty_amount,
          federal_penalty: item.federal_penalty,
          state_penalty: item.state_penalty,
          violation_type: item.violation_type,
          violation_description: item.violation_description,
          naics_code: item.naics_code,
          sic_code: item.sic_code
        }
      };
    });
  }
}