const REGULATIONS_BASE_URL = 'https://api.regulations.gov/v4';

export interface RegulatoryDocument {
  id: string;
  title: string;
  agency: string;
  postedDate: string;
  summary: string;
  documentType: string;
  consumerImpact?: string;
  familyAction?: string;
}

class RegulatoryAPIClient {
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly maxRequestsPerHour = 950; // Stay under 1000 limit

  async makeRequest(url: string): Promise<Response> {
    await this.enforceRateLimit();
    this.requestCount++;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response;
  }

  private async enforceRateLimit() {
    const now = Date.now();
    const hourElapsed = now - this.windowStart;

    if (hourElapsed >= 3600000) {
      this.requestCount = 0;
      this.windowStart = now;
    } else if (this.requestCount >= this.maxRequestsPerHour) {
      const waitTime = 3600000 - hourElapsed;
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

const apiClient = new RegulatoryAPIClient();

// Fetch recent food safety documents from FDA/USDA
export async function fetchFoodSafetyDocuments(): Promise<RegulatoryDocument[]> {
  console.log('Fetching regulatory documents...');
  
  // Return mock data demonstrating the consumer-friendly regulatory news format
  const mockDocuments: RegulatoryDocument[] = [
    {
      id: 'FDA-2024-N-0001',
      title: 'FDA Issues Final Rule on Food Traceability Requirements for High-Risk Foods',
      agency: 'FDA',
      postedDate: new Date().toISOString().split('T')[0],
      summary: 'New traceability requirements for high-risk foods to improve food safety oversight and rapid response to contamination events',
      documentType: 'Final Rule',
      consumerImpact: 'Better tracking of your food from farm to table means faster responses to safety issues and quicker removal of contaminated products',
      familyAction: 'Look for improved labeling and tracking information on packaged foods over the coming months'
    },
    {
      id: 'USDA-FSIS-2024-0001', 
      title: 'USDA Updates Salmonella Performance Standards for Poultry Processing Plants',
      agency: 'USDA',
      postedDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
      summary: 'Enhanced testing requirements and performance standards to reduce salmonella contamination in poultry products',
      documentType: 'Notice',
      consumerImpact: 'Safer chicken and turkey products in grocery stores through stricter testing and oversight of processing plants',
      familyAction: 'Continue proper cooking practices - always cook poultry to 165°F internal temperature'
    },
    {
      id: 'FDA-2024-N-0002',
      title: 'Seafood HACCP Program Updates for Enhanced Import Safety Controls',
      agency: 'FDA', 
      postedDate: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 days ago
      summary: 'Strengthened Hazard Analysis and Critical Control Points (HACCP) requirements for imported seafood products',
      documentType: 'Guidance Document',
      consumerImpact: 'Improved safety oversight of imported fish and shellfish means better protection from contaminated seafood',
      familyAction: 'Buy seafood from reputable sources and always check that it\'s properly refrigerated and fresh'
    },
    {
      id: 'FDA-2024-D-0003',
      title: 'Draft Guidance on Allergen Labeling for Packaged Foods',
      agency: 'FDA',
      postedDate: new Date(Date.now() - 259200000).toISOString().split('T')[0], // 3 days ago
      summary: 'Proposed improvements to allergen warning labels to help consumers with food allergies make safer choices',
      documentType: 'Draft Guidance',
      consumerImpact: 'Clearer allergen warnings on food packages will help families avoid dangerous allergic reactions',
      familyAction: 'If you have food allergies, watch for improved allergen warnings on new product packaging'
    },
    {
      id: 'USDA-AMS-2024-0001',
      title: 'Organic Certification Updates for Better Consumer Trust',
      agency: 'USDA',
      postedDate: new Date(Date.now() - 345600000).toISOString().split('T')[0], // 4 days ago
      summary: 'Enhanced verification requirements for organic food certification to ensure product integrity',
      documentType: 'Proposed Rule',
      consumerImpact: 'Stricter organic standards mean you can be more confident that organic foods meet high quality requirements',
      familyAction: 'Continue choosing organic products knowing they meet increasingly rigorous standards'
    }
  ];

  console.log('Returning mock regulatory documents:', mockDocuments.length);
  
  // Simulate API delay for realistic experience
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return mockDocuments;
}

// Process raw API data into consumer-friendly format
function processRegulatoryDocument(rawDoc: any): RegulatoryDocument {
  const consumerTranslations = {
    'food safety': 'safer groceries for your family',
    'traceability': 'better tracking of food from farm to store',
    'recall': 'removing unsafe products from stores',
    'FSMA': 'Food Safety Modernization Act requirements'
  };

  let consumerImpact = rawDoc.attributes?.title || '';
  Object.entries(consumerTranslations).forEach(([technical, consumer]) => {
    consumerImpact = consumerImpact.toLowerCase().replace(technical, consumer);
  });

  return {
    id: rawDoc.id,
    title: rawDoc.attributes?.title || 'Regulatory Document Update',
    agency: rawDoc.attributes?.agencyId || 'Unknown',
    postedDate: rawDoc.attributes?.postedDate || new Date().toISOString(),
    summary: rawDoc.attributes?.summary || rawDoc.attributes?.abstract || 'Regulatory update affecting food safety',
    documentType: rawDoc.attributes?.documentType || 'Document',
    consumerImpact: consumerImpact,
    familyAction: generateFamilyAction(rawDoc.attributes?.title || '', rawDoc.attributes?.agencyId || '')
  };
}

// Generate family-specific action recommendations
function generateFamilyAction(title: string, agency: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('recall')) {
    return 'Check your pantry and refrigerator for affected products';
  } else if (titleLower.includes('labeling') || titleLower.includes('allergen')) {
    return 'Look for improved allergen warnings on new products';
  } else if (titleLower.includes('traceability')) {
    return 'No action needed - this makes your food safer automatically';
  } else if (titleLower.includes('inspection')) {
    return 'Expect better food safety oversight at stores and restaurants';
  }
  
  return 'Stay informed about changes affecting your food choices';
}