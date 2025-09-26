// Admin Fetch Hook
// Typed fetcher with error handling and toast notifications

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { handleApiError, showError, withRetry, checkRateLimit } from '@/lib/admin-errors';

interface AdminFetchOptions extends RequestInit {
  showSuccessToast?: boolean;
  successMessage?: string;
  retries?: number;
  skipRateLimit?: boolean;
}

interface AdminFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAdminFetch<T = any>() {
  const [state, setState] = useState<AdminFetchState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (
    url: string,
    options: AdminFetchOptions = {}
  ): Promise<T | null> => {
    const {
      showSuccessToast = false,
      successMessage = 'Operation completed successfully',
      retries = 3,
      skipRateLimit = false,
      ...fetchOptions
    } = options;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Check rate limit unless skipped
      if (!skipRateLimit) {
        const rateLimitKey = `${url}_${fetchOptions.method || 'GET'}`;
        if (!checkRateLimit(rateLimitKey, 10, 60000)) { // 10 requests per minute
          throw new Error('Rate limit exceeded. Please try again later.');
        }
      }

      const executeRequest = async () => {
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
          ...fetchOptions,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          (error as any).response = response;
          (error as any).status = response.status;
          throw error;
        }

        return await response.json();
      };

      const data = await withRetry(executeRequest, retries);

      setState(prev => ({ ...prev, data, loading: false }));

      if (showSuccessToast) {
        toast.success(successMessage);
      }

      return data;
    } catch (error) {
      const result = handleApiError(error);

      setState(prev => ({
        ...prev,
        error: result.error || 'An unexpected error occurred',
        loading: false
      }));

      showError(error);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hooks for common admin operations
export function useSyncTrigger() {
  const { execute, loading } = useAdminFetch<{
    success: boolean;
    results: Array<{
      source: string;
      inserted: number;
      updated: number;
      skipped: number;
      errors: string[];
    }>;
    summary: {
      totalInserted: number;
      totalUpdated: number;
      totalErrors: number;
      duration: number;
    };
  }>();

  const triggerSync = useCallback(async (sinceDays: number = 1) => {
    return await execute('/api/admin/sync', {
      method: 'POST',
      body: JSON.stringify({ sinceDays }),
      showSuccessToast: true,
      successMessage: 'Sync completed successfully',
    });
  }, [execute]);

  const triggerBackfill = useCallback(async (sinceDays: number = 30) => {
    return await execute('/api/admin/backfill', {
      method: 'POST',
      body: JSON.stringify({ sinceDays }),
      showSuccessToast: true,
      successMessage: 'Backfill completed successfully',
    });
  }, [execute]);

  return {
    triggerSync,
    triggerBackfill,
    loading,
  };
}

export function useHealthCheck() {
  const { execute, loading, data } = useAdminFetch<{
    sources: Array<{
      name: string;
      status: 'healthy' | 'unhealthy' | 'timeout';
      latency: number;
      message: string;
      lastChecked: string;
    }>;
    summary: {
      healthy: number;
      unhealthy: number;
      avgLatency: number;
    };
  }>();

  const runHealthCheck = useCallback(async () => {
    return await execute('/api/admin/health', {
      method: 'POST',
      showSuccessToast: true,
      successMessage: 'Health check completed',
    });
  }, [execute]);

  return {
    runHealthCheck,
    healthData: data,
    loading,
  };
}

export function useDedupe() {
  const { execute, loading } = useAdminFetch<{
    removedCount: number;
    affectedSources: string[];
    duration: number;
  }>();

  const runDedupe = useCallback(async () => {
    return await execute('/api/admin/dedupe', {
      method: 'POST',
      showSuccessToast: true,
      successMessage: 'Deduplication completed',
    });
  }, [execute]);

  return {
    runDedupe,
    loading,
  };
}

export function useEmergencyRLS() {
  const { execute, loading } = useAdminFetch<{
    success: boolean;
    action: string;
    affected_tables: string[];
  }>();

  const enableRLS = useCallback(async () => {
    return await execute('/api/admin/rls', {
      method: 'POST',
      body: JSON.stringify({ action: 'enable' }),
      showSuccessToast: true,
      successMessage: 'Emergency RLS enabled successfully',
    });
  }, [execute]);

  const disableRLS = useCallback(async () => {
    return await execute('/api/admin/rls', {
      method: 'POST',
      body: JSON.stringify({ action: 'disable' }),
      showSuccessToast: true,
      successMessage: 'Emergency RLS disabled successfully',
    });
  }, [execute]);

  return {
    enableRLS,
    disableRLS,
    loading,
  };
}