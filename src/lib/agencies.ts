// US regulatory agencies only
export const AVAILABLE_AGENCIES = [
  "FDA",
  "EPA",
  "USDA", 
  "FSIS",
  "Federal_Register"
] as const;

export type Agency = typeof AVAILABLE_AGENCIES[number];

// Helper function to get display name for agencies
export const getAgencyDisplayName = (agency: string): string => {
  switch (agency) {
    case 'Federal_Register':
      return 'Fed Register';
    case 'FSIS':
      return 'FSIS';
    case 'USDA':
      return 'USDA';
    case 'EPA':
      return 'EPA';
    default:
      return agency;
  }
};

// Helper function to check if source matches agency (with various mappings)
export const doesSourceMatchAgency = (source: string, agency: string): boolean => {
  const sourceLower = source.toLowerCase();
  const agencyLower = agency.toLowerCase();
  
  // Handle various source name mappings for our API endpoints
  if (agency === 'USDA' && (sourceLower.includes('usda') || sourceLower.includes('fsis'))) return true;
  if (agency === 'FSIS' && sourceLower.includes('fsis')) return true;
  if (agency === 'EPA' && sourceLower.includes('epa')) return true;
  if (agency === 'Federal_Register' && sourceLower.includes('federal')) return true;
  
  return sourceLower.includes(agencyLower) || sourceLower === agency;
};