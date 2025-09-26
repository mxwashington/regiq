// Unified Alert Schema and Mappers
// Normalizes data from FDA, FSIS, CDC, EPA into consistent format

import { z } from 'zod';
import { createHash } from 'crypto';

// Core unified alert schema
export const NormalizedAlertSchema = z.object({
  external_id: z.string(),          // stable unique id from source (normalized)
  source: z.enum(['FDA', 'FSIS', 'CDC', 'EPA']),
  title: z.string(),
  summary: z.string().nullable(),
  link_url: z.string().url().nullable(),
  date_published: z.string(),       // ISO 8601
  date_updated: z.string().nullable(), // ISO 8601
  jurisdiction: z.string().nullable(),
  locations: z.array(z.string()).default([]),
  product_types: z.array(z.string()).default([]),
  category: z.string().nullable(),  // recall, outbreak, enforcement, guidance
  severity: z.number().nullable(),  // 0-100 score
  raw: z.unknown(),                 // original parsed JSON
  hash: z.string(),                 // sha256 for deduplication
});

export type NormalizedAlert = z.infer<typeof NormalizedAlertSchema>;

// Utility functions
export function normalizeExternalId(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function computeAlertHash(source: string, externalId: string, dateUpdated?: string, datePublished?: string): string {
  const hashInput = `${source}:${normalizeExternalId(externalId)}:${dateUpdated || datePublished || ''}`;
  return createHash('sha256').update(hashInput, 'utf8').digest('hex');
}

// Severity mapping functions
export function computeSeverityForFDA(classification: string): number {
  switch (classification?.toLowerCase()) {
    case 'class i': return 90;
    case 'class ii': return 60;
    case 'class iii': return 30;
    default: return 50;
  }
}

export function computeSeverityForFSIS(recallClass: string): number {
  switch (recallClass?.toLowerCase()) {
    case 'class i': return 90;
    case 'class ii': return 60;
    case 'class iii': return 30;
    case 'high': return 85;
    case 'medium': return 55;
    case 'low': return 25;
    default: return 50;
  }
}

export function computeSeverityForCDC(status: string, type: string): number {
  const statusLower = status?.toLowerCase() || '';
  const typeLower = type?.toLowerCase() || '';

  if (statusLower.includes('active') || statusLower.includes('ongoing')) return 70;
  if (statusLower.includes('closed') || statusLower.includes('resolved')) return 40;
  if (typeLower.includes('outbreak')) return 75;
  if (typeLower.includes('advisory') || typeLower.includes('guidance')) return 50;
  if (typeLower.includes('recall')) return 80;

  return 50;
}

export function computeSeverityForEPA(actionType: string, significance: string): number {
  const actionLower = actionType?.toLowerCase() || '';
  const significanceLower = significance?.toLowerCase() || '';

  if (significanceLower.includes('significant') || actionLower.includes('enforcement')) return 80;
  if (actionLower.includes('violation') || actionLower.includes('penalty')) return 75;
  if (actionLower.includes('notice') || actionLower.includes('warning')) return 40;
  if (actionLower.includes('settlement') || actionLower.includes('consent')) return 60;

  return 50;
}

// Location extractors
function extractFDALocations(item: any): string[] {
  const locations: string[] = [];
  if (item.state) locations.push(item.state);
  if (item.city) locations.push(item.city);
  if (item.country && item.country !== 'US') locations.push(item.country);
  if (item.distribution_pattern) {
    // Extract state abbreviations from distribution pattern
    const stateMatches = item.distribution_pattern.match(/\b[A-Z]{2}\b/g);
    if (stateMatches) locations.push(...stateMatches);
  }
  return [...new Set(locations)]; // Remove duplicates
}

function extractFSISLocations(item: any): string[] {
  const locations: string[] = [];
  if (item.distributionPattern) {
    // Parse distribution pattern for states/regions
    const stateMatches = item.distributionPattern.match(/\b[A-Z]{2}\b/g);
    if (stateMatches) locations.push(...stateMatches);
  }
  return [...new Set(locations)];
}

// Product type extractors
function extractFDAProductTypes(item: any): string[] {
  const types: string[] = [];
  if (item.product_type) types.push(item.product_type);
  if (item.product_description) {
    // Extract common product categories
    const desc = item.product_description.toLowerCase();
    if (desc.includes('drug') || desc.includes('medication')) types.push('Drug');
    if (desc.includes('device') || desc.includes('medical device')) types.push('Medical Device');
    if (desc.includes('food') || desc.includes('dietary')) types.push('Food');
    if (desc.includes('cosmetic')) types.push('Cosmetic');
  }
  return [...new Set(types)];
}

function extractFSISProductTypes(item: any): string[] {
  const types: string[] = [];
  if (item.productName) {
    const name = item.productName.toLowerCase();
    if (name.includes('beef') || name.includes('cattle')) types.push('Beef');
    if (name.includes('pork') || name.includes('swine')) types.push('Pork');
    if (name.includes('chicken') || name.includes('poultry')) types.push('Poultry');
    if (name.includes('turkey')) types.push('Turkey');
    if (name.includes('fish') || name.includes('seafood')) types.push('Seafood');
    if (name.includes('egg')) types.push('Eggs');
  }
  return [...new Set(types)];
}

// Category mappers
function mapFDACategory(item: any): string {
  if (item.recall_number || item.status) return 'recall';
  if (item.event_id) return 'adverse_event';
  return 'enforcement';
}

function mapFSISCategory(item: any): string {
  return 'recall'; // FSIS primarily deals with recalls
}

// Main mapper functions
export function mapFDA(item: any, source: 'FDA' = 'FDA'): NormalizedAlert {
  const externalId = normalizeExternalId(item.recall_number || item.event_id || item.id || '');
  const datePublished = item.recall_initiation_date || item.receivedate || item.report_date || new Date().toISOString();
  const dateUpdated = item.recall_announcement_date || item.termination_date || null;

  return {
    external_id: externalId,
    source,
    title: item.product_description || item.reason_for_recall || item.medicinalproduct || 'FDA Alert',
    summary: item.reason_for_recall || item.product_description || null,
    link_url: item.more_code_info || null,
    date_published: datePublished,
    date_updated: dateUpdated,
    jurisdiction: item.country === 'US' ? item.state : item.country,
    locations: extractFDALocations(item),
    product_types: extractFDAProductTypes(item),
    category: mapFDACategory(item),
    severity: computeSeverityForFDA(item.classification),
    raw: item,
    hash: computeAlertHash(source, externalId, dateUpdated, datePublished)
  };
}

export function mapFSIS(item: any): NormalizedAlert {
  const externalId = normalizeExternalId(item.recallNumber || item.recall_number || '');
  const datePublished = item.recallDate || item.recall_date || new Date().toISOString();

  return {
    external_id: externalId,
    source: 'FSIS' as const,
    title: item.productName || item.product_name || 'FSIS Recall',
    summary: item.summary || item.reasonForRecall || item.reason_for_recall || null,
    link_url: item.link || item.url || null,
    date_published: datePublished,
    date_updated: null,
    jurisdiction: 'United States',
    locations: extractFSISLocations(item),
    product_types: extractFSISProductTypes(item),
    category: mapFSISCategory(item),
    severity: computeSeverityForFSIS(item.recallClass || item.recall_class),
    raw: item,
    hash: computeAlertHash('FSIS', externalId, null, datePublished)
  };
}

export function mapCDC(item: any): NormalizedAlert {
  const externalId = normalizeExternalId(item.id || item.outbreak_id || item.guid || '');
  const datePublished = item.date_published || item.pub_date || item.investigation_start_date || new Date().toISOString();
  const dateUpdated = item.date_updated || item.last_updated || null;

  return {
    external_id: externalId,
    source: 'CDC' as const,
    title: item.title || item.headline || item.name || 'CDC Alert',
    summary: item.summary || item.description || item.investigation_summary || null,
    link_url: item.link || item.url || item.web_link || null,
    date_published: datePublished,
    date_updated: dateUpdated,
    jurisdiction: item.jurisdiction || 'United States',
    locations: item.locations || item.states_affected || [],
    product_types: item.products || item.food_vehicle || [],
    category: item.type === 'outbreak' ? 'outbreak' : (item.type === 'recall' ? 'recall' : 'advisory'),
    severity: computeSeverityForCDC(item.status, item.type),
    raw: item,
    hash: computeAlertHash('CDC', externalId, dateUpdated, datePublished)
  };
}

export function mapEPA(item: any): NormalizedAlert {
  const externalId = normalizeExternalId(item.case_number || item.enforcement_id || item.id || '');
  const datePublished = item.date_achieved || item.settlement_date || item.action_date || new Date().toISOString();
  const dateUpdated = item.date_updated || null;

  return {
    external_id: externalId,
    source: 'EPA' as const,
    title: item.defendant_entity || item.facility_name || item.title || 'EPA Enforcement Action',
    summary: item.summary || item.case_summary || item.violations || null,
    link_url: item.link || item.url || null,
    date_published: datePublished,
    date_updated: dateUpdated,
    jurisdiction: item.state || item.region || 'United States',
    locations: item.state ? [item.state] : [],
    product_types: item.media || item.environmental_media || [],
    category: 'enforcement',
    severity: computeSeverityForEPA(item.action_type, item.significance),
    raw: item,
    hash: computeAlertHash('EPA', externalId, dateUpdated, datePublished)
  };
}

// Validation helper
export function validateAlert(alert: unknown): NormalizedAlert {
  return NormalizedAlertSchema.parse(alert);
}

// Batch validation
export function validateAlerts(alerts: unknown[]): { valid: NormalizedAlert[], invalid: unknown[] } {
  const valid: NormalizedAlert[] = [];
  const invalid: unknown[] = [];

  for (const alert of alerts) {
    try {
      valid.push(validateAlert(alert));
    } catch (error) {
      invalid.push(alert);
    }
  }

  return { valid, invalid };
}