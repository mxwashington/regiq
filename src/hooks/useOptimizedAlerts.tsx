/**
 * Optimized Alerts Hook - Performance improvements without complex generics
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fallbackAlerts } from '@/lib/debug-utils';

import { logger } from '@/lib/logger';
interface OptimizedAlert {
  id: string;
  title: string;
  summary: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  published_date: string;
  external_url?: string;
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
  realtime?: boolean;
}

export const useOptimizedAlerts = (options: UseOptimizedAlertsOptions = {}) => {
  const { limit, filters = {}, realtime = false } = options;
  
  const [alerts, setAlerts] = useState<OptimizedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const { toast } = useToast();

  // Load alerts with retry logic
  const loadAlerts = useCallback(async (currentRetryCount = 0) => {
    const maxRetries = 3;

    try {
      setLoading(true);
      setError(null);

      // Test connection
      const { error: pingError } = await supabase
        .from('alerts')
        .select('count')
        .limit(0);

      if (pingError) {
        throw new Error(`Database connection failed: ${pingError.message}`);
      }

      // Build query
      let query = supabase
        .from('alerts')
        .select(`
          id,
          title,
          summary,
          urgency,
          source,
          published_date,
          external_url,
          dismissed_by,
          ai_summary,
          urgency_score,
          full_content
        `, { count: 'exact' })
        .order('published_date', { ascending: false });

      // Apply source filter
      if (filters.source) {
        if (Array.isArray(filters.source)) {
          query = query.in('source', filters.source);
        } else {
          query = query.eq('source', filters.source);
        }
      }

      // Apply urgency filter
      if (filters.urgency) {
        if (Array.isArray(filters.urgency)) {
          query = query.in('urgency', filters.urgency);
        } else {
          query = query.eq('urgency', filters.urgency);
        }
      }

      // Apply date range filter
      if (filters.dateRange) {
        query = query
          .gte('published_date', filters.dateRange.start)
          .lte('published_date', filters.dateRange.end);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        throw new Error(`Query failed: ${fetchError.message}`);
      }

      if (!data) {
        throw new Error('No data returned from query');
      }

      // Type cast urgency and filter dismissed if needed
      let processedAlerts = data.map(alert => ({
        ...alert,
        urgency: (alert.urgency as OptimizedAlert['urgency']) || 'medium'
      }));

      if (filters.excludeDismissed) {
        processedAlerts = processedAlerts.filter(alert => 
          !alert.dismissed_by || alert.dismissed_by.length === 0
        );
      }

      setAlerts(processedAlerts);
      setTotalCount(count || 0);
      setHasMore(limit ? processedAlerts.length >= limit : false);
      setRetryCount(0);
      setLoading(false);

    } catch (err: any) {
      logger.error(`[useOptimizedAlerts] Attempt ${currentRetryCount + 1} failed:`, err);
      
      if (currentRetryCount >= maxRetries) {
        // Use fallback data
        logger.warn('[useOptimizedAlerts] Using fallback data');
        setAlerts(fallbackAlerts.map(alert => ({ 
          ...alert, 
          urgency: alert.urgency as OptimizedAlert['urgency'], 
          isFallback: true 
        })));
        setTotalCount(fallbackAlerts.length);
        setError(err.message || 'Failed to load alerts');
        setRetryCount(currentRetryCount + 1);
        setLoading(false);
        
        toast({
          title: 'Connection Issue',
          description: 'Using cached data. Click refresh to try again.',
          variant: 'destructive'
        });
      } else {
        // Retry with backoff
        const delay = Math.min(1000 * Math.pow(2, currentRetryCount), 5000);
        setTimeout(() => loadAlerts(currentRetryCount + 1), delay);
      }
    }
  }, [filters, limit, toast]);

  // Load more for pagination
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      const lastAlert = alerts[alerts.length - 1];
      if (!lastAlert) return;

      let query = supabase
        .from('alerts')
        .select(`
          id,
          title,
          summary,
          urgency,
          source,
          published_date,
          external_url,
          dismissed_by,
          ai_summary,
          urgency_score,
          full_content
        `)
        .order('published_date', { ascending: false })
        .lt('published_date', lastAlert.published_date);

      // Apply existing filters
      if (filters.source) {
        if (Array.isArray(filters.source)) {
          query = query.in('source', filters.source);
        } else {
          query = query.eq('source', filters.source);
        }
      }

      if (filters.urgency) {
        if (Array.isArray(filters.urgency)) {
          query = query.in('urgency', filters.urgency);
        } else {
          query = query.eq('urgency', filters.urgency);
        }
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const processedData = data.map(alert => ({
          ...alert,
          urgency: (alert.urgency as OptimizedAlert['urgency']) || 'medium'
        }));

        setAlerts(prev => [...prev, ...processedData]);
        setHasMore(limit ? data.length >= limit : false);
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      logger.error('[useOptimizedAlerts] Load more failed:', err);
      toast({
        title: 'Error',
        description: 'Failed to load more alerts',
        variant: 'destructive'
      });
    }
  }, [hasMore, loading, alerts, filters, limit, toast]);

  // Dismiss alert optimistically
  const dismissAlert = useCallback(async (alertId: string, userId: string) => {
    try {
      // Optimistic update
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { ...alert, dismissed_by: [...(alert.dismissed_by || []), userId] }
          : alert
      ));

      const { error } = await supabase.rpc('dismiss_alert_for_user', {
        alert_id: alertId,
        user_id: userId
      });

      if (error) {
        // Rollback
        setAlerts(prev => prev.map(alert =>
          alert.id === alertId
            ? { ...alert, dismissed_by: (alert.dismissed_by || []).filter(id => id !== userId) }
            : alert
        ));
        throw error;
      }
    } catch (err: any) {
      logger.error('[useOptimizedAlerts] Dismiss failed:', err);
      toast({
        title: 'Error',
        description: 'Failed to dismiss alert',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Clear all alerts
  const clearAllAlerts = useCallback(async (userId: string) => {
    try {
      const originalAlerts = alerts;
      setAlerts(prev => prev.map(alert => ({
        ...alert,
        dismissed_by: [...(alert.dismissed_by || []), userId]
      })));

      const { error } = await supabase.rpc('clear_all_alerts_for_user', {
        user_id: userId
      });

      if (error) {
        setAlerts(originalAlerts);
        throw error;
      }

      toast({
        title: 'Success',
        description: 'All alerts cleared'
      });
    } catch (err: any) {
      logger.error('[useOptimizedAlerts] Clear all failed:', err);
      toast({
        title: 'Error',
        description: 'Failed to clear alerts',
        variant: 'destructive'
      });
    }
  }, [alerts, toast]);

  // Refresh manually
  const refresh = useCallback(() => {
    loadAlerts(0);
  }, [loadAlerts]);

  // Set up real-time subscription
  useEffect(() => {
    if (!realtime) return;

    const channel = supabase
      .channel('alerts_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAlert = {
            ...payload.new,
            urgency: (payload.new.urgency as OptimizedAlert['urgency']) || 'medium'
          } as OptimizedAlert;
          
          setAlerts(prev => [newAlert, ...prev]);
          setTotalCount(prev => prev + 1);
        } else if (payload.eventType === 'UPDATE') {
          const updatedAlert = {
            ...payload.new,
            urgency: (payload.new.urgency as OptimizedAlert['urgency']) || 'medium'
          } as OptimizedAlert;
          
          setAlerts(prev => prev.map(alert =>
            alert.id === updatedAlert.id ? updatedAlert : alert
          ));
        } else if (payload.eventType === 'DELETE') {
          setAlerts(prev => prev.filter(alert => alert.id !== payload.old.id));
          setTotalCount(prev => Math.max(0, prev - 1));
        }
      });

    channel.subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtime]);

  // Load alerts on mount and filter changes
  useEffect(() => {
    loadAlerts(0);
  }, [loadAlerts]);

  // Computed values
  const alertsByUrgency = useMemo(() => {
    return alerts.reduce((acc, alert) => {
      acc[alert.urgency] = (acc[alert.urgency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [alerts]);

  const recentAlerts = useMemo(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return alerts.filter(alert => alert.published_date >= oneDayAgo);
  }, [alerts]);

  return {
    alerts,
    loading,
    error,
    totalCount,
    hasMore,
    retryCount,
    loadMore,
    dismissAlert,
    clearAllAlerts,
    refresh,
    alertsByUrgency,
    recentAlerts
  };
};