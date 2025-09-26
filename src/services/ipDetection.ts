import { logger } from '@/lib/logger';

interface IPDetectionConfig {
  maxRetries: number;
  retryDelay: number;
  cacheTimeout: number;
  minInterval: number;
}

interface IPInfo {
  ip: string;
  timestamp: number;
  source: string;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

class IPDetectionService {
  private config: IPDetectionConfig = {
    maxRetries: 2,
    retryDelay: 5000, // 5 seconds
    cacheTimeout: 3600000, // 1 hour
    minInterval: 30000, // 30 seconds minimum between requests
  };

  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  };

  private lastRequestTime = 0;
  private readonly CACHE_KEY = 'regiq_user_ip';
  private readonly CIRCUIT_BREAKER_KEY = 'regiq_ip_circuit_breaker';

  constructor(config?: Partial<IPDetectionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.loadCircuitBreakerState();
  }

  private loadCircuitBreakerState(): void {
    try {
      const stored = localStorage.getItem(this.CIRCUIT_BREAKER_KEY);
      if (stored) {
        this.circuitBreaker = JSON.parse(stored);
      }
    } catch (error) {
      logger.warn('Failed to load circuit breaker state:', error);
    }
  }

  private saveCircuitBreakerState(): void {
    try {
      localStorage.setItem(this.CIRCUIT_BREAKER_KEY, JSON.stringify(this.circuitBreaker));
    } catch (error) {
      logger.warn('Failed to save circuit breaker state:', error);
    }
  }

  private isCircuitOpen(): boolean {
    const now = Date.now();
    
    // Reset circuit breaker after 5 minutes
    if (this.circuitBreaker.isOpen && now - this.circuitBreaker.lastFailure > 300000) {
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failures = 0;
      this.saveCircuitBreakerState();
    }

    return this.circuitBreaker.isOpen;
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();
    
    // Open circuit after 3 failures
    if (this.circuitBreaker.failures >= 3) {
      this.circuitBreaker.isOpen = true;
      logger.warn('IP detection circuit breaker opened due to repeated failures');
    }
    
    this.saveCircuitBreakerState();
  }

  private recordSuccess(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
    this.saveCircuitBreakerState();
  }

  private getCachedIP(): IPInfo | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const ipInfo: IPInfo = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - ipInfo.timestamp < this.config.cacheTimeout) {
        return ipInfo;
      }
      
      // Remove expired cache
      localStorage.removeItem(this.CACHE_KEY);
      return null;
    } catch (error) {
      logger.warn('Failed to read IP cache:', error);
      return null;
    }
  }

  private setCachedIP(ip: string, source: string): void {
    try {
      const ipInfo: IPInfo = {
        ip,
        timestamp: Date.now(),
        source,
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(ipInfo));
    } catch (error) {
      logger.warn('Failed to cache IP:', error);
    }
  }

  private shouldThrottle(): boolean {
    const now = Date.now();
    return now - this.lastRequestTime < this.config.minInterval;
  }

  private async fetchFromService(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.ip || data.origin || null;
    } catch (error) {
      if (error instanceof Error) {
        logger.warn(`IP service ${url} failed:`, error.message);
      }
      return null;
    }
  }

  async getCurrentIP(): Promise<string | null> {
    try {
      // Check circuit breaker
      if (this.isCircuitOpen()) {
        logger.warn('IP detection circuit breaker is open, using cached IP if available');
        const cached = this.getCachedIP();
        return cached?.ip || null;
      }

      // Check cache first
      const cached = this.getCachedIP();
      if (cached) {
        logger.info('Using cached IP:', cached.ip);
        return cached.ip;
      }

      // Check throttling
      if (this.shouldThrottle()) {
        logger.warn('IP detection request throttled, using cached IP if available');
        return cached?.ip || null;
      }

      this.lastRequestTime = Date.now();

      // Try fallback method first (no external API)
      const fallbackIP = this.getFallbackIP();
      if (fallbackIP) {
        this.setCachedIP(fallbackIP, 'fallback');
        this.recordSuccess();
        return fallbackIP;
      }

      // CORS-enabled services only
      const ipServices = [
        'https://httpbin.org/ip', // More reliable for CORS
      ];

      for (const service of ipServices) {
        const ip = await this.fetchFromService(service);
        if (ip) {
          this.setCachedIP(ip, service);
          this.recordSuccess();
          logger.info('Successfully detected IP:', ip);
          return ip;
        }
      }

      this.recordFailure();
      return null;
    } catch (error) {
      logger.error('IP detection failed:', error);
      this.recordFailure();
      return null;
    }
  }

  private getFallbackIP(): string | null {
    // Try to extract IP from any existing data
    try {
      // Check if we have any previous IP in browser storage
      const stored = localStorage.getItem('regiq_fallback_ip');
      if (stored) {
        const data = JSON.parse(stored);
        if (Date.now() - data.timestamp < 86400000) { // 24 hours
          return data.ip;
        }
      }
    } catch (error) {
      logger.warn('Failed to get fallback IP:', error);
    }
    return null;
  }

  clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CIRCUIT_BREAKER_KEY);
      localStorage.removeItem('regiq_fallback_ip');
    } catch (error) {
      logger.warn('Failed to clear IP cache:', error);
    }
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
    };
    this.saveCircuitBreakerState();
  }

  getStatus() {
    const cached = this.getCachedIP();
    return {
      cached: !!cached,
      cacheAge: cached ? Date.now() - cached.timestamp : null,
      circuitOpen: this.circuitBreaker.isOpen,
      failures: this.circuitBreaker.failures,
      lastIP: cached?.ip,
    };
  }
}

// Export singleton instance
export const ipDetectionService = new IPDetectionService();

// For testing and debugging
export { IPDetectionService };