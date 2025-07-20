// FDA OpenAPI Client
// Base URL: https://api.fda.gov

export interface FDAEndpoints {
  // Drug endpoints
  drugEvent: '/drug/event.json';
  drugLabel: '/drug/label.json';
  drugNdc: '/drug/ndc.json';
  drugEnforcement: '/drug/enforcement.json';
  drugsFda: '/drug/drugsfda.json';
  
  // Device endpoints
  devicePma: '/device/pma.json';
  deviceReglist: '/device/reglist.json';
  deviceCovid19Serology: '/device/covid19serology.json';
  deviceUdi: '/device/udi.json';
  deviceEnforcement: '/device/enforcement.json';
  
  // Food endpoints
  foodEnforcement: '/food/enforcement.json';
  foodEvent: '/food/event.json';
  
  // Animal & Veterinary endpoints
  animalEvent: '/animalandveterinary/event.json';
  
  // Tobacco endpoints
  tobaccoProblem: '/tobacco/problem.json';
}

export interface FDASearchParams {
  search?: string;
  limit?: number;
  skip?: number;
  count?: string;
  sort?: string;
  api_key?: string;
}

export interface FDAMeta {
  disclaimer: string;
  terms: string;
  license: string;
  last_updated: string;
  results: {
    skip: number;
    limit: number;
    total: number;
  };
}

export interface FDAEnforcementResult {
  recall_number: string;
  status: string;
  classification: 'Class I' | 'Class II' | 'Class III';
  product_description: string;
  company_name: string;
  brand_name?: string;
  product_quantity?: string;
  reason_for_recall: string;
  recall_initiation_date: string;
  state: string;
  initial_firm_notification: string;
  distribution_pattern: string;
  voluntary_mandated: string;
  city: string;
  country: string;
  event_id?: string;
  product_type?: string;
  termination_date?: string;
  recall_announcement_date?: string;
  code_info?: string;
  more_code_info?: string;
}

export interface FDAEventResult {
  safetyreportversion?: string;
  safetyreportid?: string;
  primarysourcecountry?: string;
  occurcountry?: string;
  transmissiondateformat?: string;
  fulfillexpeditecriteria?: string;
  serious?: string;
  seriousnesscongenitalanomali?: string;
  seriousnessdeath?: string;
  seriousnessdisabling?: string;
  seriousnesshospitalization?: string;
  seriousnesslifethreatening?: string;
  seriousnessother?: string;
  receivedate?: string;
  receiptdate?: string;
  receiptdateformat?: string;
  patient?: {
    patientsex?: string;
    patientagegroup?: string;
    patientweight?: string;
    patientdeath?: {
      patientdeathdate?: string;
      patientdeathdateformat?: string;
    };
  };
  drug?: Array<{
    drugcharacterization?: string;
    medicinalproduct?: string;
    drugdosagetext?: string;
    drugdosageform?: string;
    drugindicationmeddraversion?: string;
    drugindication?: string;
    drugstartdateformat?: string;
    drugenddateformat?: string;
    actiondrug?: string;
    drugrecurrence?: string;
    drugadditional?: string;
    activesubstance?: {
      activesubstancename?: string;
    };
  }>;
  reaction?: Array<{
    reactionmeddraversion?: string;
    reactionmeddraversionllt?: string;
    reactionmeddrapt?: string;
    reactionmeddrallt?: string;
    reactionoutcome?: string;
  }>;
}

export interface FDAShortageResult {
  status: string;
  product_name: string;
  active_ingredients: Array<{
    name: string;
    strength: string;
  }>;
  dosage_forms: string[];
  companies: Array<{
    name: string;
    contact: string;
  }>;
  reason: string;
  additional_info: string;
  revision_date: string;
}

export interface FDAResponse<T> {
  meta: FDAMeta;
  results: T[];
  cached?: boolean;
}

export class FDAApiClient {
  private baseUrl = 'https://api.fda.gov';
  private requestsCache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour cache
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string, 
    params: FDASearchParams = {}
  ): Promise<FDAResponse<T>> {
    const cacheKey = `${endpoint}?${new URLSearchParams(params as Record<string, string>).toString()}`;
    
    // Check cache first
    const cached = this.requestsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return { ...cached.data, cached: true };
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Set default limit if not specified
    if (!params.limit) {
      params.limit = 20;
    }

    // Add API key if available
    if (this.apiKey || params.api_key) {
      url.searchParams.append('api_key', this.apiKey || params.api_key!);
    }

    // Add parameters to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'api_key') {
        url.searchParams.append(key, value.toString());
      }
    });

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No data found for this search');
        }
        if (response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        }
        throw new Error(`FDA API error: ${response.status} ${response.statusText}`);
      }

      const data: FDAResponse<T> = await response.json();
      
      // Cache the result
      this.requestsCache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch data from FDA API');
    }
  }

  // Drug endpoints
  async searchDrugEvents(params: FDASearchParams = {}): Promise<FDAResponse<FDAEventResult>> {
    return this.makeRequest<FDAEventResult>('/drug/event.json', params);
  }

  async searchDrugLabels(params: FDASearchParams = {}) {
    return this.makeRequest('/drug/label.json', params);
  }

  async searchDrugNdc(params: FDASearchParams = {}) {
    return this.makeRequest('/drug/ndc.json', params);
  }

  async searchDrugEnforcement(params: FDASearchParams = {}): Promise<FDAResponse<FDAEnforcementResult>> {
    return this.makeRequest<FDAEnforcementResult>('/drug/enforcement.json', params);
  }

  async searchDrugsFda(params: FDASearchParams = {}) {
    return this.makeRequest('/drug/drugsfda.json', params);
  }

  // Device endpoints
  async searchDevicePma(params: FDASearchParams = {}) {
    return this.makeRequest('/device/pma.json', params);
  }

  async searchDeviceReglist(params: FDASearchParams = {}) {
    return this.makeRequest('/device/reglist.json', params);
  }

  async searchDeviceCovid19Serology(params: FDASearchParams = {}) {
    return this.makeRequest('/device/covid19serology.json', params);
  }

  async searchDeviceUdi(params: FDASearchParams = {}) {
    return this.makeRequest('/device/udi.json', params);
  }

  async searchDeviceEnforcement(params: FDASearchParams = {}): Promise<FDAResponse<FDAEnforcementResult>> {
    return this.makeRequest<FDAEnforcementResult>('/device/enforcement.json', params);
  }

  // Food endpoints
  async searchFoodEnforcement(params: FDASearchParams = {}): Promise<FDAResponse<FDAEnforcementResult>> {
    return this.makeRequest<FDAEnforcementResult>('/food/enforcement.json', params);
  }

  async searchFoodEvents(params: FDASearchParams = {}): Promise<FDAResponse<FDAEventResult>> {
    return this.makeRequest<FDAEventResult>('/food/event.json', params);
  }

  // Animal & Veterinary endpoints
  async searchAnimalEvents(params: FDASearchParams = {}): Promise<FDAResponse<FDAEventResult>> {
    return this.makeRequest<FDAEventResult>('/animalandveterinary/event.json', params);
  }

  // Tobacco endpoints
  async searchTobaccoProblems(params: FDASearchParams = {}) {
    return this.makeRequest('/tobacco/problem.json', params);
  }

  // Legacy method for backwards compatibility
  async searchDrugShortages(params: FDASearchParams = {}): Promise<FDAResponse<FDAShortageResult>> {
    // Use the drugs@FDA endpoint which includes shortage information
    return this.makeRequest<FDAShortageResult>('/drug/drugsfda.json', params);
  }

  // Combined search across multiple endpoints
  async searchMultipleEndpoints(
    query: string, 
    endpoints: (keyof FDAEndpoints)[] = ['foodEnforcement', 'drugEnforcement', 'deviceEnforcement'],
    limit: number = 10
  ): Promise<{ endpoint: string; data: FDAResponse<any>; error?: string }[]> {
    const searchParams: FDASearchParams = {
      search: query,
      limit
    };

    const endpointMethods = {
      drugEvent: this.searchDrugEvents.bind(this),
      drugLabel: this.searchDrugLabels.bind(this),
      drugNdc: this.searchDrugNdc.bind(this),
      drugEnforcement: this.searchDrugEnforcement.bind(this),
      drugsFda: this.searchDrugsFda.bind(this),
      devicePma: this.searchDevicePma.bind(this),
      deviceReglist: this.searchDeviceReglist.bind(this),
      deviceCovid19Serology: this.searchDeviceCovid19Serology.bind(this),
      deviceUdi: this.searchDeviceUdi.bind(this),
      deviceEnforcement: this.searchDeviceEnforcement.bind(this),
      foodEnforcement: this.searchFoodEnforcement.bind(this),
      foodEvent: this.searchFoodEvents.bind(this),
      animalEvent: this.searchAnimalEvents.bind(this),
      tobaccoProblem: this.searchTobaccoProblems.bind(this)
    };

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const method = endpointMethods[endpoint];
        const data = await method(searchParams);
        return { endpoint, data };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          endpoint: endpoints[index],
          data: { meta: {} as FDAMeta, results: [] },
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  // Quick search helpers
  async getRecentRecalls(days: number = 30): Promise<FDAResponse<FDAEnforcementResult>[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const dateString = date.toISOString().split('T')[0];
    
    const searchQuery = `recall_initiation_date:[${dateString}+TO+*]`;
    const params: FDASearchParams = {
      search: searchQuery,
      limit: 20,
      sort: 'recall_initiation_date:desc'
    };

    const [food, drug, device] = await Promise.allSettled([
      this.searchFoodEnforcement(params),
      this.searchDrugEnforcement(params),
      this.searchDeviceEnforcement(params)
    ]);

    return [
      food.status === 'fulfilled' ? food.value : { meta: {} as FDAMeta, results: [] },
      drug.status === 'fulfilled' ? drug.value : { meta: {} as FDAMeta, results: [] },
      device.status === 'fulfilled' ? device.value : { meta: {} as FDAMeta, results: [] }
    ];
  }

  async getClassIRecalls(): Promise<FDAResponse<FDAEnforcementResult>[]> {
    const params: FDASearchParams = {
      search: 'classification:"Class+I"',
      limit: 20,
      sort: 'recall_initiation_date:desc'
    };

    const [food, drug, device] = await Promise.allSettled([
      this.searchFoodEnforcement(params),
      this.searchDrugEnforcement(params),
      this.searchDeviceEnforcement(params)
    ]);

    return [
      food.status === 'fulfilled' ? food.value : { meta: {} as FDAMeta, results: [] },
      drug.status === 'fulfilled' ? drug.value : { meta: {} as FDAMeta, results: [] },
      device.status === 'fulfilled' ? device.value : { meta: {} as FDAMeta, results: [] }
    ];
  }

  // Search query builder utilities
  buildSearchQuery(filters: {
    productDescription?: string;
    companyName?: string;
    classification?: 'Class I' | 'Class II' | 'Class III';
    state?: string;
    dateRange?: { start: string; end: string };
    voluntaryMandated?: 'Voluntary' | 'FDA Mandated';
  }): string {
    const queryParts: string[] = [];

    if (filters.productDescription) {
      queryParts.push(`product_description:"${filters.productDescription}"`);
    }

    if (filters.companyName) {
      queryParts.push(`company_name:"${filters.companyName}"`);
    }

    if (filters.classification) {
      queryParts.push(`classification:"${filters.classification}"`);
    }

    if (filters.state) {
      queryParts.push(`state:"${filters.state}"`);
    }

    if (filters.dateRange) {
      queryParts.push(`recall_initiation_date:[${filters.dateRange.start}+TO+${filters.dateRange.end}]`);
    }

    if (filters.voluntaryMandated) {
      queryParts.push(`voluntary_mandated:"${filters.voluntaryMandated}"`);
    }

    return queryParts.join('+AND+');
  }

  // Clear cache utility
  clearCache(): void {
    this.requestsCache.clear();
  }
}

// Export singleton instance
export const fdaApi = new FDAApiClient();

// FSIS API Client
export interface FSISRecallResult {
  recallNumber: string;
  productName: string;
  companyName: string;
  recallDate: string;
  recallClass: string;
  summary: string;
  distributionPattern: string;
  productQuantity: string;
  reasonForRecall: string;
}

export class FSISApiClient {
  private baseUrl = 'https://www.fsis.usda.gov/fsis/api/recall/v/1';
  private requestsCache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour cache

  async searchRecalls(params: Record<string, string> = {}): Promise<FSISRecallResult[]> {
    const cacheKey = `recalls?${new URLSearchParams(params).toString()}`;
    
    // Check cache first
    const cached = this.requestsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }

    const url = new URL(this.baseUrl);
    
    // Add parameters to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RegIQ-FSIS-Client/1.0'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No FSIS recall data found');
        }
        if (response.status === 429) {
          throw new Error('FSIS API rate limit exceeded. Please try again later.');
        }
        throw new Error(`FSIS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.requestsCache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch data from FSIS API');
    }
  }

  async getRecentRecalls(days: number = 30): Promise<FSISRecallResult[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const dateString = date.toISOString().split('T')[0];
    
    return this.searchRecalls({
      fromDate: dateString,
      limit: '50'
    });
  }

  clearCache(): void {
    this.requestsCache.clear();
  }
}

// Export singleton instance
export const fsisApi = new FSISApiClient();