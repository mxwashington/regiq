// FDA Query Helper - Auto-suggest, validation, and smart expansion
export interface FDASearchTerm {
  term: string;
  category: 'pathogen' | 'allergen' | 'company' | 'product' | 'classification' | 'symptom' | 'drug' | 'device';
  aliases: string[];
  description: string;
  frequency: number; // How often this term appears in FDA data
}

export interface QuerySuggestion {
  term: string;
  category: string;
  confidence: number;
  expandedTerms?: string[];
}

export interface QueryValidation {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
  correctedQuery?: string;
}

// Comprehensive FDA terminology database
export const fdaTerminology: FDASearchTerm[] = [
  // Pathogens
  { term: 'listeria', category: 'pathogen', aliases: ['listeria monocytogenes', 'l. monocytogenes'], description: 'Bacterial pathogen causing listeriosis', frequency: 95 },
  { term: 'salmonella', category: 'pathogen', aliases: ['salmonella enterica', 'salmonella spp'], description: 'Bacterial pathogen causing food poisoning', frequency: 89 },
  { term: 'e. coli', category: 'pathogen', aliases: ['escherichia coli', 'ecoli', 'e.coli', 'stec'], description: 'Bacterial pathogen, some strains toxic', frequency: 78 },
  { term: 'hepatitis a', category: 'pathogen', aliases: ['hep a', 'hepatitis virus'], description: 'Viral infection affecting liver', frequency: 45 },
  { term: 'norovirus', category: 'pathogen', aliases: ['norwalk virus', 'stomach flu'], description: 'Viral gastroenteritis pathogen', frequency: 67 },
  { term: 'clostridium', category: 'pathogen', aliases: ['c. difficile', 'c. botulinum', 'clostridium botulinum'], description: 'Bacterial spore-forming pathogen', frequency: 34 },
  
  // Allergens
  { term: 'undeclared allergen', category: 'allergen', aliases: ['undeclared', 'allergen not declared'], description: 'Allergen not listed on product label', frequency: 92 },
  { term: 'peanut', category: 'allergen', aliases: ['peanuts', 'groundnut', 'arachis'], description: 'Tree nut allergen', frequency: 85 },
  { term: 'tree nuts', category: 'allergen', aliases: ['nuts', 'almonds', 'walnuts', 'cashews'], description: 'Various tree nut allergens', frequency: 76 },
  { term: 'milk', category: 'allergen', aliases: ['dairy', 'lactose', 'casein', 'whey'], description: 'Milk protein allergen', frequency: 81 },
  { term: 'eggs', category: 'allergen', aliases: ['egg', 'ovalbumin', 'egg protein'], description: 'Egg protein allergen', frequency: 72 },
  { term: 'soy', category: 'allergen', aliases: ['soybean', 'soja', 'glycine max'], description: 'Soy protein allergen', frequency: 68 },
  { term: 'wheat', category: 'allergen', aliases: ['gluten', 'wheat protein', 'triticum'], description: 'Wheat gluten allergen', frequency: 74 },
  { term: 'fish', category: 'allergen', aliases: ['seafood', 'finfish'], description: 'Fish protein allergen', frequency: 59 },
  { term: 'shellfish', category: 'allergen', aliases: ['crustacean', 'shrimp', 'crab', 'lobster'], description: 'Shellfish allergen', frequency: 63 },
  
  // Classifications
  { term: 'class i', category: 'classification', aliases: ['class 1', 'most serious'], description: 'Most serious FDA recall classification', frequency: 100 },
  { term: 'class ii', category: 'classification', aliases: ['class 2', 'moderate'], description: 'Moderate FDA recall classification', frequency: 100 },
  { term: 'class iii', category: 'classification', aliases: ['class 3', 'least serious'], description: 'Least serious FDA recall classification', frequency: 100 },
  
  // Products
  { term: 'infant formula', category: 'product', aliases: ['baby formula', 'formula'], description: 'Nutritional product for infants', frequency: 78 },
  { term: 'dietary supplement', category: 'product', aliases: ['supplement', 'vitamin', 'herbal'], description: 'Nutritional supplement product', frequency: 65 },
  { term: 'pet food', category: 'product', aliases: ['dog food', 'cat food', 'animal feed'], description: 'Food products for pets', frequency: 58 },
  { term: 'medical device', category: 'device', aliases: ['device', 'implant', 'equipment'], description: 'Medical equipment or device', frequency: 71 },
  
  // Drug terms
  { term: 'contamination', category: 'drug', aliases: ['contaminated', 'impurity', 'adulterated'], description: 'Drug contamination issues', frequency: 83 },
  { term: 'mislabeling', category: 'drug', aliases: ['mislabeled', 'incorrect label', 'labeling error'], description: 'Incorrect product labeling', frequency: 76 },
  { term: 'potency', category: 'drug', aliases: ['subpotent', 'superpotent', 'strength'], description: 'Drug potency issues', frequency: 54 },
  
  // Companies (most frequent in recalls)
  { term: 'abbott', category: 'company', aliases: ['abbott laboratories'], description: 'Major pharmaceutical/nutritional company', frequency: 45 },
  { term: 'nestle', category: 'company', aliases: ['nestle usa'], description: 'Food manufacturing company', frequency: 42 },
  { term: 'tyson', category: 'company', aliases: ['tyson foods'], description: 'Meat processing company', frequency: 38 },
  
  // Symptoms
  { term: 'illness', category: 'symptom', aliases: ['sick', 'sickness', 'disease'], description: 'General illness reports', frequency: 67 },
  { term: 'hospitalization', category: 'symptom', aliases: ['hospitalized', 'hospital'], description: 'Serious illness requiring hospitalization', frequency: 45 },
  { term: 'death', category: 'symptom', aliases: ['fatality', 'died', 'fatal'], description: 'Fatal outcomes', frequency: 23 }
];

export class FDAQueryHelper {
  private terminology: FDASearchTerm[];
  private synonyms: Map<string, string[]>;
  
  constructor() {
    this.terminology = fdaTerminology;
    this.synonyms = this.buildSynonymMap();
  }

  private buildSynonymMap(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    
    this.terminology.forEach(term => {
      // Add main term
      map.set(term.term.toLowerCase(), [term.term, ...term.aliases]);
      
      // Add aliases pointing to main term
      term.aliases.forEach(alias => {
        map.set(alias.toLowerCase(), [term.term, ...term.aliases]);
      });
    });
    
    return map;
  }

  // Auto-suggest terms as user types
  getSuggestions(input: string, limit: number = 8): QuerySuggestion[] {
    if (input.length < 2) return [];
    
    const query = input.toLowerCase().trim();
    const suggestions: QuerySuggestion[] = [];
    
    // Direct matches
    this.terminology.forEach(term => {
      const mainMatch = term.term.toLowerCase().includes(query);
      const aliasMatch = term.aliases.some(alias => alias.toLowerCase().includes(query));
      
      if (mainMatch || aliasMatch) {
        const confidence = mainMatch ? 1.0 : 0.8;
        const expandedTerms = this.getExpandedTerms(term.term);
        
        suggestions.push({
          term: term.term,
          category: term.category,
          confidence: confidence * (term.frequency / 100),
          expandedTerms
        });
      }
    });
    
    // Sort by confidence and frequency
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  // Validate OpenFDA query syntax
  validateQuery(query: string): QueryValidation {
    const validation: QueryValidation = {
      isValid: true,
      errors: [],
      suggestions: [],
      correctedQuery: query
    };

    // Check for common syntax errors
    const syntaxChecks = [
      {
        pattern: /\s+AND\s+/g,
        replacement: '+AND+',
        error: 'Use +AND+ instead of AND for OpenFDA queries'
      },
      {
        pattern: /\s+OR\s+/g,
        replacement: '+OR+',
        error: 'Use +OR+ instead of OR for OpenFDA queries'
      },
      {
        pattern: /[^"\w\s+\-:.[\]()]/g,
        replacement: '',
        error: 'Remove special characters that are not supported'
      }
    ];

    let corrected = query;
    syntaxChecks.forEach(check => {
      if (check.pattern.test(query)) {
        validation.errors.push(check.error);
        validation.isValid = false;
        corrected = corrected.replace(check.pattern, check.replacement);
      }
    });

    // Check for field syntax
    const fieldPattern = /(\w+):\s*"([^"]+)"/g;
    const validFields = ['product_description', 'company_name', 'classification', 'state', 'recall_initiation_date'];
    
    let fieldMatch;
    while ((fieldMatch = fieldPattern.exec(query)) !== null) {
      const fieldName = fieldMatch[1];
      if (!validFields.includes(fieldName)) {
        validation.errors.push(`"${fieldName}" is not a valid search field`);
        validation.isValid = false;
        validation.suggestions.push(`Try: ${validFields.join(', ')}`);
      }
    }

    validation.correctedQuery = corrected;
    return validation;
  }

  // Smart query expansion
  expandQuery(query: string): string {
    let expanded = query;
    const words = query.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      const synonyms = this.synonyms.get(word);
      if (synonyms && synonyms.length > 1) {
        // Create OR clause with synonyms
        const orClause = synonyms.map(s => `"${s}"`).join('+OR+');
        expanded = expanded.replace(
          new RegExp(`\\b${word}\\b`, 'gi'), 
          `(${orClause})`
        );
      }
    });

    return expanded;
  }

  // Get related terms for expansion
  getExpandedTerms(term: string): string[] {
    const synonyms = this.synonyms.get(term.toLowerCase());
    return synonyms ? synonyms.filter(s => s !== term) : [];
  }

  // Get trending search terms based on recent FDA data
  getTrendingTerms(): FDASearchTerm[] {
    return this.terminology
      .filter(term => term.frequency > 70)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  // Search term analytics
  getTermAnalytics(term: string): {
    category: string;
    frequency: number;
    relatedTerms: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } | null {
    const found = this.terminology.find(t => 
      t.term.toLowerCase() === term.toLowerCase() || 
      t.aliases.some(a => a.toLowerCase() === term.toLowerCase())
    );

    if (!found) return null;

    const riskLevel = found.category === 'pathogen' || found.category === 'classification' 
      ? 'high' 
      : found.category === 'allergen' 
      ? 'medium' 
      : 'low';

    return {
      category: found.category,
      frequency: found.frequency,
      relatedTerms: found.aliases,
      riskLevel
    };
  }

  // Build search suggestions for empty query
  getPopularSearches(): string[] {
    return [
      'Recent Class I recalls',
      'Listeria contamination',
      'Undeclared allergen recalls',
      'Salmonella outbreaks',
      'Drug contamination',
      'Medical device recalls',
      'Infant formula safety',
      'Peanut allergen recalls'
    ];
  }
}

// Export singleton instance
export const fdaQueryHelper = new FDAQueryHelper();