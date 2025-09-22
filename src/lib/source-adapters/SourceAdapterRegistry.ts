import { BaseSourceAdapter } from './BaseSourceAdapter';
import { FDAAdapter } from './FDAAdapter';
import { USDAAdapter } from './USDAAdapter';
import { FSISAdapter } from './FSISAdapter';
import { WHOAdapter } from './WHOAdapter';
// RegulationsGovAdapter removed - using new regulatory system
import { SourceType, SourceFilter, SourceResult } from '@/types/filter-engine';

// Placeholder adapters for remaining sources (R-010 to R-026)
class PlaceholderAdapter extends BaseSourceAdapter {
  constructor(private sourceType: SourceType) {
    super({
      auth: { type: 'api_key' },
      rate_limit: { requests_per_hour: 100 },
      retry: { max_attempts: 3, base_delay_ms: 1000, max_delay_ms: 10000, exponential_base: 2, jitter: true },
      cache: { ttl_seconds: 300, use_etag: false, use_if_modified_since: false },
      timeout_ms: 30000,
      circuit_breaker: { failure_threshold: 5, reset_timeout_ms: 60000 }
    });
  }

  getSourceType(): string {
    return this.sourceType;
  }

  buildRequest(filter: SourceFilter): any {
    return {
      url: `https://api.placeholder.com/${this.sourceType.toLowerCase()}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };
  }

  normalize(response: any): any[] {
    // Placeholder implementation - returns empty array
    return [];
  }
}

export class SourceAdapterRegistry {
  private adapters: Map<SourceType, BaseSourceAdapter> = new Map();
  private circuit_breakers: Map<SourceType, { open: boolean; failures: number; reset_time: number }> = new Map();

  constructor() {
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    // Fully implemented adapters
    this.adapters.set('FDA', new FDAAdapter());
    this.adapters.set('USDA', new USDAAdapter());
    this.adapters.set('FSIS', new FSISAdapter());
    this.adapters.set('WHO', new WHOAdapter());
    // RegulationsGovAdapter removed - using new regulatory system

    // Placeholder adapters for remaining sources (to be implemented in R-010 to R-026)
    const placeholder_sources: SourceType[] = [
      'HEALTH_CANADA', 'CDC', 'MHRA', 'IAEA', 'FSA', 'EFSA',
      'CFIA', 'EMA', 'FAO', 'MHLW', 'ECHA', 'FSANZ',
      'EPA', 'OSHA', 'TGA', 'PMDA', 'FTC', 'REGULATIONS_GOV'
    ];

    placeholder_sources.forEach(source => {
      this.adapters.set(source, new PlaceholderAdapter(source));
      this.circuit_breakers.set(source, { open: false, failures: 0, reset_time: 0 });
    });
  }

  getAdapter(sourceType: SourceType): BaseSourceAdapter | null {
    return this.adapters.get(sourceType) || null;
  }

  async executeQuery(filter: SourceFilter): Promise<SourceResult> {
    const adapter = this.getAdapter(filter.source_type);
    
    if (!adapter) {
      return {
        source: filter.source_type,
        success: false,
        data: [],
        error: `No adapter found for source: ${filter.source_type}`
      };
    }

    // Check circuit breaker
    const breaker = this.circuit_breakers.get(filter.source_type);
    if (breaker?.open && Date.now() < breaker.reset_time) {
      return {
        source: filter.source_type,
        success: false,
        data: [],
        error: 'Circuit breaker is open for this source'
      };
    }

    try {
      const result = await adapter.executeWithPolicy(filter);
      
      // Reset circuit breaker on success
      if (result.success && breaker) {
        breaker.failures = 0;
        breaker.open = false;
      }
      
      return result;
    } catch (error) {
      // Record failure and potentially open circuit breaker
      if (breaker) {
        breaker.failures++;
        if (breaker.failures >= 5) {
          breaker.open = true;
          breaker.reset_time = Date.now() + 300000; // 5 minutes
        }
      }

      return {
        source: filter.source_type,
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async executeMultipleQueries(filters: SourceFilter[]): Promise<SourceResult[]> {
    // Execute queries in parallel with limited concurrency
    const concurrency_limit = 5;
    const results: SourceResult[] = [];
    
    for (let i = 0; i < filters.length; i += concurrency_limit) {
      const batch = filters.slice(i, i + concurrency_limit);
      const batch_promises = batch.map(filter => this.executeQuery(filter));
      const batch_results = await Promise.allSettled(batch_promises);
      
      batch_results.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Handle rejected promise
          const failed_filter = batch[batch_results.indexOf(result)];
          results.push({
            source: failed_filter.source_type,
            success: false,
            data: [],
            error: 'Query execution failed'
          });
        }
      });
    }
    
    return results;
  }

  getAvailableSources(): SourceType[] {
    return Array.from(this.adapters.keys());
  }

  getSourceHealth(): Record<SourceType, { available: boolean; circuit_open: boolean; last_error?: string }> {
    const health: Record<string, any> = {};
    
    this.adapters.forEach((adapter, source) => {
      const breaker = this.circuit_breakers.get(source);
      health[source] = {
        available: true,
        circuit_open: breaker?.open || false,
        failures: breaker?.failures || 0
      };
    });
    
    return health;
  }
}