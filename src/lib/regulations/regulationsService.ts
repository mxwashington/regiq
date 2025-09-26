import { supabase } from '@/integrations/supabase/client';
import {
  RegulationsGovDocument,
  RegulationsGovComment,
  RegulationsGovSearchFilters,
  RegulationsGovPagination,
  RegulationsGovSort,
  ProcessedRegulationDocument,
  RegulationsGovApiResponse,
  RegulationsGovSingleResponse,
  IndustryFilterPreset,
  INDUSTRY_PRESETS,
  AGENCY_MAPPING
} from './types';

import { logger } from '@/lib/logger';
export class RegulationsService {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  
  constructor() {}

  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL
    });
  }

  /**
   * Search regulatory documents with filters
   */
  async searchDocuments(
    searchTerm?: string,
    filters: RegulationsGovSearchFilters = {},
    pagination: RegulationsGovPagination = {},
    sort: RegulationsGovSort = {}
  ): Promise<RegulationsGovApiResponse<RegulationsGovDocument>> {
    const cacheKey = this.getCacheKey('search_documents', { searchTerm, filters, pagination, sort });
    const cached = this.getCachedData<RegulationsGovApiResponse<RegulationsGovDocument>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase.functions.invoke('regulations-gov-api', {
        body: {
          action: 'search',
          query: searchTerm,
          agencyId: Array.isArray(filters.agencyId) ? filters.agencyId.join(',') : filters.agencyId,
          documentType: Array.isArray(filters.documentType) ? filters.documentType.join(',') : filters.documentType,
          postedDate: filters.postedDate?.ge,
          limit: pagination.size || 25,
          offset: ((pagination.page || 1) - 1) * (pagination.size || 25),
          sort: sort.sort,
          ...filters
        }
      });

      if (error) {
        throw new Error(`Regulations.gov API error: ${error.message}`);
      }

      const result = data as RegulationsGovApiResponse<RegulationsGovDocument>;
      this.setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      logger.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Get specific document details
   */
  async getDocumentDetails(documentId: string): Promise<RegulationsGovSingleResponse<RegulationsGovDocument>> {
    const cacheKey = this.getCacheKey('document_details', { documentId });
    const cached = this.getCachedData<RegulationsGovSingleResponse<RegulationsGovDocument>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase.functions.invoke('regulations-gov-api', {
        body: {
          action: 'get_document',
          documentId
        }
      });

      if (error) {
        throw new Error(`Failed to get document details: ${error.message}`);
      }

      const result = data as RegulationsGovSingleResponse<RegulationsGovDocument>;
      this.setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      logger.error('Error getting document details:', error);
      throw error;
    }
  }

  /**
   * Search documents by specific agencies
   */
  async searchByAgencies(
    agencies: string[],
    searchTerm?: string,
    pagination: RegulationsGovPagination = {}
  ): Promise<RegulationsGovApiResponse<RegulationsGovDocument>> {
    return this.searchDocuments(searchTerm, {
      agencyId: agencies,
      // Focus on high-impact document types
      documentType: ['Rule', 'Proposed Rule', 'Notice']
    }, pagination, {
      sort: '-postedDate' // Most recent first
    });
  }

  /**
   * Get recent documents within date range
   */
  async getRecentDocuments(
    dateRange: { startDate: Date; endDate?: Date } = { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    agencies?: string[],
    pagination: RegulationsGovPagination = {}
  ): Promise<RegulationsGovApiResponse<RegulationsGovDocument>> {
    const startDateStr = dateRange.startDate.toISOString().split('T')[0];
    const endDateStr = dateRange.endDate?.toISOString().split('T')[0];

    return this.searchDocuments(undefined, {
      agencyId: agencies,
      postedDate: {
        ge: startDateStr,
        le: endDateStr
      },
      documentType: ['Rule', 'Proposed Rule', 'Notice'] // Focus on regulatory content
    }, pagination, {
      sort: '-postedDate'
    });
  }

  /**
   * Search public comments for a document
   */
  async searchComments(
    docketId: string,
    pagination: RegulationsGovPagination = {}
  ): Promise<RegulationsGovApiResponse<RegulationsGovComment>> {
    const cacheKey = this.getCacheKey('search_comments', { docketId, pagination });
    const cached = this.getCachedData<RegulationsGovApiResponse<RegulationsGovComment>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase.functions.invoke('regulations-gov-api', {
        body: {
          action: 'get_comments',
          documentId: docketId, // Used as docketId in the edge function
          limit: pagination.size || 25,
          offset: ((pagination.page || 1) - 1) * (pagination.size || 25)
        }
      });

      if (error) {
        throw new Error(`Failed to get comments: ${error.message}`);
      }

      const result = data as RegulationsGovApiResponse<RegulationsGovComment>;
      this.setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      logger.error('Error searching comments:', error);
      throw error;
    }
  }

  /**
   * Get documents with enhanced processing for industry-specific needs
   */
  async getProcessedDocuments(
    industryPreset?: keyof typeof INDUSTRY_PRESETS,
    searchTerm?: string,
    pagination: RegulationsGovPagination = {}
  ): Promise<ProcessedRegulationDocument[]> {
    let filters: RegulationsGovSearchFilters = {};
    
    if (industryPreset && INDUSTRY_PRESETS[industryPreset]) {
      const preset = INDUSTRY_PRESETS[industryPreset];
      filters = {
        agencyId: preset.agencies,
        documentType: preset.documentTypes as any[]
      };
      
      // Combine search term with industry keywords
      if (searchTerm) {
        searchTerm = `${searchTerm} ${preset.keywords.slice(0, 3).join(' ')}`;
      } else {
        searchTerm = preset.keywords.slice(0, 5).join(' OR ');
      }
    }

    const response = await this.searchDocuments(searchTerm, filters, pagination, {
      sort: '-postedDate'
    });

    return response.data.map(doc => this.processDocument(doc, industryPreset));
  }

  /**
   * Monitor for new regulations (for background sync)
   */
  async syncRecentDocuments(): Promise<{ processed: number; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('regulations-gov-api', {
        body: {
          action: 'sync_recent'
        }
      });

      if (error) {
        throw new Error(`Sync failed: ${error.message}`);
      }

      return data as { processed: number; message: string };
    } catch (error) {
      logger.error('Error syncing recent documents:', error);
      throw error;
    }
  }

  /**
   * Search open comment periods
   */
  async getOpenCommentPeriods(
    agencies?: string[],
    pagination: RegulationsGovPagination = {}
  ): Promise<RegulationsGovApiResponse<RegulationsGovDocument>> {
    const today = new Date().toISOString().split('T')[0];
    
    return this.searchDocuments(undefined, {
      agencyId: agencies,
      openForComment: true,
      commentEndDate: {
        ge: today // Comment period hasn't ended
      },
      documentType: ['Rule', 'Proposed Rule']
    }, pagination, {
      sort: '-postedDate' // Most recent first since commentEndDate sorting may not be supported
    });
  }

  /**
   * Get regulatory intelligence summary
   */
  async getRegulatoryIntelligence(
    industryPreset: keyof typeof INDUSTRY_PRESETS,
    dateRange: { days: number } = { days: 7 }
  ): Promise<{
    totalDocuments: number;
    byAgency: Record<string, number>;
    byType: Record<string, number>;
    urgentItems: ProcessedRegulationDocument[];
    openComments: RegulationsGovDocument[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange.days);

    const [recentDocs, openComments] = await Promise.all([
      this.getProcessedDocuments(industryPreset, undefined, { size: 100 }),
      this.getOpenCommentPeriods(INDUSTRY_PRESETS[industryPreset].agencies, { size: 20 })
    ]);

    const byAgency: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let urgentItems: ProcessedRegulationDocument[] = [];

    recentDocs.forEach(doc => {
      byAgency[doc.agency] = (byAgency[doc.agency] || 0) + 1;
      byType[doc.documentType] = (byType[doc.documentType] || 0) + 1;
      
      if (doc.urgencyLevel === 'High' || doc.urgencyLevel === 'Critical') {
        urgentItems.push(doc);
      }
    });

    // Sort urgent items by urgency score
    urgentItems = urgentItems
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 10);

    return {
      totalDocuments: recentDocs.length,
      byAgency,
      byType,
      urgentItems,
      openComments: openComments.data.slice(0, 10)
    };
  }

  /**
   * Process raw document into enhanced format
   */
  private processDocument(
    doc: RegulationsGovDocument,
    industryPreset?: keyof typeof INDUSTRY_PRESETS
  ): ProcessedRegulationDocument {
    const urgency = this.calculateUrgencyScore(doc, industryPreset);
    const tags = this.extractTags(doc, industryPreset);
    
    return {
      id: doc.id,
      title: doc.attributes.title,
      agency: doc.attributes.agencyId,
      documentType: doc.attributes.documentType,
      summary: doc.attributes.summary,
      publishedDate: new Date(doc.attributes.postedDate),
      lastModified: doc.attributes.lastModifiedDate ? new Date(doc.attributes.lastModifiedDate) : undefined,
      urgencyScore: urgency.score,
      urgencyLevel: urgency.level,
      isOpenForComment: doc.attributes.openForComment,
      commentDeadline: doc.attributes.commentEndDate ? new Date(doc.attributes.commentEndDate) : undefined,
      externalUrl: `https://www.regulations.gov/document/${doc.id}`,
      docketId: doc.attributes.docketId,
      tags,
      industryRelevance: industryPreset ? [INDUSTRY_PRESETS[industryPreset].name] : undefined
    };
  }

  /**
   * Calculate urgency score and level
   */
  private calculateUrgencyScore(
    doc: RegulationsGovDocument,
    industryPreset?: keyof typeof INDUSTRY_PRESETS
  ): { score: number; level: 'Low' | 'Medium' | 'High' | 'Critical' } {
    let score = 5; // Base score
    const text = `${doc.attributes.title} ${doc.attributes.summary || ''}`.toLowerCase();

    // High urgency keywords
    const criticalKeywords = ['recall', 'emergency', 'immediate', 'urgent', 'critical', 'danger', 'hazard', 'death', 'injury'];
    const highKeywords = ['enforcement', 'violation', 'warning', 'penalty', 'contamination', 'outbreak'];
    const mediumKeywords = ['proposed rule', 'final rule', 'compliance', 'requirement', 'deadline'];

    // Keyword scoring
    if (criticalKeywords.some(keyword => text.includes(keyword))) {
      score += 4;
    } else if (highKeywords.some(keyword => text.includes(keyword))) {
      score += 3;
    } else if (mediumKeywords.some(keyword => text.includes(keyword))) {
      score += 2;
    }

    // Document type scoring
    if (doc.attributes.documentType === 'Rule') {
      score += 2;
    } else if (doc.attributes.documentType === 'Proposed Rule') {
      score += 1;
    } else if (doc.attributes.documentType === 'Notice') {
      score += 1;
    }

    // Agency priority scoring
    const agencyPriority = AGENCY_MAPPING[doc.attributes.agencyId]?.priority || 3;
    if (agencyPriority === 1) {
      score += 2;
    } else if (agencyPriority === 2) {
      score += 1;
    }

    // Comment period urgency
    if (doc.attributes.openForComment && doc.attributes.commentEndDate) {
      const daysLeft = Math.ceil((new Date(doc.attributes.commentEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) {
        score += 3;
      } else if (daysLeft <= 14) {
        score += 2;
      } else if (daysLeft <= 30) {
        score += 1;
      }
    }

    // Industry relevance boost
    if (industryPreset && INDUSTRY_PRESETS[industryPreset]) {
      const preset = INDUSTRY_PRESETS[industryPreset];
      if (preset.keywords.some(keyword => text.includes(keyword))) {
        score += 2;
      }
    }

    // Determine level
    let level: 'Low' | 'Medium' | 'High' | 'Critical';
    if (score >= 12) {
      level = 'Critical';
    } else if (score >= 9) {
      level = 'High';
    } else if (score >= 6) {
      level = 'Medium';
    } else {
      level = 'Low';
    }

    return { score: Math.min(15, score), level };
  }

  /**
   * Extract relevant tags from document
   */
  private extractTags(
    doc: RegulationsGovDocument,
    industryPreset?: keyof typeof INDUSTRY_PRESETS
  ): string[] {
    const tags: string[] = [];
    const text = `${doc.attributes.title} ${doc.attributes.summary || ''}`.toLowerCase();

    // Add document type
    tags.push(doc.attributes.documentType);

    // Add agency
    tags.push(doc.attributes.agencyId);

    // Add industry-specific tags
    if (industryPreset && INDUSTRY_PRESETS[industryPreset]) {
      const preset = INDUSTRY_PRESETS[industryPreset];
      preset.keywords.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
          tags.push(keyword);
        }
      });
    }

    // Add urgency tags
    if (text.includes('recall')) tags.push('Recall');
    if (text.includes('emergency')) tags.push('Emergency');
    if (text.includes('compliance')) tags.push('Compliance');
    if (text.includes('enforcement')) tags.push('Enforcement');
    if (doc.attributes.openForComment) tags.push('Open for Comment');

    // Add temporal tags
    const postedDate = new Date(doc.attributes.postedDate);
    const daysAgo = Math.ceil((Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo <= 1) tags.push('New Today');
    else if (daysAgo <= 7) tags.push('This Week');
    else if (daysAgo <= 30) tags.push('This Month');

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Clear cache (useful for development)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const regulationsService = new RegulationsService();