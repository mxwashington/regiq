import { BaseSourceAdapter, AdapterConfig } from './BaseSourceAdapter';
import { SourceFilter, APIRequest, APIResponse, NormalizedResult } from '@/types/filter-engine';

export class FSISAdapter extends BaseSourceAdapter {
  private static readonly FSIS_RSS_URLS = [
    'https://www.fsis.usda.gov/wps/wcm/connect/fsis-content/internet/main/topics/recalls-and-public-health-alerts/recall-summaries/rss',
    'https://www.fsis.usda.gov/news-events/news-press-releases/rss.xml'
  ];
  
  constructor() {
    const config: AdapterConfig = {
      auth: {
        type: 'api_key',
        header_name: 'Authorization'
      },
      rate_limit: {
        requests_per_hour: 300,
        requests_per_minute: 15
      },
      retry: {
        max_attempts: 3,
        base_delay_ms: 2000,
        max_delay_ms: 20000,
        exponential_base: 2,
        jitter: true
      },
      cache: {
        ttl_seconds: 900, // 15 minutes
        use_etag: true,
        use_if_modified_since: true
      },
      timeout_ms: 30000,
      circuit_breaker: {
        failure_threshold: 4,
        reset_timeout_ms: 180000
      }
    };
    
    super(config);
  }

  getSourceType(): string {
    return 'FSIS';
  }

  buildRequest(filter: SourceFilter): APIRequest {
    // Use RSS feeds since FSIS doesn't have a public API
    const rssUrl = FSISAdapter.FSIS_RSS_URLS[0]; // Use primary RSS feed
    
    const base_request: APIRequest = {
      url: rssUrl,
      method: 'GET',
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'User-Agent': 'RegIQ/1.0 Regulatory Intelligence Bot'
      }
    };

    // RSS doesn't support query parameters, so return base request
    return base_request;
    
    // RSS feeds don't support complex filtering, but we can filter results after parsing
  }

  normalize(response: APIResponse): NormalizedResult[] {
    if (!response.data || typeof response.data !== 'string') {
      return [];
    }

    // Parse RSS XML content
    const xmlText = response.data;
    const results: NormalizedResult[] = [];
    
    try {
      // Extract RSS items using regex
      const itemPattern = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      let match;
      
      while ((match = itemPattern.exec(xmlText)) !== null) {
        const itemXml = match[1];
        
        // Extract title, description, link, pubDate
        const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const descMatch = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
        const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
        
        const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        const link = linkMatch ? linkMatch[1].trim() : '';
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
        
        // Only process recall and alert items
        if (title && (title.toLowerCase().includes('recall') || 
                     title.toLowerCase().includes('alert') ||
                     title.toLowerCase().includes('public health'))) {
          
          // Determine urgency based on content
          let urgency: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
          const content = (title + ' ' + description).toLowerCase();
          
          if (content.includes('class i') || content.includes('serious') || content.includes('death')) {
            urgency = 'Critical';
          } else if (content.includes('class ii') || content.includes('illness') || content.includes('contamination')) {
            urgency = 'High';
          } else if (content.includes('class iii')) {
            urgency = 'Low';
          }

          results.push({
            id: `fsis_rss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            external_id: link || title,
            source: 'FSIS',
            title: title,
            summary: description || title,
            urgency,
            published_date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            external_url: link,
            metadata: {
              raw_xml: itemXml,
              publication_date: pubDate,
              content_source: 'FSIS_RSS'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error parsing FSIS RSS:', error);
    }

    return results;
    // This code was replaced by RSS parsing above
  }

  private getAPIKey(): string | null {
    // In production, this would be retrieved from secure storage
    return null;
  }
}