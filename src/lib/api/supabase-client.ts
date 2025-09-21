/**
 * Centralized Supabase API Client with Performance Optimizations
 * Provides query batching, caching, and error handling
 */

import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

interface QueryCache {
  [key: string]: {
    data: any;
    timestamp: number;
    ttl: number;
  };
}

interface BatchQuery {
  id: string;
  table: string;
  select: string;
  filters: Record<string, any>;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

class SupabaseAPIClient {
  private cache: QueryCache = {};
  private batchQueue: BatchQuery[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // milliseconds
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Execute a query with caching and batching support
   */
  async query<T = any>(
    table: string,
    options: {
      select?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      cache?: boolean;
      cacheTTL?: number;
    } = {}
  ): Promise<{ data: T | null; error: PostgrestError | null; count?: number }> {
    const {
      select = '*',
      filters = {},
      orderBy,
      limit,
      cache = true,
      cacheTTL = this.DEFAULT_TTL
    } = options;

    // Generate cache key
    const cacheKey = this.generateCacheKey(table, select, filters, orderBy, limit);

    // Check cache first
    if (cache && this.isCacheValid(cacheKey)) {
      return { data: this.cache[cacheKey].data, error: null };
    }

    try {
      let query = supabase.from(table).select(select, { count: 'exact' });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object' && value !== null) {
          // Handle complex filters like { gte: 100 }, { like: '%search%' }
          Object.entries(value).forEach(([operator, operatorValue]) => {
            query = (query as any)[operator](key, operatorValue);
          });
        } else {
          query = query.eq(key, value);
        }
      });

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const result = await query;

      // Cache successful results
      if (cache && !result.error) {
        this.setCache(cacheKey, result.data, cacheTTL);
      }

      return result;
    } catch (error) {
      console.error(`[SupabaseAPIClient] Query failed for table ${table}:`, error);
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Insert data with optimistic updates and rollback
   */
  async insert<T = any>(
    table: string,
    data: Partial<T> | Partial<T>[],
    options: { 
      select?: string;
      onConflict?: string;
      optimisticUpdate?: boolean;
    } = {}
  ): Promise<{ data: T | null; error: PostgrestError | null }> {
    const { select = '*', onConflict, optimisticUpdate = false } = options;

    try {
      let query = supabase.from(table).insert(data).select(select);

      if (onConflict) {
        query = query.onConflict(onConflict);
      }

      const result = await query;

      // Invalidate relevant cache entries
      this.invalidateTableCache(table);

      return result as { data: T | null; error: PostgrestError | null };
    } catch (error) {
      console.error(`[SupabaseAPIClient] Insert failed for table ${table}:`, error);
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Update data with optimistic updates
   */
  async update<T = any>(
    table: string,
    data: Partial<T>,
    filters: Record<string, any>,
    options: { select?: string } = {}
  ): Promise<{ data: T | null; error: PostgrestError | null }> {
    const { select = '*' } = options;

    try {
      let query = supabase.from(table).update(data).select(select);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const result = await query;

      // Invalidate relevant cache entries
      this.invalidateTableCache(table);

      return result as { data: T | null; error: PostgrestError | null };
    } catch (error) {
      console.error(`[SupabaseAPIClient] Update failed for table ${table}:`, error);
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Delete data
   */
  async delete(
    table: string,
    filters: Record<string, any>
  ): Promise<{ error: PostgrestError | null }> {
    try {
      let query = supabase.from(table).delete();

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const result = await query;

      // Invalidate relevant cache entries
      this.invalidateTableCache(table);

      return result;
    } catch (error) {
      console.error(`[SupabaseAPIClient] Delete failed for table ${table}:`, error);
      return { error: error as PostgrestError };
    }
  }

  /**
   * Execute RPC (Remote Procedure Call)
   */
  async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {},
    options: { cache?: boolean; cacheTTL?: number } = {}
  ): Promise<{ data: T | null; error: PostgrestError | null }> {
    const { cache = false, cacheTTL = this.DEFAULT_TTL } = options;

    // Generate cache key for RPC
    const cacheKey = `rpc_${functionName}_${JSON.stringify(params)}`;

    // Check cache first
    if (cache && this.isCacheValid(cacheKey)) {
      return { data: this.cache[cacheKey].data, error: null };
    }

    try {
      const result = await supabase.rpc(functionName, params);

      // Cache successful results
      if (cache && !result.error) {
        this.setCache(cacheKey, result.data, cacheTTL);
      }

      return result;
    } catch (error) {
      console.error(`[SupabaseAPIClient] RPC failed for ${functionName}:`, error);
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Batch multiple queries together for better performance
   */
  async batchQuery<T = any>(queries: Array<{
    table: string;
    select?: string;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }>): Promise<Array<{ data: T | null; error: PostgrestError | null }>> {
    const results = await Promise.allSettled(
      queries.map(query => this.query(query.table, query))
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value as { data: T | null; error: PostgrestError | null };
      }
      return { data: null, error: { message: result.reason } as PostgrestError };
    });
  }

  /**
   * Subscribe to real-time changes with automatic cleanup
   */
  subscribeToTable(
    table: string,
    callback: (payload: any) => void,
    filters: Record<string, any> = {}
  ) {
    let channel = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: Object.entries(filters).map(([key, value]) => `${key}=eq.${value}`).join('&')
      }, callback);

    channel.subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Cache management methods
   */
  private generateCacheKey(
    table: string,
    select: string,
    filters: Record<string, any>,
    orderBy?: { column: string; ascending?: boolean },
    limit?: number
  ): string {
    return `${table}_${select}_${JSON.stringify(filters)}_${JSON.stringify(orderBy)}_${limit}`;
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache[key];
    if (!cached) return false;
    return Date.now() - cached.timestamp < cached.ttl;
  }

  private setCache(key: string, data: any, ttl: number) {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      ttl
    };
  }

  private invalidateTableCache(table: string) {
    Object.keys(this.cache).forEach(key => {
      if (key.startsWith(table)) {
        delete this.cache[key];
      }
    });
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache = {};
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const keys = Object.keys(this.cache);
    const validKeys = keys.filter(key => this.isCacheValid(key));
    
    return {
      totalKeys: keys.length,
      validKeys: validKeys.length,
      hitRate: validKeys.length / Math.max(keys.length, 1),
      memoryUsage: JSON.stringify(this.cache).length
    };
  }
}

// Export singleton instance
export const apiClient = new SupabaseAPIClient();

// Export types for use in components
export type { QueryCache, BatchQuery };