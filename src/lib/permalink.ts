// Permalink Utilities
// URL state encoding/decoding for shareable filtered views

export interface FilterState {
  sources?: string[];
  dateFrom?: string;
  dateTo?: string;
  severityMin?: number;
  severityMax?: number;
  categories?: string[];
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function encodeFilterState(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  // Handle arrays by joining with commas
  if (filters.sources && filters.sources.length > 0) {
    params.set('sources', filters.sources.join(','));
  }

  if (filters.categories && filters.categories.length > 0) {
    params.set('categories', filters.categories.join(','));
  }

  // Handle simple values
  if (filters.dateFrom) {
    params.set('dateFrom', filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set('dateTo', filters.dateTo);
  }

  if (filters.severityMin !== undefined) {
    params.set('severityMin', filters.severityMin.toString());
  }

  if (filters.severityMax !== undefined) {
    params.set('severityMax', filters.severityMax.toString());
  }

  if (filters.search && filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.page !== undefined && filters.page > 1) {
    params.set('page', filters.page.toString());
  }

  if (filters.pageSize !== undefined && filters.pageSize !== 50) {
    params.set('pageSize', filters.pageSize.toString());
  }

  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy);
  }

  if (filters.sortOrder && filters.sortOrder !== 'desc') {
    params.set('sortOrder', filters.sortOrder);
  }

  return params;
}

export function decodeFilterState(searchParams: URLSearchParams): FilterState {
  const filters: FilterState = {};

  // Handle arrays
  const sources = searchParams.get('sources');
  if (sources) {
    filters.sources = sources.split(',').filter(Boolean);
  }

  const categories = searchParams.get('categories');
  if (categories) {
    filters.categories = categories.split(',').filter(Boolean);
  }

  // Handle simple values
  const dateFrom = searchParams.get('dateFrom');
  if (dateFrom) {
    filters.dateFrom = dateFrom;
  }

  const dateTo = searchParams.get('dateTo');
  if (dateTo) {
    filters.dateTo = dateTo;
  }

  const severityMin = searchParams.get('severityMin');
  if (severityMin) {
    const parsed = parseInt(severityMin, 10);
    if (!isNaN(parsed)) {
      filters.severityMin = parsed;
    }
  }

  const severityMax = searchParams.get('severityMax');
  if (severityMax) {
    const parsed = parseInt(severityMax, 10);
    if (!isNaN(parsed)) {
      filters.severityMax = parsed;
    }
  }

  const search = searchParams.get('search');
  if (search && search.trim()) {
    filters.search = search.trim();
  }

  const page = searchParams.get('page');
  if (page) {
    const parsed = parseInt(page, 10);
    if (!isNaN(parsed) && parsed > 0) {
      filters.page = parsed;
    }
  }

  const pageSize = searchParams.get('pageSize');
  if (pageSize) {
    const parsed = parseInt(pageSize, 10);
    if (!isNaN(parsed) && parsed > 0) {
      filters.pageSize = parsed;
    }
  }

  const sortBy = searchParams.get('sortBy');
  if (sortBy) {
    filters.sortBy = sortBy;
  }

  const sortOrder = searchParams.get('sortOrder');
  if (sortOrder === 'asc' || sortOrder === 'desc') {
    filters.sortOrder = sortOrder;
  }

  return filters;
}

export function createPermalink(filters: FilterState, baseUrl?: string): string {
  const params = encodeFilterState(filters);
  const url = baseUrl || window.location.origin + window.location.pathname;

  if (params.toString()) {
    return `${url}?${params.toString()}`;
  }

  return url;
}

export function copyPermalink(filters: FilterState, baseUrl?: string): void {
  const permalink = createPermalink(filters, baseUrl);

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(permalink);
  } else {
    // Fallback for older browsers or non-HTTPS
    const textArea = document.createElement('textarea');
    textArea.value = permalink;
    textArea.style.position = 'absolute';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

// Predefined filter presets
export const FILTER_PRESETS = {
  TODAY: {
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  },
  LAST_7_DAYS: {
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  },
  LAST_30_DAYS: {
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  },
  LAST_90_DAYS: {
    dateFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  },
  HIGH_SEVERITY: {
    severityMin: 70,
  },
  CRITICAL_SEVERITY: {
    severityMin: 80,
  },
  FDA_ONLY: {
    sources: ['FDA'],
  },
  RECALLS_ONLY: {
    categories: ['recall'],
  },
} as const;

// Helper to validate filter state
export function validateFilterState(filters: FilterState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate date range
  if (filters.dateFrom && filters.dateTo) {
    const fromDate = new Date(filters.dateFrom);
    const toDate = new Date(filters.dateTo);

    if (fromDate > toDate) {
      errors.push('Start date cannot be after end date');
    }
  }

  // Validate severity range
  if (filters.severityMin !== undefined && filters.severityMax !== undefined) {
    if (filters.severityMin > filters.severityMax) {
      errors.push('Minimum severity cannot be higher than maximum severity');
    }
  }

  // Validate severity bounds
  if (filters.severityMin !== undefined && (filters.severityMin < 0 || filters.severityMin > 100)) {
    errors.push('Minimum severity must be between 0 and 100');
  }

  if (filters.severityMax !== undefined && (filters.severityMax < 0 || filters.severityMax > 100)) {
    errors.push('Maximum severity must be between 0 and 100');
  }

  // Validate page values
  if (filters.page !== undefined && filters.page < 1) {
    errors.push('Page number must be positive');
  }

  if (filters.pageSize !== undefined && (filters.pageSize < 1 || filters.pageSize > 1000)) {
    errors.push('Page size must be between 1 and 1000');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}