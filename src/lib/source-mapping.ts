// Source mapping utilities for filtering
// Maps database source names to filter categories

export type AgencySource = 'FDA' | 'EPA' | 'USDA' | 'FSIS' | 'Federal_Register' | 'CDC';

// Maps database sources to filter categories - Enhanced Pipeline Support
export const SOURCE_TO_FILTER_MAP: Record<string, AgencySource> = {
  // FDA sources
  'FDA': 'FDA',
  'FDA Warning Letters': 'FDA',
  'FDA Enforcement Reports': 'FDA',
  'FDA Safety Communications': 'FDA',
  'Health and Human Services Department': 'FDA',
  
  // EPA sources
  'EPA': 'EPA',
  'EPA ECHO Enforcement': 'EPA',
  'EPA Enforcement Actions': 'EPA',
  'Environmental Protection Agency': 'EPA',
  
  // USDA sources  
  'USDA': 'USDA',
  'USDA Food Safety Alerts': 'USDA',
  'USDA FSIS Recalls': 'USDA',
  
  // FSIS sources (specialized USDA)
  'FSIS': 'FSIS',
  'FSIS Meat & Poultry Recalls': 'FSIS',
  
  // CDC sources
  'CDC': 'CDC',
  'CDC Health Advisories': 'CDC',
  'CDC Food Safety Alerts': 'CDC',
  
  // Federal Register sources
  'Federal Register': 'Federal_Register',
  'Federal_Register': 'Federal_Register',
  'Federal Register Rules': 'Federal_Register',
};

// Reverse mapping - filter category to database sources
export const FILTER_TO_SOURCES_MAP: Record<AgencySource, string[]> = {
  'FDA': ['FDA', 'FDA Warning Letters', 'FDA Enforcement Reports', 'FDA Safety Communications', 'Health and Human Services Department'],
  'EPA': ['EPA', 'EPA ECHO Enforcement', 'EPA Enforcement Actions', 'Environmental Protection Agency'],
  'USDA': ['USDA', 'USDA Food Safety Alerts', 'USDA FSIS Recalls'],
  'FSIS': ['FSIS', 'FSIS Meat & Poultry Recalls'],
  'CDC': ['CDC', 'CDC Health Advisories', 'CDC Food Safety Alerts'],
  'Federal_Register': ['Federal Register', 'Federal_Register', 'Federal Register Rules'],
};

// Get filter category from database source name
export function getFilterCategory(databaseSource: string, alertAgency?: string): AgencySource | null {
  // Handle Federal Register and other multi-agency sources
  if (databaseSource === 'Federal Register' && alertAgency) {
    if (alertAgency === 'EPA') return 'EPA';
    if (alertAgency === 'FDA') return 'FDA'; 
    if (alertAgency === 'USDA') return 'USDA';
  }
  
  // Handle Enhanced Federal Register Rules
  if (databaseSource === 'Enhanced Federal Register Rules' && alertAgency) {
    if (alertAgency === 'EPA') return 'EPA';
    if (alertAgency === 'FDA') return 'FDA'; 
    if (alertAgency === 'USDA') return 'USDA';
  }
  
  return SOURCE_TO_FILTER_MAP[databaseSource] || null;
}

// Get all database source names for a filter category
export function getDatabaseSources(filterCategory: AgencySource): string[] {
  return FILTER_TO_SOURCES_MAP[filterCategory] || [];
}

// Check if a database source matches a filter category
export function sourceMatchesFilter(databaseSource: string, filterCategory: AgencySource, alertAgency?: string): boolean {
  return getFilterCategory(databaseSource, alertAgency) === filterCategory;
}

// Agency display configuration
export const AGENCY_CONFIG = {
  FDA: {
    label: 'FDA',
    fullName: 'Food & Drug Administration',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    selectedColor: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  EPA: {
    label: 'EPA',
    fullName: 'Environmental Protection Agency',
    color: 'bg-green-100 text-green-800 hover:bg-green-200',
    selectedColor: 'bg-green-600 text-white hover:bg-green-700',
  },
  USDA: {
    label: 'USDA',
    fullName: 'US Department of Agriculture',
    color: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
    selectedColor: 'bg-orange-600 text-white hover:bg-orange-700',
  },
  FSIS: {
    label: 'FSIS',
    fullName: 'Food Safety Inspection Service',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    selectedColor: 'bg-purple-600 text-white hover:bg-purple-700',
  },
  CDC: {
    label: 'CDC',
    fullName: 'Centers for Disease Control',
    color: 'bg-teal-100 text-teal-800 hover:bg-teal-200',
    selectedColor: 'bg-teal-600 text-white hover:bg-teal-700',
  },
  Federal_Register: {
    label: 'Fed Register',
    fullName: 'Federal Register',
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    selectedColor: 'bg-gray-600 text-white hover:bg-gray-700',
  },
} as const;