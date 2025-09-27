// Source mapping utilities for filtering
// Maps database source names to filter categories

export type AgencySource = 'FDA' | 'CDC' | 'WHO' | 'MHRA' | 'Federal_Register';

// Maps database sources to filter categories
export const SOURCE_TO_FILTER_MAP: Record<string, AgencySource> = {
  'CDC': 'CDC',
  'CDC Health Alerts': 'CDC',
  'FDA': 'FDA', 
  'WHO': 'WHO',
  'WHO Health Alerts': 'WHO',
  'MHRA': 'MHRA',
  'Federal Register': 'Federal_Register',
  'Federal_Register': 'Federal_Register',
};

// Reverse mapping - filter category to database sources
export const FILTER_TO_SOURCES_MAP: Record<AgencySource, string[]> = {
  'CDC': ['CDC', 'CDC Health Alerts'],
  'FDA': ['FDA'],
  'WHO': ['WHO', 'WHO Health Alerts'], 
  'MHRA': ['MHRA'],
  'Federal_Register': ['Federal Register', 'Federal_Register'],
};

// Get filter category from database source name
export function getFilterCategory(databaseSource: string): AgencySource | null {
  return SOURCE_TO_FILTER_MAP[databaseSource] || null;
}

// Get all database source names for a filter category
export function getDatabaseSources(filterCategory: AgencySource): string[] {
  return FILTER_TO_SOURCES_MAP[filterCategory] || [];
}

// Check if a database source matches a filter category
export function sourceMatchesFilter(databaseSource: string, filterCategory: AgencySource): boolean {
  const sources = getDatabaseSources(filterCategory);
  return sources.includes(databaseSource);
}

// Agency display configuration
export const AGENCY_CONFIG = {
  FDA: {
    label: 'FDA',
    fullName: 'Food & Drug Administration',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    selectedColor: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  CDC: {
    label: 'CDC',
    fullName: 'Centers for Disease Control',
    color: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
    selectedColor: 'bg-orange-600 text-white hover:bg-orange-700',
  },
  WHO: {
    label: 'WHO',
    fullName: 'World Health Organization',
    color: 'bg-green-100 text-green-800 hover:bg-green-200',
    selectedColor: 'bg-green-600 text-white hover:bg-green-700',
  },
  MHRA: {
    label: 'MHRA',
    fullName: 'UK Medicines & Healthcare Regulatory Agency',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    selectedColor: 'bg-purple-600 text-white hover:bg-purple-700',
  },
  Federal_Register: {
    label: 'Fed Register',
    fullName: 'Federal Register',
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    selectedColor: 'bg-gray-600 text-white hover:bg-gray-700',
  },
} as const;