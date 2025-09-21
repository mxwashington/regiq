/**
 * Simplified API Client - Basic version without complex generics
 */

import { supabase } from '@/integrations/supabase/client';

export const simpleApiClient = {
  // Basic query method
  async query(table: string, options: any = {}) {
    try {
      let query = supabase.from(table).select(options.select || '*', { count: 'exact' });
      
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]: [string, any]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        });
      }
      
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      return await query;
    } catch (error) {
      console.error(`Query failed for table ${table}:`, error);
      return { data: null, error };
    }
  },

  // Basic insert method
  async insert(table: string, data: any) {
    try {
      return await supabase.from(table).insert(data).select();
    } catch (error) {
      return { data: null, error };
    }
  },

  // Basic update method
  async update(table: string, data: any, filters: any) {
    try {
      let query = supabase.from(table).update(data).select();
      Object.entries(filters).forEach(([key, value]: [string, any]) => {
        query = query.eq(key, value);
      });
      return await query;
    } catch (error) {
      return { data: null, error };
    }
  },

  // Basic RPC method
  async rpc(functionName: string, params: any = {}) {
    try {
      return await supabase.rpc(functionName, params);
    } catch (error) {
      return { data: null, error };
    }
  }
};