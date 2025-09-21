/**
 * Centralized State Management Hook using Zustand patterns
 * Replaces scattered useState calls with optimized state management
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// User preferences state
interface UserPreferencesState {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    urgencyThreshold: 'low' | 'medium' | 'high' | 'critical';
  };
  dashboard: {
    layout: 'compact' | 'comfortable' | 'spacious';
    defaultTab: string;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  filters: {
    sources: string[];
    agencies: string[];
    dateRange: { start: string; end: string } | null;
  };
  // Actions
  updateTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateNotifications: (notifications: Partial<UserPreferencesState['notifications']>) => void;
  updateDashboard: (dashboard: Partial<UserPreferencesState['dashboard']>) => void;
  updateFilters: (filters: Partial<UserPreferencesState['filters']>) => void;
  reset: () => void;
}

// Application state
interface AppState {
  // UI State
  sidebarOpen: boolean;
  loading: {
    alerts: boolean;
    tasks: boolean;
    facilities: boolean;
    global: boolean;
  };
  errors: {
    alerts: string | null;
    tasks: string | null;
    facilities: string | null;
    global: string | null;
  };
  
  // Data Cache
  cache: {
    alerts: Map<string, any>;
    tasks: Map<string, any>;
    facilities: Map<string, any>;
    lastUpdated: Map<string, number>;
  };

  // Actions
  setSidebarOpen: (open: boolean) => void;
  setLoading: (key: keyof AppState['loading'], loading: boolean) => void;
  setError: (key: keyof AppState['errors'], error: string | null) => void;
  setCacheData: (key: string, data: any) => void;
  getCacheData: (key: string, maxAge?: number) => any;
  clearCache: (key?: string) => void;
  reset: () => void;
}

// Performance monitoring state
interface PerformanceState {
  metrics: {
    renderTime: number;
    apiResponseTime: number;
    errorCount: number;
    cacheHitRate: number;
  };
  history: Array<{
    timestamp: number;
    event: string;
    duration: number;
    metadata?: any;
  }>;
  
  // Actions
  recordMetric: (metric: keyof PerformanceState['metrics'], value: number) => void;
  recordEvent: (event: string, duration: number, metadata?: any) => void;
  getAverageResponseTime: () => number;
  getErrorRate: () => number;
  clearHistory: () => void;
}

// Create stores with persistence and selectors
export const useUserPreferences = create<UserPreferencesState>()(
  persist(
    subscribeWithSelector(
      immer((set, get) => ({
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          urgencyThreshold: 'medium'
        },
        dashboard: {
          layout: 'comfortable',
          defaultTab: 'alerts',
          autoRefresh: true,
          refreshInterval: 60000 // 1 minute
        },
        filters: {
          sources: [],
          agencies: [],
          dateRange: null
        },

        updateTheme: (theme) => set((state) => {
          state.theme = theme;
        }),

        updateNotifications: (notifications) => set((state) => {
          Object.assign(state.notifications, notifications);
        }),

        updateDashboard: (dashboard) => set((state) => {
          Object.assign(state.dashboard, dashboard);
        }),

        updateFilters: (filters) => set((state) => {
          Object.assign(state.filters, filters);
        }),

        reset: () => set((state) => {
          state.theme = 'system';
          state.language = 'en';
          state.notifications = {
            email: true,
            push: true,
            urgencyThreshold: 'medium'
          };
          state.dashboard = {
            layout: 'comfortable',
            defaultTab: 'alerts',
            autoRefresh: true,
            refreshInterval: 60000
          };
          state.filters = {
            sources: [],
            agencies: [],
            dateRange: null
          };
        })
      }))
    ),
    {
      name: 'regiq-user-preferences',
      version: 1
    }
  )
);

export const useAppState = create<AppState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      sidebarOpen: false,
      loading: {
        alerts: false,
        tasks: false,
        facilities: false,
        global: false
      },
      errors: {
        alerts: null,
        tasks: null,
        facilities: null,
        global: null
      },
      cache: {
        alerts: new Map(),
        tasks: new Map(),
        facilities: new Map(),
        lastUpdated: new Map()
      },

      setSidebarOpen: (open) => set((state) => {
        state.sidebarOpen = open;
      }),

      setLoading: (key, loading) => set((state) => {
        state.loading[key] = loading;
      }),

      setError: (key, error) => set((state) => {
        state.errors[key] = error;
      }),

      setCacheData: (key, data) => set((state) => {
        state.cache.alerts.set(key, data);
        state.cache.lastUpdated.set(key, Date.now());
      }),

      getCacheData: (key, maxAge = 5 * 60 * 1000) => { // 5 minutes default
        const state = get();
        const data = state.cache.alerts.get(key);
        const lastUpdated = state.cache.lastUpdated.get(key);
        
        if (!data || !lastUpdated) return null;
        if (Date.now() - lastUpdated > maxAge) return null;
        
        return data;
      },

      clearCache: (key) => set((state) => {
        if (key) {
          state.cache.alerts.delete(key);
          state.cache.tasks.delete(key);
          state.cache.facilities.delete(key);
          state.cache.lastUpdated.delete(key);
        } else {
          state.cache.alerts.clear();
          state.cache.tasks.clear();
          state.cache.facilities.clear();
          state.cache.lastUpdated.clear();
        }
      }),

      reset: () => set((state) => {
        state.sidebarOpen = false;
        state.loading = {
          alerts: false,
          tasks: false,
          facilities: false,
          global: false
        };
        state.errors = {
          alerts: null,
          tasks: null,
          facilities: null,
          global: null
        };
        state.cache = {
          alerts: new Map(),
          tasks: new Map(),
          facilities: new Map(),
          lastUpdated: new Map()
        };
      })
    }))
  )
);

export const usePerformanceState = create<PerformanceState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      metrics: {
        renderTime: 0,
        apiResponseTime: 0,
        errorCount: 0,
        cacheHitRate: 0
      },
      history: [],

      recordMetric: (metric, value) => set((state) => {
        state.metrics[metric] = value;
      }),

      recordEvent: (event, duration, metadata) => set((state) => {
        state.history.push({
          timestamp: Date.now(),
          event,
          duration,
          metadata
        });
        
        // Keep only last 100 events
        if (state.history.length > 100) {
          state.history = state.history.slice(-100);
        }
      }),

      getAverageResponseTime: () => {
        const state = get();
        const apiEvents = state.history.filter(event => event.event.includes('api_call'));
        if (apiEvents.length === 0) return 0;
        
        const totalTime = apiEvents.reduce((sum, event) => sum + event.duration, 0);
        return totalTime / apiEvents.length;
      },

      getErrorRate: () => {
        const state = get();
        const totalEvents = state.history.length;
        const errorEvents = state.history.filter(event => event.event.includes('error')).length;
        
        return totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;
      },

      clearHistory: () => set((state) => {
        state.history = [];
      })
    }))
  )
);

// Computed selectors for common use cases
export const useLoadingState = () => {
  return useAppState((state) => ({
    isLoading: Object.values(state.loading).some(Boolean),
    loadingStates: state.loading
  }));
};

export const useErrorState = () => {
  return useAppState((state) => ({
    hasErrors: Object.values(state.errors).some(Boolean),
    errors: state.errors
  }));
};

export const useFilters = () => {
  return useUserPreferences((state) => ({
    filters: state.filters,
    updateFilters: state.updateFilters
  }));
};

export const useDashboardPreferences = () => {
  return useUserPreferences((state) => ({
    dashboard: state.dashboard,
    updateDashboard: state.updateDashboard
  }));
};

// Performance hook for monitoring
export const usePerformanceMonitor = () => {
  const recordEvent = usePerformanceState((state) => state.recordEvent);
  const recordMetric = usePerformanceState((state) => state.recordMetric);
  const getAverageResponseTime = usePerformanceState((state) => state.getAverageResponseTime);
  const getErrorRate = usePerformanceState((state) => state.getErrorRate);

  const measureApiCall = async (
    apiCall: () => Promise<any>,
    operation: string
  ): Promise<any> => {
    const startTime = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      recordEvent(`api_call_${operation}`, duration);
      recordMetric('apiResponseTime', duration);
      
      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      recordEvent(`api_error_${operation}`, duration, { error: error.message });
      recordMetric('errorCount', usePerformanceState.getState().metrics.errorCount + 1);
      throw error;
    }
  };

  const measureRender = (componentName: string, renderFn: () => void) => {
    const startTime = performance.now();
    renderFn();
    const duration = performance.now() - startTime;
    
    recordEvent(`render_${componentName}`, duration);
    recordMetric('renderTime', duration);
  };

  return {
    measureApiCall,
    measureRender,
    getAverageResponseTime,
    getErrorRate
  };
};

// Utility hook for cache management
export const useCacheManager = () => {
  const { setCacheData, getCacheData, clearCache } = useAppState();

  const withCache = async (
    key: string,
    fetchFn: () => Promise<any>,
    maxAge?: number
  ): Promise<any> => {
    // Try to get from cache first
    const cached = getCacheData(key, maxAge);
    if (cached) {
      usePerformanceState.getState().recordMetric(
        'cacheHitRate',
        usePerformanceState.getState().metrics.cacheHitRate + 1
      );
      return cached;
    }

    // Fetch fresh data and cache it
    const data = await fetchFn();
    setCacheData(key, data);
    return data;
  };

  return {
    withCache,
    clearCache,
    getCacheData,
    setCacheData
  };
};
