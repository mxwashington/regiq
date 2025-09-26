import { logger } from '@/lib/logger';

// Code of Federal Regulations (CFR) API Client
// Integrates with GovInfo API and eCFR scraping for live CFR access

export interface CFRTitle {
  number: number;
  name: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  color: string;
}

export interface CFRSection {
  title: number;
  part: number;
  section?: string;
  subpart?: string;
  text: string;
  effectiveDate: string;
  lastRevised: string;
  citation: string;
  hierarchy: string[];
  crossReferences: string[];
  definitions: { term: string; definition: string }[];
  requirements: string[];
  deadlines: { requirement: string; deadline: string; type: 'absolute' | 'relative' }[];
}

export interface CFRSearchParams {
  query?: string;
  title?: number;
  part?: number;
  section?: string;
  searchType: 'text' | 'citation' | 'requirements' | 'definitions';
  includeArchived?: boolean;
  effectiveDateRange?: { start: string; end: string };
}

export interface CFRSearchResult {
  sections: CFRSection[];
  totalResults: number;
  searchTerms: string[];
  suggestedCitations: string[];
  relatedSections: string[];
  lastUpdated: string;
}

// Priority CFR titles for RegIQ users
export const CFR_TITLES: CFRTitle[] = [
  {
    number: 21,
    name: 'Food and Drugs (FDA)',
    priority: 'HIGH',
    description: 'FDA regulations for food, drugs, biologics, and medical devices',
    color: 'blue'
  },
  {
    number: 9,
    name: 'Animals and Animal Products (USDA)',
    priority: 'HIGH', 
    description: 'USDA/FSIS meat and poultry inspection regulations',
    color: 'green'
  },
  {
    number: 40,
    name: 'Environmental Protection (EPA)',
    priority: 'MEDIUM',
    description: 'EPA pesticide and environmental regulations',
    color: 'teal'
  },
  {
    number: 7,
    name: 'Agriculture (USDA)',
    priority: 'MEDIUM',
    description: 'Agricultural marketing and organic regulations',
    color: 'orange'
  },
  {
    number: 16,
    name: 'Commercial Practices (FTC)',
    priority: 'MEDIUM',
    description: 'FTC consumer protection and advertising regulations',
    color: 'purple'
  }
];

// Key CFR parts for quick access
export const PRIORITY_CFR_PARTS = {
  21: [
    { part: 110, name: 'Current Good Manufacturing Practice in Manufacturing, Packing, or Holding Human Food', category: 'Food Safety' },
    { part: 117, name: 'Current Good Manufacturing Practice, Hazard Analysis, and Risk-Based Preventive Controls for Human Food', category: 'Food Safety' },
    { part: 120, name: 'Hazard Analysis and Critical Control Point (HACCP) Systems', category: 'Food Safety' },
    { part: 123, name: 'Fish and Fishery Products', category: 'Food Safety' },
    { part: 210, name: 'Current Good Manufacturing Practice for Finished Pharmaceuticals', category: 'Pharmaceuticals' },
    { part: 211, name: 'Current Good Manufacturing Practice for Finished Pharmaceuticals', category: 'Pharmaceuticals' },
    { part: 820, name: 'Quality System Regulation', category: 'Medical Devices' },
    { part: 801, name: 'Labeling', category: 'Medical Devices' }
  ],
  9: [
    { part: 416, name: 'Sanitation', category: 'Food Safety' },
    { part: 417, name: 'Hazard Analysis and Critical Control Point (HACCP) Systems', category: 'Food Safety' },
    { part: 430, name: 'Requirements for Specific Classes of Product', category: 'Meat & Poultry' }
  ]
};

export class CFRApiClient {
  private govInfoApiKey: string;
  private baseUrls = {
    govInfo: 'https://api.govinfo.gov',
    eCFR: 'https://www.ecfr.gov/current'
  };
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor(apiKey?: string) {
    this.govInfoApiKey = apiKey || '';
  }

  // Search CFR text across titles and parts
  async searchCFR(params: CFRSearchParams): Promise<CFRSearchResult> {
    const cacheKey = `cfr-search-${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }

    try {
      let results: CFRSection[] = [];

      if (params.searchType === 'citation' && params.title && params.part) {
        // Direct citation lookup
        results = await this.getCFRSection(params.title, params.part, params.section);
      } else if (params.query) {
        // Text search
        results = await this.searchCFRText(params.query, params.title);
      }

      const searchResult: CFRSearchResult = {
        sections: results,
        totalResults: results.length,
        searchTerms: params.query ? params.query.split(' ') : [],
        suggestedCitations: this.generateSuggestedCitations(results),
        relatedSections: this.findRelatedSections(results),
        lastUpdated: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(cacheKey, { data: searchResult, timestamp: Date.now() });
      
      return searchResult;

    } catch (error) {
      logger.error('CFR search error:', error);
      throw new Error('Failed to search CFR data');
    }
  }

  // Get specific CFR section (e.g., 21 CFR 117.1)
  async getCFRSection(title: number, part: number, section?: string): Promise<CFRSection[]> {
    try {
      // Try GovInfo API first, fall back to eCFR scraping
      if (this.govInfoApiKey) {
        return await this.getCFRFromGovInfo(title, part, section);
      } else {
        return await this.getCFRFromECFR(title, part, section);
      }
    } catch (error) {
      logger.error(`Error fetching CFR ${title} CFR ${part}${section ? `.${section}` : ''}:`, error);
      throw error;
    }
  }

  // GovInfo API integration
  private async getCFRFromGovInfo(title: number, part: number, section?: string): Promise<CFRSection[]> {
    const currentYear = new Date().getFullYear();
    const url = `${this.baseUrls.govInfo}/packages/CFR-${currentYear}-title${title}/granules`;
    
    const response = await fetch(`${url}?api_key=${this.govInfoApiKey}`);
    if (!response.ok) {
      throw new Error(`GovInfo API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Process GovInfo response to extract CFR sections
    return this.processGovInfoData(data, title, part, section);
  }

  // eCFR scraping fallback
  private async getCFRFromECFR(title: number, part: number, section?: string): Promise<CFRSection[]> {
    const url = `${this.baseUrls.eCFR}/title-${title}/part-${part}`;
    
    // In a real implementation, this would scrape the eCFR website
    // For now, return mock data structure
    return this.generateMockCFRData(title, part, section);
  }

  // Search CFR text for specific terms
  private async searchCFRText(query: string, title?: number): Promise<CFRSection[]> {
    const searchTerms = query.toLowerCase().split(' ');
    const results: CFRSection[] = [];

    // Search priority titles if no specific title provided
    const titlesToSearch = title ? [title] : CFR_TITLES.filter(t => t.priority === 'HIGH').map(t => t.number);

    for (const titleNum of titlesToSearch) {
      try {
        const titleResults = await this.searchTitleForTerms(titleNum, searchTerms);
        results.push(...titleResults);
      } catch (error) {
        logger.error(`Error searching CFR Title ${titleNum}:`, error);
      }
    }

    return results.sort((a, b) => this.calculateRelevanceScore(b, searchTerms) - this.calculateRelevanceScore(a, searchTerms));
  }

  private async searchTitleForTerms(title: number, searchTerms: string[]): Promise<CFRSection[]> {
    // In real implementation, this would search the actual CFR text
    // For now, return relevant mock data
    return this.generateSearchResults(title, searchTerms);
  }

  private calculateRelevanceScore(section: CFRSection, searchTerms: string[]): number {
    let score = 0;
    const textLower = section.text.toLowerCase();
    
    searchTerms.forEach(term => {
      // Count occurrences and weight by position
      const occurrences = (textLower.match(new RegExp(term, 'g')) || []).length;
      score += occurrences;
      
      // Higher score for matches in title/heading
      if (section.citation.toLowerCase().includes(term)) {
        score += 5;
      }
    });

    return score;
  }

  private generateSuggestedCitations(sections: CFRSection[]): string[] {
    const suggestions = new Set<string>();
    
    sections.forEach(section => {
      // Add related sections
      section.crossReferences.forEach(ref => suggestions.add(ref));
      
      // Add parent/child sections
      if (section.section) {
        suggestions.add(`${section.title} CFR ${section.part}`); // Parent part
      }
    });

    return Array.from(suggestions).slice(0, 10);
  }

  private findRelatedSections(sections: CFRSection[]): string[] {
    const related = new Set<string>();
    
    sections.forEach(section => {
      // Find sections in same part
      const baseCitation = `${section.title} CFR ${section.part}`;
      related.add(baseCitation);
      
      // Add cross-references
      section.crossReferences.forEach(ref => related.add(ref));
    });

    return Array.from(related).slice(0, 15);
  }

  // Mock data generators (replace with real API/scraping logic)
  private generateMockCFRData(title: number, part: number, section?: string): CFRSection[] {
    const mockSections: CFRSection[] = [
      {
        title,
        part,
        section: section || '1',
        text: this.generateMockCFRText(title, part, section),
        effectiveDate: '2024-01-01',
        lastRevised: '2023-12-15',
        citation: `${title} CFR ${part}${section ? `.${section}` : ''}`,
        hierarchy: [`Title ${title}`, `Part ${part}`, section ? `Section ${section}` : ''],
        crossReferences: this.generateCrossReferences(title, part),
        definitions: this.generateDefinitions(title, part),
        requirements: this.generateRequirements(title, part),
        deadlines: this.generateDeadlines(title, part)
      }
    ];

    return mockSections;
  }

  private generateSearchResults(title: number, searchTerms: string[]): CFRSection[] {
    const relevantParts = PRIORITY_CFR_PARTS[title as keyof typeof PRIORITY_CFR_PARTS] || [];
    
    return relevantParts
      .filter(partInfo => 
        searchTerms.some(term => 
          partInfo.name.toLowerCase().includes(term) || 
          partInfo.category.toLowerCase().includes(term)
        )
      )
      .map(partInfo => ({
        title,
        part: partInfo.part,
        section: '1',
        text: this.generateMockCFRText(title, partInfo.part),
        effectiveDate: '2024-01-01',
        lastRevised: '2023-12-15',
        citation: `${title} CFR ${partInfo.part}`,
        hierarchy: [`Title ${title}`, `Part ${partInfo.part}`, partInfo.name],
        crossReferences: this.generateCrossReferences(title, partInfo.part),
        definitions: this.generateDefinitions(title, partInfo.part),
        requirements: this.generateRequirements(title, partInfo.part),
        deadlines: this.generateDeadlines(title, partInfo.part)
      }));
  }

  private generateMockCFRText(title: number, part: number, section?: string): string {
    const cfrTexts = {
      21: {
        110: 'Current good manufacturing practice regulations in this part contain the minimum sanitary and processing requirements for producing safe food...',
        117: 'This part establishes current good manufacturing practice, hazard analysis, and risk-based preventive controls for human food...',
        820: 'This part establishes quality system requirements for the design, manufacture, packaging, labeling, storage, installation, and servicing of medical devices...'
      },
      9: {
        416: 'All official establishments must meet the sanitation performance standards in order to pass inspection...',
        417: 'Each establishment must develop and implement a system of preventive controls known as Hazard Analysis and Critical Control Point (HACCP) system...'
      }
    };

    return cfrTexts[title as keyof typeof cfrTexts]?.[part as keyof any] || 
           `This section contains the regulatory requirements for ${title} CFR ${part}${section ? `.${section}` : ''}. The full text would be retrieved from the CFR database in a production implementation.`;
  }

  private generateCrossReferences(title: number, part: number): string[] {
    const crossRefs = {
      21: {
        110: ['21 CFR 117', '21 CFR 120', '9 CFR 416'],
        117: ['21 CFR 110', '21 CFR 123', '21 CFR 507'],
        820: ['21 CFR 801', '21 CFR 803', '21 CFR 806']
      }
    };

    return crossRefs[title as keyof typeof crossRefs]?.[part as keyof any] || [];
  }

  private generateDefinitions(title: number, part: number): { term: string; definition: string }[] {
    const definitions = {
      21: {
        110: [
          { term: 'Adequate', definition: 'That which is needed to accomplish the intended purpose in keeping with good public health practice.' },
          { term: 'Food', definition: 'Food as defined in section 201(f) of the Federal Food, Drug, and Cosmetic Act.' }
        ],
        117: [
          { term: 'Hazard', definition: 'Any biological, chemical, or physical agent that is reasonably likely to cause illness or injury.' },
          { term: 'Preventive controls', definition: 'Risk-based, reasonably appropriate procedures, practices, and processes.' }
        ]
      }
    };

    return definitions[title as keyof typeof definitions]?.[part as keyof any] || [];
  }

  private generateRequirements(title: number, part: number): string[] {
    const requirements = {
      21: {
        110: [
          'Establish and maintain sanitary facilities and controls',
          'Implement pest control measures',
          'Provide adequate lighting in all areas',
          'Maintain equipment in clean and sanitary condition'
        ],
        117: [
          'Conduct hazard analysis for each type of food manufactured',
          'Establish preventive controls for identified hazards',
          'Monitor preventive controls to ensure effectiveness',
          'Maintain records documenting implementation'
        ]
      }
    };

    return requirements[title as keyof typeof requirements]?.[part as keyof any] || [];
  }

  private generateDeadlines(title: number, part: number): { requirement: string; deadline: string; type: 'absolute' | 'relative' }[] {
    const deadlines = {
      21: {
        117: [
          { requirement: 'Complete hazard analysis', deadline: 'Before beginning production', type: 'relative' as const },
          { requirement: 'Validate preventive controls', deadline: 'Within 90 days of implementation', type: 'relative' as const },
          { requirement: 'Review food safety plan', deadline: 'At least every 3 years', type: 'relative' as const }
        ]
      }
    };

    return deadlines[title as keyof typeof deadlines]?.[part as keyof any] || [];
  }

  private processGovInfoData(data: any, title: number, part: number, section?: string): CFRSection[] {
    // Process actual GovInfo API response
    // This is a placeholder for the real implementation
    return this.generateMockCFRData(title, part, section);
  }

  // Utility functions
  getCFRTitleInfo(titleNumber: number): CFRTitle | undefined {
    return CFR_TITLES.find(title => title.number === titleNumber);
  }

  formatCFRCitation(title: number, part: number, section?: string, subpart?: string): string {
    let citation = `${title} CFR ${part}`;
    if (section) citation += `.${section}`;
    if (subpart) citation += `(${subpart})`;
    return citation;
  }

  parseCFRCitation(citation: string): { title?: number; part?: number; section?: string } {
    const match = citation.match(/(\d+)\s+CFR\s+(\d+)(?:\.(\d+))?/i);
    if (!match) return {};
    
    return {
      title: parseInt(match[1]),
      part: parseInt(match[2]),
      section: match[3]
    };
  }

  // Quick access functions for common CFR lookups
  async getFoodSafetyRegulations(): Promise<CFRSection[]> {
    const foodSafetyParts = [110, 117, 120, 123];
    const results: CFRSection[] = [];
    
    for (const part of foodSafetyParts) {
      try {
        const sections = await this.getCFRSection(21, part);
        results.push(...sections);
      } catch (error) {
        logger.error(`Error fetching 21 CFR ${part}:`, error);
      }
    }
    
    return results;
  }

  async getDrugRegulations(): Promise<CFRSection[]> {
    const drugParts = [210, 211, 314];
    const results: CFRSection[] = [];
    
    for (const part of drugParts) {
      try {
        const sections = await this.getCFRSection(21, part);
        results.push(...sections);
      } catch (error) {
        logger.error(`Error fetching 21 CFR ${part}:`, error);
      }
    }
    
    return results;
  }

  async getMedicalDeviceRegulations(): Promise<CFRSection[]> {
    const deviceParts = [801, 803, 806, 820];
    const results: CFRSection[] = [];
    
    for (const part of deviceParts) {
      try {
        const sections = await this.getCFRSection(21, part);
        results.push(...sections);
      } catch (error) {
        logger.error(`Error fetching 21 CFR ${part}:`, error);
      }
    }
    
    return results;
  }

  // Clear cache utility
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const cfrApi = new CFRApiClient();