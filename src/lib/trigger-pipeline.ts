import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
export async function triggerDataPipelineNow() {
  try {
    logger.info('🔄 Triggering unified regulatory data pipeline...');
    
    // Invoke the unified orchestrator which runs all scrapers
    const { data, error } = await supabase.functions.invoke('unified-regulatory-orchestrator', {
      body: { mode: 'all', trigger_type: 'manual' }
    });
    
    if (error) {
      logger.error('❌ Unified pipeline failed:', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Unified pipeline completed successfully:', data);
    
    return { 
      success: true, 
      totalAlertsProcessed: data?.total_processed || 0,
      agencyResults: data?.results || {},
      message: `Processed alerts from ${Object.keys(data?.results || {}).length} sources`
    };
    
  } catch (error) {
    logger.error('❌ Error triggering data pipeline:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Note: Auto-trigger removed to prevent conflicts with centralized refresh system