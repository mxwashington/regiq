// FDA OpenAPI Client
// Base URL: https://api.fda.gov

export interface FDAEndpoints {
  foodEnforcement: '/food/enforcement.json';
  drugEnforcement: '/drug/enforcement.json';
  deviceEnforcement: '/device/enforcement.json';
  foodEvents: '/food/event.json';
  drugEvents: '/drug/event.json';
  drugShortages: '/drug/shortages.json';
  animalEvents: '/animal/event.json';
}

export interface FDASearchParams {
  search?: string;
  limit?: number;
  skip?: number;
  count?: string;
  sort?: string;
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

    // Add parameters to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
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

  // Enforcement Actions
  async searchFoodEnforcement(params: FDASearchParams = {}): Promise<FDAResponse<FDAEnforcementResult>> {
    return this.makeRequest<FDAEnforcementResult>('/food/enforcement.json', params);
  }

  async searchDrugEnforcement(params: FDASearchParams = {}): Promise<FDAResponse<FDAEnforcementResult>> {
    return this.makeRequest<FDAEnforcementResult>('/drug/enforcement.json', params);
  }

  async searchDeviceEnforcement(params: FDASearchParams = {}): Promise<FDAResponse<FDAEnforcementResult>> {
    return this.makeRequest<FDAEnforcementResult>('/device/enforcement.json', params);
  }

  // Adverse Events
  async searchFoodEvents(params: FDASearchParams = {}): Promise<FDAResponse<FDAEventResult>> {
    return this.makeRequest<FDAEventResult>('/food/event.json', params);
  }

  async searchDrugEvents(params: FDASearchParams = {}): Promise<FDAResponse<FDAEventResult>> {
    return this.makeRequest<FDAEventResult>('/drug/event.json', params);
  }

  async searchAnimalEvents(params: FDASearchParams = {}): Promise<FDAResponse<FDAEventResult>> {
    return this.makeRequest<FDAEventResult>('/animal/event.json', params);
  }

  // Drug Shortages
  async searchDrugShortages(params: FDASearchParams = {}): Promise<FDAResponse<FDAShortageResult>> {
    return this.makeRequest<FDAShortageResult>('/drug/shortages.json', params);
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
      foodEnforcement: this.searchFoodEnforcement.bind(this),
      drugEnforcement: this.searchDrugEnforcement.bind(this),
      deviceEnforcement: this.searchDeviceEnforcement.bind(this),
      foodEvents: this.searchFoodEvents.bind(this),
      drugEvents: this.searchDrugEvents.bind(this),
      drugShortages: this.searchDrugShortages.bind(this),
      animalEvents: this.searchAnimalEvents.bind(this)
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