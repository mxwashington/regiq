/**
 * Alert source search utilities with smart keyword extraction
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
 * Extract meaningful keywords from alert titles for better search results
 */
export const extractKeywords = (title: string): string => {
  // Common regulatory stop words that add noise to searches
  const stopWords = [
    'alert', 'recall', 'warning', 'notice', 'announcement', 'advisory', 'safety', 
    'enforcement', 'action', 'update', 'notification', 'report', 'voluntary', 
    'fda', 'usda', 'epa', 'cdc', 'osha', 'ftc', 'mhra', 'ema', 'efsa', 'health',
    'due', 'potential', 'possible', 'may', 'could', 'might', 'because', 'linked',
    'contamination', 'risk', 'hazard', 'companies', 'stores', 'products', 'items',
    'select', 'certain', 'various', 'multiple', 'following', 'above', 'below',
    'pursuant', 'accordance', 'hereby', 'therefore', 'whereas', 'effective',
    'immediately', 'voluntarily', 'announces', 'issues', 'releases'
  ];
  
  // Extract meaningful keywords
  const keywords = title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .split(' ')
    .filter(word => word.length > 2) // Remove short words
    .filter(word => !stopWords.includes(word)) // Remove stop words
    .filter(word => !/^\d+$/.test(word)) // Remove pure numbers
    .slice(0, 5); // Take first 5 relevant keywords
  
  // If we have too few keywords, fall back to important terms from the title
  if (keywords.length < 2) {
    const importantTerms = title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(word => word.length > 3)
      .filter(word => !['alert', 'recall', 'warning', 'notice', 'voluntary'].includes(word))
      .slice(0, 3);
    
    return importantTerms.join(' ') || title.substring(0, 50);
  }
  
  return keywords.join(' ');
};

/**
 * Generate search queries for an alert using smart keyword extraction
 */
export const generateSearchQueries = (title: string, agency: string) => {
  const config = getAgencySearchConfig(agency);
  const keywords = extractKeywords(title);
  const cleanTitle = title.replace(/[^\w\s]/g, '').trim();
  
  return {
    // Primary: Smart keywords search on agency domain
    primary: `${keywords} site:${config.domain}`,
    
    // Secondary: Keywords + agency terms on agency domain
    secondary: `${keywords} ${config.additionalTerms?.[0] || 'alert'} site:${config.domain}`,
    
    // Fallback: Keywords + agency name broadly
    fallback: `${keywords} ${agency} ${config.additionalTerms?.[0] || 'regulatory'}`,
    
    // Broad: Full title as backup
    broad: `"${cleanTitle}" ${agency} site:${config.domain}`
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