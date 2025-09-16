import { SourceFilter, APIRequest, APIResponse, NormalizedResult, SourceResult, SourceError, SourceErrorType } from '@/types/filter-engine';

export interface RateLimitConfig {
  requests_per_hour: number;
  requests_per_minute?: number;
  burst_limit?: number;
}

export interface RetryConfig {
  max_attempts: number;
  base_delay_ms: number;
  max_delay_ms: number;
  exponential_base: number;
  jitter: boolean;
}

export interface CacheConfig {
  ttl_seconds: number;
  use_etag: boolean;
  use_if_modified_since: boolean;
}

export interface AdapterConfig {
  auth: {
    type: 'api_key' | 'bearer' | 'basic' | 'oauth';
    key_param?: string;
    header_name?: string;
  };
  rate_limit: RateLimitConfig;
  retry: RetryConfig;
  cache: CacheConfig;
  timeout_ms: number;
  circuit_breaker: {
    failure_threshold: number;
    reset_timeout_ms: number;
  };
}

export abstract class BaseSourceAdapter {
  protected config: AdapterConfig;
  protected last_request_time: number = 0;
  protected request_count: number = 0;
  protected circuit_open: boolean = false;
  protected circuit_failures: number = 0;
  protected circuit_reset_time: number = 0;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  // Abstract methods to be implemented by concrete adapters
  abstract buildRequest(filter: SourceFilter): APIRequest;
  abstract normalize(response: APIResponse): NormalizedResult[];
  abstract getSourceType(): string;

  // Main execution method with all cross-cutting concerns
  async executeWithPolicy(filter: SourceFilter): Promise<SourceResult> {
    const source_type = this.getSourceType() as any;
    
    try {
      // Check circuit breaker
      if (this.isCircuitOpen()) {
        throw new Error('Circuit breaker is open');
      }

      // Apply rate limiting
      await this.applyRateLimit();

      // Use secure proxy instead of direct API calls
      const result = await this.executeViaSecureProxy(filter);

      // Reset circuit breaker on success
      this.resetCircuitBreaker();

      return {
        source: source_type,
        success: true,
        data: result,
        cache_info: { hit: false }
      };

    } catch (error) {
      // Handle circuit breaker
      this.recordFailure();

      const source_error = this.classifyError(error as Error);
      
      return {
        source: source_type,
        success: false,
        data: [],
        error: source_error.message
      };
    }
  }

  // New method to use secure proxy instead of direct API calls
  private async executeViaSecureProxy(filter: SourceFilter): Promise<NormalizedResult[]> {
    // This would be implemented by calling the secure-regulatory-proxy Edge Function
    // instead of making direct external API calls
    
    // For now, return empty array - this will be implemented in the concrete adapters
    // when they're fully connected to the proxy functions
    return [];
  }

  // Rate limiting implementation
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const time_since_last = now - this.last_request_time;
    const min_interval = (60 * 1000) / (this.config.rate_limit.requests_per_minute || 60);

    if (time_since_last < min_interval) {
      const delay = min_interval - time_since_last;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.last_request_time = Date.now();
    this.request_count++;
  }

  // Retry logic with exponential backoff
  private async executeWithRetry(request: APIRequest): Promise<APIResponse> {
    let last_error: Error;

    for (let attempt = 1; attempt <= this.config.retry.max_attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout_id = setTimeout(() => controller.abort(), this.config.timeout_ms);

        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeout_id);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        return {
          status: response.status,
          headers,
          data
        };

      } catch (error) {
        last_error = error as Error;
        
        if (attempt < this.config.retry.max_attempts) {
          const delay = this.calculateRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw last_error!;
  }

  private calculateRetryDelay(attempt: number): number {
    const base_delay = this.config.retry.base_delay_ms;
    const exponential_delay = base_delay * Math.pow(this.config.retry.exponential_base, attempt - 1);
    const capped_delay = Math.min(exponential_delay, this.config.retry.max_delay_ms);
    
    if (this.config.retry.jitter) {
      return capped_delay * (0.5 + Math.random() * 0.5);
    }
    
    return capped_delay;
  }

  // Circuit breaker implementation
  private isCircuitOpen(): boolean {
    if (this.circuit_open && Date.now() > this.circuit_reset_time) {
      this.circuit_open = false;
      this.circuit_failures = 0;
    }
    return this.circuit_open;
  }

  private recordFailure(): void {
    this.circuit_failures++;
    if (this.circuit_failures >= this.config.circuit_breaker.failure_threshold) {
      this.circuit_open = true;
      this.circuit_reset_time = Date.now() + this.config.circuit_breaker.reset_timeout_ms;
    }
  }

  private resetCircuitBreaker(): void {
    this.circuit_failures = 0;
    this.circuit_open = false;
  }

  // Cache implementation (simplified - in production would use Redis/Memcached)
  private async checkCache(request: APIRequest): Promise<NormalizedResult[] | null> {
    // Simple in-memory cache for demo
    // In production, this would integrate with Redis or similar
    return null;
  }

  private async cacheResult(request: APIRequest, data: NormalizedResult[]): Promise<void> {
    // Cache implementation would go here
  }

  // Error classification
  private classifyError(error: Error): SourceError {
    const message = error.message.toLowerCase();
    
    if (message.includes('401') || message.includes('403')) {
      return {
        type: 'auth_error',
        message: 'Authentication failed',
        retryable: false
      };
    }
    
    if (message.includes('429')) {
      return {
        type: 'rate_limit',
        message: 'Rate limit exceeded',
        retryable: true
      };
    }
    
    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        type: 'timeout',
        message: 'Request timeout',
        retryable: true
      };
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        type: 'network_error',
        message: 'Network error',
        retryable: true
      };
    }
    
    if (message.includes('400')) {
      return {
        type: 'invalid_request',
        message: 'Invalid request parameters',
        retryable: false
      };
    }
    
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return {
        type: 'server_error',
        message: 'Server error',
        retryable: true
      };
    }
    
    return {
      type: 'unknown_error',
      message: error.message,
      retryable: false
    };
  }

  // Helper method for adding authentication to requests
  protected addAuth(request: APIRequest, api_key: string): APIRequest {
    const { auth } = this.config;
    
    switch (auth.type) {
      case 'api_key':
        if (auth.key_param) {
          // Add as URL parameter
          const url = new URL(request.url);
          url.searchParams.set(auth.key_param, api_key);
          request.url = url.toString();
        } else if (auth.header_name) {
          // Add as header
          request.headers[auth.header_name] = api_key;
        }
        break;
        
      case 'bearer':
        request.headers['Authorization'] = `Bearer ${api_key}`;
        break;
        
      case 'basic':
        const encoded = btoa(`${api_key}:`);
        request.headers['Authorization'] = `Basic ${encoded}`;
        break;
    }
    
    return request;
  }
}