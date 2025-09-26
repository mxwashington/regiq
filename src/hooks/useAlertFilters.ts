// Alert Filters Hook
// Manages agency filter state with URL sync and persistence

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SafeAuthContext';
import { debounce } from 'lodash';

export type AgencySource = 'FDA' | 'FSIS' | 'CDC' | 'EPA';

export interface AlertFilters {
  sources: AgencySource[];
  sinceDays: number;
  minSeverity: number | null;
  searchQuery: string;
}

const DEFAULT_FILTERS: AlertFilters = {
  sources: ['FDA', 'FSIS', 'CDC', 'EPA'],
  sinceDays: 30,
  minSeverity: null,
  searchQuery: '',
};

const STORAGE_KEY = 'regiq.alertFilters';

export function useAlertFilters() {
  const router = useRouter();
  const { user } = useAuth();
  const [filters, setFilters] = useState<AlertFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);

  // Parse URL parameters into filters
  const parseUrlFilters = useCallback((query: any): Partial<AlertFilters> => {
    const urlFilters: Partial<AlertFilters> = {};

    if (query.source) {
      const sourcesParam = Array.isArray(query.source) ? query.source : [query.source];
      const validSources = sourcesParam.filter((s: string) =>
        ['FDA', 'FSIS', 'CDC', 'EPA'].includes(s)
      ) as AgencySource[];
      if (validSources.length > 0) {
        urlFilters.sources = validSources;
      }
    }

    if (query.sinceDays) {
      const days = parseInt(query.sinceDays as string, 10);
      if (!isNaN(days) && days > 0) {
        urlFilters.sinceDays = days;
      }
    }

    if (query.minSeverity) {
      const severity = parseInt(query.minSeverity as string, 10);
      if (!isNaN(severity) && severity >= 0 && severity <= 100) {
        urlFilters.minSeverity = severity;
      }
    }

    if (query.q && typeof query.q === 'string') {
      urlFilters.searchQuery = query.q;
    }

    return urlFilters;
  }, []);

  // Update URL with current filters
  const updateUrl = useCallback((newFilters: AlertFilters) => {
    const query: any = {};

    if (newFilters.sources.length > 0 && newFilters.sources.length < 4) {
      query.source = newFilters.sources;
    }

    if (newFilters.sinceDays !== DEFAULT_FILTERS.sinceDays) {
      query.sinceDays = newFilters.sinceDays.toString();
    }

    if (newFilters.minSeverity !== null) {
      query.minSeverity = newFilters.minSeverity.toString();
    }

    if (newFilters.searchQuery.trim()) {
      query.q = newFilters.searchQuery.trim();
    }

    router.replace({
      pathname: router.pathname,
      query,
    }, undefined, { shallow: true });
  }, [router]);

  // Save to localStorage
  const saveToLocalStorage = useCallback((filters: AlertFilters) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }
  }, []);

  // Load from localStorage
  const loadFromLocalStorage = useCallback((): Partial<AlertFilters> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          sources: Array.isArray(parsed.sources) ? parsed.sources : DEFAULT_FILTERS.sources,
          sinceDays: typeof parsed.sinceDays === 'number' ? parsed.sinceDays : DEFAULT_FILTERS.sinceDays,
          minSeverity: typeof parsed.minSeverity === 'number' ? parsed.minSeverity : DEFAULT_FILTERS.minSeverity,
          searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : DEFAULT_FILTERS.searchQuery,
        };
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error);
    }
    return {};
  }, []);

  // Save to user preferences (authenticated users only)
  const saveToUserPreferences = useCallback(
    debounce(async (filters: AlertFilters) => {
      if (!user?.id) return;

      try {
        await supabase.rpc('set_user_preference', {
          p_user_id: user.id,
          p_key: 'alert_filters',
          p_value: filters,
        });
      } catch (error) {
        console.warn('Failed to save filters to user preferences:', error);
      }
    }, 1000),
    [user?.id]
  );

  // Load from user preferences
  const loadFromUserPreferences = useCallback(async (): Promise<Partial<AlertFilters>> => {
    if (!user?.id) return {};

    try {
      const { data, error } = await supabase.rpc('get_user_preference', {
        p_user_id: user.id,
        p_key: 'alert_filters',
        p_default: DEFAULT_FILTERS,
      });

      if (error) throw error;

      return data || {};
    } catch (error) {
      console.warn('Failed to load filters from user preferences:', error);
      return {};
    }
  }, [user?.id]);

  // Initialize filters on mount
  useEffect(() => {
    const initializeFilters = async () => {
      setIsLoading(true);

      try {
        // Priority: URL > User Preferences > localStorage > Defaults
        const urlFilters = parseUrlFilters(router.query);
        const userFilters = await loadFromUserPreferences();
        const localFilters = loadFromLocalStorage();

        const mergedFilters = {
          ...DEFAULT_FILTERS,
          ...localFilters,
          ...userFilters,
          ...urlFilters,
        };

        setFilters(mergedFilters);

        // If URL didn't have complete filters, update it
        if (Object.keys(urlFilters).length === 0) {
          updateUrl(mergedFilters);
        }
      } catch (error) {
        console.error('Failed to initialize filters:', error);
        setFilters(DEFAULT_FILTERS);
      } finally {
        setIsLoading(false);
      }
    };

    if (router.isReady) {
      initializeFilters();
    }
  }, [router.isReady, router.query, user?.id, parseUrlFilters, loadFromUserPreferences, loadFromLocalStorage, updateUrl]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<AlertFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    // Persist changes
    updateUrl(updatedFilters);
    saveToLocalStorage(updatedFilters);
    saveToUserPreferences(updatedFilters);
  }, [filters, updateUrl, saveToLocalStorage, saveToUserPreferences]);

  // Specific update methods
  const setSources = useCallback((sources: AgencySource[]) => {
    updateFilters({ sources });
  }, [updateFilters]);

  const setSinceDays = useCallback((sinceDays: number) => {
    updateFilters({ sinceDays });
  }, [updateFilters]);

  const setMinSeverity = useCallback((minSeverity: number | null) => {
    updateFilters({ minSeverity });
  }, [updateFilters]);

  const setSearchQuery = useCallback((searchQuery: string) => {
    updateFilters({ searchQuery });
  }, [updateFilters]);

  const toggleSource = useCallback((source: AgencySource) => {
    const newSources = filters.sources.includes(source)
      ? filters.sources.filter(s => s !== source)
      : [...filters.sources, source];
    setSources(newSources);
  }, [filters.sources, setSources]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    updateUrl(DEFAULT_FILTERS);
    saveToLocalStorage(DEFAULT_FILTERS);
    saveToUserPreferences(DEFAULT_FILTERS);
  }, [updateUrl, saveToLocalStorage, saveToUserPreferences]);

  // Generate cache key for queries
  const getCacheKey = useCallback(() => {
    return `alerts_${filters.sources.sort().join('-')}_${filters.sinceDays}_${filters.minSeverity || 'all'}_${filters.searchQuery}`;
  }, [filters]);

  return {
    filters,
    isLoading,
    setSources,
    setSinceDays,
    setMinSeverity,
    setSearchQuery,
    toggleSource,
    resetFilters,
    updateFilters,
    getCacheKey,
  };
}