// Source mapping utilities for filtering
// Maps database source names to filter categories

export type AgencySource = 'FDA' | 'EPA' | 'USDA' | 'FSIS' | 'Federal_Register' | 'CDC' | 'REGULATIONS_GOV' | 'TTB' | 'NOAA' | 'OSHA' | 'USDA_APHIS' | 'CBP' | 'FDA_IMPORT' | 'USDA-ARMS' | 'USDA-FDC';

// Maps database sources to filter categories - Enhanced Pipeline Support
export const SOURCE_TO_FILTER_MAP: Record<string, AgencySource> = {
  // FDA sources
  'FDA': 'FDA',
  'FDA Warning Letters': 'FDA',
  'FDA Form 483 Observations': 'FDA',
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
  
  // USDA ARMS Economic Data
  'USDA-ARMS': 'USDA-ARMS',
  
  // USDA FoodData Central
  'USDA-FDC': 'USDA-FDC',
  
  // FSIS sources (specialized USDA)
  'FSIS': 'FSIS',
  'FSIS Recalls': 'FSIS',
  'FSIS Meat & Poultry Recalls': 'FSIS',
  
  // CDC sources
  'CDC': 'CDC',
  'CDC Health Advisories': 'CDC',
  'CDC Food Safety Alerts': 'CDC',
  
  // Federal Register sources
  'Federal Register': 'Federal_Register',
  'Federal_Register': 'Federal_Register',
  'Federal Register Rules': 'Federal_Register',
  
  // Regulations.gov sources
  'REGULATIONS_GOV': 'REGULATIONS_GOV',
  'Regulations.gov': 'REGULATIONS_GOV',

  // TTB sources
  'TTB': 'TTB',
  'TTB Alcohol Regulatory Updates': 'TTB',

  // NOAA sources
  'NOAA': 'NOAA',
  'NOAA Fisheries': 'NOAA',
  'NOAA Seafood Safety': 'NOAA',

  // OSHA sources
  'OSHA': 'OSHA',
  'OSHA Food Industry Safety': 'OSHA',

  // USDA APHIS sources
  'USDA-APHIS': 'USDA_APHIS',
  'USDA APHIS': 'USDA_APHIS',
  'APHIS': 'USDA_APHIS',

  // CBP sources
  'CBP': 'CBP',
  'CBP Customs': 'CBP',
  'Customs and Border Protection': 'CBP',

  // FDA Import Alerts (specialized)
  'FDA-Import': 'FDA_IMPORT',
  'FDA Import Alerts': 'FDA_IMPORT',
  'FDA Import': 'FDA_IMPORT',
};

// Reverse mapping - filter category to database sources
export const FILTER_TO_SOURCES_MAP: Record<AgencySource, string[]> = {
  'FDA': ['FDA', 'FDA Warning Letters', 'FDA Form 483 Observations', 'FDA Enforcement Reports', 'FDA Safety Communications', 'Health and Human Services Department'],
  'EPA': ['EPA', 'EPA ECHO Enforcement', 'EPA Enforcement Actions', 'Environmental Protection Agency'],
  'USDA': ['USDA', 'USDA Food Safety Alerts', 'USDA FSIS Recalls'],
  'USDA-ARMS': ['USDA-ARMS'],
  'USDA-FDC': ['USDA-FDC'],
  'FSIS': ['FSIS', 'FSIS Recalls', 'FSIS Meat & Poultry Recalls'],
  'CDC': ['CDC', 'CDC Health Advisories', 'CDC Food Safety Alerts'],
  'Federal_Register': ['Federal Register', 'Federal_Register', 'Federal Register Rules'],
  'REGULATIONS_GOV': ['REGULATIONS_GOV', 'Regulations.gov'],
  'TTB': ['TTB', 'TTB Alcohol Regulatory Updates'],
  'NOAA': ['NOAA', 'NOAA Fisheries', 'NOAA Seafood Safety'],
  'OSHA': ['OSHA', 'OSHA Food Industry Safety'],
  'USDA_APHIS': ['USDA-APHIS', 'USDA APHIS', 'APHIS'],
  'CBP': ['CBP', 'CBP Customs', 'Customs and Border Protection'],
  'FDA_IMPORT': ['FDA-Import', 'FDA Import Alerts', 'FDA Import'],
};

// Get filter category from database source name
export function getFilterCategory(databaseSource: string, alertAgency?: string): AgencySource | null {
  // Always prioritize source mapping first - Federal Register alerts stay as Federal Register
  // regardless of their agency classification
  const directSourceMapping = SOURCE_TO_FILTER_MAP[databaseSource];
  if (directSourceMapping) {
    return directSourceMapping;
  }
  
  return null;
}

// Get all database source names for a filter category
export function getDatabaseSources(filterCategory: AgencySource): string[] {
  return FILTER_TO_SOURCES_MAP[filterCategory] || [];
}

// Check if a database source matches a filter category
export function sourceMatchesFilter(databaseSource: string, filterCategory: AgencySource, alertAgency?: string): boolean {
  // Check if the source field matches directly
  const sourceMatch = getFilterCategory(databaseSource, alertAgency) === filterCategory;
  if (sourceMatch) return true;
  
  // Also check if the agency field matches the filter category
  // This handles cases like Regulations.gov alerts with agency: "FDA"
  if (alertAgency && SOURCE_TO_FILTER_MAP[alertAgency] === filterCategory) {
    return true;
  }
  
  return false;
}

// Validate source mappings - check for unmapped sources
export async function validateSourceMappings(): Promise<{
  mappedSources: string[];
  unmappedSources: string[];
  sourceStats: Record<string, { count: number; sampleAgencies: string[] }>;
}> {
  try {
    // Import supabase dynamically to avoid circular imports
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('alerts')
      .select('source, agency')
      .gte('published_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const sourceStats: Record<string, { count: number; sampleAgencies: string[] }> = {};
    const mappedSources: string[] = [];
    const unmappedSources: string[] = [];

    data?.forEach(alert => {
      if (alert.source) {
        // Track source statistics
        if (!sourceStats[alert.source]) {
          sourceStats[alert.source] = { count: 0, sampleAgencies: [] };
        }
        sourceStats[alert.source].count++;
        
        if (alert.agency && !sourceStats[alert.source].sampleAgencies.includes(alert.agency)) {
          sourceStats[alert.source].sampleAgencies.push(alert.agency);
        }

        // Check if source is mapped
        const filterCategory = getFilterCategory(alert.source, alert.agency);
        if (filterCategory) {
          if (!mappedSources.includes(alert.source)) {
            mappedSources.push(alert.source);
          }
        } else {
          if (!unmappedSources.includes(alert.source)) {
            unmappedSources.push(alert.source);
          }
        }
      }
    });

    return {
      mappedSources: mappedSources.sort(),
      unmappedSources: unmappedSources.sort(),
      sourceStats
    };
  } catch (error) {
    console.error('Error validating source mappings:', error);
    return {
      mappedSources: [],
      unmappedSources: [],
      sourceStats: {}
    };
  }
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
  'USDA-ARMS': {
    label: 'USDA-ARMS',
    fullName: 'USDA Economic Intelligence',
    color: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    selectedColor: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  'USDA-FDC': {
    label: 'Food Data',
    fullName: 'USDA FoodData Central',
    color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
    selectedColor: 'bg-emerald-600 text-white hover:bg-emerald-700',
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
  REGULATIONS_GOV: {
    label: 'Regulations.gov',
    fullName: 'Regulations.gov',
    color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
    selectedColor: 'bg-indigo-600 text-white hover:bg-indigo-700',
  },
  TTB: {
    label: 'TTB',
    fullName: 'Alcohol & Tobacco Tax Bureau',
    color: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    selectedColor: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  NOAA: {
    label: 'NOAA',
    fullName: 'NOAA Fisheries',
    color: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
    selectedColor: 'bg-cyan-600 text-white hover:bg-cyan-700',
  },
  OSHA: {
    label: 'OSHA',
    fullName: 'Occupational Safety & Health',
    color: 'bg-red-100 text-red-800 hover:bg-red-200',
    selectedColor: 'bg-red-600 text-white hover:bg-red-700',
  },
  USDA_APHIS: {
    label: 'APHIS',
    fullName: 'USDA Animal & Plant Health',
    color: 'bg-lime-100 text-lime-800 hover:bg-lime-200',
    selectedColor: 'bg-lime-600 text-white hover:bg-lime-700',
  },
  CBP: {
    label: 'CBP',
    fullName: 'Customs & Border Protection',
    color: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
    selectedColor: 'bg-slate-600 text-white hover:bg-slate-700',
  },
  FDA_IMPORT: {
    label: 'FDA Import',
    fullName: 'FDA Import Alerts',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    selectedColor: 'bg-blue-600 text-white hover:bg-blue-700',
  },
} as const;