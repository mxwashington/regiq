import { BaseSourceAdapter, AdapterConfig } from './BaseSourceAdapter';
import { SourceFilter, APIRequest, APIResponse, NormalizedResult } from '@/types/filter-engine';

export class WHOAdapter extends BaseSourceAdapter {
  private static readonly BASE_URL = 'https://www.who.int/emergencies/surveillance/event-based-surveillance';
  
  constructor() {
    const config: AdapterConfig = {
      auth: {
        type: 'bearer',
        header_name: 'Authorization'
      },
      rate_limit: {
        requests_per_hour: 200,
        requests_per_minute: 10
      },
      retry: {
        max_attempts: 4,
        base_delay_ms: 3000,
        max_delay_ms: 30000,
        exponential_base: 2,
        jitter: true
      },
      cache: {
        ttl_seconds: 1800, // 30 minutes
        use_etag: true,
        use_if_modified_since: true
      },
      timeout_ms: 45000,
      circuit_breaker: {
        failure_threshold: 3,
        reset_timeout_ms: 300000
      }
    };
    
    super(config);
  }

  getSourceType(): string {
    return 'WHO';
  }

  buildRequest(filter: SourceFilter): APIRequest {
    const base_request: APIRequest = {
      url: 'https://extranet.who.int/don/api/outbreak-alerts',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'RegIQ/1.0'
      }
    };

    const url = new URL(base_request.url);
    
    // Alert type filter
    if (filter.filters.alert_type?.value) {
      const types = Array.isArray(filter.filters.alert_type.value) 
        ? filter.filters.alert_type.value 
        : [filter.filters.alert_type.value];
      
      url.searchParams.set('alert_type', types.join(','));
    }

    // Country filter
    if (filter.filters.country?.value) {
      const countries = Array.isArray(filter.filters.country.value) 
        ? filter.filters.country.value 
        : [filter.filters.country.value];
      
      url.searchParams.set('countries', countries.join(','));
    }

    // Pathogen filter
    if (filter.filters.pathogen?.value) {
      url.searchParams.set('pathogen', filter.filters.pathogen.value.toString());
    }

    // WHO region filter
    if (filter.filters.who_region?.value) {
      url.searchParams.set('region', filter.filters.who_region.value.toString());
    }

    // Date range filter
    if (filter.filters.publication_date?.value) {
      const range = filter.filters.publication_date.value as { min?: string; max?: string };
      if (range.min) {
        url.searchParams.set('date_from', range.min);
      }
      if (range.max) {
        url.searchParams.set('date_to', range.max);
      }
    }

    // Risk assessment level
    if (filter.filters.risk_level?.value) {
      url.searchParams.set('risk_level', filter.filters.risk_level.value.toString());
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
    if (!response.data?.alerts && !response.data?.outbreaks) {
      return [];
    }

    const alerts = response.data.alerts || response.data.outbreaks || [];

    return alerts.map((item: any) => {
      // Determine urgency based on WHO risk assessment
      let urgency: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
      
      const risk_level = item.risk_assessment?.level?.toLowerCase() || '';
      if (risk_level.includes('very high') || risk_level.includes('emergency')) {
        urgency = 'Critical';
      } else if (risk_level.includes('high')) {
        urgency = 'High';
      } else if (risk_level.includes('low')) {
        urgency = 'Low';
      }

      return {
        id: `who_${item.id || item.outbreak_id || Math.random().toString(36).substr(2, 9)}`,
        external_id: item.id || item.outbreak_id || '',
        source: 'WHO',
        title: item.title || item.disease || 'WHO Disease Outbreak Alert',
        summary: item.summary || item.description || '',
        urgency,
        published_date: item.date_published || item.date_reported || new Date().toISOString(),
        external_url: item.url || item.link || '',
        metadata: {
          outbreak_id: item.outbreak_id,
          disease: item.disease,
          pathogen: item.pathogen,
          countries_affected: item.countries || [],
          who_region: item.who_region,
          cases_reported: item.cases_reported,
          deaths_reported: item.deaths_reported,
          risk_assessment: item.risk_assessment,
          control_measures: item.control_measures,
          date_first_reported: item.date_first_reported,
          date_who_notified: item.date_who_notified,
          event_status: item.event_status,
          grade: item.grade
        }
      };
    });
  }

  private getAPIKey(): string | null {
    // In production, this would be retrieved from secure storage
    return null;
  }
}