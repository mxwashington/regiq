/**
 * Alert source search utilities
 */

export interface AgencySearchConfig {
  domain: string;
  searchPath?: string;
  additionalTerms?: string[];
}

/**
 * Map agencies to their primary domains and search configurations
 */
export const getAgencySearchConfig = (agency: string): AgencySearchConfig => {
  const normalizedAgency = agency.toUpperCase().trim();
  
  const configs: Record<string, AgencySearchConfig> = {
    'FDA': {
      domain: 'fda.gov',
      additionalTerms: ['recall', 'safety alert', 'enforcement']
    },
    'USDA': {
      domain: 'usda.gov',
      additionalTerms: ['recall', 'food safety']
    },
    'FSIS': {
      domain: 'fsis.usda.gov',
      additionalTerms: ['recall', 'public health alert']
    },
    'EPA': {
      domain: 'epa.gov',
      additionalTerms: ['enforcement', 'compliance']
    },
    'CDC': {
      domain: 'cdc.gov',
      additionalTerms: ['health alert', 'outbreak']
    },
    'OSHA': {
      domain: 'osha.gov',
      additionalTerms: ['safety alert', 'compliance']
    },
    'FTC': {
      domain: 'ftc.gov',
      additionalTerms: ['enforcement', 'consumer alert']
    },
    'MHRA': {
      domain: 'gov.uk',
      additionalTerms: ['MHRA', 'medical device', 'drug safety']
    },
    'EMA': {
      domain: 'ema.europa.eu',
      additionalTerms: ['safety alert', 'regulatory']
    },
    'EFSA': {
      domain: 'efsa.europa.eu',
      additionalTerms: ['food safety', 'risk assessment']
    },
    'HEALTH CANADA': {
      domain: 'canada.ca',
      additionalTerms: ['Health Canada', 'recall', 'advisory']
    }
  };

  // Try to find exact match first
  if (configs[normalizedAgency]) {
    return configs[normalizedAgency];
  }

  // Try partial matches
  for (const [key, config] of Object.entries(configs)) {
    if (normalizedAgency.includes(key) || key.includes(normalizedAgency)) {
      return config;
    }
  }

  // Default fallback
  return {
    domain: 'gov',
    additionalTerms: ['regulatory', 'alert']
  };
};

/**
 * Generate search queries for an alert
 */
export const generateSearchQueries = (title: string, agency: string) => {
  const config = getAgencySearchConfig(agency);
  const cleanTitle = title.replace(/[^\w\s]/g, '').trim();
  
  return {
    // Primary: Exact title search on agency domain
    primary: `"${cleanTitle}" site:${config.domain}`,
    
    // Secondary: Title + agency terms on agency domain
    secondary: `${cleanTitle} ${config.additionalTerms?.[0] || 'alert'} site:${config.domain}`,
    
    // Fallback: Title + agency name broadly
    fallback: `"${cleanTitle}" ${agency} ${config.additionalTerms?.[0] || 'regulatory'}`,
    
    // Broad: General search
    broad: `${cleanTitle} ${agency} regulatory alert`
  };
};

/**
 * Open a targeted search for an alert
 */
export const searchForAlert = (title: string, agency: string, searchType: 'primary' | 'secondary' | 'fallback' | 'broad' = 'primary') => {
  const queries = generateSearchQueries(title, agency);
  const query = queries[searchType];
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  
  // Track search usage
  console.log(`Alert search: ${searchType} for ${agency}`, { title: title.substring(0, 50), query });
  
  window.open(searchUrl, '_blank', 'noopener,noreferrer');
};

/**
 * Check if an external URL is valid and accessible
 */
export const isValidSourceUrl = (url: string | null | undefined): boolean => {
  if (!url || url.trim() === '') return false;
  
  try {
    const parsedUrl = new URL(url);
    // Check for common government domains or other trusted sources
    const trustedDomains = ['.gov', '.europa.eu', '.canada.ca'];
    return trustedDomains.some(domain => parsedUrl.hostname.includes(domain));
  } catch {
    return false;
  }
};