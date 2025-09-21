/**
 * Optimized Alerts Hook - Prevents N+1 queries, implements smart caching
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { fallbackAlerts } from '@/lib/debug-utils';

interface OptimizedAlert {
  id: string;
  title: string;
  summary: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  published_date: string;
  external_url?: string;
  tags?: string[];
  dismissed_by?: string[];
  isFallback?: boolean;
}

interface UseOptimizedAlertsOptions {
  limit?: number;
  filters?: {
    source?: string | string[];
    urgency?: string | string[];
    dateRange?: { start: string; end: string };
    excludeDismissed?: boolean;
  };
  cache?: boolean;
  cacheTTL?: number;
  realtime?: boolean;
}

interface AlertsState {
  alerts: OptimizedAlert[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  retryCount: number;
}

export const useOptimizedAlerts = (options: UseOptimizedAlertsOptions = {}) => {
  const {
    limit,
    filters = {},
    cache = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    realtime = false
  } = options;

  const [state, setState] = useState<AlertsState>({
    alerts: [],
    loading: true,
    error: null,
    totalCount: 0,
    hasMore: false,
    retryCount: 0
  });

  const { toast } = useToast();

  // Memoized filter object to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => {
    const dbFilters: Record<string, any> = {};

    if (filters.source) {
      dbFilters.source = Array.isArray(filters.source) ? filters.source : [filters.source];
    }

    if (filters.urgency) {
      dbFilters.urgency = Array.isArray(filters.urgency) ? filters.urgency : [filters.urgency];
    }

    if (filters.dateRange) {
      dbFilters.published_date = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      };
    }

    return dbFilters;
  }, [filters]);

  // Load alerts with retry logic and fallback
  const loadAlerts = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Test connection first
      const { error: pingError } = await apiClient.query('alerts', {
        select: 'count',
        limit: 0,
        cache: false
      });

      if (pingError) {
        throw new Error(`Database connection failed: ${pingError.message}`);
      }

      // Build query options
      const queryOptions = {
        select: `
          id,
          title,
          summary,
          urgency,
          source,
          published_date,
          external_url,
          tags,
          dismissed_by
        `,
        filters: memoizedFilters,
        orderBy: { column: 'published_date', ascending: false },
        limit,
        cache,
        cacheTTL
      };

      const { data, error, count } = await apiClient.query<OptimizedAlert[]>('alerts', queryOptions);

      if (error) {
        throw new Error(`Query failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from query');
      }

      // Filter out dismissed alerts if requested
      let processedAlerts = data;
      if (filters.excludeDismissed) {
        // This would need user context to work properly
        processedAlerts = data.filter(alert => 
          !alert.dismissed_by || alert.dismissed_by.length === 0
        );
      }

      console.log('[useOptimizedAlerts] Successfully loaded alerts:', {
        count: processedAlerts.length,
        totalCount: count,
        limit,
        hasMore: limit ? processedAlerts.length >= limit : false
      });

      setState({
        alerts: processedAlerts,
        loading: false,
        error: null,
        totalCount: count || 0,
        hasMore: limit ? processedAlerts.length >= limit : false,
        retryCount: 0
      });

    } catch (err: any) {
      console.error(`[useOptimizedAlerts] Attempt ${retryCount + 1} failed:`, err);
      
      if (retryCount >= maxRetries) {
        // All retries failed, use fallback
        console.warn('[useOptimizedAlerts] All retries failed, using fallback data');
        
        setState({
          alerts: fallbackAlerts.map(alert => ({ ...alert, urgency: alert.urgency as OptimizedAlert['urgency'], isFallback: true })),
          loading: false,
          error: err.message || 'Failed to load alerts',
          totalCount: fallbackAlerts.length,
          hasMore: false,
          retryCount: retryCount + 1
        });
        
        toast({
          title: 'Connection Issue',
          description: 'Using cached data. Click refresh to try again.',
          variant: 'destructive'
        });
      } else {
        // Retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setTimeout(() => loadAlerts(retryCount + 1), delay);
      }
    }
  }, [memoizedFilters, limit, cache, cacheTTL, filters.excludeDismissed, toast]);

  // Load more alerts for pagination
  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.loading) return;

    try {
      const queryOptions = {
        select: `
          id,
          title,
          summary,
          urgency,
          source,
          published_date,
          external_url,
          tags,
          dismissed_by
        `,
        filters: {
          ...memoizedFilters,
          published_date: {
            ...memoizedFilters.published_date,
            lt: state.alerts[state.alerts.length - 1]?.published_date
          }
        },
        orderBy: { column: 'published_date', ascending: false },
        limit,
        cache: false // Don't cache pagination queries
      };

      const { data, error } = await apiClient.query<OptimizedAlert[]>('alerts', queryOptions);

      if (error) throw error;

      if (data && data.length > 0) {
        setState(prev => ({
          ...prev,
          alerts: [...prev.alerts, ...data],
          hasMore: limit ? data.length >= limit : false
        }));
      } else {
        setState(prev => ({ ...prev, hasMore: false }));
      }

    } catch (err: any) {
      console.error('[useOptimizedAlerts] Load more failed:', err);
      toast({
        title: 'Error',
        description: 'Failed to load more alerts',
        variant: 'destructive'
      });
    }
  }, [state.hasMore, state.loading, state.alerts, memoizedFilters, limit, toast]);

  // Dismiss alert optimistically
  const dismissAlert = useCallback(async (alertId: string, userId: string) => {
    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === alertId
            ? {
                ...alert,
                dismissed_by: [...(alert.dismissed_by || []), userId]
              }
            : alert
        )
      }));

      const { error } = await apiClient.rpc('dismiss_alert_for_user', {
        alert_id: alertId,
        user_id: userId
      });

      if (error) {
        // Rollback optimistic update
        setState(prev => ({
          ...prev,
          alerts: prev.alerts.map(alert =>
            alert.id === alertId
              ? {
                  ...alert,
                  dismissed_by: (alert.dismissed_by || []).filter(id => id !== userId)
                }
              : alert
          )
        }));
        throw error;
      }

    } catch (err: any) {
      console.error('[useOptimizedAlerts] Dismiss failed:', err);
      toast({
        title: 'Error',
        description: 'Failed to dismiss alert',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Clear all alerts optimistically
  const clearAllAlerts = useCallback(async (userId: string) => {
    try {
      // Optimistic update
      const originalAlerts = state.alerts;
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert => ({
          ...alert,
          dismissed_by: [...(alert.dismissed_by || []), userId]
        }))
      }));

      const { error } = await apiClient.rpc('clear_all_alerts_for_user', {
        user_id: userId
      });

      if (error) {
        // Rollback optimistic update
        setState(prev => ({ ...prev, alerts: originalAlerts }));
        throw error;
      }

      toast({
        title: 'Success',
        description: 'All alerts cleared',
      });

    } catch (err: any) {
      console.error('[useOptimizedAlerts] Clear all failed:', err);
      toast({
        title: 'Error',
        description: 'Failed to clear alerts',
        variant: 'destructive'
      });
    }
  }, [state.alerts, toast]);

  // Refresh alerts manually
  const refresh = useCallback(() => {
    // Clear cache for this query
    apiClient.clearCache();
    loadAlerts(0);
  }, [loadAlerts]);

  // Set up real-time subscription
  useEffect(() => {
    if (!realtime) return;

    const unsubscribe = apiClient.subscribeToTable(
      'alerts',
      (payload) => {
        console.log('[useOptimizedAlerts] Real-time update:', payload);
        
        if (payload.eventType === 'INSERT') {
          setState(prev => ({
            ...prev,
            alerts: [payload.new, ...prev.alerts],
            totalCount: prev.totalCount + 1
          }));
        } else if (payload.eventType === 'UPDATE') {
          setState(prev => ({
            ...prev,
            alerts: prev.alerts.map(alert =>
              alert.id === payload.new.id ? payload.new : alert
            )
          }));
        } else if (payload.eventType === 'DELETE') {
          setState(prev => ({
            ...prev,
            alerts: prev.alerts.filter(alert => alert.id !== payload.old.id),
            totalCount: Math.max(0, prev.totalCount - 1)
          }));
        }
      },
      memoizedFilters
    );

    return unsubscribe;
  }, [realtime, memoizedFilters]);

  // Load alerts on mount and when filters change
  useEffect(() => {
    loadAlerts(0);
  }, [loadAlerts]);

  // Computed values
  const alertsByUrgency = useMemo(() => {
    return state.alerts.reduce((acc, alert) => {
      acc[alert.urgency] = (acc[alert.urgency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [state.alerts]);

  const recentAlerts = useMemo(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return state.alerts.filter(alert => alert.published_date >= oneDayAgo);
  }, [state.alerts]);

  return {
    // State
    alerts: state.alerts,
    loading: state.loading,
    error: state.error,
    totalCount: state.totalCount,
    hasMore: state.hasMore,
    retryCount: state.retryCount,
    
    // Actions
    loadMore,
    dismissAlert,
    clearAllAlerts,
    refresh,
    
    // Computed values
    alertsByUrgency,
    recentAlerts,
    
    // Cache stats (for debugging)
    cacheStats: apiClient.getCacheStats()
  };
};