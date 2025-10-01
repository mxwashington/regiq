/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by "opening" the circuit after too many failures.
 * Gradually attempts recovery through a "half-open" state.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests blocked immediately (fail-fast)
 * - HALF_OPEN: Testing if service recovered, allowing limited requests
 *
 * Benefits:
 * - Prevents overwhelming failing services with requests
 * - Fails fast when service is down (no wasted retries)
 * - Automatically attempts recovery after timeout
 * - Reduces cascading failures across system
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private state: CircuitState = 'CLOSED';
  private name: string;

  /**
   * @param threshold - Number of failures before opening circuit (default: 5)
   * @param timeout - Milliseconds to wait before attempting HALF_OPEN (default: 60s)
   * @param name - Name for logging purposes
   */
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    name: string = 'CircuitBreaker'
  ) {
    this.name = name;
    console.log(`[${this.name}] Circuit breaker initialized (threshold: ${threshold}, timeout: ${timeout}ms)`);
  }

  /**
   * Execute function with circuit breaker protection
   *
   * @throws {Error} When circuit is OPEN
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);

      if (timeSinceLastFailure > this.timeout) {
        console.log(`[${this.name}] Circuit transitioning from OPEN to HALF_OPEN`);
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        const retryInSeconds = Math.ceil((this.timeout - timeSinceLastFailure) / 1000);
        throw new Error(
          `Circuit breaker OPEN for ${this.name} - too many failures. ` +
          `Retry in ${retryInSeconds}s`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;

      // After 3 successes in HALF_OPEN, close circuit
      if (this.successCount >= 3) {
        console.log(`[${this.name}] Circuit CLOSED - service recovered after ${this.successCount} successful requests`);
        this.state = 'CLOSED';
        this.successCount = 0;
      } else {
        console.log(`[${this.name}] HALF_OPEN success ${this.successCount}/3`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN immediately reopens circuit
      console.log(`[${this.name}] Circuit OPEN - service still failing in HALF_OPEN state`);
      this.state = 'OPEN';
      this.successCount = 0;
    } else if (this.failureCount >= this.threshold) {
      // Too many failures in CLOSED state, open circuit
      console.log(
        `[${this.name}] Circuit OPEN - ${this.failureCount} consecutive failures (threshold: ${this.threshold})`
      );
      this.state = 'OPEN';
    } else {
      console.log(`[${this.name}] Failure ${this.failureCount}/${this.threshold}`);
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === 'OPEN';
  }

  /**
   * Manually reset circuit (use with caution)
   *
   * Only use this for manual recovery or testing.
   * Normally the circuit should recover automatically.
   */
  reset(): void {
    console.log(`[${this.name}] Circuit manually reset`);
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  /**
   * Get circuit breaker stats
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number | null;
    name: string;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      name: this.name
    };
  }
}

// ============================================================================
// Global Circuit Breakers for FDA Endpoints
// ============================================================================

/**
 * Pre-configured circuit breakers for each FDA category
 *
 * Usage:
 * ```typescript
 * import { fdaCircuitBreakers } from './_shared/circuit-breaker.ts';
 *
 * const result = await fdaCircuitBreakers.food.execute(async () => {
 *   return await fetchFDAData({ ... });
 * });
 * ```
 */
export const fdaCircuitBreakers = {
  food: new CircuitBreaker(5, 60000, 'FDA-Food'),
  drug: new CircuitBreaker(5, 60000, 'FDA-Drug'),
  device: new CircuitBreaker(5, 60000, 'FDA-Device'),
  recalls: new CircuitBreaker(5, 60000, 'FDA-Recalls'),
  shortages: new CircuitBreaker(5, 60000, 'FDA-Shortages')
};

/**
 * Get stats for all FDA circuit breakers
 */
export function getAllFDACircuitStats() {
  return {
    food: fdaCircuitBreakers.food.getStats(),
    drug: fdaCircuitBreakers.drug.getStats(),
    device: fdaCircuitBreakers.device.getStats(),
    recalls: fdaCircuitBreakers.recalls.getStats(),
    shortages: fdaCircuitBreakers.shortages.getStats()
  };
}

/**
 * Reset all FDA circuit breakers (for testing/recovery)
 */
export function resetAllFDACircuits(): void {
  console.log('[Circuit Breaker] Resetting all FDA circuits');
  fdaCircuitBreakers.food.reset();
  fdaCircuitBreakers.drug.reset();
  fdaCircuitBreakers.device.reset();
  fdaCircuitBreakers.recalls.reset();
  fdaCircuitBreakers.shortages.reset();
}
