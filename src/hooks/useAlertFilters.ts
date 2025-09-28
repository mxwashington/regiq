// Alert Filters Hook
// Manages agency filter state with URL sync and persistence

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SafeAuthContext';
import { debounce } from 'lodash';

export type AgencySource = 'FDA' | 'EPA' | 'USDA' | 'FSIS' | 'Federal_Register' | 'CDC';

export interface AlertFilters {
  sources: AgencySource[];
  sinceDays: number;
  minSeverity: number | null;
  searchQuery: string;
}

const DEFAULT_FILTERS: AlertFilters = {
  sources: ['FDA', 'EPA', 'USDA', 'FSIS', 'Federal_Register', 'CDC'],
  sinceDays: 30,
  minSeverity: null,
  searchQuery: '',
};

const STORAGE_KEY = 'regiq.alertFilters';

export function useAlertFilters() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [filters, setFilters] = useState<AlertFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);

  // Parse URL parameters into filters
  const parseUrlFilters = useCallback((searchParams: URLSearchParams): Partial<AlertFilters> => {
    const urlFilters: Partial<AlertFilters> = {};

    const sourceParam = searchParams.get('source');
    if (sourceParam) {
      const sourcesParam = sourceParam.split(',');
      const validSources = sourcesParam.filter((s: string) =>
        ['FDA', 'EPA', 'USDA', 'FSIS', 'Federal_Register', 'CDC'].includes(s)
      ) as AgencySource[];
      if (validSources.length > 0) {
        urlFilters.sources = validSources;
      }
    }

    const sinceDaysParam = searchParams.get('sinceDays');
    if (sinceDaysParam) {
      const days = parseInt(sinceDaysParam, 10);
      if (!isNaN(days) && days > 0) {
        urlFilters.sinceDays = days;
      }
    }

    const severityParam = searchParams.get('minSeverity');
    if (severityParam) {
      const severity = parseInt(severityParam, 10);
      if (!isNaN(severity) && severity >= 0 && severity <= 100) {
        urlFilters.minSeverity = severity;
      }
    }

    const queryParam = searchParams.get('q');
    if (queryParam) {
      urlFilters.searchQuery = queryParam;
    }

    return urlFilters;
  }, []);

  // Update URL with current filters
  const updateUrl = useCallback((newFilters: AlertFilters) => {
    const searchParams = new URLSearchParams(location.search);

    if (newFilters.sources.length > 0 && newFilters.sources.length < 6) {
      searchParams.set('source', newFilters.sources.join(','));
    } else {
      searchParams.delete('source');
    }

    if (newFilters.sinceDays !== DEFAULT_FILTERS.sinceDays) {
      searchParams.set('sinceDays', newFilters.sinceDays.toString());
    } else {
      searchParams.delete('sinceDays');
    }

    if (newFilters.minSeverity !== null) {
      searchParams.set('minSeverity', newFilters.minSeverity.toString());
    } else {
      searchParams.delete('minSeverity');
    }

    if (newFilters.searchQuery.trim()) {
      searchParams.set('q', newFilters.searchQuery.trim());
    } else {
      searchParams.delete('q');
    }

    const newSearch = searchParams.toString();
    navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
  }, [navigate, location]);

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
        // TODO: Fix Supabase function name - commenting out for now
        /*
        await supabase.rpc('set_user_preference', {
          p_user_id: user.id,
          p_key: 'alert_filters',
          p_value: filters,
        });
        */
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
      // TODO: Fix Supabase function name - commenting out for now  
      /*
      const { data, error } = await supabase.rpc('get_user_preference', {
        p_user_id: user.id,
        p_key: 'alert_filters',
        p_default: DEFAULT_FILTERS,
      });

      if (error) throw error;

      return data || {};
      */
      return {};
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
        const searchParams = new URLSearchParams(location.search);
        const urlFilters = parseUrlFilters(searchParams);
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

    initializeFilters();
  }, [location.search, user?.id, parseUrlFilters, loadFromUserPreferences, loadFromLocalStorage, updateUrl]);

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