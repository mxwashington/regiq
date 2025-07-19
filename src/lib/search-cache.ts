
import { supabase } from '@/integrations/supabase/client';

export interface CacheEntry {
  cache_key: string;
  query: string;
  result_data: any;
  expires_at: string;
}

export const searchCacheUtils = {
  // Generate a consistent cache key
  generateCacheKey: (query: string, filters: any = {}): string => {
    const normalizedQuery = query.toLowerCase().trim();
    const filterString = JSON.stringify(filters, Object.keys(filters).sort());
    return `${normalizedQuery}:${btoa(filterString)}`.substring(0, 255);
  },

  // Safely store cache entry with upsert to prevent duplicates
  storeCache: async (query: string, result: any, filters: any = {}): Promise<void> => {
    try {
      const cacheKey = searchCacheUtils.generateCacheKey(query, filters);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

      console.log('Storing cache entry:', { cacheKey, query: query.substring(0, 50) });

      const { error } = await supabase
        .from('search_cache')
        .upsert({
          cache_key: cacheKey,
          query: query.substring(0, 500), // Truncate long queries
          result_data: result,
          expires_at: expiresAt
        }, { 
          onConflict: 'cache_key',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Cache storage error:', error);
      }
    } catch (error) {
      console.error('Cache storage failed:', error);
    }
  },

  // Retrieve cache entry
  getCache: async (query: string, filters: any = {}): Promise<any> => {
    try {
      const cacheKey = searchCacheUtils.generateCacheKey(query, filters);
      
      const { data, error } = await supabase
        .from('search_cache')
        .select('result_data, expires_at')
        .eq('cache_key', cacheKey)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      // Check if cache is expired
      if (new Date(data.expires_at) < new Date()) {
        // Clean up expired entry
        await supabase
          .from('search_cache')
          .delete()
          .eq('cache_key', cacheKey);
        return null;
      }

      return data.result_data;
    } catch (error) {
      console.error('Cache retrieval failed:', error);
      return null;
    }
  },

  // Clean expired entries
  cleanExpiredCache: async (): Promise<void> => {
    try {
      const { error } = await supabase
        .from('search_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Cache cleanup error:', error);
      } else {
        console.log('Expired cache entries cleaned');
      }
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }
};
