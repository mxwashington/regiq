// Comprehensive Alert Sync Service
// Orchestrates data pipeline from all APIs to database with deduplication

import { supabase } from '@/integrations/supabase/client';
import { fdaApi, fsisApi, type FDAEnforcementResult, type FSISRecallResult } from '@/lib/fda-api';
import { cdcApi, type CDCOutbreak, type CDCAdvisory } from '@/lib/cdc-api';
import { epaApi, type EPAEnforcement } from '@/lib/epa-api';
import {
  mapFDA,
  mapFSIS,
  mapCDC,
  mapEPA,
  validateAlert,
  type NormalizedAlert
} from '@/lib/alerts-schema';

export interface SyncResult {
  source: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  alertsFetched: number;
  alertsInserted: number;
  alertsUpdated: number;
  alertsSkipped: number;
  errors: string[];
  metadata?: Record<string, any>;
}

export interface SyncOptions {
  daysBack?: number;
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class ComprehensiveAlertSyncService {
  private defaultOptions: Required<SyncOptions> = {
    daysBack: 30,
    batchSize: 50,
    maxRetries: 3,
    retryDelay: 1000,
  };

  constructor(private options: SyncOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  // Main orchestration method
  async syncAllSources(daysBack?: number): Promise<SyncResult[]> {
    const days = daysBack || this.options.daysBack!;
    console.log(`Starting comprehensive sync for last ${days} days`);

    const results = await Promise.allSettled([
      this.syncFDAData(days),
      this.syncFSISData(days),
      this.syncCDCData(days),
      this.syncEPAData(days),
    ]);

    return results.map((result, index) => {
      const sources = ['FDA', 'FSIS', 'CDC', 'EPA'];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          source: sources[index],
          success: false,
          startTime: new Date(),
          endTime: new Date(),
          alertsFetched: 0,
          alertsInserted: 0,
          alertsUpdated: 0,
          alertsSkipped: 0,
          errors: [result.reason?.message || 'Unknown error'],
        };
      }
    });
  }

  // FDA data sync (all enforcement types)
  async syncFDAData(daysBack: number = 30): Promise<SyncResult> {
    const startTime = new Date();
    const result: SyncResult = {
      source: 'FDA',
      success: false,
      startTime,
      endTime: new Date(),
      alertsFetched: 0,
      alertsInserted: 0,
      alertsUpdated: 0,
      alertsSkipped: 0,
      errors: [],
    };

    // Start sync log - using simplified version
    const { data: logId, error: logError } = await supabase
      .rpc('start_sync_log', {
        p_source: 'FDA'
      });

    if (logError) {
      result.errors.push(`Failed to start sync log: ${logError.message}`);
      return result;
    }

    try {
      console.log('Syncing FDA enforcement data...');

      // Fetch from all FDA enforcement endpoints
      const [foodResults, drugResults, deviceResults] = await Promise.allSettled([
        fdaApi.getRecentRecalls(daysBack),
        this.fetchFDADrugEnforcement(daysBack),
        this.fetchFDADeviceEnforcement(daysBack),
      ]);

      const allFDAAlerts: FDAEnforcementResult[] = [];

      // Combine results from all endpoints
      if (foodResults.status === 'fulfilled') {
        allFDAAlerts.push(...(foodResults.value[0]?.results || []));
      } else {
        result.errors.push(`FDA Food: ${foodResults.reason?.message}`);
      }

      if (drugResults.status === 'fulfilled') {
        allFDAAlerts.push(...drugResults.value);
      } else {
        result.errors.push(`FDA Drug: ${drugResults.reason?.message}`);
      }

      if (deviceResults.status === 'fulfilled') {
        allFDAAlerts.push(...deviceResults.value);
      } else {
        result.errors.push(`FDA Device: ${deviceResults.reason?.message}`);
      }

      result.alertsFetched = allFDAAlerts.length;

      // Process in batches
      const batchSize = this.options.batchSize!;
      for (let i = 0; i < allFDAAlerts.length; i += batchSize) {
        const batch = allFDAAlerts.slice(i, i + batchSize);
        const batchResult = await this.processFDABatch(batch);

        result.alertsInserted += batchResult.inserted;
        result.alertsUpdated += batchResult.updated;
        result.alertsSkipped += batchResult.skipped;
        result.errors.push(...batchResult.errors);
      }

      result.success = result.errors.length === 0 || result.alertsInserted > 0 || result.alertsUpdated > 0;
      result.endTime = new Date();

      // Finish sync log - simplified
      await supabase.rpc('finish_sync_log', {
        p_log_id: logId,
        p_status: result.success ? 'completed' : 'partial'
      });

      console.log(`FDA sync completed: ${result.alertsInserted} inserted, ${result.alertsUpdated} updated`);
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.endTime = new Date();

      await supabase.rpc('finish_sync_log', {
        p_log_id: logId,
        p_status: 'failed'
      });

      return result;
    }
  }

  // FSIS data sync
  async syncFSISData(daysBack: number = 30): Promise<SyncResult> {
    const startTime = new Date();
    const result: SyncResult = {
      source: 'FSIS',
      success: false,
      startTime,
      endTime: new Date(),
      alertsFetched: 0,
      alertsInserted: 0,
      alertsUpdated: 0,
      alertsSkipped: 0,
      errors: [],
    };

    const { data: logId, error: logError } = await supabase
      .rpc('start_sync_log', {
        p_source: 'FSIS'
      });

    if (logError) {
      result.errors.push(`Failed to start sync log: ${logError.message}`);
      return result;
    }

    try {
      console.log('Syncing FSIS recall data...');

      const fsisRecalls = await fsisApi.getRecentRecalls(daysBack);
      result.alertsFetched = fsisRecalls.length;

      // Process in batches
      const batchSize = this.options.batchSize!;
      for (let i = 0; i < fsisRecalls.length; i += batchSize) {
        const batch = fsisRecalls.slice(i, i + batchSize);
        const batchResult = await this.processFSISBatch(batch);

        result.alertsInserted += batchResult.inserted;
        result.alertsUpdated += batchResult.updated;
        result.alertsSkipped += batchResult.skipped;
        result.errors.push(...batchResult.errors);
      }

      result.success = result.errors.length === 0 || result.alertsInserted > 0 || result.alertsUpdated > 0;
      result.endTime = new Date();

      await supabase.rpc('finish_sync_log', {
        p_log_id: logId,
        p_status: result.success ? 'completed' : 'partial'
      });

      console.log(`FSIS sync completed: ${result.alertsInserted} inserted, ${result.alertsUpdated} updated`);
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.endTime = new Date();

      await supabase.rpc('finish_sync_log', {
        p_log_id: logId,
        p_status: 'failed'
      });

      return result;
    }
  }

  // CDC data sync
  async syncCDCData(daysBack: number = 30): Promise<SyncResult> {
    const startTime = new Date();
    const result: SyncResult = {
      source: 'CDC',
      success: false,
      startTime,
      endTime: new Date(),
      alertsFetched: 0,
      alertsInserted: 0,
      alertsUpdated: 0,
      alertsSkipped: 0,
      errors: [],
    };

    const { data: logId, error: logError } = await supabase
      .rpc('start_sync_log', {
        p_source: 'CDC'
      });

    if (logError) {
      result.errors.push(`Failed to start sync log: ${logError.message}`);
      return result;
    }

    try {
      console.log('Syncing CDC data...');

      const [outbreaks, advisories] = await Promise.allSettled([
        cdcApi.getRecentOutbreaks(daysBack),
        cdcApi.getHealthAdvisories(daysBack),
      ]);

      const allCDCData: (CDCOutbreak | CDCAdvisory)[] = [];

      if (outbreaks.status === 'fulfilled') {
        allCDCData.push(...outbreaks.value);
      } else {
        result.errors.push(`CDC Outbreaks: ${outbreaks.reason?.message}`);
      }

      if (advisories.status === 'fulfilled') {
        allCDCData.push(...advisories.value);
      } else {
        result.errors.push(`CDC Advisories: ${advisories.reason?.message}`);
      }

      result.alertsFetched = allCDCData.length;

      // Process in batches
      const batchSize = this.options.batchSize!;
      for (let i = 0; i < allCDCData.length; i += batchSize) {
        const batch = allCDCData.slice(i, i + batchSize);
        const batchResult = await this.processCDCBatch(batch);

        result.alertsInserted += batchResult.inserted;
        result.alertsUpdated += batchResult.updated;
        result.alertsSkipped += batchResult.skipped;
        result.errors.push(...batchResult.errors);
      }

      result.success = result.errors.length === 0 || result.alertsInserted > 0 || result.alertsUpdated > 0;
      result.endTime = new Date();

      // Skip remaining database calls for now
      console.log(`CDC sync completed: ${result.alertsInserted} inserted, ${result.alertsUpdated} updated`);
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.endTime = new Date();

      // Skip remaining database calls for now  
      console.log(`CDC sync completed: ${result.alertsInserted} inserted, ${result.alertsUpdated} updated`);

      return result;
    }
  }

  // EPA data sync
  async syncEPAData(daysBack: number = 30): Promise<SyncResult> {
    const startTime = new Date();
    const result: SyncResult = {
      source: 'EPA',
      success: false,
      startTime,
      endTime: new Date(),
      alertsFetched: 0,
      alertsInserted: 0,
      alertsUpdated: 0,
      alertsSkipped: 0,
      errors: [],
    };

    const { data: logId, error: logError } = await supabase
      .rpc('start_sync_log', {
        p_source: 'EPA'  
      });

    if (logError) {
      result.errors.push(`Failed to start sync log: ${logError.message}`);
      return result;
    }

    try {
      console.log('Syncing EPA enforcement data...');

      const epaEnforcement = await epaApi.getRecentEnforcement(daysBack);
      result.alertsFetched = epaEnforcement.length;

      // Process in batches
      const batchSize = this.options.batchSize!;
      for (let i = 0; i < epaEnforcement.length; i += batchSize) {
        const batch = epaEnforcement.slice(i, i + batchSize);
        const batchResult = await this.processEPABatch(batch);

        result.alertsInserted += batchResult.inserted;
        result.alertsUpdated += batchResult.updated;
        result.alertsSkipped += batchResult.skipped;
        result.errors.push(...batchResult.errors);
      }

      result.success = result.errors.length === 0 || result.alertsInserted > 0 || result.alertsUpdated > 0;
      result.endTime = new Date();

      // Skip remaining database calls for now
      console.log(`EPA sync completed: ${result.alertsInserted} inserted, ${result.alertsUpdated} updated`);
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.endTime = new Date();

      // Skip remaining database calls for now
      console.log(`EPA sync completed: ${result.alertsInserted} inserted, ${result.alertsUpdated} updated`);

      return result;
    }
  }

  // Helper methods for fetching FDA data
  private async fetchFDADrugEnforcement(daysBack: number): Promise<FDAEnforcementResult[]> {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dateString = date.toISOString().split('T')[0];

    const searchQuery = `recall_initiation_date:[${dateString}+TO+*]`;
    const response = await fdaApi.searchDrugEnforcement({
      search: searchQuery,
      limit: 100,
      sort: 'recall_initiation_date:desc'
    });

    return response.results || [];
  }

  private async fetchFDADeviceEnforcement(daysBack: number): Promise<FDAEnforcementResult[]> {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dateString = date.toISOString().split('T')[0];

    const searchQuery = `recall_initiation_date:[${dateString}+TO+*]`;
    const response = await fdaApi.searchDeviceEnforcement({
      search: searchQuery,
      limit: 100,
      sort: 'recall_initiation_date:desc'
    });

    return response.results || [];
  }

  // Batch processing methods
  private async processFDABatch(batch: FDAEnforcementResult[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    let inserted = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (const item of batch) {
      try {
        const normalized = mapFDA(item);
        const validated = validateAlert(normalized);

        const { data, error } = await supabase.rpc('upsert_alert', {
          p_external_id: validated.external_id,
          p_source: validated.source,
          p_title: validated.title,
          p_summary: validated.summary,
          p_link_url: validated.link_url,
          p_date_published: validated.date_published,
          p_date_updated: validated.date_updated,
          p_jurisdiction: validated.jurisdiction,
          p_locations: validated.locations,
          p_product_types: validated.product_types,
          p_category: validated.category,
          p_severity: validated.severity,
          p_raw: validated.raw as any,
          p_hash: validated.hash,
        });

        if (error) {
          errors.push(`FDA upsert error: ${error.message}`);
          skipped++;
        } else if (data && data[0]) {
          if (data[0].action === 'inserted') inserted++;
          else if (data[0].action === 'updated') updated++;
          else skipped++;
        }
      } catch (error) {
        errors.push(`FDA mapping/validation error: ${error instanceof Error ? error.message : 'Unknown'}`);
        skipped++;
      }
    }

    return { inserted, updated, skipped, errors };
  }

  private async processFSISBatch(batch: FSISRecallResult[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    let inserted = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (const item of batch) {
      try {
        const normalized = mapFSIS(item);
        const validated = validateAlert(normalized);

        const { data, error } = await supabase.rpc('upsert_alert', {
          p_external_id: validated.external_id,
          p_source: validated.source,
          p_title: validated.title,
          p_summary: validated.summary,
          p_link_url: validated.link_url,
          p_date_published: validated.date_published,
          p_date_updated: validated.date_updated,
          p_jurisdiction: validated.jurisdiction,
          p_locations: validated.locations,
          p_product_types: validated.product_types,
          p_category: validated.category,
          p_severity: validated.severity,
          p_raw: validated.raw as any,
          p_hash: validated.hash,
        });

        if (error) {
          errors.push(`FSIS upsert error: ${error.message}`);
          skipped++;
        } else if (data && data[0]) {
          if (data[0].action === 'inserted') inserted++;
          else if (data[0].action === 'updated') updated++;
          else skipped++;
        }
      } catch (error) {
        errors.push(`FSIS mapping/validation error: ${error instanceof Error ? error.message : 'Unknown'}`);
        skipped++;
      }
    }

    return { inserted, updated, skipped, errors };
  }

  private async processCDCBatch(batch: (CDCOutbreak | CDCAdvisory)[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    let inserted = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (const item of batch) {
      try {
        // Determine if it's an outbreak or advisory and map accordingly
        const cdcItem = {
          ...item,
          type: 'investigation_start_date' in item ? 'outbreak' : 'advisory',
          status: 'investigation_status' in item ? item.investigation_status : 'active',
          date_published: 'investigation_start_date' in item ? item.investigation_start_date : item.pub_date,
          locations: 'states_affected' in item ? item.states_affected : [],
          products: 'food_vehicle' in item ? item.food_vehicle : [],
        };

        const normalized = mapCDC(cdcItem);
        const validated = validateAlert(normalized);

        const { data, error } = await supabase.rpc('upsert_alert', {
          p_external_id: validated.external_id,
          p_source: validated.source,
          p_title: validated.title,
          p_summary: validated.summary,
          p_link_url: validated.link_url,
          p_date_published: validated.date_published,
          p_date_updated: validated.date_updated,
          p_jurisdiction: validated.jurisdiction,
          p_locations: validated.locations,
          p_product_types: validated.product_types,
          p_category: validated.category,
          p_severity: validated.severity,
          p_raw: validated.raw as any,
          p_hash: validated.hash,
        });

        if (error) {
          errors.push(`CDC upsert error: ${error.message}`);
          skipped++;
        } else if (data && data[0]) {
          if (data[0].action === 'inserted') inserted++;
          else if (data[0].action === 'updated') updated++;
          else skipped++;
        }
      } catch (error) {
        errors.push(`CDC mapping/validation error: ${error instanceof Error ? error.message : 'Unknown'}`);
        skipped++;
      }
    }

    return { inserted, updated, skipped, errors };
  }

  private async processEPABatch(batch: EPAEnforcement[]): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    let inserted = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (const item of batch) {
      try {
        const epaItem = {
          ...item,
          id: item.case_number,
          title: item.case_name || item.defendant_entity,
          summary: item.case_summary,
          date_published: item.action_date || item.date_achieved,
          date_updated: item.date_updated,
          url: item.link,
          media: item.environmental_media,
        };

        const normalized = mapEPA(epaItem);
        const validated = validateAlert(normalized);

        const { data, error } = await supabase.rpc('upsert_alert', {
          p_external_id: validated.external_id,
          p_source: validated.source,
          p_title: validated.title,
          p_summary: validated.summary,
          p_link_url: validated.link_url,
          p_date_published: validated.date_published,
          p_date_updated: validated.date_updated,
          p_jurisdiction: validated.jurisdiction,
          p_locations: validated.locations,
          p_product_types: validated.product_types,
          p_category: validated.category,
          p_severity: validated.severity,
          p_raw: validated.raw as any,
          p_hash: validated.hash,
        });

        if (error) {
          errors.push(`EPA upsert error: ${error.message}`);
          skipped++;
        } else if (data && data[0]) {
          if (data[0].action === 'inserted') inserted++;
          else if (data[0].action === 'updated') updated++;
          else skipped++;
        }
      } catch (error) {
        errors.push(`EPA mapping/validation error: ${error instanceof Error ? error.message : 'Unknown'}`);
        skipped++;
      }
    }

    return { inserted, updated, skipped, errors };
  }

  // Utility methods
  async getSyncStatus(): Promise<{
    lastSyncTime: string | null;
    totalAlerts: number;
    alertsBySource: { [key: string]: number };
    recentAlerts: number;
  }> {
    const { data: summaryData } = await supabase
      .from('alerts_summary')
      .select('source, total_alerts, recent_alerts');

    const { data: lastSync } = await supabase
      .from('alert_sync_logs')
      .select('run_finished')
      .eq('status', 'completed')
      .order('run_finished', { ascending: false })
      .limit(1)
      .single();

    const totalAlerts = summaryData?.find(s => s.source === 'ALL')?.total_alerts || 0;
    const recentAlerts = summaryData?.find(s => s.source === 'ALL')?.recent_alerts || 0;

    const alertsBySource: { [key: string]: number } = {};
    summaryData?.forEach(item => {
      if (item.source !== 'ALL') {
        alertsBySource[item.source] = item.total_alerts || 0;
      }
    });

    return {
      lastSyncTime: lastSync?.run_finished || null,
      totalAlerts,
      alertsBySource,
      recentAlerts,
    };
  }

  async getRecentSyncLogs(limit: number = 10): Promise<any[]> {
    const { data, error } = await supabase
      .from('alert_sync_logs')
      .select('*')
      .order('run_started', { ascending: false })
      .limit(limit);

    return data || [];
  }
}

// Export singleton instance
export const comprehensiveAlertSyncService = new ComprehensiveAlertSyncService();