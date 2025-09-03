// Dynamic agencies fetched from actual database alerts
export const AVAILABLE_AGENCIES = [
  "FDA",
  "USDA", 
  "FSIS",
  "EPA",
  "CDC",
  "MHRA",
  "WHO",
  "Federal_Register",
  "Health_Canada"
] as const;

export type Agency = typeof AVAILABLE_AGENCIES[number];

// Helper function to get display name for agencies
export const getAgencyDisplayName = (agency: string): string => {
  switch (agency) {
    case 'Federal_Register':
      return 'Fed Register';
    case 'Health_Canada':
      return 'Health Canada';
    case 'MHRA':
      return 'MHRA';
    case 'WHO':
      return 'WHO';
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
  if (agency === 'Federal_Register' && sourceLower.includes('federal')) return true;
  if (agency === 'Health_Canada' && sourceLower.includes('health_canada')) return true;
  if (agency === 'MHRA' && sourceLower.includes('mhra')) return true;
  if (agency === 'WHO' && sourceLower.includes('who')) return true;
  
  return sourceLower.includes(agencyLower) || sourceLower === agency;
};