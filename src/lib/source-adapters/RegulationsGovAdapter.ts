import { BaseSourceAdapter } from './BaseSourceAdapter';
import { SourceFilter, SourceResult } from '@/types/filter-engine';
import { supabase } from '@/integrations/supabase/client';

export class RegulationsGovAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      auth: { type: 'api_key' },
      rate_limit: { requests_per_hour: 1000 }, // Regulations.gov allows high rate limits
      retry: { max_attempts: 3, base_delay_ms: 1000, max_delay_ms: 5000, exponential_base: 2, jitter: true },
      cache: { ttl_seconds: 1800, use_etag: true, use_if_modified_since: true }, // 30 min cache
      timeout_ms: 30000,
      circuit_breaker: { failure_threshold: 3, reset_timeout_ms: 300000 } // 5 min reset
    });
  }

  getSourceType(): string {
    return 'REGULATIONS_GOV';
  }

  buildRequest(filter: SourceFilter): any {
    const params: any = {
      action: 'search',
      limit: 25,
      offset: 0
    };

    // Extract query from keyword filter
    if (filter.filters.keyword?.value) {
      params.query = filter.filters.keyword.value;
    }

    // Extract agency from agency filter
    if (filter.filters.agency?.value) {
      params.agencyId = filter.filters.agency.value;
    }

    // Extract document type from document_type filter
    if (filter.filters.document_type?.value) {
      params.documentType = filter.filters.document_type.value;
    }

    return {
      url: '/regulations-gov-api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    };
  }

  normalize(response: any): any[] {
    if (!response.documents) {
      return [];
    }

    return response.documents.map((doc: any) => ({
      id: doc.id,
      external_id: doc.id,
      title: doc.title,
      source: 'REGULATIONS_GOV' as const,
      summary: doc.summary,
      urgency: this.determineUrgency(doc) as 'Critical' | 'High' | 'Medium' | 'Low',
      published_date: doc.postedDate,
      external_url: doc.url,
      metadata: {
        document_type: doc.documentType,
        agency_id: doc.agencyId,
        open_for_comment: doc.openForComment,
        comment_end_date: doc.commentEndDate
      }
    }));
  }

  async executeWithPolicy(filter: SourceFilter): Promise<SourceResult> {
    try {
      // Extract parameters from filter
      const query = filter.filters.keyword?.value as string;
      const agencyId = filter.filters.agency?.value as string;
      const documentType = filter.filters.document_type?.value as string;

      // Use Supabase edge function for actual API call
      const { data, error } = await supabase.functions.invoke('regulations-gov-api', {
        body: {
          action: 'search',
          query,
          agencyId,
          documentType,
          limit: 25,
          offset: 0
        }
      });

      if (error) {
        return {
          source: 'REGULATIONS_GOV',
          success: false,
          data: [],
          error: error.message
        };
      }

      const normalizedData = this.normalize(data);

      return {
        source: 'REGULATIONS_GOV',
        success: true,
        data: normalizedData,
        pagination: {
          total: data.total || normalizedData.length,
          has_more: (data.total || normalizedData.length) > normalizedData.length
        }
      };

    } catch (error) {
      return {
        source: 'REGULATIONS_GOV',
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private determineUrgency(doc: any): string {
    const title = (doc.title || '').toLowerCase();
    const summary = (doc.summary || '').toLowerCase();
    const text = `${title} ${summary}`;

    const highUrgencyKeywords = [
      'recall', 'emergency', 'immediate', 'urgent', 'critical', 'danger', 
      'hazard', 'death', 'injury', 'contamination', 'outbreak', 'violation'
    ];

    const mediumUrgencyKeywords = [
      'rule', 'regulation', 'compliance', 'requirement', 'standard', 
      'guideline', 'policy', 'proposed', 'final'
    ];

    if (highUrgencyKeywords.some(keyword => text.includes(keyword))) {
      return 'High';
    } else if (mediumUrgencyKeywords.some(keyword => text.includes(keyword))) {
      return 'Medium';  
    }

    return 'Low';
  }
}