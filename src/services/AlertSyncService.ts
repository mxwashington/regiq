import { supabase } from '@/integrations/supabase/client';
import { fdaApi, fsisApi } from '@/lib/fda-api';
import { logger } from '@/lib/logger';

export interface AlertSyncResult {
  success: boolean;
  source: string;
  alertsImported: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
}

export class AlertSyncService {
  private static instance: AlertSyncService;

  static getInstance(): AlertSyncService {
    if (!AlertSyncService.instance) {
      AlertSyncService.instance = new AlertSyncService();
    }
    return AlertSyncService.instance;
  }

  /**
   * Sync FDA Food Enforcement Reports to alerts table
   */
  async syncFDAFoodAlerts(days: number = 30): Promise<AlertSyncResult> {
    const startTime = new Date();
    const result: AlertSyncResult = {
      success: false,
      source: 'FDA_FOOD',
      alertsImported: 0,
      errors: [],
      startTime,
      endTime: new Date()
    };

    try {
      logger.info(`[AlertSync] Starting FDA Food alerts sync for last ${days} days`);

      const recalls = await fdaApi.getRecentRecalls(days);
      logger.info(`[AlertSync] Retrieved ${recalls.length} FDA food recalls`);

      for (const recall of recalls) {
        try {
          const alert = this.transformFDARecallToAlert(recall, 'FDA');
          await this.insertAlert(alert);
          result.alertsImported++;
        } catch (error) {
          const errorMsg = `Failed to import FDA recall ${recall.results?.[0]?.recall_number}: ${error}`;
          logger.error(`[AlertSync] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      result.endTime = new Date();

      logger.info(`[AlertSync] FDA Food sync complete: ${result.alertsImported} alerts imported, ${result.errors.length} errors`);
      return result;

    } catch (error) {
      result.errors.push(`FDA Food sync failed: ${error}`);
      result.endTime = new Date();
      logger.error(`[AlertSync] FDA Food sync failed:`, error);
      return result;
    }
  }

  /**
   * Sync USDA FSIS recalls to alerts table
   */
  async syncFSISAlerts(days: number = 30): Promise<AlertSyncResult> {
    const startTime = new Date();
    const result: AlertSyncResult = {
      success: false,
      source: 'USDA_FSIS',
      alertsImported: 0,
      errors: [],
      startTime,
      endTime: new Date()
    };

    try {
      logger.info(`[AlertSync] Starting FSIS alerts sync for last ${days} days`);

      const recalls = await fsisApi.getRecentRecalls(days);
      logger.info(`[AlertSync] Retrieved ${recalls.length} FSIS recalls`);

      for (const recall of recalls) {
        try {
          const alert = this.transformFSISRecallToAlert(recall);
          await this.insertAlert(alert);
          result.alertsImported++;
        } catch (error) {
          const errorMsg = `Failed to import FSIS recall ${recall.recallCaseNumber}: ${error}`;
          logger.error(`[AlertSync] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      result.endTime = new Date();

      logger.info(`[AlertSync] FSIS sync complete: ${result.alertsImported} alerts imported, ${result.errors.length} errors`);
      return result;

    } catch (error) {
      result.errors.push(`FSIS sync failed: ${error}`);
      result.endTime = new Date();
      logger.error(`[AlertSync] FSIS sync failed:`, error);
      return result;
    }
  }

  /**
   * Sync all available data sources
   */
  async syncAllSources(days: number = 30): Promise<AlertSyncResult[]> {
    logger.info(`[AlertSync] Starting comprehensive sync for last ${days} days`);

    const results = await Promise.allSettled([
      this.syncFDAFoodAlerts(days),
      this.syncFSISAlerts(days)
    ]);

    const syncResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const sources = ['FDA_FOOD', 'USDA_FSIS'];
        return {
          success: false,
          source: sources[index],
          alertsImported: 0,
          errors: [`Sync promise rejected: ${result.reason}`],
          startTime: new Date(),
          endTime: new Date()
        };
      }
    });

    const totalImported = syncResults.reduce((sum, r) => sum + r.alertsImported, 0);
    const totalErrors = syncResults.reduce((sum, r) => sum + r.errors.length, 0);

    logger.info(`[AlertSync] Comprehensive sync complete: ${totalImported} total alerts imported, ${totalErrors} total errors`);

    return syncResults;
  }

  /**
   * Transform FDA recall data to our alert format
   */
  private transformFDARecallToAlert(recall: any, agency: string) {
    const recallData = recall.results?.[0];
    if (!recallData) {
      throw new Error('No recall data found in FDA response');
    }

    // Determine urgency based on recall class
    let urgency = 'medium';
    let urgencyScore = 5;

    if (recallData.classification) {
      const classification = recallData.classification.toLowerCase();
      if (classification.includes('class i')) {
        urgency = 'critical';
        urgencyScore = 9;
      } else if (classification.includes('class ii')) {
        urgency = 'high';
        urgencyScore = 7;
      } else if (classification.includes('class iii')) {
        urgency = 'medium';
        urgencyScore = 5;
      }
    }

    const publishedDate = recallData.report_date || recallData.recall_initiation_date || new Date().toISOString();

    return {
      title: `FDA Food Recall: ${recallData.product_description || 'Product Recall'}`,
      summary: recallData.reason_for_recall || 'FDA food product recall issued',
      full_content: JSON.stringify(recallData, null, 2),
      agency,
      source: `FDA Food Enforcement Report`,
      urgency,
      urgency_score: urgencyScore,
      published_date: publishedDate,
      external_url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
      metadata: {
        recall_number: recallData.recall_number,
        classification: recallData.classification,
        recalling_firm: recallData.recalling_firm,
        product_description: recallData.product_description,
        distribution_pattern: recallData.distribution_pattern,
        state: recallData.state,
        country: recallData.country
      },
      ai_summary: `FDA has issued a ${urgency} recall for ${recallData.product_description || 'food products'} due to ${recallData.reason_for_recall}. Recall initiated by ${recallData.recalling_firm || 'manufacturer'}.`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Transform FSIS recall data to our alert format
   */
  private transformFSISRecallToAlert(recall: any) {
    // Determine urgency based on recall class or health hazard
    let urgency = 'medium';
    let urgencyScore = 5;

    if (recall.healthHazard) {
      const hazard = recall.healthHazard.toLowerCase();
      if (hazard.includes('high') || hazard.includes('class i')) {
        urgency = 'critical';
        urgencyScore = 9;
      } else if (hazard.includes('reasonable') || hazard.includes('class ii')) {
        urgency = 'high';
        urgencyScore = 7;
      }
    }

    return {
      title: `USDA FSIS Recall: ${recall.productName || 'Meat/Poultry Product Recall'}`,
      summary: recall.problemDescription || 'USDA FSIS meat/poultry product recall issued',
      full_content: JSON.stringify(recall, null, 2),
      agency: 'USDA',
      source: 'FSIS Recall',
      urgency,
      urgency_score: urgencyScore,
      published_date: recall.recallDate || new Date().toISOString(),
      external_url: recall.pressReleaseURL || `https://www.fsis.usda.gov/recalls-alerts`,
      metadata: {
        recall_case_number: recall.recallCaseNumber,
        establishment_number: recall.establishmentNumber,
        establishment_name: recall.establishmentName,
        product_name: recall.productName,
        problem_description: recall.problemDescription,
        health_hazard: recall.healthHazard,
        states_affected: recall.statesAffected
      },
      ai_summary: `USDA FSIS has issued a ${urgency} recall for ${recall.productName || 'meat/poultry products'} due to ${recall.problemDescription}. Recall involves establishment ${recall.establishmentName}.`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Insert alert into database with duplicate prevention
   */
  private async insertAlert(alertData: any) {
    // Check for existing alert to prevent duplicates
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('title', alertData.title)
      .eq('agency', alertData.agency)
      .eq('published_date', alertData.published_date)
      .single();

    if (existing) {
      logger.info(`[AlertSync] Skipping duplicate alert: ${alertData.title}`);
      return existing;
    }

    // Insert new alert
    const { data, error } = await supabase
      .from('alerts')
      .insert([alertData])
      .select()
      .single();

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    logger.info(`[AlertSync] Inserted alert: ${alertData.title}`);
    return data;
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus(): Promise<{
    lastSyncTime: string | null;
    totalAlerts: number;
    alertsBySource: { [key: string]: number };
    recentAlerts: number;
  }> {
    try {
      // Get total alerts count
      const { count: totalAlerts } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true });

      // Get alerts by source
      const { data: sourceData } = await supabase
        .from('alerts')
        .select('agency')
        .order('created_at', { ascending: false });

      const alertsBySource: { [key: string]: number } = {};
      sourceData?.forEach(alert => {
        alertsBySource[alert.agency] = (alertsBySource[alert.agency] || 0) + 1;
      });

      // Get recent alerts (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentAlerts } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .gte('published_date', sevenDaysAgo.toISOString());

      // Get last sync time (approximate from most recent alert created_at)
      const { data: lastAlert } = await supabase
        .from('alerts')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        lastSyncTime: lastAlert?.created_at || null,
        totalAlerts: totalAlerts || 0,
        alertsBySource,
        recentAlerts: recentAlerts || 0
      };

    } catch (error) {
      logger.error('[AlertSync] Failed to get sync status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const alertSyncService = AlertSyncService.getInstance();