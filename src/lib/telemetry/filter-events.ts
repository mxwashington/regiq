// Telemetry events for Source Filter Engine
export interface FilterTelemetryEvents {
  'filter.query.started': { 
    sources: string[]; 
    filter_count: number;
    user_id?: string;
    timestamp: string;
  };
  
  'filter.query.completed': { 
    duration_ms: number; 
    result_count: number;
    sources: string[];
    cache_hits: number;
    cache_misses: number;
    user_id?: string;
    timestamp: string;
  };
  
  'filter.source.error': { 
    source: string; 
    error_type: string;
    error_message: string;
    user_id?: string;
    timestamp: string;
  };
  
  'filter.cache.hit': { 
    source: string; 
    cache_key: string;
    user_id?: string;
    timestamp: string;
  };
  
  'filter.ui.section_expanded': { 
    source: string;
    user_id?: string;
    timestamp: string;
  };

  'filter.api.proxy_used': {
    source: string;
    endpoint: string;
    user_id: string;
    status: 'success' | 'error' | 'rate_limited';
    response_time_ms?: number;
    timestamp: string;
  };

  'filter.security.suspicious_query': {
    user_id: string;
    query_pattern: string;
    threat_level: 'low' | 'medium' | 'high';
    timestamp: string;
  };
}

// SLA Monitoring Targets
export const SLA_TARGETS = {
  availability: 99.9,
  error_rate: 0.1, // 0.1%
  response_time_p95: 2000, // ms
  cache_hit_ratio: 0.8,
  api_proxy_success_rate: 99.5,
  rate_limit_compliance: 100 // % of requests within rate limits
} as const;

// Event logging helper
export class FilterTelemetryLogger {
  constructor(private supabase: any) {}

  async logEvent<K extends keyof FilterTelemetryEvents>(
    eventType: K, 
    data: FilterTelemetryEvents[K]
  ): Promise<void> {
    try {
      await this.supabase.from('usage_logs').insert({
        user_id: data.user_id || null,
        feature_name: `filter_telemetry_${eventType}`,
        amount: 1,
        metadata: {
          event_type: eventType,
          ...data
        }
      });
    } catch (error) {
      console.error('Failed to log telemetry event:', error);
    }
  }

  // Performance monitoring
  async trackPerformance(metric: string, value: number, labels: Record<string, string> = {}): Promise<void> {
    try {
      await this.supabase.from('usage_logs').insert({
        user_id: labels.user_id || null,
        feature_name: `filter_performance_${metric}`,
        amount: value,
        metadata: {
          metric,
          value,
          labels,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to track performance metric:', error);
    }
  }

  // Security event logging
  async logSecurityEvent(eventType: string, userId: string, metadata: Record<string, any>): Promise<void> {
    try {
      await this.supabase.from('security_events').insert({
        user_id: userId,
        event_type: `filter_${eventType}`,
        metadata: {
          ...metadata,
          component: 'source_filter_engine',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}