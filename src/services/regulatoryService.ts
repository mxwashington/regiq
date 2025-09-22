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
  const agencies = ['FDA', 'USDA'];
  const allDocuments: RegulatoryDocument[] = [];

  for (const agency of agencies) {
    try {
      const url = `${REGULATIONS_BASE_URL}/documents?filter[agencyId]=${agency}&filter[searchTerm]=food&sort=-postedDate&page[size]=10&api_key=DEMO_KEY`;
      const response = await apiClient.makeRequest(url);
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        const processedDocs = data.data.map(processRegulatoryDocument);
        allDocuments.push(...processedDocs);
      }
    } catch (error) {
      console.error(`Error fetching ${agency} documents:`, error);
    }
  }

  return allDocuments.slice(0, 20); // Limit to 20 most recent
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