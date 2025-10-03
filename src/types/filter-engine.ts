// Core Filter Engine Types
export type SourceType = 
  | 'FDA' | 'USDA' | 'FSIS' | 'WHO' | 'HEALTH_CANADA' | 'CDC' | 'MHRA' 
  | 'IAEA' | 'FSA' | 'EFSA' | 'CFIA' | 'EMA' | 'FAO' | 'MHLW' | 'ECHA' 
  | 'FSANZ' | 'EPA' | 'OSHA' | 'TGA' | 'PMDA' | 'FTC' | 'REGULATIONS_GOV';

export type FilterOperator = 'eq' | 'ne' | 'in' | 'not_in' | 'contains' | 'range' | 'exists';

export interface FilterValue {
  operator: FilterOperator;
  value: string | number | boolean | string[] | number[] | { min?: number; max?: number };
}

export interface SharedFacets {
  time_range?: {
    start_date?: string;
    end_date?: string;
  };
  keyword?: string;
  jurisdiction?: string[];
  urgency?: string[];
  days_since_published?: string;
}

export interface SourceFilter {
  source_type: SourceType;
  enabled: boolean;
  filters: Record<string, FilterValue>;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterQuery {
  sources: SourceFilter[];
  shared: SharedFacets;
  pagination: PaginationParams;
  sorting: SortParams;
}

export interface NormalizedResult {
  id: string;
  external_id: string;
  source: SourceType;
  title: string;
  summary: string;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  published_date: string;
  external_url?: string;
  metadata: Record<string, any>;
}

export interface SourceResult {
  source: SourceType;
  success: boolean;
  data: NormalizedResult[];
  error?: string;
  pagination?: {
    total?: number;
    has_more?: boolean;
    next_cursor?: string;
  };
  cache_info?: {
    hit: boolean;
    ttl?: number;
  };
}

export interface APIRequest {
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
}

export interface APIResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
}

// Error Types
export type SourceErrorType = 
  | 'auth_error' | 'rate_limit' | 'timeout' | 'network_error' 
  | 'invalid_request' | 'server_error' | 'unknown_error';

export interface SourceError {
  type: SourceErrorType;
  message: string;
  code?: string;
  retryable: boolean;
}