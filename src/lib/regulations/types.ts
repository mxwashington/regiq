// TypeScript interfaces for Regulations.gov API

export interface RegulationsGovDocument {
  id: string;
  type: 'documents';
  attributes: {
    agencyId: string;
    title: string;
    documentType: 'Rule' | 'Proposed Rule' | 'Notice' | 'Supporting & Related Material' | 'Other';
    summary?: string;
    postedDate: string;
    lastModifiedDate?: string;
    openForComment: boolean;
    commentEndDate?: string;
    commentStartDate?: string;
    withdrawn?: boolean;
    rin?: string;
    docketId: string;
    subtype?: string;
    frDocNum?: string;
    metadata?: Record<string, any>;
  };
  links: {
    self: string;
  };
}

export interface RegulationsGovComment {
  id: string;
  type: 'comments';
  attributes: {
    agencyId: string;
    title: string;
    comment: string;
    postedDate: string;
    lastModifiedDate?: string;
    docketId: string;
    documentType: 'Public Submission';
    pageCount?: number;
    commentOnId?: string;
    duplicateComments?: number;
    stateProvinceRegion?: string;
    country?: string;
    category?: string;
    organization?: string;
    firstName?: string;
    lastName?: string;
    withdrawn?: boolean;
  };
  links: {
    self: string;
  };
}

export interface RegulationsGovDocket {
  id: string;
  type: 'dockets';
  attributes: {
    agencyId: string;
    title: string;
    docketType: 'Rulemaking' | 'Nonrulemaking';
    lastModifiedDate: string;
    highlightedContent?: string;
    keywords?: string[];
    program?: string[];
    subagency?: string;
    subagencyId?: string;
  };
  links: {
    self: string;
  };
}

export interface RegulationsGovAgency {
  id: string;
  type: 'agencies';
  attributes: {
    acronym: string;
    name: string;
    description?: string;
    parentAcronym?: string;
  };
  links: {
    self: string;
  };
}

export interface RegulationsGovApiResponse<T> {
  data: T[];
  meta: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    numberOfElements: number;
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
  };
  links: {
    self: string;
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
}

export interface RegulationsGovSingleResponse<T> {
  data: T;
  included?: any[];
}

export interface RegulationsGovSearchFilters {
  searchTerm?: string;
  agencyId?: string | string[];
  docketId?: string | string[];
  documentType?: string | string[];
  postedDate?: {
    ge?: string; // Greater than or equal (YYYY-MM-DD)
    le?: string; // Less than or equal (YYYY-MM-DD)
  };
  commentEndDate?: {
    ge?: string;
    le?: string;
  };
  lastModifiedDate?: {
    ge?: string;
    le?: string;
  };
  rin?: string;
  frDocNum?: string;
  openForComment?: boolean;
  withdrawn?: boolean;
}

export interface RegulationsGovPagination {
  page?: number;
  size?: number; // 25, 50, 100, 250
}

export interface RegulationsGovSort {
  sort?: 'lastModifiedDate' | '-lastModifiedDate' | 'postedDate' | '-postedDate' | 'title' | 'docketId' | 'commentEndDate' | '-commentEndDate';
}

// Enhanced interfaces for our application use
export interface ProcessedRegulationDocument {
  id: string;
  title: string;
  agency: string;
  documentType: string;
  summary?: string;
  publishedDate: Date;
  lastModified?: Date;
  urgencyScore: number;
  urgencyLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  isOpenForComment: boolean;
  commentDeadline?: Date;
  externalUrl: string;
  docketId: string;
  tags: string[];
  industryRelevance?: string[];
  aiSummary?: string;
  impactAssessment?: string;
  complianceActions?: string[];
}

export interface RegulationsGovError {
  status: number;
  title: string;
  detail: string;
  source?: {
    parameter?: string;
    pointer?: string;
  };
}

export interface RegulationsGovApiConfig {
  baseUrl: string;
  apiKey: string;
  defaultPageSize: number;
  rateLimit: {
    requestsPerHour: number;
    burstLimit: number;
  };
  cache: {
    ttl: number; // seconds
    enabled: boolean;
  };
}

// Industry-specific filter presets
export interface IndustryFilterPreset {
  name: string;
  description: string;
  agencies: string[];
  documentTypes: string[];
  keywords: string[];
  excludeKeywords?: string[];
}

export const INDUSTRY_PRESETS: Record<string, IndustryFilterPreset> = {
  FOOD_BEVERAGE: {
    name: 'Food & Beverage',
    description: 'FDA, USDA FSIS food safety regulations and recalls',
    agencies: ['FDA', 'FSIS', 'CDC'],
    documentTypes: ['Rule', 'Notice', 'Proposed Rule'],
    keywords: ['food safety', 'recall', 'inspection', 'HACCP', 'labeling', 'nutrition', 'contamination'],
    excludeKeywords: ['tobacco', 'drug', 'device']
  },
  PHARMACEUTICALS: {
    name: 'Pharmaceuticals',
    description: 'FDA drug and medical device regulations',
    agencies: ['FDA', 'CDC'],
    documentTypes: ['Rule', 'Notice', 'Proposed Rule'],
    keywords: ['drug', 'pharmaceutical', 'medical device', 'clinical trial', 'GMP', 'recall', 'warning letter'],
    excludeKeywords: ['food', 'tobacco']
  },
  AGRICULTURE: {
    name: 'Agriculture',
    description: 'USDA, EPA agricultural and pesticide regulations',
    agencies: ['USDA', 'EPA', 'FSIS'],
    documentTypes: ['Rule', 'Notice', 'Proposed Rule'],
    keywords: ['agriculture', 'pesticide', 'livestock', 'organic', 'feed', 'animal health', 'crop'],
    excludeKeywords: ['tobacco']
  },
  ENVIRONMENTAL: {
    name: 'Environmental',
    description: 'EPA environmental and chemical regulations',
    agencies: ['EPA', 'OSHA'],
    documentTypes: ['Rule', 'Notice', 'Proposed Rule'],
    keywords: ['environmental', 'chemical', 'waste', 'air quality', 'water', 'TSCA', 'RCRA'],
    excludeKeywords: []
  }
};

export const AGENCY_MAPPING: Record<string, { name: string; priority: number }> = {
  'FDA': { name: 'Food and Drug Administration', priority: 1 },
  'FSIS': { name: 'Food Safety and Inspection Service', priority: 1 },
  'EPA': { name: 'Environmental Protection Agency', priority: 1 },
  'USDA': { name: 'United States Department of Agriculture', priority: 2 },
  'CDC': { name: 'Centers for Disease Control and Prevention', priority: 2 },
  'OSHA': { name: 'Occupational Safety and Health Administration', priority: 3 },
  'FTC': { name: 'Federal Trade Commission', priority: 3 },
  'CPSC': { name: 'Consumer Product Safety Commission', priority: 2 }
};